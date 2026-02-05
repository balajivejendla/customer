@echo off
echo Adding Redis to system PATH...

REM Add Redis to current session PATH
set PATH=%PATH%;C:\Redis

REM Add Redis to user PATH permanently
setx PATH "%PATH%;C:\Redis"

echo.
echo ✅ Redis added to PATH!
echo.
echo Now you can run Redis from anywhere using:
echo   redis-server
echo   redis-cli
echo.
echo ⚠️  You may need to restart your terminal for changes to take effect.
echo.
pause