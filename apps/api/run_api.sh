#!/bin/bash
cd "$(dirname "$0")"

# Load environment variables from .env (set -a auto-exports everything)
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "[error] .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

exec ./api.exe
