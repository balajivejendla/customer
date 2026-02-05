    const jwt = require('jsonwebtoken');
const redisCloudService = require('./redis-cloud.service');
const ragService = require('./rag.service');
const mongoDBService = require('./mongodb.service');
const embeddingService = require('./embedding.service');
const geminiService = require('./gemini.service');

// Load environment variables
require('dotenv').config();

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
const SOCKET_PORT = process.env.SOCKET_PORT || 3005;

console.log(`🚀 Starting WebSocket server in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`📊 Port: ${SOCKET_PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Use Redis Cloud service instead of creating our own connection
const isRedisConnected = () => redisCloudService.isAvailable();

// CORS Origins Configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000"
];

console.log(`🔗 CORS Origins:`, corsOrigins);

const io = require('socket.io')(SOCKET_PORT, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Utility function to verify JWT token
function verifySocketToken(token) {
    try {
        console.log('🔍 Verifying JWT token...');
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'toxicity-api',
            audience: 'toxicity-client'
        });
        console.log('✅ JWT verification successful:', decoded.email);
        return decoded;
    } catch (error) {
        console.log('❌ JWT verification failed:', error.message);
        throw new Error('Invalid or expired token: ' + error.message);
    }
}

// Authentication middleware for Socket.IO
function authenticateSocket(socket, next) {
    console.log('🔐 Authentication attempt from:', socket.handshake.address);
    
    const token = socket.handshake.auth.token;
    console.log('🔍 Token received:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
        console.log('❌ No token provided');
        return next(new Error('Authentication token required'));
    }
    
    try {
        const decoded = verifySocketToken(token);
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.authenticated = true;
        
        console.log(`✅ Socket authenticated: ${decoded.email} (${socket.id})`);
        next();
    } catch (error) {
        console.log(`❌ Socket authentication failed: ${error.message}`);
        next(new Error('Authentication failed: ' + error.message));
    }
}

// Apply authentication middleware
io.use(authenticateSocket);

// Message history storage (in-memory fallback)
const messageHistory = new Map();
const activeChats = new Map();
const connectedUsers = new Map();

// Helper function to store message in history (using Redis Cloud service)
async function addToMessageHistory(userId, messageData) {
    // Try Redis Cloud service first
    const stored = await redisCloudService.storeMessage(userId, messageData);
    
    if (stored) {
        console.log(`💾 Message stored in Redis Cloud for user ${userId}`);
        return;
    }
    
    // Fallback to in-memory storage
    if (!messageHistory.has(userId)) {
        messageHistory.set(userId, []);
    }
    
    const history = messageHistory.get(userId);
    history.push(messageData);
    
    // Keep only last 100 messages per user
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }
    
    console.log(`📝 Message stored in memory for user ${userId}. Total messages: ${history.length}`);
}

// Helper function to cache response using Redis Cloud service
async function cacheResponse(query, response) {
    const cached = await redisCloudService.cacheResponse(query, response, {
        timestamp: new Date().toISOString(),
        cached: true
    });
    
    if (cached) {
        console.log(`💾 Response cached for query: "${query.substring(0, 50)}..."`);
        return true;
    }
    
    console.log('⚠️ Redis cache store failed, response not cached');
    return false;
}

// Helper function to get cached response using Redis Cloud service
async function getCachedResponse(query) {
    const cacheData = await redisCloudService.getCachedResponse(query);
    
    if (cacheData) {
        console.log(`🎯 Cache hit for query: "${query.substring(0, 50)}..."`);
        return cacheData;
    }
    
    return null;
}

// Helper function to get message history using Redis Cloud service
async function getMessageHistory(userId, limit = 20) {
    // Try Redis Cloud service first
    const history = await redisCloudService.getMessageHistory(userId, limit);
    
    if (history && history.length > 0) {
        console.log(`📜 Retrieved ${history.length} messages from Redis Cloud for user ${userId}`);
        return history;
    }
    
    // Fallback to in-memory storage
    const memoryHistory = messageHistory.get(userId) || [];
    const result = memoryHistory.slice(-limit);
    console.log(`📜 Retrieved ${result.length} messages from memory for user ${userId}`);
    return result;
}

