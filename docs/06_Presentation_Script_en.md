# 🎤 COMP7300 Project Presentation Script

## Basic Information
- **Project Name:** RenoCredit
- **Presentation Time:** 20 Minutes (15 mins presentation + 5 mins Q&A)
- **Presentation Date:** April 20, 2026
- **Presenters:** All Group Members

---

## 📋 Presentation Flow

### [Opening] 0:00 - 2:00 (2 minutes)
**Speaker: Member 1 (Project Manager)**

---

#### Slide 1: Title Page

**[Click to play title animation]**

**Script:**
> "Good morning Professors and fellow classmates. We are Group X, and today we're presenting our project 'RenoCredit' — a credit and risk management platform designed specifically for Hong Kong's renovation industry."

**[Pause for 1 second]**

> "I am the project manager, [Name], and today our team will walk you through this project."

**[Gestures to introduce teammates]**

---

#### Slide 2: Project Background

**[Click to switch slide]**

**Script:**
> "Why did we choose this project? The Hong Kong renovation industry has a massive pain point — financing difficulty."

**[Click to show pain points list]**

> "There are over 5,000 renovation companies in Hong Kong, but many struggle with cash flow. Why? Because banks find it extremely difficult to evaluate their credit risks."

**[Click to show solution]**

> "Our solution borrows the TransUnion (TU) model, establishing an industry-specific credit scoring platform. We help banks identify high-quality companies, enabling good agencies to receive loans at reasonable interest rates."

---

### [Market Analysis] 2:00 - 4:00 (2 minutes)
**Speaker: Member 2**

---

#### Slide 3: Market Analysis

**[Click to switch slide]**

**Script:**
> "Let's look at the market size. The annual output of Hong Kong's renovation industry exceeds HKD 100 billion, with financing needs reaching about 20 billion annually."

**[Click to show table]**

> "Our target customers fall into three categories: renovation companies, banks, and suppliers. Each faces unique pain points, and our platform can meet their needs simultaneously."

**[Click to competitive advantages]**

> "Compared to traditional credit assessments, we have four major advantages: an industry-specific scoring model, real-time risk assessment, bank loan matching, and guaranteed regulatory compliance."

---

### [Core Features] 4:00 - 7:00 (3 minutes)
**Speaker: Member 3**

---

#### Slide 4: Core Features

**[Click to switch slide]**

**Script:**
> "Let me introduce our three core modules."

**[Click to show module 1]**

> "First is the Credit Scoring System. We score based on 5 major dimensions, out of a total 1000 points. These include Financial Strength, Operational Stability, Credit History, Qualifications, and Industry Risk."

**[Click to show module 2]**

> "Second is the Loan Matching Platform. Users can apply for loans online, banks can review them, and progress is tracked in real time."

**[Click to show module 3]**

> "Third is the Risk Management Dashboard. Admins can monitor system states in real time, receive early warnings, and generate compliance reports."

---

#### Slide 5: Credit Scoring Model

**[Click to switch slide]**

**Script:**
> "This details the structure of our scoring model."

**[Click to show scoring table]**

> "Financial strength accounts for 30%, focusing on registered capital and turnover. Operational stability takes 25%, looking at years of operation and completed projects. Credit history holds 25%, analyzing repayment records. Qualifications take up 10%, checking licenses and ISO certs. Finally, industry risk is 10%, watching regional risk and company status."

**[Click to show credit grades]**

> "Based on the total score, we categorize companies into 7 tiers, from AAA to C. AAA-tier companies can obtain a preferred rate of 3.5%, while C-tier faces a 10% rate."

**[Click to show compliance features]**

> "Notably, we are the very first platform in the market to incorporate Occupational Safety and Health (OSH) compliance into credit scoring. Following the Labour Department's guidelines for moving objects over 16kg, we check for safety policies, training records, and lifting equipment. This satisfies regulations while lowering business interruption risks caused by injuries."

---

### [Technical Architecture] 7:00 - 9:00 (2 minutes)
**Speaker: Member 4**

---

#### Slide 6: System Architecture

**[Click to switch slide]**

**Script:**
> "Let me walk you through our technology stack."

**[Click to show tech stack]**

> "For the frontend, we use React + TypeScript + Material-UI. The backend is built with Flask + Python. The database runs on PostgreSQL, with Redis for caching and MinIO for file storage."

