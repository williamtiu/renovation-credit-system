# DecoFinance Database Design

## 1. Database Overview

The system uses SQLAlchemy models with SQLite-friendly defaults for local development and testing. The schema is created through application startup and seed scripts.

## 2. Core Entity Groups

### 2.1 Identity and Audit
- `users`
- `audit_logs`
- `consent_records`

### 2.2 Company and Trust
- `companies`
- `credit_scores`
- `loan_applications`

### 2.3 Project Finance
- `projects`
- `project_bids`
- `project_milestones`
- `escrow_ledger_entries`
- `dispute_cases`
- `smart_contract_agreements`

## 3. Key Tables

### 3.1 users
- `id`, `username`, `email`, `password_hash`
- `role`, `is_active`, `company_id`
- `created_at`, `updated_at`

### 3.2 companies
- company identity and contact fields
- operating profile fields
- licence and insurance fields
- OSH and ESG monitoring fields
- `risk_level`, `trust_score_cached`, `dispute_count_cached`, `is_verified_for_bidding`

### 3.3 credit_scores
- company linkage
- score, grade, risk level
- weighted component scores
- recommended loan limit and interest rate

### 3.4 loan_applications
- company linkage and optional project linkage
- requested amount, purpose, term
- review, approval, disbursement, and repayment fields

### 3.5 projects
- customer linkage
- title, address, budget, dates, status
- accepted bid linkage

### 3.6 project_bids
- project, company, and submitter linkage
- bid amount, duration, proposal summary, status

### 3.7 project_milestones
- project linkage
- sequence, planned amount, planned percentage, due date, status
- evidence and review timestamps

### 3.8 escrow_ledger_entries
- project linkage and optional milestone linkage
- entry type, amount, status, note, creator

### 3.9 dispute_cases
- project linkage and optional milestone linkage
- opened by, against company, type, description, status, resolution summary

### 3.10 smart_contract_agreements
- one-to-one link with a project
- selected bid and contractor linkage
- contract code and state
- escrow, release, freeze, milestone, and dispute counters
- terms JSON and event log JSON

## 4. Relationship Summary

```text
users -> companies
companies -> credit_scores
companies -> loan_applications
users -> projects
projects -> project_bids
projects -> project_milestones
projects -> escrow_ledger_entries
projects -> dispute_cases
projects -> smart_contract_agreements
```

## 5. Persistence Notes

- Local development typically uses SQLite database files.
- Tests use in-memory SQLite.
- Seed and random-data scripts can rebuild the schema quickly.
- Migration tooling is not currently part of the repo.

## 6. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial simplified schema draft |
| v1.1 | 2026-03-09 | Updated to match the implemented project-finance and smart-contract model |
