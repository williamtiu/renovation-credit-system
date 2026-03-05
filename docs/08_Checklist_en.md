# 📋 COMP7300 Project Deliverables Checklist

## Project Name: RenoCredit
**Group Number:** ______  
**Submission Date:** 2026-04-20  
**Group Leader:** ______  

---

## ✅ Usage Instructions

- [ ] Check (✓) or cross (✗) the boxes
- [ ] Mark off items immediately as they are completed
- [ ] Note the name of the assigned member
- [ ] Record the completion date
- [ ] Add explanations in the Notes field for any issues

---

## 📁 Part 1: System Design Documentation

### 1.1 User Requirements Specification

- [ ] **01_User_Spec.md**
  - [ ] Project Overview complete
  - [ ] User Roles clearly defined
  - [ ] Functional Requirements detailed
  - [ ] Non-functional Requirements clear (Performance, Security, Usability)
  - [ ] UI Design requirements professional
  - [ ] Data validation rules complete
  - [ ] Error handling mechanisms explained
  - [ ] Deliverables list included
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.2 Database Design Documentation

- [ ] **02_Database_Design.md**
  - [ ] Database overview complete
  - [ ] ER Diagram clear (using proper tools)
  - [ ] All table schemas thoroughly designed
    - [ ] users table
    - [ ] companies table
    - [ ] credit_scores table
    - [ ] loan_applications table
    - [ ] banks table
    - [ ] audit_logs table
  - [ ] SQL DDL scripts complete
  - [ ] Indexes suitably applied
  - [ ] Constraints present (CHECK, FOREIGN KEY)
  - [ ] Data migration strategy explained
  - [ ] Backup strategy explained
  - [ ] Performance optimization suggestions
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.3 System Architecture Design Documentation

- [ ] **03_System_Design.md**
  - [ ] High-level architecture diagram clear
  - [ ] Tech-stack justification solid
  - [ ] System modules logically partitioned
  - [ ] Core business flow Swimlane diagrams
    - [ ] User Registration
    - [ ] Credit Scoring Calculation
    - [ ] Loan Application Approval
  - [ ] API Design methodology intact
  - [ ] Security details comprehensive (Auth, Encryption, RBAC)
  - [ ] Performance optimization strategy
  - [ ] Deployment architecture mapped
  - [ ] Testing strategy clarified
  - [ ] Monitoring & Logging design
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.4 Compliance Analysis Report

- [ ] **04_Compliance_Analysis.md**
  - [ ] Applicable Law list full
    - [ ] Personal Data (Privacy) Ordinance (PDPO)
    - [ ] Money Lenders Ordinance
    - [ ] Electronic Transactions Ordinance
    - [ ] Occupational Safety and Health Regulations
    - [ ] Banking Ordinance
  - [ ] PDPO 6 Data Protection Principles analysis
  - [ ] Business model compliance clarification
  - [ ] Cross-border data transfer compliance
  - [ ] Data breach response protocols
  - [ ] E-Contract validity analysis
  - [ ] OSH Compliance scoring breakdown
  - [ ] Anti-Money Laundering (AML) measures
  - [ ] Legal risk assessment
  - [ ] Regulatory contact info
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.5 API Documentation

- [ ] **05_API_Documentation.md**
  - [ ] API Overview complete (Base URL, Auth method)
  - [ ] Auth Services
    - [ ] POST /auth/register
    - [ ] POST /auth/login
    - [ ] POST /auth/refresh
    - [ ] POST /auth/logout
  - [ ] Company Services
    - [ ] GET /companies
    - [ ] PUT /companies/me
    - [ ] POST /companies/documents
    - [ ] GET /companies/me/score
    - [ ] POST /companies/me/score/calculate
  - [ ] Loan Services
    - [ ] POST /loans
    - [ ] GET /loans
    - [ ] GET /loans/:id
    - [ ] POST /loans/:id/withdraw
    - [ ] POST /loans/:id/approve
    - [ ] POST /loans/:id/reject
  - [ ] Report Services
    - [ ] GET /reports/credit-score
    - [ ] GET /reports/loan-history
  - [ ] Admin Services
    - [ ] GET /admin/users
    - [ ] GET /admin/audit-logs
  - [ ] Error code reference table
  - [ ] Rate limit policies
  - [ ] Extensive Req/Res payloads examples
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.6 Test Report

