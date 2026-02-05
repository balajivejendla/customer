# Redis Setup for Windows
Write-Host "🔧 Setting up Redis for Windows..." -ForegroundColor Green
Write-Host ""

# Create Redis directory
$redisDir = "C:\Redis"
if (!(Test-Path $redisDir)) {
    New-Item -ItemType Directory -Path $redisDir -Force
    Write-Host "✅ Created Redis directory: $redisDir" -ForegroundColor Green
}

# Download Redis for Windows
$redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"
$zipPath = "$redisDir\redis.zip"

Write-Host "📥 Downloading Redis for Windows..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $redisUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Redis downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download Redis: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Please download manually from: $redisUrl" -ForegroundColor Yellow
    exit 1
}

# Extract Redis
Write-Host "📦 Extracting Redis..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipPath -DestinationPath $redisDir -Force
    Remove-Item $zipPath
    Write-Host "✅ Redis extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add Redis to PATH (for current session)
$env:PATH += ";$redisDir"

Write-Host ""
Write-Host "🎉 Redis setup completed!" -ForegroundColor Green
Write-Host "📍 Redis installed at: $redisDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 To start Redis:" -ForegroundColor Yellow
Write-Host "   cd $redisDir" -ForegroundColor White
Write-Host "   .\redis-server.exe" -ForegroundColor White
Write-Host ""
Write-Host "🧪 To test Redis:" -ForegroundColor Yellow
Write-Host "   .\redis-cli.exe ping" -ForegroundColor White
Write-Host ""

# Try to start Redis server
Write-Host "🚀 Starting Redis server..." -ForegroundColor Green
try {
    Set-Location $redisDir
    Start-Process -FilePath ".\redis-server.exe" -WindowStyle Normal
    Write-Host "✅ Redis server started!" -ForegroundColor Green
    Write-Host "🔗 Redis is running on localhost:6379" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ Could not auto-start Redis. Please start manually:" -ForegroundColor Yellow
    Write-Host "   cd $redisDir" -ForegroundColor White
    Write-Host "   .\redis-server.exe" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Setup complete! Redis is ready to use." -ForegroundColor Green