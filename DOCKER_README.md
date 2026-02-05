# 🐳 Docker Setup

## 🚀 **Quick Start**

### **Local Development with Docker:**
```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run

# Test the Docker setup
npm run docker:test
```

### **Using Docker Compose:**
```bash
# Start all services (backend + Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📋 **Prerequisites**

- ✅ Docker Desktop installed and running
- ✅ `.env` file with required environment variables
- ✅ All dependencies in `package.json`

## 🔧 **Configuration**

### **Environment Variables:**
Copy `.env.example` to `.env` and update:
```bash
cp .env.example .env
# Edit .env with your values
```

### **Required Variables:**
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret  
- `GOOGLE_API_KEY` - Google AI API key
- `MONGODB_URI` - MongoDB connection string

## 🧪 **Testing**

### **Health Check:**
```bash
curl http://localhost:4000/health
```

### **WebSocket Test:**
```bash
# In browser console:
const socket = io('ws://localhost:3000');
```

## 📊 **Container Details**

- **Base Image:** `node:18-alpine`
- **Exposed Ports:** 3000 (WebSocket), 4000 (HTTP)
- **Health Check:** `/health` endpoint
- **User:** Non-root `nodejs` user
- **Working Directory:** `/app`

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **Docker not running:**
```bash
# Start Docker Desktop
# Or on Linux:
sudo systemctl start docker
```

#### **Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :4000
netstat -tulpn | grep :3000

# Kill processes if needed
sudo kill -9 <PID>
```

#### **Environment variables missing:**
```bash
# Check .env file exists
ls -la .env

# Verify required variables are set
cat .env | grep -E "(JWT_SECRET|GOOGLE_API_KEY|MONGODB_URI)"
```

## 🚀 **Deployment**

This Docker configuration is optimized for:
- ✅ **Render** - Web services
- ✅ **Railway** - Container deployment  
- ✅ **Google Cloud Run** - Serverless containers
- ✅ **AWS ECS** - Container orchestration
- ✅ **DigitalOcean App Platform** - PaaS deployment

## 📈 **Production Optimizations**

- ✅ Multi-stage builds (if needed)
- ✅ Non-root user for security
- ✅ Health checks for monitoring
- ✅ Proper signal handling
- ✅ Minimal attack surface
- ✅ Production dependencies only