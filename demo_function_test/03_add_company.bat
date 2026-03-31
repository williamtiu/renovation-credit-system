@echo off
echo ==============================================
echo Testing: Add a New Company
echo Endpoint: /api/companies
echo ==============================================

curl -X POST ^
  -H "Content-Type: application/json" ^
  -b cookies.txt ^
  -c cookies.txt ^
  -d "{\"company_name\":\"Test Renovation Ltd\",\"business_registration\":\"BR-77889900\",\"established_date\":\"2015-06-01\",\"registered_capital\":1000000,\"annual_revenue\":5000000,\"employee_count\":25,\"project_count_completed\":150,\"contact_person\":\"John Doe\",\"phone\":\"+852 98765432\",\"email\":\"contact@testrenovation.com\",\"address\":\"123 Builder Street\",\"district\":\"Kowloon\",\"has_license\":true,\"iso_certified\":false,\"bank_account_years\":8,\"existing_loans\":0,\"loan_repayment_history\":\"Good\"}" ^
  http://localhost:5001/api/companies

echo.
echo.
pause
