@echo off
echo ==============================================
echo Running all Integration Test Scripts
echo Make sure the Flask server is running at http://localhost:5001
echo ==============================================

if exist cookies.txt del cookies.txt

echo.
echo [1] Registering User...
call 01_add_user.bat

echo.
echo [2] Logging In...
call 02_login_user.bat

echo.
echo [3] Adding Company...
call 03_add_company.bat

echo.
echo [4] Giving Company a Credit Score...
call 04_score_company.bat

echo.
echo [5] Requesting Loan...
call 05_add_loan.bat

echo.
echo [6] Approving Loan...
call 06_review_loan.bat

echo.
echo [7] Disbursing Loan...
call 07_disburse_loan.bat

echo.
echo [8] Making Repayment...
call 08_repay_loan.bat

echo.
echo ==============================================
echo All Tests Completed! Check the Flask Server Console for logs.
echo ==============================================
pause
