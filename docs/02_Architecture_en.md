# 🏗️ System Design Document

## 1. System Architecture

### 1.1 Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Layer                               │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│    │ Renovation│     │ Bank     │      │ System   │             │
│    │ Company   │     │ Officer  │      │ Admin    │             │
│    │ Web/Mobile│     │ Web      │      │ Web      │             │
│    └────┬─────┘      └────┬─────┘      └────┬─────┘             │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React.js + TypeScript (Frontend)            │   │
│  │  - Responsive Design (Desktop/Tablet/Mobile)             │   │
│  │  - Component Library: Material-UI / Ant Design           │   │
│  │  - State Management: Redux / Zustand                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼ HTTPS/TLS 1.3
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Flask + Python 3.14 (Backend API)           │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │   │
│  │  │ Auth       │  │ Scoring    │  │ Loans      │          │   │
│  │  └────────────┘  └────────────┘  └────────────┘          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │   │
│  │  │ Users      │  │ Reports    │  │ Audits     │          │   │
│  │  └────────────┘  └────────────┘  └────────────┘          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼ SQLAlchemy ORM
┌─────────────────────────────────────────────────────────────────┐
│                          Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PostgreSQL  │  │    Redis     │  │  MinIO/S3    │           │
│  │  (Main DB)   │  │   (Cache)    │  │  (Storage)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Reason |
|------|------|------|---------|
| **Frontend** | React | 18.x | Component-based, rich ecosystem |
| | TypeScript | 5.x | Type safety, less errors |
| | Material-UI | 5.x | Professional UI components |
| **Backend** | Python | 3.14 | Rapid development, ML ecosystem |
| | Flask | 3.0 | Lightweight, flexible, extensible |
| | SQLAlchemy | 2.0 | Powerful ORM, generic DB support |
| **Database** | PostgreSQL | 15+ | High performance, ACID compliant |
| | Redis | 7.x | Caching, session storage |
| **Storage** | MinIO | latest | S3 compatibility, self-hosted |
| **Deployment**| Docker | latest | Containerization |
| | Nginx | latest | Reverse Proxy, load balancing |

---

## 2. System Module Design

### 2.1 Backend Modules Overview 

```text
backend/                     
├── app/
│   ├── config.py            # App Configuration
│   ├── models/              # DB Models
│   │   ├── user.py, company.py, credit_score.py, loan_application.py, bank.py, audit_log.py
│   ├── routes/              # API Routes
│   │   ├── auth.py, companies.py, scores.py, loans.py, reports.py, admin.py
│   ├── services/            # Business Logic
│   │   ├── auth_service.py, scoring_service.py, loan_service.py
│   ├── utils/               # Utility functions (Validators, PDF Generator)
│   └── middleware/          # Auth & Audit Hooks
```

---

## 3. API Design

### 3.1 Authentication Module

| Method | Endpoint | Description | Auth Required |
|------|------|------|------|
| POST | `/api/auth/register` | User Registration | ❌ |
| POST | `/api/auth/login` | User Login | ❌ |
| POST | `/api/auth/logout` | User Logout | ✅ |
| POST | `/api/auth/refresh` | Refresh Token | ✅ |

### 3.2 Companies Module

| Method | Endpoint | Description | Auth Required |
|------|------|------|------|
| GET | `/api/companies` | Get Companies List | ✅ |
| GET | `/api/companies/me` | Get Own Profile | ✅ |
| PUT | `/api/companies/me` | Update Own Profile | ✅ |
| POST | `/api/companies/documents` | Upload Document | ✅ |
| GET | `/api/companies/:id/score` | Get Credit Score | ✅ |
| POST | `/api/companies/:id/score/calculate` | Calculate Score | ✅ |

### 3.3 Loans Module

| Method | Endpoint | Description | Auth Required |
|------|------|------|------|
| GET | `/api/loans` | Get Loan Applications List | ✅ |
| POST | `/api/loans` | Submit Loan Application | ✅ |
| GET | `/api/loans/:id` | Get Application Details | ✅ |
| POST | `/api/loans/:id/withdraw` | Withdraw Application | ✅ |
| POST | `/api/loans/:id/approve` | Approve (Bank Only) | ✅ |
| POST | `/api/loans/:id/reject` | Reject (Bank Only) | ✅ |

---

## 4. Security Design

### 4.1 Authentication & Authorization
**JWT Token Structure:** Utilizing Bearer tokens with Role-Based Access Control (RBAC). Passwords are professionally hashed using bcrypt.

**Role Rules:**
- **Renovation Companies:** Can submit applications and monitor score profiles.
- **Banks:** Can fetch pending apps, calculate ratings, update approvals, and view company backgrounds.
- **Sys Admins:** Manage user bases and view sensitive logs.

### 4.2 Application Monitoring
Using logging structures. Logging all app faults, DB latency, traffic metrics natively.

---

## 5. Deployment Architecture

### 5.1 Docker Compose Execution File
Deploying standard Docker components over Nginx bridging, Redis instances, PostgreSQL datastore running over volumes for strict data preservation across system shutdowns.

---

**Version:** v1.0  
**Updated:** 2026-03-03  
**Authors:** Architecture Team