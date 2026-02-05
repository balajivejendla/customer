#!/usr/bin/env node
/**
 * Render Production Startup Script
 * Combines HTTP server and WebSocket server on the same port (10000)
 * This is required for Render deployment
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const redis = require('redis');

// Load environment variables
require('dotenv').config();

// Import services
const mongoDBService = require('./mongodb.service');
const ragService = require('./rag.service');
const embeddingService = require('./embedding.service');
const geminiService = require('./gemini.service');

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 10000; // Render requires port 10000

console.log(`🚀 Starting Combined Server for Render Deployment`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔧 Port: ${PORT} (Both HTTP and WebSocket)`);

// Express app setup
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [
    "https://your-frontend-domain.com",
    "http://localhost:5173",
    "http://localhost:3000"
];

app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - TEMPORARILY DISABLED due to 429 errors
// TODO: Re-enable with proper configuration after testing
/*
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return !req.headers['x-forwarded-for'];
    },
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.ip || 
               req.connection.remoteAddress || 
               'unknown';
    }
});

app.use('/auth', limiter);
*/

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';

// Redis setup
let redisClient = null;
let isRedisConnected = false;

async function connectRedis() {
    if (process.env.REDIS_ENABLED === 'true') {
        try {
            const redisHost = process.env.REDIS_CLOUD_HOST || 'localhost';
            const redisPort = process.env.REDIS_CLOUD_PORT || 6379;
            const redisPassword = process.env.REDIS_CLOUD_PASSWORD;
            
            console.log(`🔗 Connecting to Redis at ${redisHost}:${redisPort}`);
            
            const redisConfig = {
                host: redisHost,
                port: redisPort
            };
            
            if (redisPassword) {
                redisConfig.password = redisPassword;
            }
            
            redisClient = redis.createClient(redisConfig);
            
            redisClient.on('error', (err) => {
                console.log('⚠️ Redis connection error:', err.message);
                isRedisConnected = false;
            });
            
            redisClient.on('connect', () => {
                console.log('✅ Connected to Redis');
                isRedisConnected = true;
            });
            
            await redisClient.connect();
        } catch (error) {
            console.log('⚠️ Redis not available, using in-memory storage');
            isRedisConnected = false;
        }
    } else {
        console.log('📡 Redis disabled, using in-memory storage');
    }
}

// Initialize Redis
connectRedis();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        port: PORT,
        redis: isRedisConnected ? 'connected' : 'disconnected',
        services: {
            mongodb: mongoDBService.isConnected ? 'connected' : 'disconnected',
            redis: isRedisConnected ? 'connected' : 'disconnected'
        }
    });
});

// Auth routes (simplified - include your full auth logic here)
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Validate input
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        // Save user (implement your user saving logic)
        const user = {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            createdAt: new Date()
        };
        
        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user.email, email: user.email },
            JWT_SECRET,
            { expiresIn: '15m', issuer: 'toxicity-api', audience: 'toxicity-client' }
        );
        
        const refreshToken = jwt.sign(
            { userId: user.email, email: user.email },
            JWT_REFRESH_SECRET,
            { expiresIn: '7d', issuer: 'toxicity-api', audience: 'toxicity-client' }
        );
        
        res.json({
            success: true,
            message: 'User registered successfully',
            user: { 
                id: user.email,
                email: user.email, 
                name: `${user.firstName} ${user.lastName}`,
                firstName: user.firstName, 
                lastName: user.lastName 
            },
            accessToken,
            refreshToken
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Implement your user lookup and password verification logic here
        
        // Generate tokens
        const accessToken = jwt.sign(
            { userId: email, email: email },
            JWT_SECRET,
            { expiresIn: '15m', issuer: 'toxicity-api', audience: 'toxicity-client' }
        );
        
        const refreshToken = jwt.sign(
            { userId: email, email: email },
            JWT_REFRESH_SECRET,
            { expiresIn: '7d', issuer: 'toxicity-api', audience: 'toxicity-client' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            user: { 
                id: email,
                email,
                name: email
            },
            accessToken,
            refreshToken
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Socket.IO setup on the same server
const io = socketIo(server, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// JWT verification for Socket.IO
function verifySocketToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'toxicity-api',
            audience: 'toxicity-client'
        });
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token: ' + error.message);
    }
}

// Socket.IO authentication middleware
function authenticateSocket(socket, next) {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication token required'));
    }
    
    try {
        const decoded = verifySocketToken(token);
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.authenticated = true;
        next();
    } catch (error) {
        next(new Error('Authentication failed: ' + error.message));
    }
}

