const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

console.log(`🚀 Starting TEST WebSocket server on port ${SOCKET_PORT}`);

// CORS Origins Configuration
const corsOrigins = [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:8080"
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

// Simplified authentication middleware
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

io.on("connection", (socket) => {
    console.log(`🔌 New authenticated connection: ${socket.userEmail} (${socket.id})`);
    
    // Send welcome message
    socket.emit('authenticated', {
        success: true,
        message: 'Successfully connected and authenticated',
        user: {
            userId: socket.userId,
            email: socket.userEmail
        }
    });
    
    // Handle test message
    socket.on('sendMessage', (data) => {
        console.log(`📨 Test message from ${socket.userEmail}:`, data.message);
        
        socket.emit('messageSent', { 
            success: true, 
            messageId: Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Send a test response
        setTimeout(() => {
            socket.emit('chatbotResponse', {
                id: Date.now(),
                message: `Test response to: ${data.message}`,
                sender: {
                    type: 'bot',
                    name: 'Test Bot'
                },
                timestamp: new Date().toISOString()
            });
        }, 1000);
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`❌ User disconnected: ${socket.userEmail} - Reason: ${reason}`);
    });
});

// Handle authentication errors
io.engine.on("connection_error", (err) => {
    console.log(`❌ Connection error:`, err.req?.url);
    console.log(`❌ Error code:`, err.code);
    console.log(`❌ Error message:`, err.message);
});

console.log(`🚀 TEST Socket.IO server running on port ${SOCKET_PORT}`);
console.log('🔐 Authentication required for all connections');
console.log('📡 Waiting for authenticated connections...');