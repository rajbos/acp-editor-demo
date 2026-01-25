# Start all services for local development - PowerShell version

Write-Host "🚀 Starting ACP Editor - Local Development Mode" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed. Please install Node.js and npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Store job objects for cleanup
$jobs = @()

# Function to cleanup on exit
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Shutting down services..." -ForegroundColor Yellow
    foreach ($job in $jobs) {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -ErrorAction SilentlyContinue
    }
    exit 0
}

# Register cleanup on Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

try {
    # Start services in background
    Write-Host ""
    Write-Host "📡 Starting local WebSocket broker..." -ForegroundColor Green
    Set-Location packages\tools
    npm install --silent | Out-Null
    $jobs += Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run broker
    }
    Set-Location ..\..

    Start-Sleep -Seconds 2

    Write-Host "🤖 Starting agent bridge..." -ForegroundColor Green
    Set-Location packages\agent-bridge
    npm install --silent | Out-Null
    $jobs += Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm start
    }
    Set-Location ..\..

    Start-Sleep -Seconds 2

    Write-Host "🌐 Starting client server..." -ForegroundColor Green
    Set-Location packages\client
    npm install --silent | Out-Null
    $jobs += Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev
    }
    Set-Location ..\..

    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "✅ All services started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Open your browser to: " -NoNewline
    Write-Host "http://localhost:3000/?thread=test123" -ForegroundColor Cyan
    Write-Host "💡 Open the same URL in another tab to test collaboration" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    Write-Host ""

    # Monitor jobs and display output
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
            if ($output) {
                Write-Host $output
            }
        }
        Start-Sleep -Milliseconds 500
        
        # Check if any job has failed
        $failedJobs = $jobs | Where-Object { $_.State -eq 'Failed' }
        if ($failedJobs) {
            Write-Host "❌ One or more services failed. Check the output above." -ForegroundColor Red
            break
        }
    }
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
finally {
    Cleanup
}
