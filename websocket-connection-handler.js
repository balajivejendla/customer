// WebSocket Connection Handler with JWT Auto-Reconnection
// Use this in your frontend to handle WebSocket connections properly

class WebSocketManager {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 30000; // Max 30 seconds
        
        // Event handlers
        this.onConnected = null;
        this.onDisconnected = null;
        this.onMessage = null;
        this.onError = null;
        
        // Auto-connect on initialization
        this.connect();
    }
    
    // Get JWT token from localStorage, sessionStorage, or cookies
    getJWTToken() {
        // Try different storage locations
        let token = localStorage.getItem('accessToken') || 
                   localStorage.getItem('token') || 
                   sessionStorage.getItem('accessToken') || 
                   sessionStorage.getItem('token');
        
        // If token has 'Bearer ' prefix, remove it
        if (token && token.startsWith('Bearer ')) {
            token = token.substring(7);
        }
        
        console.log('🔑 JWT Token found:', token ? 'Yes' : 'No');
        return token;
    }
    
    // Check if JWT token is expired
    isTokenExpired(token) {
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp && payload.exp < currentTime) {
                console.log('⚠️ JWT token is expired');
                return true;
            }
            
            console.log('✅ JWT token is valid');
            return false;
        } catch (error) {
            console.log('❌ Invalid JWT token format');
            return true;
        }
    }
    
    // Refresh JWT token if needed
    async refreshTokenIfNeeded() {
        const token = this.getJWTToken();
        
        if (!token || this.isTokenExpired(token)) {
            console.log('🔄 Token expired or missing, attempting refresh...');
            
            const refreshToken = localStorage.getItem('refreshToken') || 
                               sessionStorage.getItem('refreshToken');
            
            if (refreshToken) {
                try {
                    const response = await fetch('http://localhost:4000/auth/refresh', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ refreshToken })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        localStorage.setItem('accessToken', data.tokens.accessToken);
                        localStorage.setItem('refreshToken', data.tokens.refreshToken);
                        console.log('✅ Token refreshed successfully');
                        return data.tokens.accessToken;
                    } else {
                        console.log('❌ Token refresh failed');
                        this.handleAuthFailure();
                        return null;
                    }
                } catch (error) {
                    console.log('❌ Token refresh error:', error.message);
                    this.handleAuthFailure();
                    return null;
                }
            } else {
                console.log('❌ No refresh token available');
                this.handleAuthFailure();
                return null;
            }
        }
        
        return token;
    }
    
    // Handle authentication failure
    handleAuthFailure() {
        console.log('🚨 Authentication failed - redirecting to login');
        
        // Clear all tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        
        // Redirect to login page or emit event
        if (this.onError) {
            this.onError('AUTHENTICATION_FAILED', 'Please log in again');
        }
        
        // You can uncomment this to auto-redirect to login
        // window.location.href = '/login';
    }
    
    // Connect to WebSocket with JWT authentication
    async connect() {
        if (this.isConnecting || this.isConnected) {
            console.log('⚠️ Already connecting or connected');
            return;
        }
        
        this.isConnecting = true;
        console.log('🔌 Attempting WebSocket connection...');
        
        try {
            // Get or refresh JWT token
            const token = await this.refreshTokenIfNeeded();
            
            if (!token) {
                console.log('❌ No valid token available');
                this.isConnecting = false;
                return;
            }
            
            // Import socket.io-client
            const { io } = await import('socket.io-client');
            
            // Create socket connection with JWT authentication
            this.socket = io(this.serverUrl, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: false // We handle reconnection manually
            });
            
            // Set up event handlers
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('❌ WebSocket connection error:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }
    
    // Set up WebSocket event handlers
    setupEventHandlers() {
        if (!this.socket) return;
        
        // Connection successful
        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay
            
            if (this.onConnected) {
                this.onConnected();
            }
        });
        
        // Authentication successful
        this.socket.on('authenticated', (data) => {
            console.log('🔐 WebSocket authenticated:', data);
        });
        
        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error.message);
            this.isConnected = false;
            this.isConnecting = false;
            
            if (error.message.includes('Authentication') || error.message.includes('token')) {
                console.log('🔑 Authentication error - token may be invalid');
                this.handleAuthFailure();
            } else {
                this.scheduleReconnect();
            }
            
            if (this.onError) {
                this.onError('CONNECTION_ERROR', error.message);
            }
        });
        
        // Disconnection
        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            this.isConnected = false;
            
            if (this.onDisconnected) {
                this.onDisconnected(reason);
            }
            
            // Auto-reconnect unless it was intentional
            if (reason !== 'io client disconnect') {
                this.scheduleReconnect();
            }
        });
        
        // Message received
        this.socket.on('chatbotResponse', (data) => {
            console.log('💬 Message received:', data);
            if (this.onMessage) {
                this.onMessage(data);
            }
        });
        
        // Other events
        this.socket.on('messageError', (error) => {
            console.error('❌ Message error:', error);
            if (this.onError) {
                this.onError('MESSAGE_ERROR', error.message);
            }
        });
        
        this.socket.on('messageHistory', (data) => {
            console.log('📜 Message history received:', data);
        });
    }
    
    // Schedule reconnection with exponential backoff
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
            if (this.onError) {
                this.onError('MAX_RECONNECT_ATTEMPTS', 'Unable to reconnect to server');
            }
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }
    
    // Send message
    sendMessage(message, room = 'general') {
        if (!this.isConnected || !this.socket) {
            console.log('❌ WebSocket not connected');
            if (this.onError) {
                this.onError('NOT_CONNECTED', 'WebSocket is not connected');
            }
            return false;
        }
        
        this.socket.emit('sendMessage', {
            message: message,
            room: room,
            timestamp: new Date().toISOString()
        });
        
        console.log('📤 Message sent:', message);
        return true;
    }
    
    // Get message history
    getMessageHistory(limit = 20) {
        if (!this.isConnected || !this.socket) {
            console.log('❌ WebSocket not connected');
            return false;
        }
        
        this.socket.emit('getMessageHistory', { limit });
        return true;
    }
    
    // Disconnect
    disconnect() {
        if (this.socket) {
            console.log('👋 Disconnecting WebSocket');
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.isConnecting = false;
    }
    
    // Reconnect manually
    reconnect() {
        console.log('🔄 Manual reconnection requested');
        this.disconnect();
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.connect();
    }
    
    // Check connection status
    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }
}

// Usage example:
/*
const wsManager = new WebSocketManager('http://localhost:3001');

// Set event handlers
wsManager.onConnected = () => {
    console.log('Connected to WebSocket!');
    // Update UI to show connected status
};

wsManager.onDisconnected = (reason) => {
    console.log('Disconnected:', reason);
    // Update UI to show disconnected status
};

wsManager.onMessage = (data) => {
    console.log('New message:', data);
    // Display message in chat UI
};

wsManager.onError = (type, message) => {
    console.error('WebSocket error:', type, message);
    // Show error to user
};

// Send a message
wsManager.sendMessage('Hello, how long does shipping take?');

// Get message history
wsManager.getMessageHistory(10);
*/

// Export for use in your application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketManager;
} else if (typeof window !== 'undefined') {
    window.WebSocketManager = WebSocketManager;
}