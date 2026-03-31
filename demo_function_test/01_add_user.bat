@echo off
echo ==============================================
echo Testing: Register a New User
echo Endpoint: /auth/register
echo ==============================================

curl -X POST ^
  -d "username=admin_test" ^
  -d "password=securepass123!" ^
  -c cookies.txt ^
  http://localhost:5001/auth/register

echo.
echo.
pause
