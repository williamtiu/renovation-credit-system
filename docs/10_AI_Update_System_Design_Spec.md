# Deliverable 2: System Design Specification for AI Code Update

## 1. Purpose

This specification is written for an AI coding assistant that will update the current DecoFinance codebase. The assistant must treat the repository as an existing Flask monolith and extend it incrementally. It must not perform a framework rewrite.

## 2. Existing System Context

The current repository uses:

- Flask application factory in app.py;
- SQLAlchemy models in models/;
- route blueprints in routes/;
- business logic in services/;
- Jinja2 templates in templates/;
- simple auth helpers in utils/auth_helper.py;
- SQLite-friendly local setup and in-memory test usage.

Existing domain objects now include:

- User
- Company
- CreditScore
- LoanApplication
- Project
- ProjectBid
- ProjectMilestone
- EscrowLedgerEntry
- DisputeCase
- SmartContractAgreement
- AuditLog

Existing working features now include:

- login and registration;
- company CRUD and compliance fields;
- credit score calculation and persistence;
- credit report rendering, comparison, and PDF export;
- loan review, disbursement, and repayment;
- dashboard and JSON API endpoints;
- project bidding, milestone approval, and dispute workflows;
- smart contract state tracking.

## 3. Architecture and Logic

### 3.1 Target architecture inside the existing app

The new feature set shall fit into the current Flask monolith using:

- additive SQLAlchemy models;
- new and updated blueprints;
- service-layer business logic;
- route-level role and ownership enforcement;
- Jinja2 templates for all new UI flows;
- JSON API support for automation and tests.

### 3.2 Core business logic to introduce

The assistant shall add these major workflows:

1. Role-aware identity and authorization.
2. Company compliance verification.
3. Customer project creation and bid management.
4. Project milestone workflow.
5. Internal escrow-state ledger updates.
6. Dispute workflow that freezes payment state.
7. Smart contract state transitions tied to project lifecycle events.
8. Trust score extension based on compliance and dispute signals.
9. Audit logging for sensitive actions.

### 3.3 Constraints

- Keep Flask sessions unless a change is absolutely necessary.
- Keep SQLite compatibility.
- Preserve current routes and behaviors where possible.
- Keep the Flask monolith as the execution core; frontend additions (including /new-ui React bundle) must continue using existing backend business rules and session auth.
- Do not remove or break current loan and score workflows.

## 4. Data Models and State Changes

### 4.1 Existing models to update

#### models/user.py

Add fields:

- email
- role
- is_active
- company_id
- created_at
- updated_at

Add helper behavior:

- role-check helper methods;
- optional relationship to Company.

#### models/company.py

Add fields:

- owner_user_id
- licence_number
- licence_class
- licence_categories
- licence_expiry_date
- licence_verification_status
- insurance_provider
- insurance_policy_number
- insurance_expiry_date
- insurance_verification_status
- trust_score_cached
- dispute_count_cached
- is_verified_for_bidding

#### models/credit_score.py

Keep backward compatibility.

Extend usage so score records can represent trust score output with compliance and dispute factors.

#### models/loan_application.py

Add fields:

- project_id
- reviewed_by_user_id
- decision_at

### 4.2 New models to create

The following new models have already been introduced or should be preserved under models/:

- project.py
- project_bid.py
- project_milestone.py
- escrow_ledger_entry.py
- dispute_case.py
- consent_record.py
- audit_log.py
- smart_contract_agreement.py

Required states:

#### Project status

- draft
- open_for_bids
- contracted
- in_progress
- completed
- cancelled
- disputed

#### ProjectBid status

- submitted
- shortlisted
- accepted
- declined
- withdrawn

#### ProjectMilestone status

- planned
- submitted
- approved
- disputed
- released

#### DisputeCase status

- open
- under_review
- resolved
- closed

#### Escrow ledger entry types

- planned
- held
- released
- retained
- frozen
- adjustment

#### SmartContractAgreement status

- draft
- active
- milestone_submitted
- frozen
- completed

## 5. Route and UI Changes

### 5.1 Existing route files to update

- routes/auth.py
- routes/companies.py
- routes/loans.py
- routes/api.py
- routes/main.py

### 5.2 New route files to create

- routes/projects.py
- routes/disputes.py
- routes/admin.py

### 5.3 Existing templates to update

- templates/base.html
- templates/index.html
- templates/dashboard.html
- templates/companies/form.html
- templates/companies/detail.html
- templates/loans/form.html
- templates/loans/detail.html

### 5.4 New templates to create

- templates/projects/list.html
- templates/projects/form.html
- templates/projects/detail.html
- templates/projects/milestones.html
- templates/disputes/list.html
- templates/disputes/form.html
- templates/admin/audit_logs.html

## 6. Step-by-Step Implementation Plan

### Step 1: Extend the auth model and helpers

Update models/user.py to add role-aware and company-linked user fields.

Update utils/auth_helper.py to add:

- login_required improvements if needed;
- role_required decorator;
- ownership-check helper functions.

Update routes/auth.py so registration captures role and email and so inactive users cannot log in.

### Step 2: Extend company compliance fields

Update models/company.py to add compliance, verification, and trust cache fields.