- [ ] **06_Test_Report.md**
  - [ ] Testing overview detailed
  - [ ] Unit Tests
    - [ ] Credit scoring algorithm
    - [ ] User auth operations
    - [ ] Database operations
  - [ ] Integration Tests
    - [ ] Loan app flow
    - [ ] Rest API flows
  - [ ] Performance Tests
    - [ ] API response limits
    - [ ] DB query loads
    - [ ] Score algo speeds
  - [ ] Frontend Tests
    - [ ] Component rendering
    - [ ] Cross-browser sanity
  - [ ] Security Tests
    - [ ] SQL Injection sweeps
    - [ ] XSS sweeps
    - [ ] Pentest summary
  - [ ] Code Coverage Stats
  - [ ] Bug logs and fix ratios
  - [ ] Final sign-offs and launch recommendations
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.7 Task Division Declaration

- [ ] **07_Task_Division.md**
  - [ ] Member profile table
    - [ ] Name
    - [ ] Student ID
    - [ ] Role
    - [ ] Email
  - [ ] Detailed task matrix
  - [ ] Contribution weighting (%)
  - [ ] Lines of Code summary
  - [ ] Meeting notes logs
  - [ ] GitHub insights attached
  - [ ] Signatures from all members
  - [ ] Professor acknowledgment block
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

### 1.8 Presentation Outline

- [ ] **08_Presentation_Outline.md**
  - [ ] Slide 1: Title Page
  - [ ] Slide 2: Project Background
  - [ ] Slide 3: Market Analysis
  - [ ] Slide 4: Core Features
  - [ ] Slide 5: Credit Scoring Model
  - [ ] Slide 6: System Architecture
  - [ ] Slide 7: Database Design
  - [ ] Slide 8-10: System Demos
  - [ ] Slide 11: Compliance Analysis
  - [ ] Slide 12: Innovations
  - [ ] Slide 13: Test Results
  - [ ] Slide 14: Project Progress
  - [ ] Slide 15: Task Division
  - [ ] Slide 16: Business Model
  - [ ] Slide 17: Risk Analysis
  - [ ] Slide 18: Future Timeline
  - [ ] Slide 19: Conclusion
  - [ ] Slide 20: Q&A
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Total Slides:** ______________  
  **Notes:** ________________________________

---

### 1.9 Presentation Script

- [ ] **09_Presentation_Script.md**
  - [ ] Opening (2 mins)
  - [ ] Market Analysis (2 mins)
  - [ ] Core Features (3 mins)
  - [ ] Architecture Overview (2 mins)
  - [ ] System Demos (5 mins)
  - [ ] Compliance (2 mins)
  - [ ] Innovation points (1 min)
  - [ ] Test reporting (1 min)
  - [ ] Conclusion (2 mins)
  - [ ] Prepped Q&A (5 common questions)
  - [ ] Staging tips
  - [ ] Prep checklist
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Est. Time:** ______________  
  **Notes:** ________________________________

---

### 1.10 Industry Reference Data

- [ ] **10_Industry_Data.md**
  - [ ] Renovation company numbers
  - [ ] Total output metrics
  - [ ] Workforce stats
  - [ ] Licenses distributions
  - [ ] Financing demand charts
  - [ ] Loan industry size tracking
  - [ ] Safety failure breakdowns
  - [ ] OSH adoption rates
  - [ ] Banking participation
  - [ ] Score distribution simulation
  - [ ] Market gap potentials
  - [ ] Direct references to all origins
  
  **Owner:** ______________  
  **Completion Date:** ______________  
  **Word Count:** ______________  
  **Notes:** ________________________________

---

## 💻 Part 2: Source Code

### 2.1 Backend Code