io.use(authenticateSocket);

// Message history storage (in-memory fallback)
const messageHistory = new Map();
const activeChats = new Map();
const connectedUsers = new Map();

// Helper function to store message in history
async function addToMessageHistory(userId, messageData) {
    if (!messageHistory.has(userId)) {
        messageHistory.set(userId, []);
    }
    
    const history = messageHistory.get(userId);
    history.push(messageData);
    
    // Keep only last 100 messages per user
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }
    
    console.log(`📝 Message stored for user ${userId}. Total messages: ${history.length}`);
}

// Helper function to get message history
async function getMessageHistory(userId, limit = 20) {
    const memoryHistory = messageHistory.get(userId) || [];
    const result = memoryHistory.slice(-limit);
    console.log(`📜 Retrieved ${result.length} messages for user ${userId}`);
    return result;
}

// Full RAG AI processing function
async function processMessageWithAI(messageData, socket) {
    try {
        const messageText = messageData.message;
        
        console.log(`🤖 Processing message with RAG: "${messageText}"`);
        
        // Step 1: Send processing status
        socket.emit('messageProcessing', {
            messageId: messageData.id,
            status: 'processing',
            timestamp: new Date().toISOString(),
            message: 'Processing your question...'
        });
        
        // Step 2: Get conversation history for context
        const history = await getMessageHistory(socket.userId, 5);
        const formattedHistory = history.map(msg => ({
            role: msg.sender.type === 'user' ? 'user' : 'assistant',
            content: msg.message
        }));
        
        // Step 3: Process query with RAG pipeline
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
            useCache: true
        });
        
        console.log(`✅ RAG processing completed:`, {
            confidence: ragResult.confidence.level,
            contextUsed: ragResult.contextUsed,
            processingTime: ragResult.processingTime
        });
        
        // Step 4: Send AI response to user
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
                cached: ragResult.cached || false,
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

// Socket.IO connection handling
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
    
    // Handle chat messages
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
                source: 'memory'
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

// Initialize services before starting server
async function initializeServices() {
    console.log('🔧 Initializing services...');
    
    try {
        // Initialize MongoDB
        console.log('📦 Connecting to MongoDB...');
        await mongoDBService.connect();
        console.log('✅ MongoDB connected');
        
        // Initialize RAG service
        console.log('🤖 Initializing RAG service...');
        await ragService.initialize();
        console.log('✅ RAG service initialized');
        
        // Initialize Redis
        await connectRedis();
        
        console.log('✅ All services initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Service initialization error:', error);
        console.log('⚠️ Server will start but some features may not work');
        return false;
    }
}

// Start the combined server
async function startServer() {
    // Initialize services first
    await initializeServices();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Combined HTTP + WebSocket Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
        console.log(`🔗 Server URL: http://localhost:${PORT}`);
        console.log(`🔌 WebSocket URL: ws://localhost:${PORT}`);
        console.log(`🔗 CORS enabled for: ${corsOrigins.join(', ')}`);
        console.log(`🎯 Ready for connections!`);
    });
}

// Start the server
startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    server.close(async () => {
        console.log('✅ Server closed');
        if (redisClient) {
            await redisClient.disconnect();
        }
        if (mongoDBService.isConnected) {
            await mongoDBService.disconnect();
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    server.close(async () => {
        console.log('✅ Server closed');
        if (redisClient) {
            await redisClient.disconnect();
        }
        if (mongoDBService.isConnected) {
            await mongoDBService.disconnect();
        }
        process.exit(0);
    });
});

module.exports = { app, server, io };