# Backend Deployment Guide

## What is Docker?

Docker is like a shipping container for your application. It packages your app with everything it needs to run (Node.js, dependencies, etc.) into a portable container that can run anywhere.

## Step 1: Prepare Your Application

### 1.1 Environment Variables
Your app needs these environment variables in production:

**Required:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `GOOGLE_API_KEY` - Your Google Gemini API key
- `JWT_SECRET` - A long, random secret key
- `JWT_REFRESH_SECRET` - Another long, random secret key

**Optional but Recommended:**
- `REDIS_CLOUD_HOST`, `REDIS_CLOUD_PORT`, `REDIS_CLOUD_PASSWORD` - For caching
- `CORS_ORIGINS` - Your frontend URL

### 1.2 Test Locally with Docker (REQUIRED!)

**Before deploying to production, you MUST test the Docker setup locally:**

#### Quick Test (Windows)
```bash
# Navigate to Backend directory
cd Backend

# Run the automated test script
./test-docker.bat
```

#### Manual Testing
```bash
# Build and start services
docker-compose up --build -d

# Test the setup
docker-compose exec backend node test-docker-setup.js

# View logs
docker-compose logs -f

# Stop services when done
docker-compose down
```

**What this tests:**
- Docker image builds correctly
- Redis connection works
- Environment variables are loaded
- Health endpoints respond
- WebSocket connections work

See `DOCKER_TESTING_GUIDE.md` for detailed testing instructions.

**⚠️ DO NOT DEPLOY until local Docker testing passes!**

## Step 2: Deploy to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Connect your GitHub repository

### 2.2 Create a New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select your backend folder/repository

### 2.3 Configure the Service

**Basic Settings:**
- **Name**: `your-app-backend`
- **Environment**: `Docker`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)

**Build & Deploy:**
- **Dockerfile Path**: `Backend/Dockerfile` (if backend is in a subfolder)
- **Docker Context Directory**: `Backend` (if backend is in a subfolder)

**Environment Variables:**
Add these in the Render dashboard:

```
NODE_ENV=production
PORT=4000
SOCKET_PORT=3001
JWT_SECRET=your-super-long-random-secret-key-here
JWT_REFRESH_SECRET=your-other-super-long-random-secret-key-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
GOOGLE_API_KEY=your-google-gemini-api-key
CORS_ORIGINS=https://your-frontend-domain.com
```

**Optional (for better performance):**
```
REDIS_ENABLED=true
REDIS_CLOUD_HOST=your-redis-host
REDIS_CLOUD_PORT=your-redis-port
REDIS_CLOUD_PASSWORD=your-redis-password
```

### 2.4 Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your Docker container
3. You'll get a URL like: `https://your-app-backend.onrender.com`

## Step 3: Update Frontend

Update your frontend to use the production backend URL:

```typescript
// In your frontend auth service or websocket service
const API_BASE_URL = 'https://your-app-backend.onrender.com';
const WS_URL = 'https://your-app-backend.onrender.com';
```

## Step 4: Test Your Deployment

1. **Health Check**: Visit `https://your-app-backend.onrender.com/health`
2. **API Test**: Try registering a user via your frontend
3. **WebSocket Test**: Try sending a message in the chat

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check the build logs in Render dashboard
2. **Environment Variables**: Make sure all required variables are set
3. **CORS Errors**: Update `CORS_ORIGINS` with your frontend URL
4. **Database Connection**: Verify MongoDB URI is correct
5. **Port Issues**: Render automatically handles ports, don't change PORT in env vars

### Logs:
- View logs in Render dashboard under "Logs" tab
- Look for startup messages and error messages

## Cost:
- Render free tier: $0/month (with limitations)
- Paid tier: $7/month (recommended for production)

## Security Notes:
- Never commit `.env` files to Git
- Use strong, unique JWT secrets
- Enable HTTPS (Render does this automatically)
- Consider using Redis for better performance