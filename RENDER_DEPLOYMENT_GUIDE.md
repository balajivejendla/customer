# Complete Render Deployment Guide

## Step 1: Prepare Your Code for Deployment

### 1.1 Push to GitHub
Make sure all your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 1.2 Verify Required Files
Ensure these files are in your Backend directory:
- ✅ `Dockerfile`
- ✅ `docker-compose.yml` (for local testing)
- ✅ `package.json`
- ✅ `render.yaml` (optional, for infrastructure as code)
- ✅ All source files

## Step 2: Create Render Account and Service

### 2.1 Sign Up for Render
1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)
4. Connect your GitHub account

### 2.2 Create a New Web Service
1. Click "New +" in the top right
2. Select "Web Service"
3. Connect your GitHub repository
4. Select your repository from the list

## Step 3: Configure the Web Service

### 3.1 Basic Settings
- **Name**: `your-app-backend` (or any name you prefer)
- **Environment**: `Docker`
- **Region**: Choose closest to your users (e.g., Oregon, Ohio, Frankfurt)
- **Branch**: `main` (or your default branch)

### 3.2 Build Settings
- **Root Directory**: `Backend` (if your backend is in a subfolder)
- **Dockerfile Path**: `Backend/Dockerfile` (if backend is in subfolder)
- **Docker Context**: `Backend`

### 3.3 Instance Type
- **Free Tier**: $0/month (limited resources, spins down after 15 min of inactivity)
- **Starter**: $7/month (recommended for production, always on)

## Step 4: Environment Variables

### 4.1 Required Environment Variables
Add these in the Render dashboard under "Environment":

```env
NODE_ENV=production
PORT=10000
SOCKET_PORT=10000

# JWT Configuration
JWT_SECRET=your-super-long-random-secret-key-here-make-it-64-characters-long
JWT_REFRESH_SECRET=your-other-super-long-random-secret-key-different-from-above

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_DB_NAME=ecommerce_faq
FAQ_COLLECTION_NAME=faq_knowledge_base

# Google Gemini API
GOOGLE_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-pro
GOOGLE_EMBEDDING_MODEL=text-embedding-004
GOOGLE_EMBEDDING_DIMENSIONS=768

# CORS (Update with your frontend URL)
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:5173

# Redis (Optional - for better performance)
REDIS_ENABLED=true
REDIS_CLOUD_HOST=your-redis-host
REDIS_CLOUD_PORT=6379
REDIS_CLOUD_PASSWORD=your-redis-password

# RAG Configuration
VECTOR_SEARCH_INDEX_NAME=vector_search_index
SIMILARITY_THRESHOLD_HIGH=0.85
SIMILARITY_THRESHOLD_LOW=0.75
MAX_RETRIEVAL_RESULTS=3
MAX_CONTEXT_LENGTH=4000

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 4.2 Important Notes:
- **PORT**: Must be `10000` (Render's requirement)
- **SOCKET_PORT**: Also `10000` (both HTTP and WebSocket on same port in production)
- **JWT_SECRET**: Generate a strong 64+ character random string
- **CORS_ORIGINS**: Update with your actual frontend domain

## Step 5: Redis Setup (Optional but Recommended)

### Option A: Render Redis (Paid)
1. Create a new Redis service in Render
2. Use the connection details in your environment variables

### Option B: Redis Cloud (Free Tier Available)
1. Go to [redis.com](https://redis.com)
2. Create a free account
3. Create a new database
4. Get connection details and add to environment variables

### Option C: No Redis (Fallback)
Set `REDIS_ENABLED=false` - the app will use in-memory storage

## Step 6: Deploy

### 6.1 Start Deployment
1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Build the Docker image
   - Deploy the container
   - Assign a URL like `https://your-app-backend.onrender.com`

### 6.2 Monitor Deployment
- Watch the build logs in real-time
- Deployment typically takes 5-10 minutes
- Look for "Your service is live" message

## Step 7: Test Your Deployment

### 7.1 Health Check
Visit: `https://your-app-backend.onrender.com/health`
Should return: `{"status":"healthy",...}`

### 7.2 Test Registration
Use your frontend or Postman to test user registration

### 7.3 Test WebSocket
Your frontend should be able to connect to the WebSocket

## Step 8: Update Frontend Configuration

Update your frontend to use the production backend URL:

```typescript
// In your auth service or config file
const API_BASE_URL = 'https://your-app-backend.onrender.com';
const WS_URL = 'https://your-app-backend.onrender.com';
```

## Step 9: Custom Domain (Optional)

### 9.1 Add Custom Domain
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check build logs in Render dashboard
   - Verify Dockerfile syntax
   - Ensure all dependencies are in package.json

2. **Environment Variables**
   - Double-check all required variables are set
   - Verify MongoDB URI is correct
   - Ensure Google API key is valid

3. **CORS Errors**
   - Update `CORS_ORIGINS` with your frontend URL
   - Include both HTTP and HTTPS versions if needed

4. **WebSocket Connection Issues**
   - Ensure both PORT and SOCKET_PORT are set to 10000
   - Check that your frontend is using the correct WebSocket URL

5. **Database Connection**
   - Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
   - Check database credentials

### Viewing Logs:
- Go to your service in Render dashboard
- Click "Logs" tab
- Look for startup messages and errors

## Cost Breakdown:

### Free Tier:
- **Web Service**: $0/month (spins down after 15 min inactivity)
- **Limitations**: 750 hours/month, slower cold starts

### Paid Tier:
- **Web Service**: $7/month (always on, faster)
- **Redis**: $7/month (optional)
- **Total**: $7-14/month

## Security Checklist:

- ✅ Strong JWT secrets (64+ characters)
- ✅ HTTPS enabled (automatic with Render)
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Environment variables (not hardcoded secrets)
- ✅ MongoDB Atlas IP whitelist configured

## Next Steps After Deployment:

1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up CI/CD for automatic deployments
5. Monitor performance and logs

Your Docker setup is production-ready and will work perfectly on Render! 🚀