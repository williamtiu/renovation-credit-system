# DecoFinance API Interface Document

## 1. Overview

### 1.1 Base Path
All JSON endpoints are under /api.

### 1.2 Response Envelope
Success:

{
  "success": true,
  "data": {}
}

Failure:

{
  "success": false,
  "error": "message"
}

### 1.3 Authentication and Authorization
Session-cookie auth is used.

- unauthenticated: 401
- inactive account: 403
- role mismatch: 403

## 2. Auth Endpoints

- GET /api/auth/me
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/register

Notes:

- register role whitelist is restricted to customer and company_user.
- login accepts identifier (username or email) plus password.

Example login request:

{
  "identifier": "customer@test.com",
  "password": "password123"
}

## 3. Company and Scoring Endpoints

- GET /api/companies
- POST /api/companies
- GET /api/companies/{id}
- POST /api/companies/{id}/score
- GET /api/credit-scores (admin/reviewer)

Access summary:

- GET companies and company detail require login.
- POST company create requires admin/reviewer/company_user.
- score recalculation requires company-management permission.

## 4. Loan and Portfolio Endpoints

- GET /api/loans (admin/reviewer)
- GET /api/stats (admin/reviewer)
- GET /api/disputes (admin/reviewer)

Stats payload includes:

- total_companies
- active_companies
- total_loans
- approved_loans
- pending_loans
- total_credit_scores
- total_projects
- open_projects
- total_disputes
- grade_distribution

## 5. Project and Contract Endpoints

- GET /api/projects
- GET /api/projects/{id}/bids
- GET /api/projects/{id}/milestones
- GET /api/projects/{id}/contract

Access summary:

- customer: own projects
- company_user: open-for-bids projects or projects where company has participated
- reviewer/admin: all projects

Contract endpoint behavior:

- returns project smart contract snapshot
- lazily initializes contract for project if missing

## 6. Developer Diagnostics Endpoint

- GET /api/developer/summary

Returns:

- current timestamp
- current session user payload
- aggregate counts (companies/projects/loans/disputes/creditScores)
- documented API endpoint lists used by the new UI developer page

## 7. Web Routes Used by UI Flows

Not JSON APIs, but key routes for user journeys:

- /auth/register
- /auth/login
- /dashboard
- /companies/compare-report
- /companies/{id}/credit-report
- /companies/{id}/credit-report/download
- /projects/
- /projects/add
- /projects/{id}/edit
- /disputes/
- /admin/audit-logs
- /new-ui/

## 8. Workflow Guard Rules

Current enforced guards include:

- only one accepted bid per project
- milestones can be created only after project is contracted/in_progress
- only accepted contractor can submit milestones
- submitted milestone with open dispute cannot be approved
- project list/detail APIs enforce ownership or participation filters

## 9. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial target-state API draft |
| v1.1 | 2026-03-09 | Current /api routes and contract endpoint documented |
| v1.2 | 2026-03-16 | Added auth JSON endpoints, developer summary endpoint, and dual-UI notes |

