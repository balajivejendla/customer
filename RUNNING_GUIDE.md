# 🚀 Complete Running Guide - What Files to Run

## 🎯 Essential Files to Run

For your backend application to work properly, you need to run **2 main files**:

### **1. HTTP Server (Required)**
```bash
node server.js
```
- **Port**: 4000
- **Purpose**: Handles all API endpoints, JWT authentication, user management
- **Frontend needs this for**: Login, registration, profile management, API calls

### **2. WebSocket Server (Required for real-time features)**
```bash
node sockets.js
```
- **Port**: 3000
- **Purpose**: Real-time messaging, chat functionality, AI responses
- **Frontend needs this for**: Live chat, message history, AI conversations

## 🔧 External Services (Auto-Connected)

These services connect automatically when you run the servers:

### **3. Redis Cloud (Configured)**
- **Status**: ✅ Auto-connects to your Redis Cloud instance
- **Purpose**: Message history, user sessions, response caching
- **Configuration**: Already set in `.env` file

### **4. MongoDB Atlas (Configured)**
- **Status**: ✅ Auto-connects to your MongoDB Atlas
- **Purpose**: User data, FAQ storage, persistent data
- **Configuration**: Already set in `.env` file

### **5. Google Gemini AI (Configured)**
- **Status**: ✅ Auto-connects with your API key
- **Purpose**: AI responses, RAG system, intelligent chat
- **Configuration**: Already set in `.env` file

## 🚀 How to Start Your Application

### **Option 1: Run Both Servers Separately (Recommended for Development)**
```bash
# Terminal 1 - HTTP Server
node server.js

# Terminal 2 - WebSocket Server (new terminal)
node sockets.js
```

### **Option 2: Production Mode (Single Command)**
```bash
# Runs both servers automatically
npm start
```

### **Option 3: Development with Auto-Restart**
```bash
# Terminal 1 - HTTP Server with nodemon
npm run dev

# Terminal 2 - WebSocket Server
npm run socket
```

## ✅ Verification - What You Should See

### **When server.js starts successfully:**
```
🚀 JWT Authentication Server running on http://localhost:4000
🔐 JWT Authentication enabled
✅ Connected to MongoDB Atlas
📚 Database: ecommerce_faq
```

### **When sockets.js starts successfully:**
```
🚀 Socket.IO server with JWT authentication running on port 3000
🔐 Authentication required for all connections
💾 Redis caching enabled for messages, sessions, and tokens
📡 Waiting for authenticated connections...
✅ Connected to MongoDB Atlas
📊 FAQ documents in collection: 210
```

## 🌐 Frontend Connection Points

Your frontend should connect to:
- **HTTP API**: `http://localhost:4000`
- **WebSocket**: `http://localhost:3000`

## 📋 Complete Startup Checklist

### **Before Starting:**
- [ ] `.env` file exists with all required variables
- [ ] `npm install` has been run
- [ ] MongoDB Atlas connection string is correct
- [ ] Redis Cloud credentials are set
- [ ] Google Gemini API key is valid

### **Start Servers:**
- [ ] Run `node server.js` (Terminal 1)
- [ ] Run `node sockets.js` (Terminal 2)
- [ ] Verify both servers show "connected" messages
- [ ] Test API endpoint: `http://localhost:4000/health`

### **Frontend Integration:**
- [ ] Frontend connects to `http://localhost:4000` for API
- [ ] Frontend connects to `http://localhost:3000` for WebSocket
- [ ] JWT authentication working
- [ ] Real-time messaging working

## 🚨 Troubleshooting

### **If server.js fails to start:**
- Check MongoDB connection string in `.env`
- Verify port 4000 is not in use
- Run `npm install` to ensure dependencies

### **If sockets.js fails to start:**
- Check Redis Cloud credentials in `.env`
- Verify port 3000 is not in use
- Ensure `server.js` is running first (for shared services)

### **If services don't connect:**
- Check internet connection
- Verify API keys and connection strings
- Check firewall settings

## 🎯 Minimum Requirements for Basic Functionality

### **Essential (Must Run):**
- ✅ `server.js` - HTTP API server
- ✅ MongoDB Atlas - User data storage

### **Recommended (Full Features):**
- ✅ `sockets.js` - Real-time messaging
- ✅ Redis Cloud - Message history and caching
- ✅ Google Gemini AI - Intelligent responses

### **Optional (Enhanced Features):**
- ⚠️ All services running for optimal performance

## 🎉 Summary

**To run your complete application:**

1. **Start HTTP Server**: `node server.js` (Port 4000)
2. **Start WebSocket Server**: `node sockets.js` (Port 3000)
3. **External services connect automatically**
4. **Frontend connects to both servers**

**That's it!** Your backend will be fully functional with:
- JWT authentication
- Real-time messaging
- AI-powered responses
- Persistent data storage
- Message history
- User management

Your application is now ready for production use! 🚀