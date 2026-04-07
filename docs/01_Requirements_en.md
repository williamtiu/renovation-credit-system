# DecoFinance User Requirements Specification

## 1. Project Overview

### 1.1 Project Name
DecoFinance: Renovation Industry Credit, Trust, and Project Finance Platform

### 1.2 Business Problem
Hong Kong renovation companies often face working-capital pressure, delayed customer payments, and difficulty proving operational quality to lenders. Traditional lending reviews do not capture renovation-specific indicators such as licence validity, OSH readiness, dispute history, or milestone delivery performance.

### 1.3 Product Goal
DecoFinance provides a renovation-specific trust and finance platform that combines:

- company profile and compliance management;
- trust scoring and credit reporting;
- project bidding and milestone workflows;
- internal escrow-state tracking and dispute handling;
- loan application review and audit visibility.

### 1.4 Primary Users
| User Type | Description | Current System Role |
|------|------|------|
| Renovation Company User | Contractor representative managing company profile, bids, and milestone submissions | `company_user` |
| Customer | Property owner or buyer creating projects and approving milestones | `customer` |
| Reviewer | Internal operations or finance reviewer handling disputes and loan decisions | `reviewer` |
| Administrator | Platform operator with audit and control visibility | `admin` |

## 2. Core User Needs

### 2.1 Company User
- Register and log in securely.
- Maintain company, licence, insurance, OSH, and ESG information.
- Generate trust scores and download credit reports.
- Apply for financing with optional project linkage.
- Bid on customer projects when verified.
- Submit milestone evidence on contracted projects.

### 2.2 Customer
- Register and create renovation projects.
- Review competing bids and accept one contractor.
- Create milestones and review submitted work.
- Approve milestones to trigger release states.
- Open disputes when progress or quality is contested.

### 2.3 Reviewer
- Review and decide loan applications.
- Resolve disputes and monitor risk exposure.
- Review company report, trust score, and audit activity.

### 2.4 Administrator
- Monitor dashboard metrics across companies, projects, loans, and disputes.
- Review audit logs.
- Manage sensitive workflows and restricted actions.

## 3. Functional Requirements

### 3.1 Identity and Access
| ID | Requirement |
|------|------|
| FUN-ID-001 | The system shall support user registration with username, email, password, and role. |
| FUN-ID-002 | The system shall hash passwords before storage. |
| FUN-ID-003 | The system shall use authenticated session-based access control. |
| FUN-ID-004 | The system shall enforce role and ownership restrictions on protected routes. |

### 3.2 Company and Trust Profile
| ID | Requirement |
|------|------|
| FUN-COM-001 | The system shall store company legal, contact, operational, licence, insurance, OSH, and ESG fields. |
| FUN-COM-002 | The system shall calculate trust-oriented credit scores using renovation-specific factors. |
| FUN-COM-003 | The system shall cache trust score and risk level on the company profile. |
| FUN-COM-004 | The system shall expose a detailed company credit report page with PDF download. |
| FUN-COM-005 | The system shall support report comparison between companies. |

### 3.3 Loan Workflow
| ID | Requirement |
|------|------|
| FUN-LOA-001 | The system shall let authenticated users submit loan applications. |
| FUN-LOA-002 | A loan application may optionally reference a project. |
| FUN-LOA-003 | Reviewer and admin users shall be able to approve or reject applications with decision details. |
| FUN-LOA-004 | Approved applications shall support disbursement and repayment tracking. |

### 3.4 Project Marketplace
| ID | Requirement |
|------|------|
| FUN-PRJ-001 | Customers shall be able to create and view renovation projects. |
| FUN-PRJ-002 | Eligible company users shall be able to submit bids to open projects. |
| FUN-PRJ-003 | Customers shall be able to accept exactly one bid per project. |
| FUN-PRJ-004 | The project detail page shall show bids, milestones, disputes, and contract summary. |

### 3.5 Milestones, Escrow State, and Smart Contract Logic
| ID | Requirement |
|------|------|
| FUN-CON-001 | The system shall create an internal smart-contract agreement record for each project. |
| FUN-CON-002 | Bid acceptance shall activate the contract and bind the selected contractor. |
| FUN-CON-003 | Milestone creation shall create planned escrow-state entries. |
| FUN-CON-004 | Milestone submission shall update contract state to pending review. |
| FUN-CON-005 | Milestone approval shall create released ledger entries and update contract balances. |
| FUN-CON-006 | Opening a dispute shall freeze relevant payment state and move the contract into a frozen state. |
| FUN-CON-007 | Resolving a dispute shall re-evaluate the contract state. |

### 3.6 Audit and Monitoring
| ID | Requirement |
|------|------|
| FUN-AUD-001 | The system shall record audit logs for registration, login, score generation, loan decisions, project actions, and dispute actions. |
| FUN-AUD-002 | The dashboard shall summarize portfolio metrics for companies, projects, loans, and disputes. |
| FUN-AUD-003 | The system shall provide JSON statistics for automation and testing. |

### 3.7 Demo and Testing Support
| ID | Requirement |
|------|------|
| FUN-OPS-001 | The system shall provide a deterministic sample seed script for demo data. |
| FUN-OPS-002 | The system shall provide a random data generator with optional database reset. |
| FUN-OPS-003 | The system shall include automated backend and Selenium frontend tests. |

## 4. Business Rules

- Only active and verified companies may bid.
- Only the project owner or admin may accept a bid.
- Only the project owner or admin may create or approve milestones.
- Only the assigned company side may submit milestone evidence.
- Disputes freeze payment state until resolution.
- Legacy records without project linkage must continue to work.

## 5. Non-Functional Requirements

### 5.1 Security
- Passwords are stored as salted hashes through Werkzeug password utilities.
- Protected actions require authenticated sessions.
- Role-based access control is enforced in route decorators.
- ORM-based queries are used to reduce SQL injection risk.

### 5.2 Reliability
- The app must remain SQLite-friendly for local demo and test execution.
- Schema creation must work through `db.create_all()` without a migration dependency.

### 5.3 Usability
- UI must support desktop and mobile-friendly layouts.
- The dashboard, report, comparison, and project pages must be usable by non-technical evaluators during demo and review.

## 6. Acceptance Criteria

- Users can register and log in by role.
- Companies can be created, edited, scored, and reported.
- Credit report PDF download works.
- Customers can create projects and accept bids.
- Milestones can be created, submitted, and approved.
- Disputes can be opened and resolved.
- Smart contract state is visible on the project detail page.
- Loan review, disbursement, and repayment workflows still work.
- Dashboard and API statistics remain available.
- Random data generation and automated tests run successfully.

## 7. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial course requirement draft |
| v1.1 | 2026-03-09 | Updated to match implemented DecoFinance workflows |

