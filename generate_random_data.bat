@echo off
setlocal

echo =======================================================
echo    DecoFinance Random Data Generator
echo =======================================================

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [WARN] Virtual environment not found. Using system Python.
)

set /p DATA_COUNT=Enter base record count to generate ^(e.g. 10^): 
if "%DATA_COUNT%"=="" set DATA_COUNT=10

set /p INIT_MODE=Drop and recreate the database first? ^(Y/N^): 
if /I "%INIT_MODE%"=="Y" (
    python generate_random_data.py --count %DATA_COUNT% --init
) else (
    python generate_random_data.py --count %DATA_COUNT%
)

echo.
echo Random data generation finished.
pause