@echo off
echo 🚀 Starting Backend with Local Redis...
echo.

echo 📊 Step 1: Starting Redis Server...
start "Redis Server" cmd /k "node start-redis-server.js"

echo ⏳ Waiting for Redis to start...
timeout /t 3 /nobreak >nul

echo 📊 Step 2: Starting HTTP Server (Port 4000)...
start "HTTP Server" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo 📡 Step 3: Starting WebSocket Server (Port 3000)...
start "WebSocket Server" cmd /k "node sockets.js"

echo.
echo ✅ All servers are starting...
echo 🔗 Redis Server: localhost:6379
echo 🌐 HTTP Server: http://localhost:4000
echo 📡 WebSocket Server: ws://localhost:3001
echo.
echo 💡 To test the servers:
echo    node test-backend.js
echo.
echo 🛑 To stop all servers:
echo    Close all terminal windows or press Ctrl+C in each
echo.
pause