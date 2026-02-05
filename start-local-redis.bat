@echo off
echo 🔧 Starting Local Redis Server...
echo.

REM Check if Redis is installed via Chocolatey
where redis-server >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Redis found via Chocolatey
    echo 🚀 Starting Redis server...
    redis-server
    goto :end
)

REM Check if Redis is installed manually
if exist "C:\Redis\redis-server.exe" (
    echo ✅ Redis found in C:\Redis
    echo 🚀 Starting Redis server...
    C:\Redis\redis-server.exe
    goto :end
)

REM Check if Docker is available
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Docker found, starting Redis container...
    docker run -d --name redis-local -p 6379:6379 redis:latest
    echo 🎯 Redis container started on port 6379
    goto :end
)

echo ❌ Redis not found!
echo.
echo 💡 Install Redis using one of these methods:
echo    1. Chocolatey: choco install redis-64
echo    2. Docker: docker run -d -p 6379:6379 redis:latest
echo    3. Manual: Download from https://github.com/microsoftarchive/redis/releases
echo.
pause

:end