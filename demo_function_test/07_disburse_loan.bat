@echo off
echo ==============================================
echo Testing: Disburse Loan Status Update
echo Endpoint: /loans/1/disburse
echo ==============================================

curl -X POST ^
  -b cookies.txt ^
  -c cookies.txt ^
  http://localhost:5001/loans/1/disburse

echo.
echo.
pause
