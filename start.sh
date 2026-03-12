#!/bin/bash

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

# Run the application
echo "[INFO] Starting Flask development server..."
echo "[INFO] Application will be available at http://localhost:5001"
echo ""

# Try python3 first, fallback to python
if command -v python3 &>/dev/null; then
    python3 app.py
else
    python app.py
fi