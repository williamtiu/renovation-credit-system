# DecoFinance ?唳摨挽霈?
## 1. ?唳摨?餈?
DecoFinance 雿輻撣行? SQLite ?末暺恕?潛? Flask-SQLAlchemy 璅∪???
- 璅∪?撘紡嚗??典?冽??`db.create_all()`??- ?澆捆?找耨銵伐?摨?臬?嗆???companies 銵剁?憒?蝻箏? OSH/ESG ??瘛餃???- 餈宏獢嚗?摨葉銝??具?
## 2. 摰?蝏?
### 2.1 頨思遢?挪?桀?摰∟恣
- users嚗?瘀?
- audit_logs嚗恣霈⊥敹?
- consent_records嚗??扇敶?

### 2.2 ?砍?縑??- companies嚗?賂?
- credit_scores嚗縑?刻???
- loan_applications嚗晰甈曄霂瘀?

### 2.3 憿寧????蝥衣??- projects嚗★?殷?
- project_bids嚗★?格???
- project_milestones嚗★?桅?蝔?嚗?- escrow_ledger_entries嚗?蝞∪?蝐餉揭?∠嚗?- dispute_cases嚗?蝥瑟?隞塚?
- smart_contract_agreements嚗?賢?蝥血?霈殷?

## 3. 銵典翰??
### 3.1 users嚗?瘀?
?喲??
- id, username, email, password_hash
- role, is_active, company_id
- created_at, updated_at

### 3.2 companies嚗?賂?
?喲??
- 頨思遢/?頂嚗ompany_name, business_registration, contact 摮挾
- 餈嚗mployee_count, annual_revenue, project_count_completed
- ??嚗as_license, licence 摮挾嚗nsurance 摮挾
- 摰/ESG嚗sh_policy_in_place, safety_training_coverage, heavy_lifting_compliance, lifting_equipment_available, safety_incident_count, esg_policy_level, green_material_ratio
- 靽⊥??嗆?status, risk_level, trust_score_cached, dispute_count_cached, is_verified_for_bidding

### 3.3 credit_scores嚗縑?刻???
?喲??
- company_id, credit_score, credit_grade, risk_level
- 蝏辣霂?嚗inancial, operational, history, qualification, industry risk嚗?- recommended_loan_limit, recommended_interest_rate
- risk_factors, scoring_model_version, scored_at, expires_at

### 3.4 loan_applications嚗晰甈曄霂瘀?
?喲??
- company_id, ?舫?project_id
- loan_amount, loan_purpose, loan_term_months
- application_status, approved_amount, approved_interest_rate
- ?冽狡??甈曇?頦芸?畾?- reviewed_by_user_id, decision_at, notes, rejection_reason

### 3.5 projects嚗★?殷?
?喲??
- customer_user_id
- title, description, property_type, property_address, district
- budget_amount, target dates, status
- accepted_bid_id, created_at, updated_at

### 3.6 project_bids嚗★?格???
?喲??
- project_id, company_id, submitted_by_user_id
- bid_amount, proposed_duration_days, proposal_summary, notes
- status, created_at, updated_at

### 3.7 project_milestones嚗★?桅?蝔?嚗??喲??
- project_id, sequence_no, name, description
- planned_percentage, planned_amount, due_date
- status, evidence_notes, submitted_at, approved_at
- submitted_by_user_id, reviewed_by_user_id

### 3.8 escrow_ledger_entries嚗?蝞∪?蝐餉揭?∠嚗??喲??
- project_id, ?舫?milestone_id
- entry_type, amount, currency, status
- reference_note, created_by_user_id, created_at

### 3.9 dispute_cases嚗?蝥瑟?隞塚?
?喲??
- project_id, ?舫?milestone_id
- opened_by_user_id, against_company_id
- dispute_type, description, status
- resolution_summary, opened_at, resolved_at

### 3.10 smart_contract_agreements嚗?賢?蝥血?霈殷?
?喲??
- project_id嚗銝銝撖嫣?嚗?- accepted_bid_id, customer_user_id, contractor_company_id
- contract_code, status
- budget_amount, escrow_balance, released_amount, frozen_amount
- milestones_total, approved_milestones, dispute_count
- terms_json, event_log_json, activated_at, last_event_at

### 3.11 audit_logs嚗恣霈⊥敹?
?喲??
- actor_user_id, action, target_type, target_id
- details_json, created_at

### 3.12 consent_records嚗??扇敶?
?喲??
- company_id, consent_type, granted_by_user_id
- granted_at, status, notes

## 4. ?喟頂??

???嚗?- users.company_id -> companies.id
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

## 5. ???秩??
- ?砍撘?虜雿輻 SQLite ?辣嚗ATABASE_URL 暺恕?嚗?- 瘚?銝餉?雿輻?? SQLite??- 蝘????箸?株??砍隞亙翰??撱箏??憛怠?璅∪???
## 6. ??
| ? | ?交? | ?? |
|------|------|------|
| v1.0 | 2026-03-03 | ??蝞?芋撘?獢?|
| v1.1 | 2026-03-09 | 憿寧????賢?蝥行芋?笆朣?|
| v1.2 | 2026-03-16 | 銝??誨????冽璅∪?靽株‘銵蛹???游?雿?銵典?甇?|

