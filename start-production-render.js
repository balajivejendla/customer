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

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/auth', limiter);

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

// Socket.IO connection handling
io.on("connection", async (socket) => {
    console.log(`🔌 New authenticated connection: ${socket.userEmail} (${socket.id})`);
    
    socket.emit('authenticated', {
        success: true,
        message: 'Successfully connected and authenticated via JWT',
        user: {
            userId: socket.userId,
            email: socket.userEmail
        }
    });
    
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
            
            // Send acknowledgment
            socket.emit('messageSent', { 
                success: true, 
                messageId: messageData.id,
                timestamp: messageData.timestamp
            });
            
            // Process with AI (implement your RAG logic here)
            // For now, send a simple response
            const botResponse = {
                id: (Date.now() + 1).toString(),
                message: `Thank you for your message: "${messageText}". Our AI system is processing your request.`,
                sender: {
                    type: 'bot',
                    name: 'AI Assistant',
                    userId: 'bot_ai'
                },
                timestamp: new Date().toISOString(),
                originalMessageId: messageData.id,
                room: messageData.room
            };
            
            socket.emit('chatbotResponse', botResponse);
            
        } catch (error) {
            console.error(`🚨 Error processing message:`, error);
            socket.emit('messageError', {
                error: 'Failed to process message',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`❌ User disconnected: ${socket.userEmail} - Reason: ${reason}`);
    });
});

// Start the combined server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Combined HTTP + WebSocket Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🔗 Server URL: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket URL: ws://localhost:${PORT}`);
    console.log(`🔗 CORS enabled for: ${corsOrigins.join(', ')}`);
    console.log(`🎯 Ready for connections!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        if (redisClient) {
            redisClient.disconnect();
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        if (redisClient) {
            redisClient.disconnect();
        }
        process.exit(0);
    });
});

module.exports = { app, server, io };