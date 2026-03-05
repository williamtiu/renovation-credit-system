@echo off
echo ==============================================
echo Testing: Review and Approve Loan Application
echo Endpoint: /loans/1/review
echo ==============================================

curl -X POST ^
  -d "action=approve" ^
  -d "approved_amount=250000" ^
  -d "approved_interest_rate=4.5" ^
  -d "approval_conditions=Guarantor signature required" ^
  -b cookies.txt ^
  -c cookies.txt ^
  http://localhost:5001/loans/1/review

echo.
echo.
pause