// Full RAG AI processing function with caching
async function processMessageWithAI(messageData, socket) {
    try {
        const messageText = messageData.message;
        
        console.log(`🤖 Processing message: "${messageText}"`);
        
        // Step 1: Check Redis cache first
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'checking_cache',
            timestamp: new Date().toISOString(),
            message: 'Checking for cached responses...'
        });
        
        const cachedResponse = await getCachedResponse(messageText);
        if (cachedResponse) {
            console.log(`🎯 Using cached response for: "${messageText}"`);
            
            socket.emit('messageProcessing', {
                messageId: messageData.id,
                status: 'cache_found',
                timestamp: new Date().toISOString(),
                message: 'Found cached response! ⚡'
            });
            
            // Send cached response immediately
            const botResponse = {
                id: (Date.now() + 1).toString(),
                message: cachedResponse.response,
                sender: {
                    type: 'bot',
                    name: 'AI Assistant (Cached)',
                    userId: 'bot_cached'
                },
                timestamp: new Date().toISOString(),
                originalMessageId: messageData.id,
                room: messageData.room,
                metadata: {
                    confidence: { level: 'high', score: 0.95, reason: 'Cached response' },
                    contextUsed: 0,
                    cached: true,
                    processingTime: 50,
                    ragEnabled: true,
                    cacheTimestamp: cachedResponse.timestamp
                }
            };
            
            // Store bot response in history
            await addToMessageHistory(socket.userId, botResponse);
            
            // Send response to user
            socket.emit('chatbotResponse', botResponse);
            
            console.log(`⚡ Cached response sent to ${socket.userEmail} in 50ms`);
            return;
        }
        
        console.log(`🔍 No cache found, processing with RAG system...`);
        
        // Step 2: Get conversation history for context
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'loading_context',
            timestamp: new Date().toISOString(),
            message: 'Loading conversation context...'
        });
        
        const history = await getMessageHistory(socket.userId, 5);
        const formattedHistory = history.map(msg => ({
            role: msg.sender.type === 'user' ? 'user' : 'assistant',
            content: msg.message
        }));
        
        // Step 3: Process query with full RAG pipeline
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'searching_knowledge',
            timestamp: new Date().toISOString(),
            message: 'Searching knowledge base... 🔍'
        });
        
        const ragResult = await ragService.processQuery(messageText, {
            userId: socket.userId,
            category: messageData.category || null,
            conversationHistory: formattedHistory,
            useCache: false // We handle caching here
        });
        
        console.log(`✅ RAG processing completed:`, {
            confidence: ragResult.confidence.level,
            contextUsed: ragResult.contextUsed,
            processingTime: ragResult.processingTime
        });
        
        // Step 4: Generate response
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'generating_response',
            timestamp: new Date().toISOString(),
            message: 'Generating personalized response... 🤖'
        });
        
        // Step 5: Cache the response if it's good quality
        if (ragResult.confidence.level === 'high' || ragResult.confidence.level === 'medium') {
            await cacheResponse(messageText, ragResult.response);
        }
        
        // Step 6: Send AI response to user
        const botResponse = {
            id: (Date.now() + 1).toString(),
            message: ragResult.response,
            sender: {
                type: 'bot',
                name: 'AI Assistant',
                userId: 'bot_rag',
                model: ragResult.model
            },
            timestamp: new Date().toISOString(),
            originalMessageId: messageData.id,
            room: messageData.room,
            metadata: {
                confidence: ragResult.confidence,
                contextUsed: ragResult.contextUsed,
                contextSources: ragResult.contextSources || [],
                cached: false,
                processingTime: ragResult.processingTime,
                retrievalTime: ragResult.retrievalTime,
                generationTime: ragResult.generationTime,
                ragEnabled: true
            }
        };
        
        // Store bot response in history
        await addToMessageHistory(socket.userId, botResponse);
        
        // Send response to user
        socket.emit('chatbotResponse', botResponse);
        
        // Send confidence indicator
        socket.emit('responseConfidence', {
            messageId: messageData.id,
            confidence: ragResult.confidence,
            contextUsed: ragResult.contextUsed,
            sources: ragResult.contextSources,
            processingTime: ragResult.processingTime
        });
        
        console.log(`🎯 AI response sent to ${socket.userEmail} (confidence: ${ragResult.confidence.level})`);
        
    } catch (error) {
        console.error(`🚨 Error processing AI message from ${socket.userEmail}:`, error);
        
        // Send error status
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'error',
            timestamp: new Date().toISOString(),
            message: 'Processing failed. Please try again.'
        });
        
        // Send error response
        socket.emit('messageError', {
            error: 'Failed to process message with AI',
            message: error.message,
            code: 'AI_PROCESSING_ERROR',
            timestamp: new Date().toISOString()
        });
        
        // Send fallback response
        const fallbackResponse = {
            id: (Date.now() + 2).toString(),
            message: "I apologize, but I'm experiencing technical difficulties processing your question. Please try again or contact our support team directly for assistance.",
            sender: {
                type: 'bot',
                name: 'Support Assistant (Fallback)',
                userId: 'bot_fallback'
            },
            timestamp: new Date().toISOString(),
            originalMessageId: messageData.id,
            room: messageData.room,
            metadata: {
                confidence: { level: 'low', score: 0.1, reason: 'System error fallback' },
                contextUsed: 0,
                cached: false,
                processingTime: 100,
                ragEnabled: false,
                error: true
            }
        };
        
        socket.emit('chatbotResponse', fallbackResponse);
    }
}

