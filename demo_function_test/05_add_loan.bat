@echo off
echo ==============================================
echo Testing: Submit Loan Application
echo Endpoint: /loans/add
echo ==============================================

curl -X POST ^
  -d "company_id=1" ^
  -d "loan_amount=250000" ^
  -d "loan_purpose=Equipment Purchase" ^
  -d "loan_term_months=24" ^
  -d "expected_interest_rate=4.5" ^
  -d "collateral_type=None" ^
  -d "collateral_value=0" ^
  -d "guarantor=John Doe" ^
  -b cookies.txt ^
  -c cookies.txt ^
  http://localhost:5001/loans/add

echo.
echo.
pause
