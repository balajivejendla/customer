@echo off
echo 🚀 Starting Clean WebSocket Server with Full RAG System...
echo.

echo 📊 Starting WebSocket Server (Port 3005)...
start "Clean WebSocket Server" cmd /k "node sockets-clean.js"

echo.
echo ✅ Clean WebSocket server is starting...
echo 📡 WebSocket Server: ws://localhost:3005
echo.
echo 💡 Features enabled:
echo    - JWT Authentication
echo    - Full RAG System with Vector Search
echo    - Gemini AI Integration
echo    - MongoDB Semantic Search
echo    - Redis Message History
echo    - Your Embedded FAQ Data
echo.
echo 🧪 To test the RAG system:
echo    node test-rag-system.js
echo.
pause