io.on("connection", async (socket) => {
    console.log(`🔌 New authenticated connection: ${socket.userEmail} (${socket.id})`);
    
    // Store user connection
    connectedUsers.set(socket.userId, {
        socketId: socket.id,
        email: socket.userEmail,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0
    });
    
    // Initialize chat session
    activeChats.set(socket.userId, {
        sessionId: `session_${socket.userId}_${Date.now()}`,
        startedAt: new Date().toISOString(),
        messageCount: 0,
        lastMessageAt: null
    });
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Send welcome message
    socket.emit('authenticated', {
        success: true,
        message: 'Successfully connected and authenticated via JWT',
        user: {
            userId: socket.userId,
            email: socket.userEmail
        }
    });
    
    // Broadcast user count
    io.emit('userCount', {
        count: connectedUsers.size,
        timestamp: new Date().toISOString()
    });
    
    console.log(`✅ User session initialized for ${socket.userEmail}`);
    console.log(`👥 Total connected users: ${connectedUsers.size}`);
    
    // Handle customer support messages
    socket.on('sendMessage', async (data) => {
        try {
            console.log(`📨 Message received from ${socket.userEmail}:`, data);
            
            if (!data || !data.message || !data.message.trim()) {
                socket.emit('messageError', { 
                    error: 'Message cannot be empty',
                    code: 'EMPTY_MESSAGE',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            const messageText = data.message.trim();
            
            const messageData = {
                id: Date.now().toString(),
                message: messageText,
                sender: {
                    userId: socket.userId,
                    email: socket.userEmail,
                    type: 'user'
                },
                timestamp: new Date().toISOString(),
                room: data.room || 'general'
            };
            
            // Update user activity
            const userConnection = connectedUsers.get(socket.userId);
            if (userConnection) {
                userConnection.lastActivity = new Date().toISOString();
                userConnection.messageCount = (userConnection.messageCount || 0) + 1;
            }
            
            // Send acknowledgment
            socket.emit('messageSent', { 
                success: true, 
                messageId: messageData.id,
                timestamp: messageData.timestamp
            });
            
            // Send processing status
            socket.emit('messageProcessing', {
                messageId: messageData.id,
                status: 'processing',
                timestamp: new Date().toISOString(),
                message: 'Processing your question...'
            });
            
            // Broadcast message
            socket.broadcast.emit('newMessage', messageData);
            
            // Store message
            await addToMessageHistory(socket.userId, messageData);
            
            // Process message with full RAG system
            await processMessageWithAI(messageData, socket);
            
        } catch (error) {
            console.error(`🚨 Error processing message:`, error);
            socket.emit('messageError', {
                error: 'Failed to process message',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle joining rooms
    socket.on('joinRoom', (roomName) => {
        if (!roomName || typeof roomName !== 'string') {
            socket.emit('roomError', { error: 'Invalid room name' });
            return;
        }
        
        socket.join(roomName);
        socket.emit('roomJoined', { 
            room: roomName, 
            message: `Joined room: ${roomName}` 
        });
        
        socket.to(roomName).emit('userJoinedRoom', {
            user: socket.userEmail,
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🏠 ${socket.userEmail} joined room: ${roomName}`);
    });
    
    // Handle leaving rooms
    socket.on('leaveRoom', (roomName) => {
        socket.leave(roomName);
        socket.emit('roomLeft', { 
            room: roomName, 
            message: `Left room: ${roomName}` 
        });
        
        socket.to(roomName).emit('userLeftRoom', {
            user: socket.userEmail,
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🚪 ${socket.userEmail} left room: ${roomName}`);
    });
    
    // Handle ping/pong
    socket.on('ping', () => {
        const user = connectedUsers.get(socket.userId);
        if (user) {
            user.lastActivity = new Date().toISOString();
        }
        
        socket.emit('pong', { 
            timestamp: new Date().toISOString(),
            userId: socket.userId,
            sessionActive: true
        });
    });
    
    // Get message history
    socket.on('getMessageHistory', async (data) => {
        try {
            const limit = data?.limit || 20;
            const history = await getMessageHistory(socket.userId, limit);
            
            socket.emit('messageHistory', {
                success: true,
                messages: history,
                count: history.length,
                userId: socket.userId,
                timestamp: new Date().toISOString(),
                source: redisCloudService.isAvailable() ? 'redis-cloud' : 'memory'
            });
            
            console.log(`📜 Message history sent to ${socket.userEmail}: ${history.length} messages`);
            
        } catch (error) {
            console.error(`🚨 Error retrieving message history for ${socket.userEmail}:`, error);
            socket.emit('messageHistoryError', {
                error: 'Failed to retrieve message history',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`❌ User disconnected: ${socket.userEmail} - Reason: ${reason}`);
        
        connectedUsers.delete(socket.userId);
        activeChats.delete(socket.userId);
        
        io.emit('userCount', {
            count: connectedUsers.size,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🧹 Cleanup completed for ${socket.userEmail}. Remaining users: ${connectedUsers.size}`);
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error(`🚨 Socket error for ${socket.userEmail}:`, error);
        socket.emit('socketError', {
            error: 'Socket connection error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    });
});

// Handle authentication errors
io.engine.on("connection_error", (err) => {
    console.log(`❌ Connection error:`, err.req);
    console.log(`❌ Error code:`, err.code);
    console.log(`❌ Error message:`, err.message);
});

console.log(`🚀 Socket.IO server running on port ${SOCKET_PORT}`);
console.log('🔐 Authentication required for all connections');
console.log('📡 Waiting for authenticated connections...');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 CORS enabled for: ${corsOrigins.join(', ')}`);

// Export for testing
module.exports = { io, verifySocketToken };