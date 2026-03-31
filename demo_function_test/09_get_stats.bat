@echo off
echo ==============================================
echo Testing: Get System Statistics
echo Endpoint: /api/stats
echo ==============================================

curl -X GET -b cookies.txt http://localhost:5001/api/stats

echo.
echo.
pause
