# Start all services for local development - PowerShell version

param(
    [switch]$WithOllama,
    [switch]$PullModel
)

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

# Optionally start Ollama Docker container
if ($WithOllama) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker not found. Cannot start Ollama container." -ForegroundColor Red
    } else {
        $model = $env:OLLAMA_MODEL
        if (-not $model) { $model = 'llama3.2:1b' }

        Write-Host "🐳 Ensuring Ollama container is running..." -ForegroundColor Green
        try {
            $running = (docker ps --filter "name=ollama" --format "{{.Names}}") -join "`n"
        } catch {
            $running = ''
        }

        if ($running -and $running -match 'ollama') {
            Write-Host "✅ Ollama already running" -ForegroundColor Yellow
        } else {
            try {
                $exists = (docker ps -a --filter "name=ollama" --format "{{.Names}}") -join "`n"
            } catch {
                $exists = ''
            }

            if ($exists -and $exists -match 'ollama') {
                Write-Host "🔁 Starting existing Ollama container..." -ForegroundColor Yellow
                docker start ollama | Out-Null
            } else {
                Write-Host "⬇️  Pulling/starting Ollama container..." -ForegroundColor Yellow
                docker run -d --name ollama -p 11434:11434 ollama/ollama | Out-Null
            }

            Start-Sleep -Seconds 2
        }

            # Check if model is already available inside the container
            $modelFound = $false
            try {
                # list model directory contents (may be empty)
                $modelsList = docker exec ollama sh -c "ls /root/.ollama/models 2>/dev/null || true" 2>$null
            } catch {
                $modelsList = ""
            }

            if ($modelsList) {
                $candidates = @($model, ($model -replace ':','_'), ($model -replace ':','-'))
                foreach ($cand in $candidates) {
                    if ($modelsList -match [regex]::Escape($cand)) { $modelFound = $true; break }
                }
                # also check short name before colon
                if (-not $modelFound -and $model -match ':') {
                    $short = $model.Split(':')[0]
                    if ($modelsList -match [regex]::Escape($short)) { $modelFound = $true }
                }
            }

            if ($modelFound) {
                Write-Host "✅ Model $model already present in Ollama" -ForegroundColor Green
            } else {
                if ($PullModel) {
                    Write-Host "📥 Pulling model $model inside Ollama (this may take a while)..." -ForegroundColor Yellow
                    # non-interactive exec
                    docker exec ollama ollama pull $model | Out-Null
                    Write-Host "✅ Model pull (requested) complete." -ForegroundColor Green
                } else {
                    Write-Host "⚠️  Model $model not found in Ollama. Re-run with -PullModel to download it, or set OLLAMA_MODEL to an installed model." -ForegroundColor Yellow
                }
            }
    }
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
    # Use dev mode for agent-bridge so it auto-restarts on code changes
    # Ensure env defaults are set in parent so child job inherits them
    if (-not $env:LLM_URL) { $env:LLM_URL = 'http://localhost:11434' }
    if (-not $env:OLLAMA_MODEL) { $env:OLLAMA_MODEL = 'llama3.2:1b' }

    $jobs += Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev
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
