@echo off
cd /d "%~dp0"

:: Load environment variables from .env
if not exist ".env" (
    echo [error] .env file not found. Please copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

powershell -NoProfile -Command "Get-Content '.env' | ForEach-Object { if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') { [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }"

api.exe
