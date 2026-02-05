# Git Setup Instructions

## Issue
Permission denied when pushing to GitHub repository. This happens when:
- Using different GitHub accounts
- Need to authenticate with Personal Access Token
- SSH keys not configured

## Solution 1: Use Personal Access Token (Recommended)

### Step 1: Create Personal Access Token
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "Customer Backend Repo"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### Step 2: Push with Token
```bash
# Remove the current remote
git remote remove origin

# Add remote with your username and token
git remote add origin https://balajivejendla:YOUR_TOKEN_HERE@github.com/balajivejendla/customer.git

# Push to repository
git push -u origin main
```

## Solution 2: Use SSH (Alternative)

### Step 1: Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### Step 2: Add SSH Key to GitHub
1. Copy the public key: `cat ~/.ssh/id_ed25519.pub`
2. Go to GitHub → Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste the key and save

### Step 3: Use SSH Remote
```bash
git remote remove origin
git remote add origin git@github.com:balajivejendla/customer.git
git push -u origin main
```

## Solution 3: GitHub CLI (Easiest)

### Step 1: Install GitHub CLI
Download from: https://cli.github.com/

### Step 2: Authenticate
```bash
gh auth login
```

### Step 3: Push
```bash
git push -u origin main
```

## Current Repository Status

✅ Repository initialized
✅ All files committed (82 files)
✅ Branch set to main
✅ Remote added
❌ Push failed (authentication issue)

## What's Ready to Deploy

Your repository contains:
- ✅ Complete backend code
- ✅ Docker configuration
- ✅ Deployment guides
- ✅ Environment examples
- ✅ Testing scripts
- ✅ Documentation

Once you push successfully, you can immediately deploy to Render!

## Quick Commands After Authentication

```bash
# Verify remote
git remote -v

# Push to GitHub
git push -u origin main

# Verify on GitHub
# Go to https://github.com/balajivejendla/customer
```