- [ ] **app.py** - Main Flask Entry 
  - [ ] Configs valid
  - [ ] Blueprints linked
  - [ ] DB init mapped
  - [ ] Port mapped to 5001
  - [ ] Debug mode setups
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **models/** - Data Models
  - [ ] database.py - DB definitions
  - [ ] user.py - User model
  - [ ] company.py - Company model
  - [ ] credit_score.py - Score persistence
  - [ ] loan_application.py - Loan mapping
  - [ ] bank.py - Bank tables
  - [ ] audit_log.py - Audit entries
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **routes/** - API Handlers
  - [ ] main.py - Base views
  - [ ] auth.py - Login views
  - [ ] companies.py - Company management
  - [ ] scores.py - Score engines
  - [ ] loans.py - Application API
  - [ ] reports.py - Reports generators
  - [ ] admin.py - Backstage tools
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **services/** - Business Logic
  - [ ] credit_scorer.py - Logic engines
  - [ ] auth_service.py - Sessions
  - [ ] loan_service.py - Triggers
  - [ ] report_service.py - Exports
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

### 2.2 Frontend Code

- [ ] **templates/** - HTML Views
  - [ ] base.html 
  - [ ] index.html
  - [ ] dashboard.html
  - [ ] companies/
    - [ ] list.html ✅
    - [ ] form.html ✅
    - [ ] detail.html ✅
  - [ ] loans/
    - [ ] list.html ✅
    - [ ] form.html ✅
    - [ ] review.html 
    - [ ] detail.html 
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **static/** - Static Assets
  - [ ] css/style.css 
  - [ ] js/main.js
  - [ ] images/
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

### 2.3 Configuration Files

- [ ] **requirements.txt** - Python Dependencies
  - [ ] Flask==3.0.0
  - [ ] Flask-SQLAlchemy==3.1.1
  - [ ] Flask-WTF==1.2.1
  - [ ] WTForms==3.1.1
  - [ ] python-dateutil==2.8.2
  - [ ] Other core packages
  
  **Owner:** ______________  
  **Status:** □ Done □ Outdated  
  **Notes:** ________________________________

---

- [ ] **.env** - Environment Variables
  - [ ] SECRET_KEY (Randomized gen)
  - [ ] DATABASE_URL
  - [ ] FLASK_ENV
  - [ ] FLASK_DEBUG
  
  **Owner:** ______________  
  **Status:** □ Done □ Missing  
  **Notes:** ________________________________

---

- [ ] **.gitignore** - Git Rules
  - [ ] venv/
  - [ ] __pycache__/
  - [ ] *.pyc
  - [ ] instance/
  - [ ] .env
  - [ ] .DS_Store
  
  **Owner:** ______________  
  **Status:** □ Done □ Pending  
  **Notes:** ________________________________

---

## 🧪 Part 3: Testing & Deployment

### 3.1 Test Scripts

- [ ] **test_system.py** - E2E Runs
  - [ ] Company creation
  - [ ] Calc runs
  - [ ] Scoring saves
  - [ ] App creation
  - [ ] Approvals checks
  - [ ] Validating dashboard states
  
  **Owner:** ______________  
  **Status:** □ Pass □ Fail □ Pending  
  **Pass Rate:** ______________%  
  **Notes:** ________________________________

---

- [ ] **docs/test_data.sql** - QA Data
  - [ ] 5 dummy banks
  - [ ] 10 dummy users
  - [ ] 10 test firms
  - [ ] 10 mock scores
  - [ ] 10 fake loans
  - [ ] 8 filler audits
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing  
  **Notes:** ________________________________

---

### 3.2 Deployment Scripts

- [ ] **deploy.sh** - Deployment Shell
  - [ ] SSH sanity
  - [ ] rsync pipelines
  - [ ] venv mappings
  - [ ] dependency fetching
  - [ ] DB injections
  - [ ] daemon reboots
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **full-deploy.sh** - Extended Deploy
  - [ ] 10 Step flows
  - [ ] Fallbacks/Error trips
  - [ ] Pretty logging
  - [ ] Feedback bars
  - [ ] Bootup validates
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing □ Bugged  
  **Notes:** ________________________________

---

- [ ] **start.sh** - Quick Runner
  - [ ] Clears zombie ports
  - [ ] Reloads py-envs
  - [ ] Touches UI assets
  - [ ] Boots app.py
  
  **Owner:** ______________  
  **Status:** □ Done □ Testing  
  **Notes:** ________________________________

---

- [ ] **deploy_restart.sh** - Restart logic
- [ ] **deploy_stop.sh** - Stop logic

  **Owner:** ______________  
  **Status:** □ Done □ Testing  
  **Notes:** ________________________________

---

### 3.3 Deployment Docs

- [ ] **DEPLOY_COMPLETE.md** 
  - [ ] Master manual
  - [ ] Manual over-rides
  - [ ] Arch mappings
  - [ ] Command lists
  - [ ] Diagnostic runbooks
  - [ ] Security audits
  
  **Owner:** ______________  
  **Status:** □ Done □ WiP  
  **Notes:** ________________________________

---

- [ ] **DEPLOY_5001.md** - Port 5001 Guide
- [ ] **DEPLOY_SUMMARY.md** - Deploy wrap-ups
- [ ] **QUICK_DEPLOY.md** - Rapid 1-pager

  **Owner:** ______________  
  **Status:** □ Done □ WiP  
  **Notes:** ________________________________

---

## 📊 Part 4: Presentation Prep

### 4.1 Presentation Deck

- [ ] **PPT/PDF Slide Deck** (20 pages)
  - [ ] Slide 1: Title Page
  - [ ] Slide 2: Project Background
  - [ ] Slide 3: Market Analysis
  - [ ] Slide 4: Core Features
  - [ ] Slide 5: Credit Scoring Model
  - [ ] Slide 6: System Architecture
  - [ ] Slide 7: Database Design
  - [ ] Slide 8-10: System Demos
  - [ ] Slide 11: Compliance Analysis
  - [ ] Slide 12: Innovations
  - [ ] Slide 13: Test Results
  - [ ] Slide 14: Project Progress
  - [ ] Slide 15: Task Division
  - [ ] Slide 16: Business Model
  - [ ] Slide 17: Risk Analysis
  - [ ] Slide 18: Future Timeline
  - [ ] Slide 19: Conclusion
  - [ ] Slide 20: Q&A
  
  **Owner:** ______________  
  **Status:** □ Done □ WiP □ Pending
  **Completion Date:** ______________  
  **Notes:** ________________________________

---

### 4.2 System Demo Setup

- [ ] **Demo Server Run**
  - [ ] Server healthy at 192.168.1.57:5001
  - [ ] Database fresh and loaded
  - [ ] Logins set
    - [ ] 1 Contractor account
    - [ ] 1 Banking agent account
    - [ ] 1 Admin user
  - [ ] Browsers cleared and caching right
  - [ ] Uninterrupted network
  
  **Owner:** ______________  
  **Status:** □ Done □ Prep □ Pending  
  **Notes:** ________________________________

---

- [ ] **Contingency Video** 
  - [ ] Recording SW armed
  - [ ] Script familiarity
  - [ ] Quiet environment
  - [ ] Snipping finished
  - [ ] Rendered MP4
  - [ ] Compress to under 50MB
  
  **Owner:** ______________  
  **Status:** □ Done □ Actioning □ Pending  
  **Notes:** ________________________________

---

### 4.3 Demo Rehearsals

- [ ] **First Rep**
  - [ ] Date: ______________
  - [ ] Full turnout
  - [ ] Timer checks (20m ceiling)
  - [ ] Flagged issues
  - [ ] Notes for rep 2
  
  **Owner:** ______________  
  **Status:** □ Done □ Pending  
  **Notes:** ________________________________

---

- [ ] **Second Rep**
  - [ ] Date: ______________
  - [ ] Full turnout
  - [ ] Timer checks 
  - [ ] V1 fixes confirmed
  - [ ] Flow and transitions
  
  **Owner:** ______________  
  **Status:** □ Done □ Pending  
  **Notes:** ________________________________

---

- [ ] **Dress Rehearsal**
  - [ ] Date: ______________
  - [ ] Wardrobe/Suit up
  - [ ] Official mics/pointers
  - [ ] 20m execution
  - [ ] Sparring Q&A
  
  **Owner:** ______________  
  **Status:** □ Done □ Pending  
  **Notes:** ________________________________

---

## 📦 Part 5: Final Submission

### 5.1 Moodle Loadout

- [ ] **System Design Composite PDF**
  - [ ] All parts merged into one book
  - [ ] Name: COMP7300_Group_Project_Documentation.pdf
  - [ ] Footprint < 10MB
  - [ ] Active TOC
  - [ ] Numbered pages
  - [ ] Cover registry of team info
  
  **Owner:** ______________  
  **Date:** ______________  
  **Status:** □ Submitted □ Pending 
  **Moodle Ticket ID:** ______________  
  **Notes:** ________________________________

---

- [ ] **Codebase Zipper**
  - [ ] Flushed envs (venv, pyc)
  - [ ] Readme/Req files checked
  - [ ] Named: COMP7300_Group_Project_SourceCode.zip
  - [ ] Caps out under 50MB
  - [ ] File trees clean
  
  **Owner:** ______________  
  **Date:** ______________  
  **Status:** □ Submitted □ Pending 
  **Moodle Ticket ID:** ______________  
  **Notes:** ________________________________

---

### 5.2 Pitch Day

- [ ] **Date:** 2026-04-20
- [ ] **Pitch Block:** ______________
- [ ] **Room:** ______________
- [ ] **Roll Call Complete:** □ Yes □ No
- [ ] **Decking:**
  - [ ] Laser/Projectors
  - [ ] Amplifiers
  - [ ] Internet gateways
  - [ ] Extension cords
  
  **Owner:** ______________  
  **Status:** □ Pitched □ Pending  
  **Notes:** ________________________________

---

## 📈 Part 6: Quality Control

### 6.1 Literary Quality

- [ ] **Orthography & Semantics**
  - [ ] Clean Traditional Chinese sweeps
  - [ ] No English blunders
  - [ ] Clean delimiters
  - [ ] Tense alignment
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Formatting Consistency**
  - [ ] Typos locked (CHT: MingLiu/JhengHei, ENG: Arial/Times)
  - [ ] Headings structured at 16-18pt, body 12pt
  - [ ] 1.5 line heights
  - [ ] Margins pinned at 2.54cm
  - [ ] Exhibits ordered numerically
  - [ ] APA/Harvard Citations aligned
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Completeness Assurance**
  - [ ] No missing major segments
  - [ ] Visual charts hold integrity/resolution
  - [ ] Gist blocks are code-formatted
  - [ ] Sourcing hits 10+ quotes minimum
  - [ ] Appendix hooked
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

### 6.2 Code Quality

- [ ] **PEP Standards**
  - [ ] Obeys PEP 8
  - [ ] Smart variable naming
  - [ ] Methods adequately described
  - [ ] Top string documentation
  - [ ] 4-space uniform indenting
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Programming Efficiency**
  - [ ] DRY implementations
  - [ ] Method brevity (< 50 lines favored)
  - [ ] Single Responsibility Principle enforced
  - [ ] Fallbacks and Exception blocks deployed
  - [ ] Standardized Loggings
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Digital Defenses**
  - [ ] Sanitized payload SQL blocks
  - [ ] JS Injection protection
  - [ ] Hashed Vaulting
  - [ ] No raw env secrets sitting in logic
  - [ ] Route guarding active
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

### 6.3 Functional Review

- [ ] **Pathing validations**
  - [ ] Signups / logins fire cleanly
  - [ ] Profiling panels stick
  - [ ] Credit algos pull active triggers
  - [ ] Load flows step to ends
  - [ ] Approvals switch flags
  - [ ] Render tables fetch accurate metadata
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Performance Limits**
  - [ ] Under half a second per API pull
  - [ ] Front end draws fast (< 3 sec)
  - [ ] Concurrency holds strong on batches
  - [ ] DB loops optimized without leakages
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

- [ ] **Browsing Flexibility**
  - [ ] Chrome plays smoothly
  - [ ] Mozilla renders smoothly
  - [ ] Safari renders smoothly
  - [ ] Form limits reflow on mobile/tablet scaling
  
  **Auditor:** ______________  
  **Date:** ______________  
  **Notes:** ________________________________

---

## ✅ Final Verification

### Last Checks Before Fireoff

- [ ] Final docs merged, proofed, loaded
- [ ] Code fully operational & validated
- [ ] Templates all located and populated
- [ ] Production build starts zero-fault
- [ ] Slidedeck built, packed for staging
- [ ] Staging ran 2x plus mock Q&A
- [ ] Moodle Drop complete
- [ ] Receipt acknowledged
- [ ] Mirrored copies offline + online

**Signature / Name:** ______________ (Lead Approval)  
**T-Minus Date:** ______________  

---

### Professorial Review

- [ ] Alpha prints passed to Prof checks
- [ ] Returns audited and addressed
- [ ] Final Gold-Master checked off

**Prof Signature / Name:** ______________  
**Review Date:** ______________  

---

## 📊 Summary Board

| Category | Elements | Hit | Burn Rate % |
|----------|----------|-----|-------------|
| Part 1: Documents | 10 | _____ | _____% |
| Part 2: Codebase | 15 | _____ | _____% |
| Part 3: Deploy & Test | 10 | _____ | _____% |
| Part 4: Rehearsal Prep | 8 | _____ | _____% |
| Part 5: Turnover | 2 | _____ | _____% |
| Part 6: Q/A | 9 | _____ | _____% |
| **Sum** | **54** | **_____|** **_____%** |

---

**Last Updated:** 2026-03-03  
**Ver:** v1.0  
**Context:** COMP7300 Financial Technology Group Project