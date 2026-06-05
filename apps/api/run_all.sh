#!/bin/bash
set -e

cd "$(dirname "$0")"

# Load environment variables from .env (set -a auto-exports everything)
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Starting LifeRise Backend Services${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "  ${BLUE}API${NC}        (residents)  -> http://localhost:8080"
echo -e "  ${BLUE}Vendor API${NC} (vendors)    -> http://localhost:8081"
echo -e "  ${BLUE}Admin API${NC}  (managers)   -> http://localhost:8082"
echo ""

# Build first if binaries don't exist
if [ ! -f "./api" ]; then
    echo -e "${YELLOW}[build]${NC} api binary not found, building..."
    go build -o api ./cmd/api
fi
if [ ! -f "./vendor-api" ]; then
    echo -e "${YELLOW}[build]${NC} vendor-api binary not found, building..."
    go build -o vendor-api ./cmd/vendor-api
fi
if [ ! -f "./admin-api" ]; then
    echo -e "${YELLOW}[build]${NC} admin-api binary not found, building..."
    go build -o admin-api ./cmd/admin-api
fi

# Cleanup function to kill all background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}[shutdown] Stopping all services...${NC}"
    kill $API_PID $VENDOR_PID $ADMIN_PID 2>/dev/null || true
    wait $API_PID $VENDOR_PID $ADMIN_PID 2>/dev/null || true
    echo -e "${GREEN}[shutdown] All services stopped.${NC}"
    exit 0
}
trap cleanup INT TERM EXIT

# Start all three services
echo -e "${GREEN}[start]${NC} Launching API on port 8080..."
./api &
API_PID=$!

echo -e "${GREEN}[start]${NC} Launching Vendor API on port 8081..."
./vendor-api &
VENDOR_PID=$!

echo -e "${GREEN}[start]${NC} Launching Admin API on port 8082..."
./admin-api &
ADMIN_PID=$!

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  All services started!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Wait for any process to exit
wait $API_PID $VENDOR_PID $ADMIN_PID
