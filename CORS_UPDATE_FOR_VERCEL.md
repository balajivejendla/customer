# CORS Update for Vercel Frontend

## 🌐 Your Deployed URLs

- **Frontend (Vercel)**: https://customer-front-eight.vercel.app
- **Backend (Render)**: https://customer-h9ow.onrender.com

## 🔧 CORS Configuration Update

Your backend needs to allow requests from your Vercel frontend.

### **Update CORS_ORIGINS on Render:**

1. **Go to your Render backend dashboard**
2. **Navigate to Environment Variables**
3. **Update CORS_ORIGINS to:**

```
CORS_ORIGINS=https://customer-front-eight.vercel.app,http://localhost:5173
```

### **Why This is Needed:**

CORS (Cross-Origin Resource Sharing) is a security feature that prevents unauthorized websites from accessing your API. By adding your Vercel URL to CORS_ORIGINS, you're telling your backend:

✅ "Allow requests from https://customer-front-eight.vercel.app"
✅ "Allow requests from http://localhost:5173 (for local development)"

### **After Updating:**

1. **Save the environment variable**
2. **Render will automatically redeploy** (or manually redeploy)
3. **Test your frontend** - Login/Register should now work!

## 🧪 Testing

After updating CORS:

1. **Visit**: https://customer-front-eight.vercel.app
2. **Try to register** a new account
3. **Try to login** with credentials
4. **Test chat functionality**
5. **Verify WebSocket connection**

## ✅ Expected Behavior

- ✅ **No CORS errors** in browser console
- ✅ **Login/Register works** with your backend
- ✅ **WebSocket connects** successfully
- ✅ **Chat messages** send and receive
- ✅ **AI responses** work properly

## 🚨 Common Issues

### **Still Getting CORS Errors?**

1. **Check the URL is exact** - No trailing slashes
2. **Verify Render redeployed** - Check deployment logs
3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
4. **Check browser console** - Look for specific error messages

### **WebSocket Not Connecting?**

1. **Verify CORS_ORIGINS** includes your Vercel URL
2. **Check environment variables** in Vercel (VITE_WS_URL)
3. **Look at browser console** for connection errors
4. **Check Render logs** for WebSocket connection attempts

## 🎯 Complete Environment Variables

### **Render Backend:**
```
CORS_ORIGINS=https://customer-front-eight.vercel.app,http://localhost:5173
```

### **Vercel Frontend:**
```
VITE_API_BASE_URL=https://customer-h9ow.onrender.com
VITE_WS_URL=https://customer-h9ow.onrender.com
```

Your full-stack application is now properly configured! 🚀