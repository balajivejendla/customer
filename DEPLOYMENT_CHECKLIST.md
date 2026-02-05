# Render Deployment Checklist

## Pre-Deployment ✅

- [x] Docker setup tested locally
- [x] All services working (HTTP, WebSocket, Redis, MongoDB)
- [x] Environment variables configured
- [x] Code pushed to GitHub
- [ ] Production environment variables prepared
- [ ] Frontend URLs identified for CORS

## Render Setup Steps

### 1. Create Render Account
- [ ] Sign up at [render.com](https://render.com)
- [ ] Connect GitHub account
- [ ] Verify email

### 2. Create Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Select your GitHub repository
- [ ] Choose correct branch (main)

### 3. Configure Service
- [ ] **Name**: Choose a good name (e.g., `my-app-backend`)
- [ ] **Environment**: Docker
- [ ] **Region**: Choose closest to users
- [ ] **Root Directory**: `Backend` (if in subfolder)
- [ ] **Plan**: Free (for testing) or Starter ($7/month for production)

### 4. Environment Variables (CRITICAL!)
Copy these and update with your actual values:

```env
NODE_ENV=production
PORT=10000
SOCKET_PORT=10000

JWT_SECRET=your-64-character-random-secret-here
JWT_REFRESH_SECRET=your-other-64-character-random-secret-here

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_DB_NAME=ecommerce_faq
FAQ_COLLECTION_NAME=faq_knowledge_base

GOOGLE_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-pro
GOOGLE_EMBEDDING_MODEL=text-embedding-004
GOOGLE_EMBEDDING_DIMENSIONS=768

CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:5173

REDIS_ENABLED=false

VECTOR_SEARCH_INDEX_NAME=vector_search_index
SIMILARITY_THRESHOLD_HIGH=0.85
SIMILARITY_THRESHOLD_LOW=0.75
MAX_RETRIEVAL_RESULTS=3
MAX_CONTEXT_LENGTH=4000

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 5. Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check for "Your service is live" message

## Post-Deployment Testing

### 6. Test Backend
- [ ] Visit `https://your-app-backend.onrender.com/health`
- [ ] Should return `{"status":"healthy"}`
- [ ] Check logs for any errors

### 7. Update Frontend
- [ ] Update frontend API URLs to use Render URL
- [ ] Test registration/login
- [ ] Test WebSocket connections
- [ ] Test chat functionality

### 8. Final Verification
- [ ] All features working
- [ ] No CORS errors
- [ ] WebSocket connections stable
- [ ] AI responses working
- [ ] Message history working

## Important Notes

### Port Configuration
- **Render requires PORT=10000**
- Both HTTP and WebSocket run on the same port in production
- Update your frontend to use the same URL for both HTTP and WebSocket

### JWT Secrets
Generate strong secrets:
```bash
# Generate random 64-character strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS Configuration
- Add your actual frontend domain to CORS_ORIGINS
- Include both HTTP and HTTPS if needed
- Keep localhost for development

### Free Tier Limitations
- Spins down after 15 minutes of inactivity
- Cold start delay (30-60 seconds)
- 750 hours/month limit
- Consider upgrading to Starter plan for production

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify Dockerfile is correct
- Ensure all files are pushed to GitHub

### Service Won't Start
- Check environment variables
- Verify MongoDB connection string
- Check Google API key validity

### CORS Errors
- Update CORS_ORIGINS with correct frontend URL
- Ensure no trailing slashes in URLs

### WebSocket Issues
- Verify both PORT and SOCKET_PORT are 10000
- Check frontend is using correct WebSocket URL
- Monitor connection logs

## Success Criteria ✅

- [ ] Backend health check returns 200 OK
- [ ] User registration works
- [ ] User login works
- [ ] WebSocket connections established
- [ ] Chat messages sent and received
- [ ] AI responses generated
- [ ] No console errors in frontend
- [ ] All features working as expected

## Next Steps After Success

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up automatic deployments
4. Monitor performance and costs
5. Consider upgrading to paid plan for production

Your Docker setup is ready for Render! 🚀