@echo off
setlocal

cd /d "%~dp0"

:: Load environment variables from .env
if not exist ".env" (
    echo [error] .env file not found. Please copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

powershell -NoProfile -Command "Get-Content '.env' | ForEach-Object { if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') { [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }"

echo ==========================================
echo  Starting LifeRise Single Backend
echo ==========================================
echo.
echo  All roles (resident/vendor/manager)
echo  on a single port: http://localhost:8080
echo.

:: Build first if binary doesn't exist
if not exist "api.exe" (
    echo [build] api.exe not found, building...
    go build -o api.exe ./cmd/api
)

echo [start] Launching API on port 8080...
api.exe
