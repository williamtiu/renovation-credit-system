# Deliverable 1: Refined User Requirement

## 1. Objective

Upgrade DecoFinance from a basic renovation-company credit scoring and loan tracking application into a role-aware renovation trust platform that supports:

- customer project creation;
- verified company participation;
- bid and contract selection;
- milestone-based payment state tracking;
- dispute-triggered payment freeze logic;
- compliance-aware trust scoring;
- continued loan application and review workflows.

The requirement must fit the current Flask, SQLAlchemy, Jinja2 codebase and be implementable incrementally without a full rewrite.

## 2. Deep Review of the Raw Requirement

### 2.1 What the raw requirement does well

- It defines a strong business direction around trust, transparency, and financing in the Hong Kong renovation market.
- It identifies meaningful domain features: contractor verification, milestone payments, disputes, and financing access.
- It recognizes that company credibility should be driven by licensing, operational history, and financial signals rather than marketing claims.

### 2.2 Gaps and issues found in the raw requirement

- It mixes business goals, legal interpretation, desired architecture, and implementation details in one document.
- It assumes integrations and workflows that do not exist in the current codebase.
- It describes a future-state platform, but the actual repository is a Flask monolith with SQLite-friendly setup and server-rendered templates.
- It does not distinguish between mandatory first-release capability and future integration readiness.
- It does not define enough operational detail for projects, bids, milestones, disputes, or audit history.
- It lacks structured acceptance criteria for engineering completion.

### 2.3 Technical feasibility conclusion

The raw requirement is feasible only if broken into staged upgrades. The current system can realistically absorb the following in the next major version:

- role-aware user management;
- customer-facing project records;
- company bidding flow;
- milestone tracking;
- internal escrow-state records;
- dispute management;
- compliance-aware trust scoring;
- audit logging.

The following should be treated as future integrations, not immediate implementation requirements:

- live bank escrow movement;
- real-time BD verification;
- TransUnion or other credit bureau integration;
- insurer API integration;
- full AML/CFT platform workflows.

## 3. Current System Context

The current application now supports:

- role-aware registration and login;
- company profile creation and editing with compliance fields;
- trust-score calculation and storage;
- loan application review, disbursement, and repayment;
- dashboard, charts, and JSON statistics endpoints;
- customer project creation and contractor bidding;
- milestone planning, submission, and approval;
- dispute handling, escrow-state records, and audit logs;
- company credit report rendering, comparison, and PDF export;
- application-layer smart contract tracking per project.

The current application still does not support:

- real bank settlement integration;
- external compliance verification APIs;
- blockchain-backed fund movement;
- production-grade document storage;
- migration-managed schema evolution.

## 4. Refined Requirement Scope

### 4.1 In scope

- Continue improving the existing role-aware users: admin, reviewer, company_user, customer.
- Continue extending company verification and monitoring depth.
- Mature customer project, bid, milestone, and dispute flows.
- Continue using escrow-state ledger entries and smart contract tracking.
- Extend trust-score interpretation and reporting depth.
- Keep loan flows working with optional project linkage.
- Preserve and extend audit logging for important business actions.

### 4.2 Out of scope

- real fund transfer with a bank;
- real third-party compliance or credit integrations;
- full replacement of existing Flask business workflows with a separate runtime;
- mobile application;
- production-grade workflow orchestration platform.

## 5. User Roles

### 5.1 Customer

The customer is an end user seeking renovation services.

### 5.2 Company User

The company user manages one renovation company and participates in projects and financing.

### 5.3 Reviewer

The reviewer is an operational or financing reviewer responsible for verification, disputes, and loan decisions.

### 5.4 Administrator

The administrator manages users, platform oversight, and audit visibility.

## 6. User Stories and Use Cases

### 6.1 Identity and access

As a new user, I want to register with the correct role so the system shows the functions relevant to me.

As an admin, I want users to be restricted by role so customers, companies, and reviewers cannot access the wrong workflows.

### 6.2 Company verification and trust

As a company user, I want to maintain my licence, insurance, and operational details so I can qualify for bids and financing.

As a reviewer, I want to mark company verification status so only credible companies can participate in the marketplace.

As a customer, I want to view trust indicators before selecting a company so I can reduce renovation risk.

### 6.3 Project and bid workflow

As a customer, I want to create a renovation project with budget, scope, and timeline so qualified companies can bid on it.

As a company user, I want to submit a bid to an open project so I can compete for work.

As a customer, I want to accept one bid so the project can move into execution.

