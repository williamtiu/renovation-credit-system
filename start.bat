@echo off
echo =======================================================
echo    Starting Renovation Credit System (TU Mode)
echo =======================================================

rem Check and activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment ^(.venv^)...
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment ^(venv^)...
    call venv\Scripts\activate.bat
) else (
    echo [WARN] Virtual environment not found. Using system Python.
    echo        ^(Tip: Run "python -m venv .venv" to create one^)
)

rem Run the application
echo [INFO] Starting Flask development server...
echo [INFO] Application will be available at http://localhost:5001
echo.
python app.py

:: Keep window open if server crashes or stops
pause