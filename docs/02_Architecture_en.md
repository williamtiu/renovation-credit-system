# DecoFinance System Architecture

## 1. Architecture Summary

DecoFinance is implemented as a Flask monolith with SQLAlchemy models and role-aware route protection. It now runs a dual-UI pattern:

- legacy server-rendered Jinja UI on primary routes;
- React UI build served by Flask under /new-ui.

```text
Browser
  |
  +-- Flask Jinja routes (legacy UI)
  +-- /new-ui (React bundle served by Flask)
  |
  v
Flask Blueprints
  |
  +-- auth
  +-- main
  +-- companies
  +-- loans
  +-- projects
  +-- disputes
  +-- admin
  +-- api
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
SQLite (default) or other SQLAlchemy-supported RDBMS
```

## 2. Technology Choices

| Layer | Technology | Current Use |
|------|------|------|
| Web Framework | Flask 3 | App factory, blueprints, request lifecycle |
| Templating | Jinja2 | Legacy UI pages and workflows |
| New UI | React + Vite build | Served under /new-ui through Flask static delivery |
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
- JSON API endpoints for system statistics, auth bootstrap, project inspection, and developer diagnostics.

### 3.6 New UI Integration Layer
- React build output lives under DecoFinance Project Overview/dist.
- Flask main blueprint serves this bundle at /new-ui and /new-ui/<path> with SPA fallback.
- React app authenticates via session-backed /api/auth endpoints.
- Developer diagnostics page uses /api/developer/summary.

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

- Local Flask process via python app.py (port 5001).
- Windows startup via start.bat and Linux/macOS startup via start.sh.
- Startup scripts can auto-build /new-ui bundle when dist is missing.
- Fixed demo data via seed_db.py.
- Bulk random data via generate_random_data.py and generate_random_data.bat.

## 7. Testing Architecture

- Route and service behavior are covered by pytest.
- Frontend flows are covered by Selenium.
- Full regression runs validate both backend and UI flows together.

## 8. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial target-state architecture draft |
| v1.1 | 2026-03-09 | Rewritten to match implemented Flask/Jinja architecture |
| v1.2 | 2026-03-16 | Synced with dual-UI (/new-ui), auth JSON endpoints, and developer diagnostics integration |

