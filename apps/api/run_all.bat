@echo off
setlocal

cd /d "%~dp0"

:: Load environment variables from .env (PowerShell parse, ignores comments/blank lines)
if not exist ".env" (
    echo [error] .env file not found. Please copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

powershell -NoProfile -Command "Get-Content '.env' | ForEach-Object { if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') { [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }"

echo ==========================================
echo  Starting LifeRise Backend Services
echo ==========================================
echo.
echo  API        (residents)  -> http://localhost:8080
echo  Vendor API (vendors)    -> http://localhost:8081
echo  Admin API  (managers)   -> http://localhost:8082
echo.

:: Build first if binaries don't exist
if not exist "api.exe" (
    echo [build] api.exe not found, building...
    go build -o api.exe ./cmd/api
)
if not exist "vendor-api.exe" (
    echo [build] vendor-api.exe not found, building...
    go build -o vendor-api.exe ./cmd/vendor-api
)
if not exist "admin-api.exe" (
    echo [build] admin-api.exe not found, building...
    go build -o admin-api.exe ./cmd/admin-api
)

:: Start all three services in separate windows
echo [start] Launching API on port 8080...
start "LifeRise API (8080)" cmd /k "api.exe"

echo [start] Launching Vendor API on port 8081...
start "LifeRise Vendor API (8081)" cmd /k "vendor-api.exe"

echo [start] Launching Admin API on port 8082...
start "LifeRise Admin API (8082)" cmd /k "admin-api.exe"

echo.
echo ==========================================
echo  All services started!
echo ==========================================
echo.
echo  Press any key to close this window.
echo  (The services will keep running.)
pause >nul
