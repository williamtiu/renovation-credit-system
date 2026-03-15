#!/bin/bash

set -e

echo "======================================================="
echo "   Starting DecoFinance"
echo "======================================================="

# Go to script directory
cd "$(dirname "$0")"

# Check and activate virtual environment
if [ -f ".venv/bin/activate" ]; then
    echo "[INFO] Activating virtual environment (.venv)..."
    source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    echo "[INFO] Activating virtual environment (venv)..."
    source venv/bin/activate
else
    echo "[WARN] Virtual environment not found. Using system Python."
    echo "       (Tip: Run 'python3 -m venv .venv' to create one)"
fi

NEW_UI_DIR="DecoFinance Project Overview"
NEED_BUILD=0

if [ -f "$NEW_UI_DIR/package.json" ]; then
    if [ "${FORCE_NEW_UI_BUILD:-0}" = "1" ]; then
        NEED_BUILD=1
    fi
    if [ ! -f "$NEW_UI_DIR/dist/index.html" ]; then
        NEED_BUILD=1
    fi

    if [ "${SKIP_NEW_UI_BUILD:-0}" != "1" ]; then
        if [ "$NEED_BUILD" = "1" ]; then
            echo "[INFO] Building New UI for /new-ui ..."
            pushd "$NEW_UI_DIR" >/dev/null
            npm install
            npm run build
            popd >/dev/null
        else
            echo "[INFO] Existing New UI build found. Skipping build."
        fi
    else
        echo "[INFO] SKIP_NEW_UI_BUILD=1 detected. Skipping New UI build."
    fi
fi

# Run the application
echo "[INFO] Starting Flask development server..."
echo "[INFO] Application: http://localhost:5001"
echo "[INFO] New UI entry: http://localhost:5001/new-ui/"
echo ""

# Try python3 first, fallback to python
if command -v python3 &>/dev/null; then
    python3 app.py
else
    python app.py
fi