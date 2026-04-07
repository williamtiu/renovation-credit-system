# DecoFinance Presentation Outline

## Slide 1: Title
- DecoFinance
- Renovation Trust, Smart Contract, and Project Finance Platform
 - Screenshot placeholder: landing page or dashboard hero

## Slide 2: Problem
- renovation companies struggle to prove lender-ready credibility
- customers face contractor selection and milestone-payment risk
- lenders lack renovation-specific monitoring indicators

## Slide 3: Solution
- trust scoring
- credit reports and PDF export
- project bidding, milestones, disputes, and smart-contract tracking

## Slide 4: User Roles
- company user
- customer
- reviewer
- admin

## Slide 5: Trust Scoring Model
- 5 weighted dimensions
- OSH and ESG inputs
- recommended loan limit and rate output

## Slide 6: Dashboard
- verified companies
- open disputes
- watchlist companies
- backlog and trend charts
 - Screenshot placeholder: dashboard overview with charts visible

## Slide 7: Credit Report
- detailed report page
- compare workspace
- PDF export
- audit snapshot
 - Screenshot placeholder: report summary plus compare workspace

## Slide 8: Project Marketplace
- create project
- receive bids
- accept one contractor
- create milestones
 - Screenshot placeholder: project detail page with bids and milestones

## Slide 9: Smart Contract Flow
- contract initialized per project
- bid acceptance activates contract
- milestone approval releases escrow-state amounts
- disputes freeze contract state
 - Screenshot placeholder: project detail smart contract card

## Slide 10: Loan Workflow
- submit application
- reviewer decision
- disbursement and repayment

## Slide 11: Technical Architecture
- Flask monolith
- Jinja templates
- SQLAlchemy models
- SQLite-friendly local setup

## Slide 12: Data Model
- users, companies, scores, loans
- projects, bids, milestones, disputes, escrow ledger, smart contracts
- audit logs

## Slide 13: Testing
- pytest backend coverage
- Selenium frontend coverage
- latest regression: 33 passing tests
 - Screenshot placeholder: terminal or test log summary

## Slide 14: Demo Operations
- `seed_db.py`
- `generate_random_data.py`
- `generate_random_data.bat`
 - Screenshot placeholder: generator prompt or sample generated dashboard state

## Slide 15: Business Value and Next Steps
- underwriting visibility
- milestone-linked control
- stronger auditability
- future bank integrations