Update routes/companies.py to:

- allow company users to manage their own company profile;
- allow reviewer/admin verification actions;
- display verification and trust indicators in detail views.

Update templates/companies/form.html and templates/companies/detail.html to support the new fields.

### Step 3: Add new project domain models

Create models/project.py.

Create models/project_bid.py.

Create models/project_milestone.py.

Create models/escrow_ledger_entry.py.

Create models/dispute_case.py.

Create models/consent_record.py.

Create models/audit_log.py.

Update app.py imports if required so db.create_all can discover the new models.

### Step 4: Add project and bid services

Create services/project_service.py to:

- create projects;
- validate bid eligibility;
- accept a bid;
- update related project and bid statuses.

Create services/audit_service.py to centralize audit writes.

### Step 5: Add projects blueprint and UI

Create routes/projects.py with routes for:

- project list;
- project create;
- project detail;
- bid submit;
- bid accept;
- milestone list/create/update;
- milestone submit;
- milestone approve.

Create the corresponding templates under templates/projects/.

Update templates/base.html to show navigation by role.

### Step 6: Add dispute and escrow logic

Create services/escrow_service.py to:

- create planned ledger entries;
- mark releasable funds as frozen on dispute;
- release entries when milestone approval conditions are met.

Create services/dispute_service.py to:

- create dispute cases;
- update milestone or project state to disputed;
- call escrow freeze logic.

Create or extend services/smart_contract_service.py to:

- initialize a contract for each project;
- activate the contract when a bid is accepted;
- synchronize ledger, dispute, and milestone metrics;
- maintain contract event history.

Create routes/disputes.py and templates/disputes/ to expose dispute creation and review.

### Step 7: Refactor scoring logic

Update services/credit_scorer.py or split scoring into a dedicated trust scorer module.

The updated scoring logic must:

- preserve current financial and operational factors;
- add compliance and dispute penalties or boosts;
- keep human-readable risk flags;
- keep score persistence compatible with existing records.

Update routes/companies.py and routes/api.py so score outputs include the new trust-related factors.

### Step 8: Link financing workflow to projects

Update models/loan_application.py and routes/loans.py so a loan application can optionally reference a related project.

Update templates/loans/form.html and templates/loans/detail.html to display the optional project linkage.

Preserve old loan records that do not have a project_id.

### Step 9: Add audit logging and admin views

Use services/audit_service.py in auth, company verification, project, dispute, and loan review flows.

Create routes/admin.py for audit log views and summary metrics.

Create templates/admin/audit_logs.html.

Update routes/main.py and templates/dashboard.html to add project, dispute, and verification metrics.

### Step 10: Extend JSON APIs

Update routes/api.py to expose safe endpoints for:

- projects;
- bids;
- milestones;
- contract details;
- disputes;
- audit-safe summary data.

Keep the existing success/data/error response shape.

### Step 11: Update seed and test coverage

Update seed_db.py so development data includes:

- users with different roles;
- verified and unverified companies;
- sample projects;
- sample bids;
- sample milestones;
- sample disputes.

Add random-data generation support so demo users can create larger linked datasets without manual entry.

Update tests/test_routes.py and tests/test_system.py.

Add new tests if needed, such as:

- tests/test_auth_roles.py
- tests/test_projects.py
- tests/test_disputes.py

## 7. File-Level Implementation Guidance

### app.py

- import any new models required for table creation;
- register new blueprints for projects, disputes, and admin;
- keep current app factory structure intact.

### routes/auth.py

- collect role and email on registration;
- prevent inactive-user login;
- add audit logging for login and registration if implemented.

### routes/companies.py

- separate self-service company editing from reviewer verification actions;
- guard routes by role and ownership;
- expose updated score and compliance information.

### routes/loans.py

- keep current approval, disbursement, and repayment logic;
- add optional project linkage;
- add audit logging on approve and reject actions.

### routes/api.py

- maintain existing response pattern;
- add endpoints incrementally;
- avoid leaking sensitive internal fields.

### services/credit_scorer.py

- refactor for maintainability;
- keep existing outputs where possible;
- add trust-related logic without breaking old callers.

### utils/auth_helper.py

- become the central place for login, role, and ownership enforcement utilities.

## 8. Definition of Done

The update is complete only when:

- role-aware auth works end to end;
- customer project flow works end to end;
- verified companies can bid;
- one bid can be accepted per project;
- milestone submission and approval work;
- disputes freeze related escrow-state records;
- trust score reflects compliance and dispute data;
- old loan and score workflows still work;
- tests pass in a clean local environment.

## 9. Guardrails for the AI Coding Assistant

- Do not rewrite the application into a new framework.
- Do not remove current working features.
- Do not depend on live third-party services.
- Do not introduce breaking schema assumptions that stop in-memory tests from running.
- Prefer additive, verifiable changes.

## 10. Summary

This system design specification tells an AI coding assistant exactly how to extend the current DecoFinance repository from a company-scoring and loan workflow into a broader renovation trust platform. The update must be implemented through additive models, routes, services, templates, and tests, with explicit support for projects, bids, milestones, disputes, escrow-state tracking, compliance-aware trust scoring, and audit visibility.