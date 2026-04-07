# DecoFinance Presentation Script

## Opening
"Today we are presenting DecoFinance, a renovation trust and project finance platform designed for Hong Kong's renovation sector. The platform helps companies prove credibility, helps customers control delivery risk, and helps reviewers make financing decisions with better operational data."

Suggested visual:
- show the dashboard or landing screen immediately after the title slide.

## Problem
"Generic lending reviews miss the operational signals that matter in renovation: licence validity, insurance status, OSH readiness, dispute history, and milestone delivery performance."

## Solution
"DecoFinance combines trust scoring, company credit reporting, project bidding, milestone governance, internal smart-contract logic, and loan review in one system."

## Roles
"The system supports four roles: company users, customers, reviewers, and admins. Each role sees the workflows relevant to its responsibilities."

## Trust Score and Report
"The trust score keeps a 1000-point structure but adapts it to renovation risk. The report page turns that score into something useful for lenders and reviewers, with risk factors, verification checks, audit activity, and PDF export."

Suggested visual:
- show the company credit report page first;
- then switch to the compare workspace or PDF download action.

## Dashboard
"The dashboard now shows portfolio visibility, not just counts. It includes verified companies, open disputes, approved loan volume, safety review backlog, watchlist companies, and trend charts."

Suggested visual:
- highlight the portfolio cards first;
- then point at score trend and dispute trend charts.

## Project and Smart Contract Workflow
"Customers can create projects and receive bids from verified contractors. Once a bid is accepted, the system activates a smart-contract agreement record. Milestones are then planned, submitted, and approved. If a dispute is opened, the contract freezes until resolution."

Suggested visual:
- show the project detail page;
- point to bids, milestones, and the smart contract summary card.

## Loan Workflow
"Loan applications can optionally link to a project. Reviewer or admin users can approve or reject the application, then continue through disbursement and repayment tracking."

## Technical Architecture
"The current implementation is a Flask monolith with Jinja templates and SQLAlchemy models. The documentation now matches the codebase that actually runs in this repository."

## Testing and Demo Support
"The project includes pytest coverage for backend flows and Selenium coverage for UI flows. The latest full regression suite passed with 33 tests. Demo data can be loaded with either the fixed seed script or the new random data generator."

Suggested visual:
- show one test log result line;
- then show the random data generator command or batch prompt.

## Closing
"DecoFinance shows how renovation-specific trust scoring, project controls, and finance workflows can be brought together in a practical, testable platform."

Suggested visual:
- return to a single summary slide with problem, solution, and validation points.