**[Click to show security architecture]**

> "For security, we utilize HTTPS/TLS 1.3 encryption, JWT Token authentication, bcrypt password hashing, RBAC control, and comprehensive audit logs."

---

#### Slide 7: Database Design

**[Click to switch slide]**

**Script:**
> "On the database side, we have 6 core tables."

**[Click to show ER Diagram]**

> "The 'users' table stores user data, 'companies' holds firm details, 'credit_scores' keeps scoring history, 'loan_applications' holds loan requests, 'banks' manages banking partners, and 'audit_logs' saves audit trails."

> "All tables implement appropriate indexes and constraints to ensure data integrity and query efficiency."

---

### [System Demo] 9:00 - 14:00 (5 minutes)
**Speaker: Member 5**

---

#### Slide 8: System Demo - Registration Flow

**[Switch to browser demo]**

**Script:**
> "Now let's do a live demo of the system."

**[Open browser to http://localhost:3000]**

> "First, we register a new user."

**[Click Register button]**

> "We fill in the email, password, and name, followed by company details like Company Name, BR number, and registered capital."

**[Fill out form]**

> "The BR number is exactly 8 digits, and the system auto-verifies its format. The email field is also checked for uniqueness."

**[Submit form]**

> "Submission successful! The system has sent a verification email."

---

#### Slide 9: System Demo - Credit Scoring

**[Log into system]**

**Script:**
> "Now we log in to calculate the credit score."

**[Click Calculate Score button]**

> "The system automatically analyzes the 5 dimensions. This takes about 3 seconds."

**[Wait for results]**

> "Alright, the results are out! This company scored 875 points, corresponding to a AAA credit grade and a 'low' risk level."

**[Click to show score breakdown]**

> "Let's view the breakdown: Financial Strength 240/300, Operations 220/250, Credit History 220/250, Qualifications 100/100, Industry Risk 95/100."

**[Click to show suggestions]**

> "The platform suggests a max loan amount of 50 million HKD at a rate of 3.5%. It also offers improvement tips, such as taking on more projects or applying for professional certificates."

---

#### Slide 10: System Demo - Loan Application

**[Click Loan Application button]**

**Script:**
> "Now let's submit a loan application."

**[Fill application form]**

> "We select a lending bank, enter a loan amount of 5 million, set the purpose to 'purchasing new equipment', and a term of 36 months."

**[Submit application]**

> "Successfully submitted! The system has generated standard application ID: LOAN-2026-001001."

**[Click to view status]**

> "We can track progress in real time. It currently shows 'pending' and represents awaiting bank approval."

---

### [Compliance Analysis] 14:00 - 16:00 (2 minutes)
**Speaker: Member 1**

---

#### Slide 11: Compliance Analysis

**[Switch back to PPT]**

**Script:**
> "Compliance is a primary focus for us."

**[Click to show legal table]**

> "We've consulted 5 major Hong Kong laws to ensure compliance, including the PDPO, the Money Lenders Ordinance, the Electronic Transactions Ordinance, OSH Regulations, and the Banking Ordinance."

**[Click to show PDPO measures]**

> "Speaking of the PDPO, we actively mapped our platform against all 6 robust Data Protection Principles, covering encryption, consent, retention policies, and data access rights."

**[Click to show Business Model Compliance]**

> "More importantly, our business model squarely places us as an information service platform. We are not money lenders, so we don't violate Cap 163. The final loan contract is always signed between the bank and the applicant."

---

### [Innovations] 16:00 - 17:00 (1 minute)
**Speaker: Member 2**

---

#### Slide 12: Innovations

**[Click to switch slide]**

**Script:**
> "Let's highlight a few innovations."

**[Click to show Industry Firsts]**

> "First is our OSH Compliance Scoring, the very first metric integrating workplace safety into an industry credit check."

**[Click to show Real-time Risks]**

> "Second, we use real-time risk alerts that actively monitor company statuses and push automated warnings."

**[Click to show ESG Integration]**

> "Third, ESG Integration. This checks environmental, social, and governance elements, tying the model to sustainable green finance trends."

---

### [Testing Results] 17:00 - 18:00 (1 minute)
**Speaker: Member 5**

---

#### Slide 13: Testing Results

**[Click to switch slide]**

**Script:**
> "For testing, we conducted comprehensive evaluations."

**[Click to show coverage table]**

> "Our overall test coverage hits 89%, vastly exceeding our initial 85% goal."

**[Click to show test stats]**

> "We have 45 unit tests, 18 integration tests, and 8 performance tests — all resulting in 100% pass rates."

**[Click to show benchmark limits]**

> "On performance, our API averages a 120ms response time, well below the 500ms target limit. We can easily support over 100 concurrent users."

---

### [Summary] 18:00 - 20:00 (2 minutes)
**Speaker: All Members**

---

#### Slides 14-19: Fast Summary

**[Quickly navigate slides 14-19]**

**Script (Member 1):**
> "To summarize, our 'RenoCredit' project embodies a highly functional FinTech application."

**[Click to show key takeaways]**

> "Not only did we finalize all major capabilities and enforce strict compliance, but we also reached an 89% test coverage and provided over 94,000 words in documentation."

**[Click to show core values]**

> "Our pride stems from driving innovation by bringing OSH guidelines directly into a traditional financing process."

---

#### Slide 20: Q&A

**[Click to switch slide]**

**Script (All Members):**
> "Thank you again for listening. The floor is now open for any questions."

**[Bow, wait for questions]**

---

## ❓ Preparation for Q&A Responses

### Q1: How do you guarantee scoring fairness?
**Answerer: Member 3**

> "Thank you for the question. Our scoring algorithm is completely open and transparent. The logic is embedded in the codebase and is fully auditable by partner banks. Furthermore, our audit logs track every computation query for traceback validation."

---

### Q2: How does the platform achieve profit?
**Answerer: Member 1**

> "We have three revenue streams. First, a bank subscription fee of HKD 10k per month. Second, value-added services for companies like premium reporting. Third, API call fees. Based on projections, we expect HKD 3.4M in year-one revenue."

---

### Q3: What's the difference between this and TU?
**Answerer: Member 4**

> "TU centers on personal consumer credit, whereas we offer a B2B enterprise credit model specific to the renovation industry. We include industry-specific nuances like completed projects and workplace safety—factors TU misses. Plus, we actually pair applicants with bank loans right within our platform."

---

### Q4: How do you acquire initial users?
**Answerer: Member 2**

> "We plan to partner with local renovation chambers of commerce, providing their members with free trials. We’ll also attend key construction networking events and launch targeted digital marketing campaigns directly connecting with loan officers."

---

### Q5: How do you handle regulatory risks?
**Answerer: Member 1**

> "We've consulted with initial legal sources to verify our compliance model. We continually monitor regulatory changes to keep the system up to date. Furthermore, we mandate standard cyber-security insurance to insulate user data."

---

## 🎯 Presentation Tips

### Pacing
- **Normal Flow:** ~150 words per minute.
- **Key Points:** Slow down to stress values, utilizing dramatic pauses.
- **Slide Swap:** Pause for 1-2 seconds after advancing.

### Body Language
- **Posture:** Stand straight, let arms drop naturally, or use illustrative hand gestures.
- **Eye Contact:** Maintain eye contact with the professors and audience.
- **Gestures:** Point to the screen using an open palm, not a single finger.

### Readiness Checklist
- **Early Checks:** Ensure microphones, laptops, and screen connections are pre-verified.
- **Backup Plans:** Have a locally downloaded MP4 of the system demo in case of network loss.
- **Time Boxing:** Pre-time your runs so nobody steps on someone else's bounds.

---

## 📝 Demo Checklist

### 1 Hour Before
- [ ] Test projector / screen
- [ ] Test audio systems
- [ ] Check WiFi / Hotspot
- [ ] Pre-load presentation slides
- [ ] Prepare water

### 10 Minutes Before
- [ ] All group members physically present
- [ ] Confirm flow order
- [ ] Microphone checks
- [ ] All devices locked to DND/Silent

### Post-Presentation
- [ ] Thank the audience
- [ ] Document all constructive feedback
- [ ] Parse asked questions and requested amendments
- [ ] Clean up demo artifacts

---

**Document Version:** v1.0  
**Last Updated:** 2026-03-03  
**Owner:** All Members  
**Presentation Date:** 2026-04-20
