@echo off
echo =======================================================
echo    Starting DecoFinance
echo =======================================================

cd /d "%~dp0"

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

set "NEW_UI_DIR=DecoFinance Project Overview"
set "NEED_BUILD=0"

if exist "%NEW_UI_DIR%\package.json" (
    if "%FORCE_NEW_UI_BUILD%"=="1" set "NEED_BUILD=1"
    if not exist "%NEW_UI_DIR%\dist\index.html" set "NEED_BUILD=1"

    if not "%SKIP_NEW_UI_BUILD%"=="1" (
        if "%NEED_BUILD%"=="1" (
            echo [INFO] Building New UI for /new-ui ...
            pushd "%NEW_UI_DIR%"
            call npm install
            if errorlevel 1 (
                echo [ERROR] npm install failed.
                popd
                exit /b 1
            )
            call npm run build
            if errorlevel 1 (
                echo [ERROR] New UI build failed.
                popd
                exit /b 1
            )
            popd
        ) else (
            echo [INFO] Existing New UI build found. Skipping build.
        )
    ) else (
        echo [INFO] SKIP_NEW_UI_BUILD=1 detected. Skipping New UI build.
    )
)

rem Run the application
echo [INFO] Starting Flask development server...
echo [INFO] Application: http://localhost:5001
echo [INFO] New UI entry: http://localhost:5001/new-ui/
echo.
python app.py

:: Keep window open if server crashes or stops
pause