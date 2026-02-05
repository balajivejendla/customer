const jwt = require('jsonwebtoken');
const redis = require('redis');
const ragService = require('./rag.service');
const mongoDBService = require('./mongodb.service');
const embeddingService = require('./embedding.service');
const geminiService = require('./gemini.service');

// Load environment variables
require('dotenv').config();

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
const SOCKET_PORT = process.env.SOCKET_PORT || 3000;

console.log(`🚀 Starting WebSocket server in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`📊 Port: ${SOCKET_PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Redis client setup
let redisClient = null;
let isRedisConnected = false;

async function connectRedis() {
    try {
        redisClient = redis.createClient({
            host: 'localhost',
            port: 6379
        });
        
        redisClient.on('error', (err) => {
            console.log('⚠️ Redis connection error:', err.message);
            isRedisConnected = false;
        });
        
        redisClient.on('connect', () => {
            console.log('✅ Connected to local Redis');
            isRedisConnected = true;
        });
        
        await redisClient.connect();
    } catch (error) {
        console.log('⚠️ Redis not available, using in-memory storage');
        isRedisConnected = false;
    }
}

// Initialize Redis connection
connectRedis();

// CORS Origins Configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3001"
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
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'toxicity-api',
            audience: 'toxicity-client'
        });
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

// Authentication middleware for Socket.IO
function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return next(new Error('Authentication token required'));
        }
        
        const decoded = verifySocketToken(token);
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.authenticated = true;
        
        console.log(`✅ Socket authenticated: ${decoded.email} (${socket.id})`);
        next();
        
    } catch (error) {
        console.log(`❌ Socket authentication failed: ${error.message} (${socket.id})`);
        next(new Error('Authentication failed: ' + error.message));
    }
}

// Apply authentication middleware
io.use(authenticateSocket);

// Message history storage (Redis + in-memory fallback)
const messageHistory = new Map(); // Fallback for when Redis is unavailable
const activeChats = new Map(); // In-memory active chats
const connectedUsers = new Map(); // In-memory connected users

