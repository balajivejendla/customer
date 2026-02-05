# Docker Commands for Local Testing

## Option 1: Run Individual Containers

### Step 1: Navigate to Backend folder
```bash
cd Backend
```

### Step 2: Run Redis container first
```bash
docker run -d --name redis-server -p 6379:6379 redis:7-alpine
```

### Step 3: Build your backend image
```bash
docker build -t my-backend-app .
```

### Step 4: Run your backend container
```bash
docker run -p 4000:4000 -p 3001:3001 --env-file .env my-backend-app
```

## Option 2: Use Docker Compose (Recommended)

### Step 1: Start both Redis and Backend together
```bash
docker-compose up --build
```

### Step 2: Run in background (detached mode)
```bash
docker-compose up -d --build
```

### Step 3: View logs
```bash
docker-compose logs -f
```

### Step 4: Stop all services
```bash
docker-compose down
```

### Step 5: Stop and remove volumes (clean slate)
```bash
docker-compose down -v
```

## Redis-specific Commands

### Connect to Redis container
```bash
docker exec -it redis-server redis-cli
```

### Check Redis is working
```bash
docker exec redis-server redis-cli ping
```

### View Redis logs
```bash
docker logs redis-server
```

### Stop Redis container
```bash
docker stop redis-server
docker rm redis-server
```

## Step 4: Test the application
- API: http://localhost:4000
- Health check: http://localhost:4000/health
- WebSocket: ws://localhost:3001
- Redis: localhost:6379

## Useful Docker commands:

### View running containers
```bash
docker ps
```

### Stop a container
```bash
docker stop <container-id>
```

### View container logs
```bash
docker logs <container-id>
```

### Remove the image (if you want to rebuild)
```bash
docker rmi my-backend-app
```

### Run container in background (detached mode)
```bash
docker run -d -p 4000:4000 -p 3001:3001 --env-file .env my-backend-app
```

### Run container with a custom name
```bash
docker run --name my-backend -p 4000:4000 -p 3001:3001 --env-file .env my-backend-app
```