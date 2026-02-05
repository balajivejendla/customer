@echo off
echo Installing Redis for Windows...
echo.

REM Create Redis directory
if not exist "C:\Redis" mkdir "C:\Redis"

echo Downloading Redis...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip' -OutFile 'C:\Redis\redis.zip' -UseBasicParsing"

if not exist "C:\Redis\redis.zip" (
    echo Failed to download Redis
    echo Please download manually from: https://github.com/microsoftarchive/redis/releases
    pause
    exit /b 1
)

echo Extracting Redis...
powershell -Command "Expand-Archive -Path 'C:\Redis\redis.zip' -DestinationPath 'C:\Redis' -Force"
del "C:\Redis\redis.zip"

echo.
echo Redis installed successfully!
echo Location: C:\Redis
echo.
echo To start Redis server:
echo   cd C:\Redis
echo   redis-server.exe
echo.
echo To test Redis:
echo   redis-cli.exe ping
echo.

REM Try to start Redis
echo Starting Redis server...
cd /d "C:\Redis"
start "Redis Server" redis-server.exe

echo.
echo Redis server started in new window!
echo You can now run your backend servers.
echo.
pause