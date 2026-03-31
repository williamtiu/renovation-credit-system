# DecoFinance

DecoFinance is a renovation trust and project-finance platform implemented as a Flask monolith with SQLAlchemy models, role-aware workflows, smart-contract state tracking, and both legacy and new UI experiences.

## Features

- Role-aware access for customer, company_user, reviewer, and admin.
- Company compliance profiling with licence, insurance, OSH, and ESG factors.
- Trust score generation and bureau-style company credit reports (including PDF export and compare workspace).
- Loan lifecycle handling (application, review, disbursement, repayment).
- Project finance workflows (project posting, bidding, milestone submission/approval, escrow ledger entries, disputes).
- Smart-contract agreement state machine tied to project lifecycle events.
- JSON endpoints for authenticated frontend integration and diagnostics.
- Dual UI model:
  - Legacy Flask/Jinja UI on main routes.
  - New React UI served by Flask at /new-ui.

## Installation

1. Create and activate a Python virtual environment.
2. Install Python dependencies:
   - pip install -r requirements.txt
3. Optional: prepare local environment values:
   - copy .env.example to .env and update values.

## Quick Start

Windows:
- .\start.bat

Linux/macOS:
- ./start.sh

Manual launch:
- python app.py

Default app URL:
- http://localhost:5001

New UI URL:
- http://localhost:5001/new-ui/

Optional script flags:
- SKIP_NEW_UI_BUILD=1 to skip React build in start scripts.
- FORCE_NEW_UI_BUILD=1 to force rebuilding React UI in start scripts.

## Environment Variables

Primary variables used by backend runtime/config:

- SECRET_KEY
- DATABASE_URL
- LOG_LEVEL
- LOG_FILE
- MAIL_SERVER
- MAIL_PORT
- MAIL_USE_TLS
- MAIL_USERNAME
- MAIL_PASSWORD

Frontend build/runtime related variables used by the React app:

- VITE_API_BASE (optional, defaults to /api)

## Running Tests

- Full regression:
  - pytest -vv
- Selenium browser flows:
  - pytest -vv tests/frontend/test_ui_selenium.py

## Documentation Index

- docs/01_Requirements_en.md
- docs/02_Architecture_en.md
- docs/03_Database_en.md
- docs/04_API_en.md
- docs/11_Smart_Contract_System.md
- docs/12_Test_Report.md
- docs/15_Workflow_Examples.md

## Project Notes

- Schema is managed via SQLAlchemy create_all with lightweight runtime patching for missing company compliance columns.
- No migration framework directory is currently present in the repository.
