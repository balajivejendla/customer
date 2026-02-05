@echo off
echo 🚀 Starting Backend Servers...
echo.

echo 📊 Starting HTTP Server (Port 4000)...
start "HTTP Server" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo 📡 Starting WebSocket Server (Port 3000)...
start "WebSocket Server" cmd /k "node sockets.js"

echo.
echo ✅ Both servers are starting...
echo 🌐 HTTP Server: http://localhost:4000
echo 📡 WebSocket Server: ws://localhost:3000
echo.
echo 💡 To test the servers:
echo    - Health check: http://localhost:4000/health
echo    - Register user: POST http://localhost:4000/auth/register
echo    - Login user: POST http://localhost:4000/auth/login
echo.
pause