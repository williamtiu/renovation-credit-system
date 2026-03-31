# DecoFinance Workflow Examples

## 1. Purpose

This document complements the API reference by showing practical request, response, and form-driven workflow examples for the current DecoFinance system.

## 1.1 End-to-End Journey Snapshot

Current browser automation covers two primary role journeys:

1. Customer
- self-register/login
- create project request (category, size, style captured in property_type/description)
- review incoming bid
- accept bid and activate contract
- approve submitted milestone and release escrow

2. Decoration Company User
- self-register/login
- complete company profile (licence + insurance + OSH/ESG readiness)
- discover open project and submit bid
- submit milestone evidence for approval

## 2. Registration Workflow

### Route
- `POST /auth/register`

### Form Fields
- `username`
- `email`
- `password`
- `role`

### Example Form Submission

```text
username=builder_demo
email=builder_demo@example.com
password=password123
role=company_user
```

### Expected Behavior
- user is created;
- password is hashed;
- user is redirected to the login page.

Guard rule:

- self-registration is restricted to customer and company_user.

## 2.1 JSON Auth Workflow (used by /new-ui)

Routes:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

Example JSON register:

{
	"username": "customer_demo",
	"email": "customer_demo@example.com",
	"password": "password123",
	"role": "customer"
}

Example JSON login:

{
	"identifier": "customer_demo@example.com",
	"password": "password123"
}

## 3. Project Creation Workflow

### Route
- `POST /projects/add`

### Example Form Submission

```text
title=Kitchen Renovation Phase 1
description=Full kitchen replacement and utility upgrade
property_type=Residential
property_address=18 Example Street
district=Kowloon
budget_amount=280000
target_start_date=2026-04-01
target_end_date=2026-06-30
status=open_for_bids
```

### Expected Behavior
- project is created;
- a smart contract shell is initialized;
- user is redirected to the project detail page.

Guard rules:

- only `customer` and `admin` users can create projects.

## 4. Project Edit Workflow

### Route
- `POST /projects/<id>/edit`

### Example Form Submission

```text
title=Kitchen Renovation Phase 1 Revised
description=Adjusted scope for kitchen and bathroom works
property_type=Residential
property_address=18 Example Street
district=Kowloon
budget_amount=320000
target_start_date=2026-04-10
target_end_date=2026-07-15
```

### Expected Behavior
- only the project owner customer or an admin can edit the project;
- customer edits are limited to projects in `draft` or `open_for_bids` state;
- a project update audit log is created;
- user is redirected back to the project detail page.

## 5. Bid Submission Workflow

### Route
- `POST /projects/<id>/bids`

### Example Form Submission

```text
bid_amount=265000
proposed_duration_days=70
proposal_summary=Scope confirmed with phased delivery plan
```

### Expected Behavior
- bid is created under the selected project;
- verified company remains eligible for later selection;
- user is redirected back to project detail.

Guard rules:

- project must still be in `open_for_bids` state;
- company must be active and verified for bidding;
- the same company cannot create multiple active bids on the same project.

Eligibility note:

- company bid eligibility is derived from active status plus compliance readiness (licence/insurance/OSH thresholds).

## 6. Milestone Approval Workflow

### Routes
- `POST /projects/<id>/milestones/add`
- `POST /projects/milestones/<id>/submit`
- `POST /projects/milestones/<id>/approve`

### Example Milestone Creation

```text
sequence_no=1
name=Deposit and Site Preparation
planned_amount=60000
planned_percentage=25
due_date=2026-04-10
```

### Example Evidence Submission

```text
evidence_notes=Site photos and signed preparation checklist uploaded
```

### Expected Behavior
- planned ledger entry is created at milestone setup;
- submission moves the contract into review-related state;
- approval creates released ledger entry and updates contract metrics.

Guard rules:

- milestones may only be created for projects in `contracted` or `in_progress` state;
- only the accepted contractor may submit a milestone;
- only milestones in `planned` state may be submitted;
- only milestones in `submitted` state may be approved;
- milestones with open disputes cannot be approved.

Escrow note:

- milestone approval triggers release_milestone_amount and writes a released ledger entry.

## 7. Dispute Workflow

### Route
- `POST /disputes/add`

### Example Form Submission

```text
project_id=1
milestone_id=1
dispute_type=quality_issue
description=Customer requested rework before release
```

### Expected Behavior
- dispute case is created;
- project or milestone is marked disputed where relevant;
- releasable funds are frozen;
- smart contract status becomes `frozen`.

Guard rules:

- customers may only dispute their own projects;
- company users may only dispute projects where their company participates;
- milestone-linked disputes must reference a milestone belonging to the same project;
- reviewer or admin resolution restores the project to a valid post-dispute state.

## 8. Loan Review Workflow

### Routes
- `POST /loans/add`
- `POST /loans/<id>/review`
- `POST /loans/<id>/disburse`
- `POST /loans/<id>/repay`

### Example Loan Submission

```text
company_id=1
project_id=1
loan_amount=150000
loan_purpose=Working capital for project mobilization
loan_term_months=12
expected_interest_rate=4.5
bank_name=Demo Bank
bank_officer=Review Officer
```

### Example Approval Form

```text
action=approve
approved_amount=120000
approved_interest_rate=4.5
approval_conditions=Release subject to ongoing milestone compliance
```

### Expected Behavior
- loan stores snapshot score context at application time;
- reviewer decision is recorded with actor and timing;
- later disbursement and repayment actions update balances and audit logs.

## 9. JSON Inspection Examples

### Contract Inspection
- `GET /api/projects/1/contract`

Requires an authenticated session and project-level access.

### Stats Inspection
- `GET /api/stats`

Requires `admin` or `reviewer`.

### Company Inspection
- `GET /api/companies/1`

Requires an authenticated session.

### Developer Diagnostics
- `GET /api/developer/summary`

Requires an authenticated session and returns current user, aggregate counts, and endpoint groups used by the new UI developer page.

These routes are useful for testing, demo verification, and review support.

## 10. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-09 | Initial workflow examples covering major form and JSON flows |
| v1.1 | 2026-03-12 | Added current edit flow and enforced authorization/state guard rules |
| v1.2 | 2026-03-16 | Synced with /api/auth endpoints, /api/developer/summary, and full two-role E2E journey |
