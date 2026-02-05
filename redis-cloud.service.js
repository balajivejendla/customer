const { createClient } = require('redis');
const crypto = require('crypto');

class RedisCloudService {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.isConnecting = false; // Prevent multiple connection attempts
        
        // Cache TTL configurations (in seconds)
        this.TTL = {
            MESSAGE: parseInt(process.env.CACHE_MESSAGE_TTL) || 3600,      // 1 hour
            RESPONSE: parseInt(process.env.CACHE_RESPONSE_TTL) || 86400,   // 24 hours
            SESSION: parseInt(process.env.CACHE_SESSION_TTL) || 900,       // 15 minutes
            USER: parseInt(process.env.CACHE_USER_TTL) || 1800,            // 30 minutes
            REFRESH_TOKEN: 7 * 24 * 60 * 60,                              // 7 days
            RATE_LIMIT: 15 * 60                                           // 15 minutes
        };
        
        this.connect();
    }
    
    async connect() {
        // Prevent multiple connection attempts
        if (this.isConnecting || this.isConnected) {
            return;
        }
        
        try {
            // Check if Redis is disabled
            if (process.env.REDIS_ENABLED === 'false') {
                console.log('⚠️ Redis disabled in configuration - using in-memory storage');
                this.isConnected = false;
                return;
            }
            
            this.isConnecting = true;
            console.log('🔗 Connecting to Redis Cloud...');
            
            // Create Redis client with exact working configuration
            this.redis = createClient({
                username: process.env.REDIS_CLOUD_USERNAME || 'default',
                password: process.env.REDIS_CLOUD_PASSWORD,
                socket: {
                    host: process.env.REDIS_CLOUD_HOST,
                    port: parseInt(process.env.REDIS_CLOUD_PORT) || 6379,
                    connectTimeout: 10000,
                    commandTimeout: 5000
                }
            });
            
            // Simple error handler - only log critical errors
            this.redis.on('error', (error) => {
                // Only log if it's a connection error, not command errors
                if (error.message.includes('connect') || error.message.includes('timeout')) {
                    console.error('❌ Redis Cloud connection error:', error.message);
                }
                this.isConnected = false;
            });
            
            this.redis.on('connect', () => {
                console.log('🔗 Redis Cloud connecting...');
            });
            
            this.redis.on('ready', () => {
                console.log('✅ Redis Cloud connected and ready');
                this.isConnected = true;
            });
            
            this.redis.on('end', () => {
                console.log('❌ Redis Cloud connection ended');
                this.isConnected = false;
            });
            
            // Connect and test
            await this.redis.connect();
            const pingResult = await this.redis.ping();
            console.log('✅ Redis Cloud ping successful:', pingResult);
            this.isConnecting = false;
            
        } catch (error) {
            console.error('❌ Failed to connect to Redis Cloud:', error.message);
            console.log('⚠️  Running without Redis cache - using in-memory storage');
            this.isConnected = false;
            this.isConnecting = false;
        }
    }
    
    // Utility method to check if Redis is available
    isAvailable() {
        return this.isConnected && this.redis;
    }
    
    // Generate cache key with namespace
    generateKey(namespace, identifier) {
        return `${namespace}:${identifier}`;
    }
    
    // ==================== MESSAGE HISTORY ====================
    
    async storeMessage(userId, messageData) {
        if (!this.isAvailable()) return false;
        
        try {
            const historyKey = this.generateKey('msg_history', userId);
            
            // Add message to user's history list
            await this.redis.lPush(historyKey, JSON.stringify(messageData));
            
            // Keep only last 100 messages
            await this.redis.lTrim(historyKey, 0, 99);
            
            // Set expiry
            await this.redis.expire(historyKey, this.TTL.MESSAGE);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error storing message:', error.message);
            return false;
        }
    }
    
    async getMessageHistory(userId, limit = 20) {
        if (!this.isAvailable()) return [];
        
        try {
            const historyKey = this.generateKey('msg_history', userId);
            const messages = await this.redis.lRange(historyKey, 0, limit - 1);
            
            return messages.map(msg => JSON.parse(msg)).reverse();
            
        } catch (error) {
            console.error('❌ Error retrieving message history:', error.message);
            return [];
        }
    }
    
    // ==================== RESPONSE CACHING ====================
    
    async cacheResponse(query, response, metadata = {}) {
        if (!this.isAvailable()) return false;
        
        try {
            const cacheKey = this.generateKey('msg_response', this.hashQuery(query));
            const cacheData = {
                query,
                response,
                metadata,
                timestamp: new Date().toISOString()
            };
            
            await this.redis.setEx(cacheKey, this.TTL.RESPONSE, JSON.stringify(cacheData));
            return true;
            
        } catch (error) {
            console.error('❌ Error caching response:', error.message);
            return false;
        }
    }
    
    async getCachedResponse(query) {
        if (!this.isAvailable()) return null;
        
        try {
            const cacheKey = this.generateKey('msg_response', this.hashQuery(query));
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error retrieving cached response:', error.message);
            return null;
        }
    }
    
    // ==================== SESSION MANAGEMENT ====================
    
    async createSession(userId, socketId, email) {
        if (!this.isAvailable()) return null;
        
        try {
            const sessionId = `session_${userId}_${Date.now()}`;
            const sessionKey = this.generateKey('session', sessionId);
            
            const sessionData = {
                sessionId,
                userId,
                socketId,
                email,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };
            
            await this.redis.setEx(sessionKey, this.TTL.SESSION, JSON.stringify(sessionData));
            return sessionData;
            
        } catch (error) {
            console.error('❌ Error creating session:', error.message);
            return null;
        }
    }
    
    async getUserSession(userId) {
        if (!this.isAvailable()) return null;
        
        try {
            const pattern = this.generateKey('session', `*_${userId}_*`);
            const keys = await this.redis.keys(pattern);
            
            if (keys.length > 0) {
                const sessionData = await this.redis.get(keys[0]);
                return sessionData ? JSON.parse(sessionData) : null;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error retrieving user session:', error.message);
            return null;
        }
    }
    
    async destroySession(sessionId) {
        if (!this.isAvailable()) return false;
        
        try {
            const sessionKey = this.generateKey('session', sessionId);
            await this.redis.del(sessionKey);
            return true;
            
        } catch (error) {
            console.error('❌ Error destroying session:', error.message);
            return false;
        }
    }
    
    // ==================== REFRESH TOKEN MANAGEMENT ====================
    
    async storeRefreshToken(token, userId, email) {
        if (!this.isAvailable()) return false;
        
        try {
            const tokenKey = this.generateKey('refresh_token', this.hashQuery(token));
            const tokenData = {
                token,
                userId,
                email,
                createdAt: new Date().toISOString()
            };
            
            await this.redis.setEx(tokenKey, this.TTL.REFRESH_TOKEN, JSON.stringify(tokenData));
            return true;
            
        } catch (error) {
            console.error('❌ Error storing refresh token:', error.message);
            return false;
        }
    }
    
    async validateRefreshToken(token) {
        if (!this.isAvailable()) return null;
        
        try {
            const tokenKey = this.generateKey('refresh_token', this.hashQuery(token));
            const tokenData = await this.redis.get(tokenKey);
            
            return tokenData ? JSON.parse(tokenData) : null;
            
        } catch (error) {
            console.error('❌ Error validating refresh token:', error.message);
            return null;
        }
    }
    
    async revokeRefreshToken(token) {
        if (!this.isAvailable()) return false;
        
        try {
            const tokenKey = this.generateKey('refresh_token', this.hashQuery(token));
            await this.redis.del(tokenKey);
            return true;
            
        } catch (error) {
            console.error('❌ Error revoking refresh token:', error.message);
            return false;
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    hashQuery(query) {
        return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    }
    
    async getCacheStats() {
        if (!this.isAvailable()) return null;
        
        try {
            const info = await this.redis.info();
            return {
                connected: this.isConnected,
                info: info
            };
            
        } catch (error) {
            console.error('❌ Error getting cache stats:', error.message);
            return null;
        }
    }
    
    // ==================== CLEANUP ====================
    
    async disconnect() {
        if (this.redis) {
            try {
                await this.redis.disconnect();
                console.log('✅ Redis Cloud disconnected');
            } catch (error) {
                console.error('❌ Error disconnecting from Redis Cloud:', error.message);
            }
        }
    }
}

// Create singleton instance
const redisCloudService = new RedisCloudService();

// Cleanup on process exit
process.on('SIGINT', async () => {
    await redisCloudService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await redisCloudService.disconnect();
    process.exit(0);
});

module.exports = redisCloudService;