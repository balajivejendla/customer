# Render Environment Variables Configuration

## 🚨 CRITICAL: Copy these EXACT values to Render Dashboard

When creating your Web Service on Render, go to **Environment** section and add these variables:

## 📋 Required Environment Variables

### 1. **Server Configuration** (CRITICAL - Render Specific)
```
NODE_ENV=production
PORT=10000
SOCKET_PORT=10000
```

### 2. **JWT Security** (CRITICAL - Generate New Secrets!)
```
JWT_SECRET=your-new-64-character-random-secret-for-production-use-crypto-random
JWT_REFRESH_SECRET=your-different-64-character-random-secret-for-refresh-tokens
```

**⚠️ IMPORTANT**: Generate new secrets for production:
```bash
# Run these commands to generate secure secrets:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. **Database Configuration** (Your Current Values)
```
MONGODB_URI=mongodb+srv://ecommerce_faq:Balaji90@chatbot.cvd1i2p.mongodb.net/ecommerce_faq?appName=Chatbot
MONGODB_DB_NAME=ecommerce_faq
FAQ_COLLECTION_NAME=faq_knowledge_base
```

### 4. **Google Gemini AI** (Your Current Values)
```
GOOGLE_API_KEY=AIzaSyCADdcipExIK1qDr2OxqlYQRez71tmBo4A
GEMINI_MODEL=gemini-pro
GOOGLE_EMBEDDING_MODEL=text-embedding-004
GOOGLE_EMBEDDING_DIMENSIONS=768
```

### 5. **CORS Configuration** (UPDATE with your frontend URL!)
```
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
```

**⚠️ IMPORTANT**: Replace `https://your-frontend-domain.com` with your actual frontend URL!

### 6. **Security Settings**
```
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 7. **RAG Configuration**
```
VECTOR_SEARCH_INDEX_NAME=vector_search_index
SIMILARITY_THRESHOLD_HIGH=0.85
SIMILARITY_THRESHOLD_LOW=0.75
MAX_RETRIEVAL_RESULTS=3
MAX_CONTEXT_LENGTH=4000
```

### 8. **Cache Configuration**
```
CACHE_MESSAGE_TTL=3600
CACHE_RESPONSE_TTL=86400
CACHE_SESSION_TTL=900
CACHE_USER_TTL=1800
```

## 🔧 Redis Configuration (Optional but Recommended)

### Option A: No Redis (Simplest - Start Here)
```
REDIS_ENABLED=false
```

### Option B: Redis Cloud (Free Tier Available)
If you want Redis for better performance:

1. **Sign up at [redis.com](https://redis.com)**
2. **Create a free database**
3. **Get connection details and add:**
```
REDIS_ENABLED=true
REDIS_CLOUD_HOST=your-redis-host.redis.cloud
REDIS_CLOUD_PORT=12345
REDIS_CLOUD_PASSWORD=your-redis-password
REDIS_CLOUD_USERNAME=default
REDIS_DB=0
```

### Option C: Render Redis (Paid - $7/month)
1. **Create Redis service in Render**
2. **Use internal connection details**

## 📝 Step-by-Step: Adding to Render

### 1. In Render Dashboard:
- Go to your Web Service
- Click **Environment** tab
- Click **Add Environment Variable**

### 2. Add Each Variable:
```
Key: NODE_ENV
Value: production

Key: PORT  
Value: 10000

Key: SOCKET_PORT
Value: 10000

Key: JWT_SECRET
Value: [your-generated-64-char-secret]

Key: JWT_REFRESH_SECRET  
Value: [your-other-generated-64-char-secret]

Key: MONGODB_URI
Value: mongodb+srv://ecommerce_faq:Balaji90@chatbot.cvd1i2p.mongodb.net/ecommerce_faq?appName=Chatbot

Key: MONGODB_DB_NAME
Value: ecommerce_faq

Key: FAQ_COLLECTION_NAME
Value: faq_knowledge_base

Key: GOOGLE_API_KEY
Value: AIzaSyCADdcipExIK1qDr2OxqlYQRez71tmBo4A

Key: GEMINI_MODEL
Value: gemini-pro

Key: GOOGLE_EMBEDDING_MODEL
Value: text-embedding-004

Key: GOOGLE_EMBEDDING_DIMENSIONS
Value: 768

Key: CORS_ORIGINS
Value: https://your-frontend-domain.com,http://localhost:5173

Key: BCRYPT_ROUNDS
Value: 12

Key: RATE_LIMIT_WINDOW_MS
Value: 900000

Key: RATE_LIMIT_MAX_REQUESTS
Value: 5

Key: VECTOR_SEARCH_INDEX_NAME
Value: vector_search_index

Key: SIMILARITY_THRESHOLD_HIGH
Value: 0.85

Key: SIMILARITY_THRESHOLD_LOW
Value: 0.75

Key: MAX_RETRIEVAL_RESULTS
Value: 3

Key: MAX_CONTEXT_LENGTH
Value: 4000

Key: CACHE_MESSAGE_TTL
Value: 3600

Key: CACHE_RESPONSE_TTL
Value: 86400

Key: CACHE_SESSION_TTL
Value: 900

Key: CACHE_USER_TTL
Value: 1800

Key: REDIS_ENABLED
Value: false
```

## 🔒 Security Checklist

- [ ] **Generate new JWT secrets** (don't use default ones!)
- [ ] **Update CORS_ORIGINS** with your actual frontend domain
- [ ] **Verify MongoDB URI** is correct
- [ ] **Confirm Google API key** is valid
- [ ] **Set NODE_ENV** to production
- [ ] **Use PORT=10000** (Render requirement)

## 🚨 Common Mistakes to Avoid

1. **❌ Using PORT=4000** → ✅ Must be PORT=10000
2. **❌ Keeping default JWT secrets** → ✅ Generate new ones
3. **❌ Wrong CORS_ORIGINS** → ✅ Use your actual frontend URL
4. **❌ Missing NODE_ENV=production** → ✅ Required for production mode
5. **❌ Forgetting SOCKET_PORT=10000** → ✅ Same as PORT on Render

## 🧪 Testing After Deployment

After adding all variables and deploying:

1. **Health Check**: Visit `https://your-app.onrender.com/health`
2. **Should return**: `{"status":"healthy",...}`
3. **Check logs** for any missing environment variable errors
4. **Test registration/login** from your frontend

## 🔄 If Something Goes Wrong

1. **Check Render logs** for error messages
2. **Verify all environment variables** are set correctly
3. **Ensure MongoDB Atlas** allows connections from anywhere (0.0.0.0/0)
4. **Confirm Google API key** has proper permissions
5. **Check CORS_ORIGINS** matches your frontend domain exactly

## 📞 Quick Reference

**Total Variables**: 25 (24 required + 1 optional Redis)
**Critical for Render**: PORT=10000, SOCKET_PORT=10000, NODE_ENV=production
**Must Change**: JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGINS

Your backend will work perfectly with these environment variables! 🚀