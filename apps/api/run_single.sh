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
echo -e "${GREEN}  Starting LifeRise Single Backend${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "  All roles (resident/vendor/manager)"
echo -e "  on a single port: ${BLUE}http://localhost:8080${NC}"
echo ""

# Build first if binary doesn't exist
if [ ! -f "./api" ]; then
    echo -e "${YELLOW}[build]${NC} api binary not found, building..."
    go build -o api ./cmd/api
fi

echo -e "${GREEN}[start]${NC} Launching API on port 8080..."
exec ./api
