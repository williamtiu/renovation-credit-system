# DecoFinance Smart Contract System

## 1. Scope

DecoFinance implements smart contracts as an application-layer deterministic state engine. It is not blockchain deployment. The engine synchronizes:

- project status
- bid acceptance
- milestone workflow
- escrow ledger movements
- dispute freeze and resolution

## 2. Contract States

- draft: project exists, no accepted bid.
- active: contractor accepted and contract activated.
- milestone_submitted: at least one milestone is awaiting customer/admin review.
- frozen: open dispute exists; release path is blocked.
- completed: all milestones approved and no open dispute remains.

## 3. Trigger Events and Effects

1. Project creation
- creates or prepares contract shell (draft).

2. Bid acceptance
- sets accepted bid and contractor company.
- contract moves to active.

3. Milestone creation
- appends term context and increments planned milestone counters.
- creates planned escrow ledger entry.

4. Milestone submission
- milestone status -> submitted.
- contract status can move to milestone_submitted.

5. Milestone approval
- creates released escrow ledger entry.
- approved milestone counter increments.
- project moves toward in_progress/completed.

6. Dispute opening
- project and related milestone states become disputed where applicable.
- escrow is frozen through ledger/contract updates.
- contract status -> frozen.

7. Dispute resolution
- clears freeze conditions.
- contract returns to active or completed depending on milestone completion.

## 4. Stored Contract Fields

smart_contract_agreements stores:

- project_id (one-to-one)
- accepted_bid_id
- customer_user_id
- contractor_company_id
- contract_code
- status
- budget_amount
- escrow_balance
- released_amount
- frozen_amount
- milestones_total
- approved_milestones
- dispute_count
- terms_json
- event_log_json
- created_at, activated_at, last_event_at

## 5. UI and API Integration

- Legacy project detail page displays contract metrics and recent events.
- API endpoint GET /api/projects/{id}/contract exposes contract snapshot.
- New UI (served at /new-ui) consumes project and contract data through /api.

## 6. Validation Coverage

- tests/test_projects.py validates lifecycle transitions and guard rules.
- tests/test_system.py validates integrated workflow behavior.
- tests/frontend/test_ui_selenium.py validates browser-level milestone and dispute flows.

## 7. Implementation Boundaries

- business rules are enforced in service and route layers;
- no financial logic is bypassed during workflow transitions;
- contract state is authoritative for operational release/freeze behavior.

## 8. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-09 | Initial smart contract system note |
| v1.1 | 2026-03-16 | Synced to current event triggers, escrow behavior, and UI/API integration |