# End-to-End (E2E) UI Testing Strategy: DecoFinance

## 1. Critical Frontend-Backend Integration Points
To move beyond API testing, we must validate the user journey through the browser, ensuring the DOM interactions accurately reflect the backend database state and business logic.

### Integration Point A: Role-Based Authentication & Navigation
**Input:** User credentials for an Admin role (e.g., username: `admin`, password: `pass`). Click 'Login'.
**Reasoning:** Verifies that session cookies are correctly set, role-based access control (RBAC) middleware routes the user to the correct dashboard, and Jinja2 templates render the appropriate navigation menus based on `g.user.role`.
**Expected Output:** URL redirects exactly to `/admin/dashboard`. The navigation element `<a href="/admin/companies">Manage Companies</a>` is strictly present and visible.

### Integration Point B: Financial Data Entry & Ratio Override (New Feature)
**Input:** On the `/companies/<id>/edit` page, enter `current_assets` = 10000, `current_liabilities` = 5000. In the override section, enter `manual_current_ratio` = 2.50. Click 'Save Company'.
**Reasoning:** Tests the full loop: HTML form -> Flask `companies.py` controller -> SQLAlchemy `Company` model -> Database commit -> Redirect to `detail.html` -> Jinja2 rendering. It specifically tests the newly added manual override logic.
**Expected Output:** The `/companies/<id>` detail page strictly displays the text `2.50 (Manual)` under the Current Ratio field. 

### Integration Point C: Automated Trust Score Generation
**Input:** Click the `Calculate Trust Score` button (`<form action="/companies/<id>/score">`) on the company detail page.
**Reasoning:** Verifies that a POST request triggered from the UI correctly initializes the `CreditScorer` engine backend, parses the financial ratios from the database, generates a `CreditScore` entity, and immediately reflects it on the frontend without a manual page reload.
**Expected Output:** The Trust Score panel is strictly visible, displaying the `report-score-number` and a `report-grade-pill` (e.g., "A" or "BBB") along with the Recommended Limit.

### Integration Point D: Loan Origination and Exposure Reflection
**Input:** On the `/loans/add` page, select a company, input `loan_amount` = 500000, `loan_term` = 12. Submit.
**Reasoning:** Verifies that a frontend transaction correctly creates a loan application and that the `/companies/<id>/credit-report` page dynamically updates the "Credit Exposure" section based on the new outstanding balance.
**Expected Output:** On the credit report UI, the element displaying "Outstanding" strictly matches `HK$ 500,000`.

---

## 2. Verifying True UI Element Visibility

It is not enough for an element to simply exist in the DOM (e.g., hidden via CSS `display: none`, `visibility: hidden`, opacity 0, or obscured by a modal/overlay). To verify that an element is visible to a *real user*:

*   **Render Tree Checking:** The E2E framework (e.g., Playwright, Selenium, or Cypress) must evaluate the browser's render tree. The element must have a bounding box (width > 0, height > 0).
*   **Viewport Intersection:** The framework must verify the element intersects with the visible viewport and is not rendered entirely off-screen.
*   **Pointer Intercepts (Actionability):** To ensure a button is "clickable", the framework simulates an exact mouse event (hover/click) at the center coordinates of the element's bounding box. If another element (like a loading spinner or modal) intercepts the pointer event, the framework assesses the button as "not interactable/visible".

**Framework Example (Playwright):**
```python
# This strictly enforces that the button is physically visible, has dimension, and is not hidden by CSS.
expect(page.locator('button:has-text("Calculate Trust Score")')).to_be_visible()

# This strictly enforces the binary expectation constraint.
expect(page.locator('.report-grade-pill')).to_have_text("BBB")
```

## 3. Strict Binary Failure Constraint
Soft assertions and "wait and see" approximations are forbidden in this suite. Every test step operates on a strict binary pass/fail condition:
*   `AssertionError` is raised instantly if the expected state is not matched after a predetermined timeout (e.g., 5 seconds max).
*   If `<div id="current-ratio">2.50 (Manual)</div>` is expected, but the UI reads `2.00 (Calculated)`, the test crashes immediately, failing the build pipeline without proceeding to the next step.