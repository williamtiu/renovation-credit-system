# DecoFinance Smart Contract System

## Objective

DecoFinance now includes an application-level smart contract layer for project-backed financing. This is not an on-chain blockchain deployment; it is a deterministic contract state engine inside the platform that governs escrow, milestone release, and dispute freezes.

## Why This Fits The App

The application already had:

- project creation and bidding;
- accepted contractor selection;
- milestone planning and approval;
- escrow ledger entries;
- dispute opening and resolution.

Those are the exact ingredients needed for a smart-contract workflow. The added contract engine turns those actions into a governed state machine.

## Contract States

- `draft`: project exists but no winning bid has been accepted.
- `active`: contractor selected and contract activated.
- `milestone_submitted`: at least one milestone is awaiting approval.
- `frozen`: an open dispute exists and funds must not be released.
- `completed`: all milestones are approved and no open dispute remains.

## Triggered Events

- project creation initializes a draft contract shell;
- bid acceptance activates the contract;
- milestone creation appends contract terms and planned escrow amounts;
- milestone submission records proof-of-work pending review;
- milestone approval releases escrow funds and advances the contract state;
- dispute opening freezes the contract;
- dispute resolution re-evaluates whether the contract returns to `active` or `completed`.

## Stored Contract Data

The `smart_contract_agreements` table stores:

- project and accepted bid linkage;
- customer and contractor references;
- contract code;
- status;
- budget, escrow balance, released amount, frozen amount;
- milestone totals and approvals;
- open dispute count;
- normalized contract terms JSON;
- rolling contract event log JSON.

## Current Application Integration

- project detail page shows contract summary and recent contract events;
- API can expose contract data for project-level integrations;
- random data generator creates contract-ready projects, milestones, releases, and disputes;
- system tests validate that contracts progress through project lifecycle events.

## Future Upgrade Path

If DecoFinance later needs a real blockchain-backed deployment, the current service layer provides a clean migration point:

1. keep the current state machine as the canonical business logic;
2. mirror contract events to a chain adapter;
3. anchor escrow release approvals and dispute outcomes on-chain;
4. keep UI and reports unchanged while replacing the storage backend.