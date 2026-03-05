# 📡 API Interface Document

## 1. API Overview

**Base URL:** `https://api.renocredit.hk/v1` (Production)
**Test URL:** `http://localhost:5000/api/v1` (Development)

**Authentication:** JWT Bearer Token
**Content-Type:** `application/json`

---

## 2. Authentication Module (Auth)

### 2.1 User Registration
`POST /api/v1/auth/register`
**Payload:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone": "91234567",
  "role": "company",
  "company": {
    "company_name": "Quality Renovation Ltd",
    "business_registration": "12345678",
    "established_date": "2015-01-15",
    "registered_capital": 5000000
  }
}
```
**Response (201 Created):** Gives success confirmation along with user ID mappings.

### 2.2 User Login
`POST /api/v1/auth/login`
**Payload:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response (200 OK):** Provides `access_token` and `refresh_token` paired with expiration intervals.

### 2.3 User Logout
`POST /api/v1/auth/logout`
Requires Bearer Auth.

---

## 3. Companies Module (Companies)

### 3.1 Get Profile
`GET /api/v1/companies/me`
*Auth Required:* Bearer Token
Returns the detailed schema of your registered company metadata.

### 3.2 Update Profile
`PUT /api/v1/companies/me`
*Auth Required:* Bearer Token
Supports modification of generalized data like `phone`, `email`, `address`, or dynamic company characteristics limit values.

---

## 4. Credit Scores Module (Credit Scores)

### 4.1 Lookup Own Credit Score
`GET /api/v1/companies/me/score`
*Auth Required:* Bearer Token
Will report detailed grades including score limits across sections (AAA-C).

### 4.2 Recalculate Credit Score
`POST /api/v1/companies/me/score/calculate`
*Auth Required:* Bearer Token
Triggers new ML/Algorithm evaluation based on newly updated document uploads.

---

## 5. Loans Module (Loans)

### 5.1 Submit Loan Application
`POST /api/v1/loans`
Required JSON payload consisting of `bank_id`, `loan_amount`, `loan_purpose`, `expected_interest_rate`, and valid parameters.

### 5.2 Application Read / Track
`GET /api/v1/loans/:id`
Retrieves granular timeline updates (e.g. Pending -> Under Review -> Bank Processed). 

---

## 6. System Error Handling Map

| Error Code | HTTP Status | Description |
|---------|-----------|------|
| SUCCESS | 200 | Operation successful |
| CREATED | 201 | Object properly instantiated |
| BAD_REQUEST | 400 | Invalid params parsed |
| UNAUTHORIZED | 401 | JWT expired/missing |
| FORBIDDEN | 403 | RBAC Permission lacking |
| NOT_FOUND | 404 | Source reference not indexed |
| CONFLICT | 409 | Conflicts (e.g. Email exists) |

## 7. Rate Limiting Map
- Authentication calls: 10 times / minute
- Standard Endpoints: 100 times / minute
- Report / File generation: 10 times / hour 
All restricted users receive standard 429 Status Codes with `X-RateLimit` headers.

---

**Version:** v1.0  
**Updated:** 2026-03-03