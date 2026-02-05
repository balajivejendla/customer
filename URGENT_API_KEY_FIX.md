# URGENT: API Key Leaked - Immediate Action Required

## Critical Issue
Your Google Gemini API key has been **reported as leaked** and disabled by Google:
```
[403 Forbidden] Your API key was reported as leaked. Please use another API key.
```

## Immediate Actions Required

### Step 1: Get New API Key (5 minutes)

1. **Go to Google AI Studio**: https://aistudio.google.com/apikey
2. **Delete the old leaked key** (if visible)
3. **Click "Create API Key"**
4. **Copy the new key** immediately
5. **Store it securely** - DO NOT commit to GitHub!

### Step 2: Update Render Environment Variables

1. Go to: https://dashboard.render.com
2. Select your backend service
3. Go to "Environment" tab
4. Update these variables:

```env
GOOGLE_API_KEY=your-new-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

5. Click "Save Changes"
6. Render will auto-redeploy

### Step 3: Update Local Environment (DO NOT COMMIT)

Update `Backend/.env` with your new key:
```env
GOOGLE_API_KEY=your-new-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

**IMPORTANT**: Never commit `.env` files to GitHub!

## Additional Fixes Needed

### Fix 1: Disable Rate Limiting Temporarily

The rate limiter is too aggressive (429 errors). I'll disable it temporarily.

### Fix 2: Fix Dashboard Reload

The dashboard redirects to login on refresh due to 429 rate limit errors preventing profile fetch.

## Security Best Practices

### Prevent Future Leaks

1. **Never commit API keys** to GitHub
2. **Use environment variables** only
3. **Add to .gitignore**:
   ```
   .env
   .env.local
   .env.production
   ```
4. **Rotate keys regularly**
5. **Use API key restrictions** in Google Cloud Console

### Restrict Your API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your API key
3. Click "Edit"
4. Under "API restrictions":
   - Select "Restrict key"
   - Enable only: "Generative Language API"
5. Under "Application restrictions":
   - Add your Render backend URL
6. Save

## Why This Happened

Your API key was likely exposed in:
- GitHub commit history
- Public repository
- Browser DevTools (if logged)
- Shared code/screenshots

## Testing After Fix

### Test 1: Verify New Key Works
```bash
curl -X POST \
  https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_NEW_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

Should return a response (not 403).

### Test 2: Check Backend Logs
After Render redeploys, check logs for:
```
✅ Google Gemini Service initialized
🤖 Model: gemini-1.5-flash
```

### Test 3: Test AI Responses
1. Login to your app
2. Ask: "How do I track my order?"
3. Should get intelligent response (not error)

## Current Issues Summary

1. ❌ **API Key Leaked** - Need new key
2. ❌ **Still using gemini-pro** - Need to set GEMINI_MODEL on Render
3. ❌ **Rate limiting too aggressive** - Causing 429 errors
4. ❌ **Dashboard reload fails** - Due to rate limit on /auth/profile

## Expected Timeline

- **Get new API key**: 2 minutes
- **Update Render**: 1 minute
- **Render redeploy**: 3-5 minutes
- **Total**: ~10 minutes

## After Fix Checklist

- [ ] New API key created
- [ ] Old key deleted from Google AI Studio
- [ ] GOOGLE_API_KEY updated on Render
- [ ] GEMINI_MODEL=gemini-1.5-flash set on Render
- [ ] Render deployment successful
- [ ] Backend logs show correct model
- [ ] AI responses working
- [ ] No 403 errors
- [ ] No 429 errors
- [ ] Dashboard reload works

---

**Priority**: CRITICAL
**Status**: Awaiting new API key
**Next Step**: Get new API key from https://aistudio.google.com/apikey
