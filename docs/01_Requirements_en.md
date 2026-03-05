# 📋 Renovation Industry Credit and Risk Management Platform - User Requirements Specification

## 1. Project Overview

### 1.1 Project Name
**RenoCredit** - Renovation Industry Credit and Risk Management Platform

### 1.2 Project Background
The Hong Kong renovation industry has continuously faced cash flow difficulties. Banks find it hard to evaluate the credit risks of renovation companies, leading to:
- High-quality renovation companies being unable to obtain loans with reasonable interest rates.
- Banks lacking industry-specific risk assessment tools.
- A lack of standardized credit scoring systems in the industry.

### 1.3 Solution
Drawing reference from TransUnion (TU) scoring models, this platform is specifically designed for the renovation industry to provide credit scoring and loan matching services. It offers:
- Industry-specific credit scoring models.
- Bank loan matching services.
- Risk management and compliance monitoring.

### 1.4 Target Users
| User Type | Description | Estimated Quantity |
|---------|------|---------|
| Renovation Company | HK Registered Renovation Enterprises | 5,000+ |
| Bank Officer | Commercial Loan Approval Personnel | 50+ |
| System Admin | Platform Operations Team | 5-10 |

---

## 2. User Role Definitions

### 2.1 Renovation Company User

**Basic Information:**
- Company Name, Business Registration (BR) Number
- Contact Person, Position, Phone, Email
- Company Address, Year Established

**Core Needs:**
| Requirement | Priority | Description |
|------|--------|------|
| Fast Credit Scoring | High | Obtain scoring results within 5 minutes |
| Fair Loan Interest Rate | High | Obtain corresponding rates based on credit score |
| Simple Application Process | High | Online submission, reducing paper usage |
| Application Status Tracking | Medium | Real-time tracking of approval progress |
| Credit Improvement Suggestions | Medium | Get suggestions to enhance credit scoring |

**Use Cases:**
```
Scenario 1: Loan Application
1. Register Account → 2. Fill Company Info → 3. Get Credit Score 
→ 4. Select Loan Plan → 5. Submit Application → 6. Await Approval

Scenario 2: Score Inquiry
1. System Login → 2. View Dashboard → 3. View Score Details 
→ 4. Download Credit Report
```

---

### 2.2 Bank Officer

**Basic Information:**
- Name, Employee Number
- Associated Bank, Department
- Permission Level

**Core Needs:**
| Requirement | Priority | Description |
|------|--------|------|
| Application Approval Dashboard | High | Centralized view of all applications |
| Credit Report Viewing | High | Detailed scores and risk factors |
| Risk Warnings & Alerts | High | Auto-flagging high-risk applications |
| Approval Decision Records | Medium | Record reasons for approval/rejection |
| Batch Processing | Low | Batch approval of straightforward applications |

**Use Cases:**
```
Scenario 1: Approve Loan Application
1. System Login → 2. View Pending Apps → 3. View Credit Report 
→ 4. Evaluate Risks → 5. Make Decision → 6. Record Reason

Scenario 2: View Statistical Reports
1. System Login → 2. Enter Report Module → 3. Select Report Type 
→ 4. Generate Report → 5. Export PDF/Excel
```

---

### 2.3 System Administrator

**Core Needs:**
| Requirement | Priority | Description |
|------|--------|------|
| User Permission Management | High | Create/Edit/Deactivate accounts |
| System Data Monitoring | High | View system operational status |
| Audit Log Viewing | High | Track all operational records |
| Scoring Model Configuration | Medium | Tune scoring parameters |
| Data Backup Management | Medium | Regular data backups |

---

## 3. Functional Requirements Specification

### 3.1 Renovation Company Features

#### 3.1.1 User Registration & Login
| Function ID | FUN-REG-001 |
|--------|-------------|
| Name | User Registration |
| Description | Renovation company registers a new account |
| Inputs | Company Name, BR Number, Contact, Email, Phone, Password |
| Validation | BR formatting (8 digits), Email format, Phone format (8 digits) |
| Outputs | Registration success notice, verification email |

| Function ID | FUN-LOG-001 |
|--------|-------------|
| Name | User Login |
| Description | Registered user logs into the system |
| Inputs | Email/Phone, Password |
| Validation | Account locks for 30 mins after 5 incorrect attempts |
| Outputs | Successful login redirects to dashboard |

#### 3.1.2 Company Profile Management
| Function ID | FUN-COM-001 |
|--------|-------------|
| Name | Fill Company Profile |
| Description | Provide detailed company information |
| Inputs | See Database Design (Companies table) |
| Required | Company Name, BR Number, Year Established, Registered Capital, Annual Revenue |
| Outputs | Save success notice |

| Function ID | FUN-COM-002 |
|--------|-------------|
| Name | Document Upload |
| Description | Upload BR, licenses, and other supporting documents |
| Inputs | File upload (PDF/JPG, max 5MB) |
| Validation | File type, file size limit |
| Outputs | Upload success notice |

#### 3.1.3 Credit Score Inquiry
| Function ID | FUN-SCR-001 |
|--------|-------------|
| Name | Get Credit Score |
| Description | System calculates and displays the credit score |
| Inputs | Company Profile (Auto-read) |
| Logic | Call scoring algorithm, compute across 5 core dimensions |
| Outputs | Total score, grade, detailed breakdown, risk factors, suggested loan terms |

