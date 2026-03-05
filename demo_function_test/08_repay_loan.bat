@echo off
echo ==============================================
echo Testing: Repay Loan Partial Amount
echo Endpoint: /loans/1/repay
echo ==============================================

curl -X POST ^
  -d "repayment_amount=10500" ^
  -b cookies.txt ^
  -c cookies.txt ^
  http://localhost:5001/loans/1/repay

echo.
echo.
pause
