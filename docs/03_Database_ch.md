# DecoFinance 数据库设计

## 1. 数据库概述

DecoFinance 使用带有 SQLite 友好默认值的 Flask-SQLAlchemy 模型。

- 模式引导：应用启动时的 `db.create_all()`。
- 兼容性修补：应用启动时检查 companies 表，如果缺少 OSH/ESG 列则添加。
- 迁移框架：仓库中不存在。

## 2. 实体组

### 2.1 身份、访问和审计
- users（用户）
- audit_logs（审计日志）
- consent_records（同意记录）

### 2.2 公司和信托
- companies（公司）
- credit_scores（信用评分）
- loan_applications（贷款申请）

### 2.3 项目融资和合约状态
- projects（项目）
- project_bids（项目投标）
- project_milestones（项目里程碑）
- escrow_ledger_entries（托管分类账条目）
- dispute_cases（纠纷案件）
- smart_contract_agreements（智能合约协议）

## 3. 表快照

### 3.1 users（用户）
关键列：
- id, username, email, password_hash
- role, is_active, company_id
- created_at, updated_at

### 3.2 companies（公司）
关键列：
- 身份/联系：company_name, business_registration, contact 字段
- 运营：employee_count, annual_revenue, project_count_completed
- 合规：has_license, licence 字段，insurance 字段
- 安全/ESG：osh_policy_in_place, safety_training_coverage, heavy_lifting_compliance, lifting_equipment_available, safety_incident_count, esg_policy_level, green_material_ratio
- 信托状态：status, risk_level, trust_score_cached, dispute_count_cached, is_verified_for_bidding

### 3.3 credit_scores（信用评分）
关键列：
- company_id, credit_score, credit_grade, risk_level
- 组件评分（financial, operational, history, qualification, industry risk）
- recommended_loan_limit, recommended_interest_rate
- risk_factors, scoring_model_version, scored_at, expires_at

### 3.4 loan_applications（贷款申请）
关键列：
- company_id, 可选 project_id
- loan_amount, loan_purpose, loan_term_months
- application_status, approved_amount, approved_interest_rate
- 拨款和还款跟踪字段
- reviewed_by_user_id, decision_at, notes, rejection_reason

### 3.5 projects（项目）
关键列：
- customer_user_id
- title, description, property_type, property_address, district
- budget_amount, target dates, status
- accepted_bid_id, created_at, updated_at

### 3.6 project_bids（项目投标）
关键列：
- project_id, company_id, submitted_by_user_id
- bid_amount, proposed_duration_days, proposal_summary, notes
- status, created_at, updated_at

### 3.7 project_milestones（项目里程碑）
关键列：
- project_id, sequence_no, name, description
- planned_percentage, planned_amount, due_date
- status, evidence_notes, submitted_at, approved_at
- submitted_by_user_id, reviewed_by_user_id

### 3.8 escrow_ledger_entries（托管分类账条目）
关键列：
- project_id, 可选 milestone_id
- entry_type, amount, currency, status
- reference_note, created_by_user_id, created_at

### 3.9 dispute_cases（纠纷案件）
关键列：
- project_id, 可选 milestone_id
- opened_by_user_id, against_company_id
- dispute_type, description, status
- resolution_summary, opened_at, resolved_at

### 3.10 smart_contract_agreements（智能合约协议）
关键列：
- project_id（唯一一对一）
- accepted_bid_id, customer_user_id, contractor_company_id
- contract_code, status
- budget_amount, escrow_balance, released_amount, frozen_amount
- milestones_total, approved_milestones, dispute_count
- terms_json, event_log_json, activated_at, last_event_at

### 3.11 audit_logs（审计日志）
关键列：
- actor_user_id, action, target_type, target_id
- details_json, created_at

### 3.12 consent_records（同意记录）
关键列：
- company_id, consent_type, granted_by_user_id
- granted_at, status, notes

## 4. 关系摘要

文本映射：
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

## 5. 持久化说明

- 本地开发通常使用 SQLite 文件（DATABASE_URL 默认回退）。
- 测试主要使用内存 SQLite。
- 种子和随机数据脚本可以快速重建和重新填充模式。

## 6. 版本历史
| 版本 | 日期 | 摘要 |
|------|------|------|
| v1.0 | 2026-03-03 | 初始简化模式草案 |
| v1.1 | 2026-03-09 | 项目融资和智能合约模型对齐 |
| v1.2 | 2026-03-16 | 与当前代码库、启动时模式修补行为和完整实体列表同步 |
