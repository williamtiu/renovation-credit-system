# Autonomous E2E QA Report (2026-03-16)

## Scope
- Customer journey:
  - Register/Login
  - Create project request with flat category, size, and style details
  - Review bids
  - Accept bid and contract
  - Approve milestone to trigger escrow release
- Decoration company journey:
  - Register/Login
  - Complete profile setup (license/compliance data used to simulate BD license and TU consent readiness)
  - Discover open project and submit bid
  - Submit milestone for customer approval

## Framework Selection
- Selected framework: pytest + Selenium WebDriver (already available and integrated in workspace).
- Rationale: Existing browser E2E harness with live Flask server fixture and role-aware flows.

## Phase 1 - Script Generation
### New / Updated Automation
- Added full two-role journey E2E test:
  - tests/frontend/test_ui_selenium.py::test_full_customer_and_company_user_journeys
- Added helpers for real user behavior:
  - registration helper
  - checkbox helper for compliance profile setup

## Phase 2 - Execution and Logging
### Initial Targeted Execution
- Command: pytest -vv tests/frontend/test_ui_selenium.py::test_full_customer_and_company_user_journeys
- Result: FAILED (timeout waiting for bid success)
- Log: test_logs/e2e_journeys_targeted_20260316_011833.log

### Iterative Re-run #1
- Command: same targeted test after first fix
- Result: FAILED again
- Log: test_logs/e2e_journeys_targeted_rerun_20260316_012119.log

### Iterative Re-run #2
- Command: same targeted test after second fix
- Result: PASSED
- Log: test_logs/e2e_journeys_targeted_rerun2_20260316_012331.log

### Full Selenium E2E Suite
- Command: pytest -vv tests/frontend/test_ui_selenium.py --log-cli-level=INFO
- Result: 4 passed, 1 warning
- Log: test_logs/frontend_selenium_full_20260316_012512.log

### Full Regression Suite
- Command: pytest -vv
- Result: 57 passed, 1 warning
- Log: test_logs/full_pytest_post_e2e_fix_20260316_012809.log

## Phase 3 - Bugs Found and Fixed
### Bug 1 (Security): JSON self-registration allowed privileged roles
- Symptom:
  - API register endpoint accepted admin/reviewer self-registration.
- Root cause:
  - API role validation did not match UI self-registration policy.
- Fix:
  - Enforced SELF_REGISTRATION_ROLES = {'customer', 'company_user'} in routes/api.py.
- Verification:
  - Added and passed regression test in tests/test_api_new_ui_integration.py.

### Bug 2 (Workflow): Newly created company profile could not bid
- Symptom:
  - Company completed profile but bid submission did not succeed in E2E.
- Root cause:
  - Bid eligibility was not derived on create flow.
  - New model instance status default had not materialized at eligibility calculation time.
- Fix:
  - Added centralized _derive_bid_eligibility(company) in routes/companies.py.
  - Applied derivation on add/edit/score paths.
  - Treated missing status as active during create-time derivation.
- Verification:
  - Targeted journey test turned green on rerun.
  - Full Selenium + full pytest suites both green.

## Captured Warnings / Non-Blocking Noise
- Browser runtime noise in headless runs (external to app logic):
  - GPU overlay info retrieval errors from Chromium runtime.
  - Google API registration endpoint warnings in browser process.
- App-level minor HTTP noise:
  - favicon.ico 404 during test browsing.
- Dependency warning:
  - reportlab DeprecationWarning (ast.NameConstant) from third-party package.

## Stability Verdict
- Final status: PASS
- Platform status after autonomous fix loop:
  - User journey E2E: PASS
  - Frontend Selenium suite: PASS
  - Full backend/integration suite: PASS
- Regression confidence: HIGH for tested journeys and existing suite coverage.
