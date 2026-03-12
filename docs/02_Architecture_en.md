# DecoFinance System Architecture

## 1. Architecture Summary

DecoFinance is implemented as a Flask monolith with server-rendered Jinja templates, SQLAlchemy models, SQLite-friendly persistence, and role-aware route protection. The architecture favors incremental extension over framework replacement.

```text
Users
  |
  v
Flask Blueprints + Jinja Templates
  |
  +-- auth
  +-- main/dashboard
  +-- companies/report/pdf
  +-- loans/review/disbursement
  +-- projects/bids/milestones
  +-- disputes
  +-- admin/audit
  +-- api/json endpoints
  |
  v
Service Layer
  |
  +-- credit_scorer
  +-- report_service
  +-- project_service
  +-- escrow_service
  +-- dispute_service
  +-- smart_contract_service
  +-- audit_service
  |
  v
SQLAlchemy Models
  |
  v
SQLite or other SQLAlchemy-supported database
```

## 2. Technology Choices

| Layer | Technology | Current Use |
|------|------|------|
| Web Framework | Flask 3 | App factory, blueprints, request lifecycle |
| Templating | Jinja2 | Dashboard, reports, project and loan UI |
| ORM | Flask-SQLAlchemy / SQLAlchemy | Models and query layer |
| Local Database | SQLite | Default development and test database |
| Testing | pytest | Backend and route regression coverage |
| Browser Testing | Selenium | End-to-end UI verification |
| PDF Generation | ReportLab | Credit report export |

## 3. Main Modules

### 3.1 Identity and Access
- Session-based authentication.
- Role-aware decorators for `customer`, `company_user`, `reviewer`, and `admin`.

### 3.2 Company Trust Domain
- Company profile management.
- Compliance-aware trust scoring.
- Credit report rendering, comparison, and PDF download.

### 3.3 Loan Domain
- Loan application submission.
- Reviewer approval or rejection.
- Disbursement and repayment tracking.

### 3.4 Project Finance Domain
- Customer project creation.
- Contractor bid submission and acceptance.
- Milestone planning, submission, and approval.
- Escrow-state ledger entries.
- Disputes and smart-contract state transitions.

### 3.5 Monitoring and Audit
- Dashboard trend summaries and watchlists.
- Audit logs for sensitive actions.
- JSON API endpoints for system statistics and entity inspection.

## 4. Smart Contract Design

The smart contract feature is implemented as an application-layer state machine rather than a blockchain deployment.

### 4.1 Core States
- `draft`
- `active`
- `milestone_submitted`
- `frozen`
- `completed`

### 4.2 Trigger Events
- project created
- bid accepted
- milestone created
- milestone submitted
- milestone approved
- dispute opened
- dispute resolved

## 5. Data and Schema Strategy

- Schema creation relies on `db.create_all()`.
- Lightweight schema patching is used where needed for older local databases.
- No migration framework is currently required for local demo use.

## 6. Deployment Shape

- Local Flask process via `python app.py`.
- Windows startup via `start.bat`.
- Fixed demo data via `seed_db.py`.
- Bulk random data via `generate_random_data.py` and `generate_random_data.bat`.

## 7. Testing Architecture

- Route and service behavior are covered by pytest.
- Frontend flows are covered by Selenium.
- Full regression runs validate both backend and UI flows together.

## 8. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial target-state architecture draft |
| v1.1 | 2026-03-09 | Rewritten to match the implemented Flask/Jinja architecture |
