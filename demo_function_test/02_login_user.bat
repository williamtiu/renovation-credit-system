@echo off
echo ==============================================
echo Testing: Login User
echo Endpoint: /auth/login
echo ==============================================

curl -X POST ^
  -d "username=admin_test" ^
  -d "password=securepass123!" ^
  -c cookies.txt ^
  -b cookies.txt ^
  http://localhost:5001/auth/login

echo.
echo.
pause