| Function ID | FUN-SCR-002 |
|--------|-------------|
| Name | Download Credit Report |
| Description | Generate and download a PDF credit report |
| Logic | Generate PDF report including score details, risk factors, suggestions |
| Outputs | PDF file download |

#### 3.1.4 Loan Application
| Function ID | FUN-LOA-001 |
|--------|-------------|
| Name | Submit Loan Application |
| Description | Submit application to the bank |
| Inputs | Loan amount, purpose, term, expected rate, guarantor details |
| Validation | Loan amount cannot exceed 150% of recommended limit |
| Outputs | Success notice, application ID |

| Function ID | FUN-LOA-002 |
|--------|-------------|
| Name | Check Application Status |
| Description | Track progress of loan approval |
| Inputs | Application ID (Auto-read) |
| Outputs | Status (Pending/Under Review/Approved/Rejected), approval notes |

---

### 3.2 Bank Features

#### 3.2.1 Application Approval Dashboard
| Function ID | FUN-APP-001 |
|--------|-------------|
| Name | View Pending Applications |
| Filtering | Application date, loan amount, credit grade, risk level |
| Sorting | By date, score, amount |
| Outputs | List of applications (summarized info) |

#### 3.2.2 Credit Report Review
| Function ID | FUN-REV-001 |
|--------|-------------|
| Name | View Credit Report Details |
| Display | Company profile, score breakdown, risk factors, historical app records |
| Outputs | Full credit report page |

#### 3.2.3 Approval Decision
| Function ID | FUN-DEC-001 |
|--------|-------------|
| Name | Approve Loan Application |
| Inputs | Decision (Approve/Reject), amount, interest rate, notes/reasons |
| Validation | Approved amount cannot exceed requested amount |
| Outputs | Result notification (automated email to applicant) |

---

### 3.3 Admin Features

#### 3.3.1 User Management
| Function ID | FUN-USR-001 |
|--------|-------------|
| Name | Create User Account |
| Inputs | User type, email, name, institution, initial password |
| Outputs | Success notice |

#### 3.3.2 Audit Logging
| Function ID | FUN-AUD-001 |
|--------|-------------|
| Name | View Audit Logs |
| Filters | Date range, user, action type |
| Outputs | Activity list (Time, User, Action, IP) |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
| ID | Description | Target |
|--------|------|------|
| PERF-001 | Page load time | < 3 seconds |
| PERF-002 | Credit score calc time | < 5 seconds |
| PERF-003 | Concurrent users | ≥ 100 online |
| PERF-004 | API response time | < 500 ms |

### 4.2 Security Requirements
| ID | Description | Implementation |
|--------|------|---------|
| SEC-001 | Password Protection | bcrypt encryption |
| SEC-002 | Data Transmission | HTTPS/TLS 1.3 |
| SEC-003 | Session Management | JWT Token, expires in 30 mins |
| SEC-004 | Prevent SQL Injection | Parameterized queries |
| SEC-005 | Prevent XSS | Input filtering, output encoding |
| SEC-006 | Access Control | Role-Based Access Control (RBAC) |

### 4.3 Availability Requirements
| ID | Description | Target |
|--------|------|------|
| AVA-001 | System Availability | ≥ 99% |
| AVA-002 | Data Backup | Daily automated backup |
| AVA-003 | Disaster Recovery | RTO < 4 hours, RPO < 1 hour |

### 4.4 Compliance Requirements
| ID | Description | Corresponding Law |
|--------|------|---------|
| COM-001 | Personal Data Protection | Privacy Ordinance |
| COM-002 | Validity of E-Transactions | Electronic Transactions Ordinance |
| COM-003 | Audit Log Retention | Min. 7 years |
| COM-004 | Cross-border Data Restriction | Stored within Hong Kong |

---

## 5. UI/UX Design Requirements

### 5.1 Design Principles
- **Professionalism**: Financial style, stable and reliable.
- **Consistency**: Unified colors, fonts, button styling.
- **Usability**: Clear labels, intuitive flow, visible error prompts.
- **Responsiveness**: Support for Desktop, Tablet, Mobile.

### 5.2 Color Scheme
| Usage | Color | Hex Code |
|------|------|---------|
| Primary | Dark Blue | #0F2B4C |
| Secondary | Gold | #D4AF37 |
| Success | Green | #28A745 |
| Warning | Yellow | #FFC107 |
| Error | Red | #DC3545 |
| Background | Light Gray | #F8F9FA |

---

## 6. Delivery Milestones

| Deliverable | Format | Person-in-Charge | Deadline |
|--------|------|--------|---------|
| Frontend Code | GitHub Repo | Member 2 | 4/7 |
| Backend Code | GitHub Repo | Member 3,4 | 4/7 |
| Sys Design Doc | PDF | Member 1 | 4/14 |
| Test Report | PDF | Member 5 | 4/14 |
| Presentation | PPT/PDF | All | 4/18 |
| Demo Video | MP4 | Member 5 | 4/18 |

---

## 7. Version History

| Version | Date | Author | Changes |
|------|------|------|---------|
| v1.0 | 2026-03-03 | Project Team | Initial Version |
