@echo off
echo ==============================================
echo Testing: Calculate Credit Score for Company
echo Endpoint: /api/companies/1/score
echo ==============================================

curl -X POST ^
  -H "Content-Type: application/json" ^
  -b cookies.txt ^
  http://localhost:5001/api/companies/1/score

echo.
echo.
pause