// Helper function to store message in history (Redis + fallback)
async function addToMessageHistory(userId, messageData) {
    // Try Redis first
    if (isRedisConnected && redisClient) {
        try {
            await redisClient.lPush(`msg_history:${userId}`, JSON.stringify(messageData));
            await redisClient.lTrim(`msg_history:${userId}`, 0, 99); // Keep only last 100 messages
            await redisClient.expire(`msg_history:${userId}`, 3600); // 1 hour expiry
            console.log(`💾 Message stored in Redis for user ${userId}`);
            return;
        } catch (error) {
            console.log('⚠️ Redis store failed, using memory');
        }
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

// Helper function to get message history (Redis + fallback)
async function getMessageHistory(userId, limit = 20) {
    // Try Redis first
    if (isRedisConnected && redisClient) {
        try {
            const messages = await redisClient.lRange(`msg_history:${userId}`, 0, limit - 1);
            if (messages.length > 0) {
                const history = messages.map(msg => JSON.parse(msg)).reverse();
                console.log(`📜 Retrieved ${history.length} messages from Redis for user ${userId}`);
                return history;
            }
        } catch (error) {
            console.log('⚠️ Redis retrieve failed, using memory');
        }
    }
    
    // Fallback to in-memory storage
    const history = messageHistory.get(userId) || [];
    const result = history.slice(-limit);
    console.log(`📜 Retrieved ${result.length} messages from memory for user ${userId}`);
    return result;
}

// Direct AI processing function with full RAG system
async function processMessageWithAI(messageData, socket) {
    try {
        const messageText = messageData.message;
        
        console.log(`🤖 Processing message with full RAG system: "${messageText}"`);
        
        // Get conversation history for context
        const history = await getMessageHistory(socket.userId, 5);
        const formattedHistory = history.map(msg => ({
            role: msg.sender.type === 'user' ? 'user' : 'assistant',
            content: msg.message
        }));
        
        // Process query with full RAG pipeline
        const ragResult = await ragService.processQuery(messageText, {
            userId: socket.userId,
            category: messageData.category || null,
            conversationHistory: formattedHistory,
            useCache: true
        });
        
        console.log(`✅ RAG processing completed:`, {
            confidence: ragResult.confidence.level,
            contextUsed: ragResult.contextUsed,
            cached: ragResult.cached,
            model: ragResult.model
        });
        
        // Send AI response to user
        const botResponse = {
            id: (Date.now() + 1).toString(),
            message: ragResult.response,
            sender: {
                type: 'bot',
                name: ragResult.cached ? 'AI Assistant (Cached)' : 'AI Assistant',
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
                cached: ragResult.cached,
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
    console.log(`🔐 JWT Authentication successful for user: ${socket.userId}`);
    
    // Store user connection with detailed info (in-memory for quick access)
    connectedUsers.set(socket.userId, {
        socketId: socket.id,
        email: socket.userEmail,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        sessionId: `session_${socket.userId}_${Date.now()}`
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
    
    // Send welcome message with authentication confirmation
    socket.emit('authenticated', {
        success: true,
        message: 'Successfully connected and authenticated via JWT',
        user: {
            userId: socket.userId,
            email: socket.userEmail
        },
        session: {
            sessionId: connectedUsers.get(socket.userId)?.sessionId,
            connectedAt: connectedUsers.get(socket.userId)?.connectedAt,
            isRestored: false
        },
        cache: {
            redisConnected: isRedisConnected,
            messageHistoryAvailable: true,
            responseCache: isRedisConnected
        },
        capabilities: [
            'sendMessage',
            'joinRoom',
            'leaveRoom',
            'getMessageHistory'
        ]
    });
    
    // Broadcast user count to all clients
    io.emit('userCount', {
        count: connectedUsers.size,
        timestamp: new Date().toISOString()
    });
    
    console.log(`✅ User session initialized for ${socket.userEmail}`);
    console.log(`👥 Total connected users: ${connectedUsers.size}`);
    
    // Handle customer support messages
    socket.on('sendMessage', async (data) => {
        try {
            console.log(`📨 Message received from ${socket.userEmail} (${socket.id}):`, data);
            
            // Validate message content
            if (!data || !data.message || !data.message.trim()) {
                socket.emit('messageError', { 
                    error: 'Message cannot be empty',
                    code: 'EMPTY_MESSAGE',
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ Empty message rejected from ${socket.userEmail}`);
                return;
            }
            
            const messageText = data.message.trim();
            
            // Create message object
            const messageData = {
                id: Date.now().toString(),
                message: messageText,
                sender: {
                    userId: socket.userId,
                    email: socket.userEmail,
                    type: 'user'
                },
                timestamp: new Date().toISOString(),
                room: data.room || 'general',
                messageId: data.messageId || Date.now().toString(),
                socketId: socket.id
            };
            
            // Update user activity stats
            const userConnection = connectedUsers.get(socket.userId);
            const chatSession = activeChats.get(socket.userId);
            
            if (userConnection) {
                userConnection.lastActivity = new Date().toISOString();
                userConnection.messageCount = (userConnection.messageCount || 0) + 1;
            }
            
            if (chatSession) {
                chatSession.messageCount += 1;
                chatSession.lastMessageAt = new Date().toISOString();
            }
            
            // Send immediate acknowledgment
            socket.emit('messageSent', { 
                success: true, 
                messageId: messageData.id,
                timestamp: messageData.timestamp,
                message: 'Message received successfully'
            });
            
            // Send processing status
            socket.emit('messageProcessing', {
                messageId: messageData.id,
                status: 'processing',
                timestamp: new Date().toISOString(),
                message: 'Processing your question...'
            });
            
            // Broadcast to room if specified
            if (data.room) {
                socket.to(data.room).emit('newMessage', messageData);
                console.log(`📢 Message broadcasted to room: ${data.room}`);
            } else {
                socket.broadcast.emit('newMessage', messageData);
                console.log(`📢 Message broadcasted to all users`);
            }
            
            // Store message in history
            await addToMessageHistory(socket.userId, messageData);
            
            // Generate simple AI response
            setTimeout(async () => {
                const botResponse = {
                    id: (Date.now() + 1).toString(),
                    message: generateSimpleResponse(messageText),
                    sender: {
                        type: 'bot',
                        name: 'Support Assistant',
                        userId: 'bot_simple'
                    },
                    timestamp: new Date().toISOString(),
                    originalMessageId: messageData.id,
                    room: messageData.room,
                    metadata: {
                        confidence: { level: 'medium', score: 0.7, reason: 'Simple response' },
                        contextUsed: 0,
                        cached: false,
                        processingTime: 1000,
                        ragEnabled: false
                    }
                };
                
                // Store bot response in history
                await addToMessageHistory(socket.userId, botResponse);
                
                // Send response to user
                socket.emit('chatbotResponse', botResponse);
                
                console.log(`🤖 Simple AI response sent to ${socket.userEmail}`);
            }, 1000); // 1 second delay to simulate processing
            
        } catch (error) {
            console.error(`🚨 Error processing message from ${socket.userEmail}:`, error);
            socket.emit('messageError', {
                error: 'Failed to process message',
                message: error.message,
                code: 'PROCESSING_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle joining specific rooms
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
        
        // Notify others in the room
        socket.to(roomName).emit('userJoinedRoom', {
            user: socket.userEmail,
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🏠 ${socket.userEmail} joined room: ${roomName}`);
    console.log(`👥 Total connected users: ${connectedUsers.size}`);
    
    // Handle customer support messages (direct processing)
    socket.on('sendMessage', async (data) => {
        try {
            console.log(`📨 Message received from ${socket.userEmail} (${socket.id}):`, data);
            
            // Validate message content
            if (!data || !data.message || !data.message.trim()) {
                socket.emit('messageError', { 
                    error: 'Message cannot be empty',
                    code: 'EMPTY_MESSAGE',
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ Empty message rejected from ${socket.userEmail}`);
                return;
            }
            
            const messageText = data.message.trim();
            
            // Create message object
            const messageData = {
                id: Date.now().toString(),
                message: messageText,
                sender: {
                    userId: socket.userId,
                    email: socket.userEmail,
                    type: 'user'
                },
                timestamp: new Date().toISOString(),
                room: data.room || 'general',
                messageId: data.messageId || Date.now().toString(),
                socketId: socket.id,
                requiresLLMResponse: data.requiresLLMResponse !== false
            };
            
            // Update user activity stats
            const userConnection = connectedUsers.get(socket.userId);
            const chatSession = activeChats.get(socket.userId);
            
            if (userConnection) {
                userConnection.lastActivity = new Date().toISOString();
                userConnection.messageCount = (userConnection.messageCount || 0) + 1;
            }
            
            if (chatSession) {
                chatSession.messageCount += 1;
                chatSession.lastMessageAt = new Date().toISOString();
            }
            
            // Send immediate acknowledgment
            socket.emit('messageSent', { 
                success: true, 
                messageId: messageData.id,
                timestamp: messageData.timestamp,
                message: 'Message received successfully'
            });
            
            // Send processing status
            socket.emit('messageProcessing', {
                messageId: messageData.id,
                status: 'processing',
                timestamp: new Date().toISOString(),
                message: 'Processing your question with AI...'
            });
            
            // Broadcast to room if specified
            if (data.room) {
                socket.to(data.room).emit('newMessage', messageData);
                console.log(`📢 Message broadcasted to room: ${data.room}`);
            } else {
                socket.broadcast.emit('newMessage', messageData);
                console.log(`📢 Message broadcasted to all users`);
            }
            
            // Store message in history
            await addToMessageHistory(socket.userId, messageData);
            
            // Generate simple AI response
            setTimeout(async () => {
                const botResponse = {
                    id: (Date.now() + 1).toString(),
                    message: generateSimpleResponse(messageText),
                    sender: {
                        type: 'bot',
                        name: 'Support Assistant',
                        userId: 'bot_simple'
                    },
                    timestamp: new Date().toISOString(),
                    originalMessageId: messageData.id,
                    room: messageData.room,
                    metadata: {
                        confidence: { level: 'medium', score: 0.7, reason: 'Simple response' },
                        contextUsed: 0,
                        cached: false,
                        processingTime: 1000,
                        ragEnabled: false
                    }
                };
                
                // Store bot response in history
                await addToMessageHistory(socket.userId, botResponse);
                
                // Send response to user
                socket.emit('chatbotResponse', botResponse);
                
                console.log(`🤖 Simple AI response sent to ${socket.userEmail}`);
            }, 1000); // 1 second delay to simulate processing
            
        } catch (error) {
            console.error(`🚨 Error processing message from ${socket.userEmail}:`, error);
            socket.emit('messageError', {
                error: 'Failed to process message',
                message: error.message,
                code: 'PROCESSING_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle joining specific rooms
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
        
        // Notify others in the room
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
        
        // Notify others in the room
        socket.to(roomName).emit('userLeftRoom', {
            user: socket.userEmail,
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🚪 ${socket.userEmail} left room: ${roomName}`);
    });
    
    // Get message history (Redis + fallback)
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
                source: isRedisConnected ? 'redis' : 'memory'
            });
            
            console.log(`📜 Message history sent to ${socket.userEmail}: ${history.length} messages (source: ${isRedisConnected ? 'Redis' : 'memory'})`);
            
        } catch (error) {
            console.error(`🚨 Error retrieving message history for ${socket.userEmail}:`, error);
            socket.emit('messageHistoryError', {
                error: 'Failed to retrieve message history',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
        // Update last activity
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
    
    // Handle disconnection (with Redis session cleanup)
    socket.on('disconnect', async (reason) => {
        console.log(`❌ User disconnected: ${socket.userEmail} (${socket.id}) - Reason: ${reason}`);
        
        // Get user stats before cleanup
        const userConnection = connectedUsers.get(socket.userId);
        const chatSession = activeChats.get(socket.userId);
        
        if (userConnection && chatSession) {
            const sessionDuration = Date.now() - new Date(userConnection.connectedAt).getTime();
            console.log(`📊 Session stats for ${socket.userEmail}:`, {
                duration: `${Math.round(sessionDuration / 1000)}s`,
                messagesExchanged: userConnection.messageCount || 0,
                sessionId: userConnection.sessionId || chatSession.sessionId
            });
        }
        
        // Clean up Redis session if available
        if (isRedisConnected && userConnection?.sessionId) {
            // Redis session cleanup would go here if implemented
        }
        
        // Remove from connected users and active chats
        connectedUsers.delete(socket.userId);
        activeChats.delete(socket.userId);
        
        // Broadcast updated user count
        const activeUserCount = connectedUsers.size;
            
        io.emit('userCount', {
            count: activeUserCount,
            timestamp: new Date().toISOString()
        });
        
        // Notify others about disconnection
        socket.broadcast.emit('userDisconnected', {
            user: socket.userEmail,
            userId: socket.userId,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🧹 Cleanup completed for ${socket.userEmail}. Remaining users: ${activeUserCount}`);
    });
    
    // Handle connection errors
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
    console.log(`❌ Error context:`, err.context);
});

// Periodic cleanup of stale connections
setInterval(() => {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    connectedUsers.forEach((user, userId) => {
        const socket = io.sockets.sockets.get(user.socketId);
        if (!socket || (now - new Date(user.connectedAt).getTime()) > staleThreshold) {
            connectedUsers.delete(userId);
            console.log(`🧹 Cleaned up stale connection for user: ${user.email}`);
        }
    });
}, 60000); // Run every minute

console.log(`🚀 Socket.IO server with JWT authentication running on port ${SOCKET_PORT}`);
console.log('🔐 Authentication required for all connections');
console.log('💾 Redis caching enabled for messages, sessions, and tokens');
console.log('📡 Waiting for authenticated connections...');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 CORS enabled for: ${corsOrigins.join(', ')}`);

// Export for testing
module.exports = { io, verifySocketToken };