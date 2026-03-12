# DecoFinance API Interface Document

## 1. API Overview

### 1.1 Base Path
Current local JSON endpoints are exposed under `/api` on the Flask app.

### 1.2 Response Shape
Most endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

### 1.3 Authentication Note
The web app uses Flask session authentication.

The JSON API now enforces the same session-backed access model as the web UI:

- unauthenticated requests return `401`;
- inactive users are blocked;
- reviewer and admin roles are required for portfolio-level inspection endpoints;
- customer users can only inspect their own projects;
- company users can only inspect open projects or projects where their company participates.

This API is mainly used for inspection, automation, and tests rather than as a public integration surface.

## 2. Company Endpoints
- `GET /api/companies`
- `POST /api/companies`
- `GET /api/companies/<id>`
- `POST /api/companies/<id>/score`

Access rules:

- `GET /api/companies` requires any authenticated user;
- `POST /api/companies` requires `admin`, `reviewer`, or `company_user`;
- `GET /api/companies/<id>` requires any authenticated user;
- `POST /api/companies/<id>/score` requires a user who can manage that company.

### 2.1 Example: Create Company

Request:

```json
{
  "company_name": "Harbour Fitout Limited",
  "business_registration": "12345678",
  "established_date": "2020-01-01",
  "registered_capital": 1500000,
  "annual_revenue": 4200000,
  "employee_count": 14,
  "project_count_completed": 36,
  "contact_person": "Alex Chan",
  "phone": "91234567",
  "email": "alex@harbourfitout.example",
  "address": "12 Queen's Road Central",
  "district": "Hong Kong Island",
  "has_license": true,
  "iso_certified": false,
  "bank_account_years": 4,
  "existing_loans": 250000,
  "loan_repayment_history": "Good"
}
```

Response shape:

```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "id": 1,
    "company_name": "Harbour Fitout Limited"
  }
}
```

### 2.2 Example: Recalculate Score

Request:

`POST /api/companies/1/score`

Response fields include:

- `score_id`
- `credit_score`
- `credit_grade`
- `trust_score`
- `risk_level`
- `recommended_loan_limit`
- `recommended_interest_rate`
- `risk_factors`

## 3. Score and Loan Endpoints
- `GET /api/credit-scores`
- `GET /api/loans`
- `GET /api/stats`

Access rules:

- all three endpoints require `admin` or `reviewer`.

### 3.1 Example: Stats Response Areas

The statistics endpoint currently reports aggregate metrics such as:

- total companies
- active companies
- total loans
- approved loans
- pending loans
- total credit scores
- total projects
- open projects
- total disputes
- grade distribution

## 4. Project Finance Endpoints
- `GET /api/projects`
- `GET /api/projects/<id>/bids`
- `GET /api/projects/<id>/milestones`
- `GET /api/projects/<id>/contract`

Access rules:

- all project endpoints require authentication;
- customers only see their own projects and project details;
- company users only see open projects or projects where their company has participated;
- reviewer and admin users can inspect all project records.

The smart contract endpoint exposes contract code, status, balances, milestone counts, dispute counts, terms, and event history.

### 4.1 Example: Contract Response

```json
{
  "success": true,
  "data": {
    "project_id": 12,
    "contract_code": "DF-SC-00012",
    "status": "active",
    "budget_amount": 240000.0,
    "escrow_balance": 180000.0,
    "released_amount": 60000.0,
    "frozen_amount": 0.0,
    "milestones_total": 3,
    "approved_milestones": 1,
    "dispute_count": 0,
    "terms": {},
    "events": []
  }
}
```

## 5. Dispute Endpoint
- `GET /api/disputes`

Access rules:

- `GET /api/disputes` requires `admin` or `reviewer`.

## 6. Important Web Routes

These are not JSON APIs but are important documented entry points:

- `/auth/register`
- `/auth/login`
- `/dashboard`
- `/companies/<id>/credit-report`
- `/companies/<id>/credit-report/download`
- `/companies/compare-report`
- `/projects/`
- `/projects/add`
- `/projects/<id>/edit`
- `/disputes/`
- `/admin/audit-logs`

## 7. Form-Driven Workflow Notes

Many core user actions in DecoFinance are HTML form workflows rather than JSON APIs. These include:

- registration and login;
- project creation;
- project editing;
- bid submission;
- milestone creation and approval;
- dispute opening;
- loan review actions.

Important workflow guards now enforced by the application include:

- only one bid may be accepted per project;
- milestones may only be added after a project is contracted;
- only the accepted contractor may submit milestone evidence;
- milestones with open disputes cannot be approved;
- project and contract inspection endpoints follow ownership and participation rules.

For hand-in and demo purposes, these are documented in `15_Workflow_Examples.md` alongside the API routes.

## 8. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial target-state API draft |
| v1.1 | 2026-03-09 | Updated to the current `/api` routes and contract endpoint |
| v1.2 | 2026-03-09 | Expanded with example payloads and workflow guidance |
| v1.3 | 2026-03-12 | Documented current authentication, authorization, and project workflow guard rules |
