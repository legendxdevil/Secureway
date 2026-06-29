# SecureWay — Local Dev Launcher
# Runs both Fiber Go backend and Next.js frontend

Write-Host "🚀 Launching SecureWay Development Servers..." -ForegroundColor Cyan

# Resolve Go path
$GoPath = "go"
if (!(Get-Command go -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Go\bin\go.exe") {
        $GoPath = "C:\Program Files\Go\bin\go.exe"
    } else {
        Write-Host "⚠️ Go executable not found on path or C:\Program Files\Go\bin.exe. Trying default 'go'..." -ForegroundColor Yellow
    }
}

# 1. Start Go Backend
Write-Host "📦 Starting Fiber Go Backend on http://localhost:8080..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath $GoPath -ArgumentList "run", "main.go" -WorkingDirectory "backend" -PassThru -NoNewWindow

# 2. Start Next.js Frontend
Write-Host "🌐 Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "frontend" -PassThru -NoNewWindow

# Wait handler for exit signal
Write-Host "🟢 Both servers are running. Press Ctrl+C or close terminal to terminate." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n🛑 Stopping servers..." -ForegroundColor Red
    if ($BackendProcess) { Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($FrontendProcess) { Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "✅ Clean shutdown completed." -ForegroundColor Green
}
