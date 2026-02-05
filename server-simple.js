const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

console.log('🚀 Starting simplified backend server...');
console.log(`📊 Port: ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Security Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

// In-memory storage (for testing without MongoDB)
const users = new Map();
const refreshTokens = new Set();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:5173', 
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// JWT Utility Functions
function generateTokens(userId, email) {
    const payload = { userId, email };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'toxicity-api',
        audience: 'toxicity-client'
    });
    
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'toxicity-api',
        audience: 'toxicity-client'
    });
    
    refreshTokens.add(refreshToken);
    
    return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'toxicity-api',
            audience: 'toxicity-client'
        });
    } catch (error) {
        throw new Error('Invalid or expired access token');
    }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'TOKEN_MISSING'
        });
    }
    
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            error: error.message,
            code: 'TOKEN_INVALID'
        });
    }
}

// Generate unique user ID
function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Authentication Routes

// Register endpoint
app.post('/auth/register', authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        console.log(`📝 Registration attempt for: ${email}`);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        if (users.has(email)) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = generateUserId();
        
        // Store user
        users.set(email, {
            userId,
            email,
            name: name || email.split('@')[0],
            password: hashedPassword,
            createdAt: new Date().toISOString()
        });
        
        // Generate tokens
        const tokens = generateTokens(userId, email);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: userId,
                email: email,
                name: name || email.split('@')[0]
            },
            tokens
        });
        
        console.log(`✅ User registered successfully: ${email}`);
        
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// Login endpoint
app.post('/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`🔐 Login attempt for: ${email}`);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        // Generate tokens
        const tokens = generateTokens(user.userId, user.email);
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.userId,
                email: user.email,
                name: user.name
            },
            tokens
        });
        
        console.log(`✅ User logged in successfully: ${email}`);
        
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// User profile endpoint
app.get('/auth/profile', authenticateToken, (req, res) => {
    try {
        const user = Array.from(users.values()).find(u => u.userId === req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Profile error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile'
        });
    }
});

// Validate token endpoint
app.get('/auth/validate', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            userId: req.user.userId,
            email: req.user.email
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users: users.size,
        mode: 'simplified'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Simplified Backend Server is running',
        version: '1.0.0',
        endpoints: {
            'POST /auth/register': 'Register new user',
            'POST /auth/login': 'Login user',
            'GET /auth/profile': 'Get user profile (requires auth)',
            'GET /auth/validate': 'Validate token (requires auth)',
            'GET /health': 'Health check'
        },
        features: [
            'JWT Authentication',
            'In-memory user storage',
            'CORS enabled',
            'Rate limiting',
            'Security headers'
        ],
        note: 'This is a simplified version without MongoDB, Redis, or WebSocket dependencies'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Simplified Backend Server running on http://localhost:${PORT}`);
    console.log(`🔐 JWT Authentication enabled`);
    console.log(`👥 In-memory user storage active`);
    console.log(`🌐 CORS enabled for frontend connections`);
    console.log(`🛡️  Security middleware active`);
    console.log(`\n🎯 Ready for frontend connections!`);
    console.log(`📋 Test with: curl http://localhost:${PORT}/health`);
});

module.exports = app;