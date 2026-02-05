// Minimal server for testing - runs without external dependencies
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

console.log('🚀 Starting minimal server for testing...');

// Basic middleware
app.use(cors());
app.use(express.json());

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// In-memory user storage for testing
const users = new Map();
const refreshTokens = new Set();

// Test endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Minimal server is running!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'minimal',
        timestamp: new Date().toISOString()
    });
});

// Simple auth test
app.post('/auth/test-register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        if (users.has(email)) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        users.set(email, { email, password: hashedPassword });
        
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            success: true,
            message: 'User registered successfully',
            token,
            user: { email }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Simple login test
app.post('/auth/test-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { email }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Minimal server running on http://localhost:${PORT}`);
    console.log('🔗 Test endpoints:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   POST http://localhost:${PORT}/auth/test-register`);
    console.log(`   POST http://localhost:${PORT}/auth/test-login`);
    console.log('\n💡 If this works, the issue is with service dependencies in server.js');
});

module.exports = app;