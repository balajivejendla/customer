# 📁 Backend Project Structure

## 🎯 Essential Backend Files

### 🚀 Core Server Files
- **`server.js`** - Main HTTP server with JWT authentication, user management, and API endpoints
- **`sockets.js`** - WebSocket server with real-time messaging and JWT authentication
- **`start-production.js`** - Production startup script that runs both HTTP and WebSocket servers

### 🔧 Service Layer
- **`user.service.js`** - MongoDB user management with authentication, profiles, and CRUD operations
- **`queue.service.js`** - Bull Queue system for message processing, LLM tasks, and background jobs
- **`queue.processors.js`** - Queue job processors for handling different types of background tasks
- **`queue.dashboard.js`** - Queue monitoring and management dashboard
- **`redis.service.js`** - Redis caching service for sessions, tokens, and message history
- **`mongodb.service.js`** - MongoDB connection and database management
- **`rag.service.js`** - RAG (Retrieval-Augmented Generation) system for intelligent responses
- **`gemini.service.js`** - Google Gemini AI integration with model iteration and caching
- **`embedding.service.js`** - Text embedding service for semantic search
- **`simple-faq.service.js`** - Simple FAQ matching system as fallback for RAG

### 🐳 Deployment & Configuration
- **`Dockerfile`** - Docker container configuration
- **`docker-compose.yml`** - Multi-service Docker setup
- **`.dockerignore`** - Docker build exclusions
- **`render.yaml`** - Render.com deployment configuration
- **`healthcheck.js`** - Health check endpoint for Docker
- **`.env`** - Environment variables (production)
- **`.env.example`** - Environment variables template

### 📦 Dependencies
- **`package.json`** - Node.js dependencies and scripts
- **`package-lock.json`** - Locked dependency versions

## 📚 Documentation Files

### 📖 Main Documentation
- **`COMPLETE_SETUP_GUIDE.md`** - Comprehensive setup instructions
- **`API_REFERENCE.md`** - Complete API documentation
- **`SYSTEM_OVERVIEW.md`** - System architecture and components overview
- **`COMPLETE_BACKEND_DOCUMENTATION.md`** - Technical implementation details

### 📋 Specialized Guides
- **`DEPLOYMENT_GUIDE.md`** - Production deployment instructions
- **`DOCKER_README.md`** - Docker setup and usage
- **`QUEUE_SYSTEM.md`** - Message queue system documentation
- **`USER_MANAGEMENT.md`** - User authentication and management guide

## 🗂️ Directory Structure

```
Backend/
├── 📄 Core Server Files
│   ├── server.js                    # Main HTTP server
│   ├── sockets.js                   # WebSocket server
│   └── start-production.js          # Production startup
│
├── 🔧 Services
│   ├── user.service.js              # User management
│   ├── queue.service.js             # Message queues
│   ├── queue.processors.js          # Queue processors
│   ├── queue.dashboard.js           # Queue monitoring
│   ├── redis.service.js             # Redis caching
│   ├── mongodb.service.js           # MongoDB connection
│   ├── rag.service.js               # RAG system
│   ├── gemini.service.js            # AI integration
│   ├── embedding.service.js         # Text embeddings
│   └── simple-faq.service.js        # FAQ fallback
│
├── 🐳 Deployment
│   ├── Dockerfile                   # Container config
│   ├── docker-compose.yml           # Multi-service setup
│   ├── render.yaml                  # Render deployment
│   ├── healthcheck.js               # Health monitoring
│   ├── .env                         # Environment vars
│   └── .env.example                 # Env template
│
├── 📦 Dependencies
│   ├── package.json                 # Node.js config
│   └── package-lock.json            # Locked versions
│
└── 📚 Documentation
    ├── COMPLETE_SETUP_GUIDE.md      # Setup instructions
    ├── API_REFERENCE.md             # API documentation
    ├── SYSTEM_OVERVIEW.md           # Architecture overview
    ├── DEPLOYMENT_GUIDE.md          # Deployment guide
    ├── DOCKER_README.md             # Docker guide
    ├── QUEUE_SYSTEM.md              # Queue documentation
    └── USER_MANAGEMENT.md           # User guide
```

## 🚀 Quick Start Commands

```bash
# Development
npm run start:dev          # Start HTTP server only
npm run start:socket       # Start WebSocket server only
npm run dev               # Start with nodemon

# Production
npm start                 # Start both servers in production mode

# Docker
npm run docker:build      # Build Docker image
npm run docker:run        # Run Docker container
```

## 🎯 Key Features

### ✅ Authentication & Security
- JWT token-based authentication
- Refresh token rotation
- Rate limiting and security headers
- Password hashing with bcrypt

### ✅ Real-time Communication
- WebSocket server with Socket.IO
- JWT authentication for WebSocket connections
- Message history and session management
- Room-based messaging

### ✅ Database & Caching
- MongoDB for persistent user storage
- Redis for caching and session management
- Automatic fallback to in-memory storage

### ✅ Message Processing
- Bull Queue system for background jobs
- Priority-based message processing
- Automatic retries and error handling
- Queue monitoring dashboard

### ✅ AI Integration
- Google Gemini AI for intelligent responses
- RAG system for context-aware answers
- Model iteration with caching
- Simple FAQ fallback system

### ✅ Production Ready
- Docker containerization
- Health check endpoints
- Environment-based configuration
- Comprehensive error handling
- Logging and monitoring

## 🔧 Environment Variables

See `.env.example` for all required environment variables including:
- Database connections (MongoDB, Redis)
- JWT secrets and configuration
- Google AI API keys
- CORS origins and security settings
- Queue and caching configuration

## 📊 System Architecture

The backend follows a microservices-inspired architecture with:
- **HTTP Server** (port 4000) - REST API and authentication
- **WebSocket Server** (port 3000) - Real-time messaging
- **Queue System** - Background job processing
- **Caching Layer** - Redis for performance
- **Database Layer** - MongoDB for persistence
- **AI Services** - Gemini integration with RAG

All services are designed to be fault-tolerant with graceful fallbacks when external dependencies are unavailable.