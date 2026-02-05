@echo off
echo 🐳 Docker Setup Testing Script
echo ================================

echo.
echo 📊 Checking Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running or not installed
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo ✅ Docker is running

echo.
echo 🏗️ Building Docker image...
docker build -t backend-app .
if errorlevel 1 (
    echo ❌ Docker build failed
    pause
    exit /b 1
)
echo ✅ Docker image built successfully

echo.
echo 🚀 Starting services with Docker Compose...
docker-compose up -d
if errorlevel 1 (
    echo ❌ Docker Compose failed to start services
    pause
    exit /b 1
)
echo ✅ Services started

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo 🧪 Running setup tests...
docker-compose exec backend node test-docker-setup.js
if errorlevel 1 (
    echo ❌ Setup tests failed
    echo.
    echo 📋 Checking logs...
    docker-compose logs --tail=20
    pause
    exit /b 1
)

echo.
echo 🌐 Testing health endpoints...
echo Testing HTTP server...
curl -s http://localhost:4000/health
echo.
echo Testing WebSocket server...
curl -s http://localhost:3001/health

echo.
echo 📊 Service status:
docker-compose ps

echo.
echo 🎉 All tests completed successfully!
echo.
echo 📋 Useful commands:
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo   Restart services: docker-compose restart
echo.
echo Press any key to view real-time logs (Ctrl+C to exit)...
pause >nul
docker-compose logs -f