const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const redisCloudService = require('./redis-cloud.service');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

console.log(`🚀 Starting server on port ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Security Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

// In-memory storage
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

// Utility Functions
function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function createUser(email, password, name) {
    if (users.has(email)) {
        throw new Error('User already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = generateUserId();
    
    const user = {
        userId,
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };
    
    users.set(email, user);
    return user;
}

async function authenticateUser(email, password) {
    const user = users.get(email);
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }
    
    return user;
}

function getUserProfile(userId) {
    const user = Array.from(users.values()).find(u => u.userId === userId);
    if (!user) {
        throw new Error('User not found');
    }
    return {
        userId: user.userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
    };
}

// JWT Functions
async function generateTokens(userId, email) {
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
    
    // Store refresh token in Redis Cloud if available, otherwise in memory
    try {
        await redisCloudService.storeRefreshToken(refreshToken, userId, email);
    } catch (error) {
        console.log('⚠️ Redis store failed, using memory');
        refreshTokens.add(refreshToken);
    }
    
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

async function verifyRefreshToken(token) {
    try {
        // Check Redis Cloud first if available
        const tokenData = await redisCloudService.validateRefreshToken(token);
        if (tokenData) {
            return jwt.verify(token, JWT_REFRESH_SECRET, {
                issuer: 'toxicity-api',
                audience: 'toxicity-client'
            });
        }
        
        // Fall back to in-memory check
        if (!refreshTokens.has(token)) {
            throw new Error('Refresh token not found');
        }
        
        return jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'toxicity-api',
            audience: 'toxicity-client'
        });
    } catch (error) {
        // Clean up invalid token
        await redisCloudService.revokeRefreshToken(token);
        refreshTokens.delete(token);
        throw new Error('Invalid or expired refresh token');
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

// Routes

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
        
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        
        // Create user
        const user = await createUser(email, password, name);
        
        // Generate tokens
        const tokens = await generateTokens(user.userId, user.email);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.userId,
                email: user.email,
                name: user.name
            },
            tokens
        });
        
        console.log(`✅ User registered successfully: ${email}`);
        
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }
        
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
        
        // Authenticate user
        const user = await authenticateUser(email, password);
        
        // Generate tokens
        const tokens = await generateTokens(user.userId, user.email);
        
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
        
        if (error.message.includes('Invalid credentials')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required'
            });
        }
        
        // Verify refresh token
        const decoded = await verifyRefreshToken(refreshToken);
        
        // Remove old refresh token
        await redisCloudService.revokeRefreshToken(refreshToken);
        refreshTokens.delete(refreshToken);
        
        // Generate new tokens
        const tokens = await generateTokens(decoded.userId, decoded.email);
        
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            tokens
        });
        
        console.log(`✅ Tokens refreshed for: ${decoded.email}`);
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(403).json({
            success: false,
            error: error.message
        });
    }
});

// Logout endpoint
app.post('/auth/logout', authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        // Remove refresh token if provided
        if (refreshToken) {
            await redisCloudService.revokeRefreshToken(refreshToken);
            refreshTokens.delete(refreshToken);
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
        console.log(`✅ User logged out: ${req.user.email}`);
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// User profile endpoint
app.get('/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userProfile = getUserProfile(req.user.userId);
        
        res.json({
            success: true,
            user: userProfile
        });
        
    } catch (error) {
        console.error('❌ Profile error:', error.message);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
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
        services: {
            redis: redisCloudService.isAvailable(),
            users: users.size
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'JWT Authentication Server is running',
        endpoints: {
            'POST /auth/register': 'Register new user',
            'POST /auth/login': 'Login user',
            'POST /auth/refresh': 'Refresh access token',
            'POST /auth/logout': 'Logout user (requires auth)',
            'GET /auth/profile': 'Get user profile (requires auth)',
            'GET /auth/validate': 'Validate token (requires auth)',
            'GET /health': 'Health check'
        },
        services: {
            redis: redisCloudService.isAvailable() ? 'connected' : 'using in-memory storage',
            users: users.size
        }
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
    console.log(`🚀 JWT Authentication Server running on http://localhost:${PORT}`);
    console.log(`🔐 JWT Authentication enabled`);
    console.log(`📡 Redis: ${redisCloudService.isAvailable() ? 'Connected' : 'Using in-memory storage'}`);
    console.log(`🌐 CORS enabled for frontend connections`);
    console.log(`\n🎯 Ready for connections!`);
});

module.exports = { app, generateTokens, verifyAccessToken, verifyRefreshToken };