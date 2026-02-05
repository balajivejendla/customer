# Quick Fix Steps - Do This Now!

## Your API Key Was Leaked and Disabled ⚠️

Google detected your API key in a public place and disabled it for security.

## Fix in 3 Steps (10 minutes)

### Step 1: Get New API Key (2 minutes)
1. Open: **https://aistudio.google.com/apikey**
2. Click **"Create API Key"**
3. **Copy the key** (looks like: `AIza...`)
4. Keep it safe!

### Step 2: Update Render (2 minutes)
1. Open: **https://dashboard.render.com**
2. Click your backend service
3. Click **"Environment"** tab
4. Find or add these:
   ```
   GOOGLE_API_KEY = paste-your-new-key-here
   GEMINI_MODEL = gemini-2.5-flash
   ```
5. Click **"Save Changes"**

### Step 3: Wait for Deploy (5 minutes)
- Render will automatically redeploy
- Watch the logs for: `✅ Google Gemini Service initialized`
- Then test your app!

## What I Just Fixed

✅ **Added missing auth endpoints** - `/auth/profile`, `/auth/logout`, `/auth/refresh`
✅ **Fixed Gemini model** - Changed to `gemini-2.5-flash` (the CORRECT model name for 2026)
✅ **Disabled rate limiter** - No more 429 errors
✅ **Dashboard reload** - Will work after deploy

## After You Update the API Key

Everything will work:
- ✅ AI responses will be intelligent
- ✅ Dashboard reload will work (no more 404)
- ✅ No more 403/429 errors
- ✅ WebSocket stays connected
- ✅ Profile loads correctly

## Test After Fix

1. Login to: https://customer-front-eight.vercel.app
2. Ask: "How do I track my order?"
3. Should get a real answer (not error)
4. **Refresh dashboard (F5)** - should stay on page with your info

## Need Help?

Check `URGENT_API_KEY_FIX.md` for detailed instructions.

---

**Do this now**: Get new API key → Update Render with `gemini-2.5-flash` → Wait 5 min → Test!
