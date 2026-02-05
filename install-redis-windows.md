# 🔧 Install Redis on Windows

## Method 1: Using Chocolatey (Easiest)
```bash
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64

# Start Redis
redis-server
```

## Method 2: Using Docker (Recommended)
```bash
# Pull and run Redis container
docker run -d --name redis-server -p 6379:6379 redis:latest

# Check if running
docker ps | grep redis

# Stop Redis
docker stop redis-server

# Start Redis again
docker start redis-server
```

## Method 3: Manual Installation
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis`
3. Run `redis-server.exe`

## Test Redis Connection
```bash
# Test if Redis is running
redis-cli ping
# Should return: PONG
```