# Docker Testing Guide

This guide will help you test the Docker setup locally before deploying to production.

## Prerequisites

- Docker Desktop installed and running
- All environment variables configured in `.env.docker`

## Step 1: Build and Test Docker Setup

### 1.1 Build the Docker Image
```bash
# Navigate to Backend directory
cd Backend

# Build the Docker image
docker build -t backend-app .
```

### 1.2 Start Services with Docker Compose
```bash
# Start Redis and Backend services
docker-compose up -d

# Check if services are running
docker-compose ps
```

### 1.3 View Logs
```bash
# View all logs
docker-compose logs

# View backend logs only
docker-compose logs backend

# View Redis logs only
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f
```

## Step 2: Test the Setup

### 2.1 Run Docker Setup Test
```bash
# Test Redis connection and environment variables
docker-compose exec backend node test-docker-setup.js
```

### 2.2 Test Health Endpoints
```bash
# Test HTTP server health
curl http://localhost:4000/health

# Test WebSocket server (should show connection attempt)
curl http://localhost:3001/health
```

### 2.3 Test WebSocket Connection
Open `Backend/test-websocket.html` in your browser and test the WebSocket connection.

## Step 3: Troubleshooting

### 3.1 Common Issues

**Redis Connection Failed:**
```bash
# Check if Redis container is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection manually
docker-compose exec redis redis-cli ping
```

**Backend Won't Start:**
```bash
# Check backend logs
docker-compose logs backend

# Check if environment variables are loaded
docker-compose exec backend env | grep REDIS
```

**Port Conflicts:**
```bash
# Check if ports are already in use
netstat -an | findstr :4000
netstat -an | findstr :3001
netstat -an | findstr :6379
```

### 3.2 Reset Everything
```bash
# Stop all services
docker-compose down

# Remove volumes (this will delete Redis data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild and restart
docker-compose up --build -d
```

## Step 4: Production Readiness Checklist

- [ ] Docker image builds successfully
- [ ] Redis connection works in Docker
- [ ] Environment variables are properly loaded
- [ ] Health checks pass
- [ ] WebSocket connections work
- [ ] AI/RAG functionality works
- [ ] Message caching works
- [ ] No memory leaks during extended testing

## Step 5: Deploy to Render

Once local testing passes, you can deploy to Render:

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Use the `render.yaml` configuration
4. Set environment variables in Render dashboard
5. Deploy!

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View running containers
docker ps

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec redis redis-cli

# Monitor resource usage
docker stats

# Clean up unused Docker resources
docker system prune -a
```

## Environment Variables for Docker

Make sure your `.env.docker` file has:

```env
# Redis Configuration (Docker)
REDIS_ENABLED=true
REDIS_CLOUD_HOST=redis
REDIS_CLOUD_PORT=6379

# Server Configuration
PORT=4000
SOCKET_PORT=3001

# All other variables from .env file...
```

## Next Steps

After successful local testing:
1. Update production environment variables
2. Deploy to Render using the deployment guide
3. Monitor logs and performance
4. Set up monitoring and alerts