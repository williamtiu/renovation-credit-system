@echo off
echo =======================================================
echo    安装 DecoFinance 依赖包
echo =======================================================
echo.

cd /d "%~dp0"

echo [步骤 1/4] 检查 Python 安装...
python --version
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)
echo.

echo [步骤 2/4] 创建虚拟环境...
if exist ".venv" (
    echo [信息] 虚拟环境已存在，跳过创建
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo [错误] 创建虚拟环境失败
        pause
        exit /b 1
    )
    echo [成功] 虚拟环境创建完成
)
echo.

echo [步骤 3/4] 激活虚拟环境...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo [错误] 激活虚拟环境失败
    pause
    exit /b 1
)
echo [成功] 虚拟环境已激活
echo.

echo [步骤 4/4] 安装依赖包...
pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] 安装依赖失败
    pause
    exit /b 1
)
echo.

echo =======================================================
echo    ✅ 安装完成！
echo =======================================================
echo.
echo 下一步操作：
echo 1. 激活虚拟环境：.venv\Scripts\activate
echo 2. 初始化数据库：python seed_db.py
echo 3. 检查数据库：python check_database.py
echo 4. 启动应用：python app.py 或运行 start.bat
echo.
echo 虚拟环境激活后，命令行前会显示 (.venv) 标识
echo.

pause
