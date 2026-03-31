# DecoFinance Database Design

## 1. Database Overview

DecoFinance uses Flask-SQLAlchemy models with SQLite-friendly defaults.

- Schema bootstrap: db.create_all at app startup.
- Compatibility patching: app startup checks the companies table and adds missing OSH/ESG columns if needed.
- Migration framework: not present in repository.

## 2. Entity Groups

### 2.1 Identity, Access, and Audit
- users
- audit_logs
- consent_records

### 2.2 Company and Trust
- companies
- credit_scores
- loan_applications

### 2.3 Project Finance and Contract State
- projects
- project_bids
- project_milestones
- escrow_ledger_entries
- dispute_cases
- smart_contract_agreements

## 3. Table Snapshot

### 3.1 users
Key columns:
- id, username, email, password_hash
- role, is_active, company_id
- created_at, updated_at

### 3.2 companies
Key columns:
- identity/contact: company_name, business_registration, contact fields
- operations: employee_count, annual_revenue, project_count_completed
- compliance: has_license, licence fields, insurance fields
- safety/esg: osh_policy_in_place, safety_training_coverage, heavy_lifting_compliance, lifting_equipment_available, safety_incident_count, esg_policy_level, green_material_ratio
- trust state: status, risk_level, trust_score_cached, dispute_count_cached, is_verified_for_bidding

### 3.3 credit_scores
Key columns:
- company_id, credit_score, credit_grade, risk_level
- component scores (financial, operational, history, qualification, industry risk)
- recommended_loan_limit, recommended_interest_rate
- risk_factors, scoring_model_version, scored_at, expires_at

### 3.4 loan_applications
Key columns:
- company_id, optional project_id
- loan_amount, loan_purpose, loan_term_months
- application_status, approved_amount, approved_interest_rate
- disbursement and repayment tracking fields
- reviewed_by_user_id, decision_at, notes, rejection_reason

### 3.5 projects
Key columns:
- customer_user_id
- title, description, property_type, property_address, district
- budget_amount, target dates, status
- accepted_bid_id, created_at, updated_at

### 3.6 project_bids
Key columns:
- project_id, company_id, submitted_by_user_id
- bid_amount, proposed_duration_days, proposal_summary, notes
- status, created_at, updated_at

### 3.7 project_milestones
Key columns:
- project_id, sequence_no, name, description
- planned_percentage, planned_amount, due_date
- status, evidence_notes, submitted_at, approved_at
- submitted_by_user_id, reviewed_by_user_id

### 3.8 escrow_ledger_entries
Key columns:
- project_id, optional milestone_id
- entry_type, amount, currency, status
- reference_note, created_by_user_id, created_at

### 3.9 dispute_cases
Key columns:
- project_id, optional milestone_id
- opened_by_user_id, against_company_id
- dispute_type, description, status
- resolution_summary, opened_at, resolved_at

### 3.10 smart_contract_agreements
Key columns:
- project_id (unique one-to-one)
- accepted_bid_id, customer_user_id, contractor_company_id
- contract_code, status
- budget_amount, escrow_balance, released_amount, frozen_amount
- milestones_total, approved_milestones, dispute_count
- terms_json, event_log_json, activated_at, last_event_at

### 3.11 audit_logs
Key columns:
- actor_user_id, action, target_type, target_id
- details_json, created_at

### 3.12 consent_records
Key columns:
- company_id, consent_type, granted_by_user_id
- granted_at, status, notes

## 4. Relationship Summary

text map:
- users.company_id -> companies.id
- companies.id -> credit_scores.company_id
- companies.id -> loan_applications.company_id
- users.id -> projects.customer_user_id
- projects.id -> project_bids.project_id
- projects.accepted_bid_id -> project_bids.id
- projects.id -> project_milestones.project_id
- projects.id -> escrow_ledger_entries.project_id
- project_milestones.id -> escrow_ledger_entries.milestone_id
- projects.id -> dispute_cases.project_id
- project_milestones.id -> dispute_cases.milestone_id
- projects.id -> smart_contract_agreements.project_id
- project_bids.id -> smart_contract_agreements.accepted_bid_id

## 5. Persistence Notes

- Local development normally uses SQLite files (DATABASE_URL default fallback).
- Tests primarily use in-memory SQLite.
- Seed and random-data scripts can rebuild and repopulate schema quickly.

## 6. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial simplified schema draft |
| v1.1 | 2026-03-09 | Project-finance and smart-contract model alignment |
| v1.2 | 2026-03-16 | Synced to current codebase, startup schema patch behavior, and full entity list |