### 6.4 Milestones and payment state

As a customer, I want project work to be broken into milestones so progress and payment decisions are structured.

As a company user, I want to submit milestone completion so the customer can review progress.

As a customer, I want to approve or dispute a milestone so payment release is tied to visible progress.

### 6.5 Disputes

As a customer or company user, I want to open a dispute on a project or milestone so unresolved issues are formally tracked.

As a reviewer, I want dispute status and notes to be visible so I can monitor platform risk and workflow state.

### 6.6 Financing

As a company user, I want my trust score and project history to support a financing application so I can seek funding more credibly.

As a reviewer, I want a clear decision workflow with reasons and conditions so every financing decision is traceable.

## 7. Functional Requirements

### 7.1 Identity and access

REQ-ID-001
The system shall support these user roles: admin, reviewer, company_user, customer.

REQ-ID-002
The system shall store unique username and email for each user.

REQ-ID-003
The system shall support linking a company user to one company record.

REQ-ID-004
The system shall enforce role and ownership restrictions on web routes and JSON APIs.

### 7.2 Company profile and verification

REQ-COM-001
The system shall extend company profiles with licence and insurance data, verification statuses, and trust-related summary fields.

REQ-COM-002
The system shall allow reviewer or admin users to update verification status.

REQ-COM-003
The system shall flag expired or unverified compliance records in company detail views and trust score outputs.

### 7.3 Project and bids

REQ-PRJ-001
The system shall allow customer users to create, edit, and view their own projects.

REQ-PRJ-002
The system shall allow eligible company users to submit bids to open projects.

REQ-PRJ-003
The system shall allow a customer to accept exactly one bid per project.

REQ-PRJ-004
The system shall persist project and bid status history sufficiently for audit review.

### 7.4 Milestones and escrow-state tracking

REQ-MIL-001
The system shall support milestones for contracted projects.

REQ-MIL-002
Each milestone shall contain sequence, amount, percentage, due date, status, and evidence notes.

REQ-MIL-003
The system shall track internal escrow-state entries for planned, held, released, retained, and frozen amounts.

REQ-MIL-004
Milestone approval shall drive payment state changes.

### 7.5 Disputes

REQ-DIS-001
The system shall allow customer and company users to open disputes against a project or milestone.

REQ-DIS-002
Opening a dispute shall freeze related releasable payment states until resolved.

REQ-DIS-003
Dispute records shall store status, description, timestamps, and resolution summary.

### 7.6 Trust score and loan workflow

REQ-SCR-001
The existing credit score workflow shall evolve into a broader trust score while preserving compatibility with existing data and loan features.

REQ-SCR-002
The trust score shall incorporate current financial and operational inputs plus compliance and dispute indicators.

REQ-SCR-003
Loan applications shall continue to function and may optionally reference a project.

REQ-SCR-004
Review decisions on loan applications shall remain traceable.

### 7.7 Audit logging

REQ-AUD-001
The system shall record audit events for key actions including verification changes, project creation, bid acceptance, milestone approval, dispute creation, and loan review decisions.

## 8. Business Rules and Edge Cases

- Only active and verified companies may submit bids.
- Only one bid may be accepted per project.
- Milestones may only be created for contracted projects.
- A disputed milestone may not be released until the dispute is resolved.
- Loan flows for older records without project links must continue to work.
- Company users must not see or modify projects they do not own through participation.
- Customers must not approve milestones on projects they do not own.

## 9. Acceptance Criteria

The requirement is considered complete when all of the following are true:

- A user can register and log in under a supported role.
- Role and ownership restrictions are enforced across the main workflows.
- A customer can create and manage a project.
- A verified company user can submit a bid to an open project.
- A customer can accept one bid and convert the project to contracted state.
- Milestones can be created and submitted for a contracted project.
- A customer can approve or dispute a submitted milestone.
- A dispute freezes related internal escrow-state entries and the smart contract state.
- Project detail pages expose smart contract summary and recent contract events.
- Company report pages expose compliance and trust indicators.
- Trust score outputs include compliance-related risk factors.
- Loan applications still work for legacy and new records.
- Audit logs are created for key business actions.
- Automated tests cover role, project, milestone, dispute, contract, and scoring behaviors.

## 10. Summary

The refined requirement converts a broad strategic concept into an implementable product definition for the current DecoFinance repository. It keeps the business goal intact while imposing realistic scope, explicit workflows, edge-case coverage, and acceptance criteria that can be used directly by engineering or an AI coding assistant.