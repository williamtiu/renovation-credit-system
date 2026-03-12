# DecoFinance Industry Data and Market Context

## 1. Purpose of This Document

This document summarizes the market and operating assumptions that support DecoFinance's trust-scoring, project-finance, OSH, and dispute-monitoring design. It is intended as business context for the product, not as a legal or regulatory filing.

## 2. Renovation Sector Profile in Hong Kong

### 2.1 Estimated Company Base
| Year | Registered Companies | Active Companies | Notes |
|------|------|------|------|
| 2023 | 4,850 | 3,200 | broad renovation and fit-out market |
| 2024 | 5,120 | 3,450 | continued demand recovery |
| 2025 | 5,380 | 3,680 | estimate used in project materials |
| 2026 | 5,650 | 3,900 | projection for planning only |

### 2.2 Why This Matters to DecoFinance
- A large long-tail contractor market creates information asymmetry.
- Many firms are too small or too operationally informal for traditional credit review.
- The platform needs structured profile, compliance, and project-delivery data to reduce that gap.

## 3. Market Output and Financing Pressure

### 3.1 Industry Output
| Year | Estimated Output (HKD Billion) | Trend |
|------|------|------|
| 2023 | 98.0 | post-slowdown pressure |
| 2024 | 105.0 | recovery and backlog release |
| 2025 | 112.0 | steady expansion |
| 2026 | 120.0 | forward planning estimate |

### 3.2 Financing Need Signals
| Indicator | Working Assumption |
|------|------|
| Financing demand | HKD 20B+ annual need |
| Average SME cash-flow pressure | high during milestone gaps |
| Reliance on informal funding | still material in smaller firms |
| Underwriting friction | driven by weak standardized trust data |

### 3.3 Product Interpretation
These conditions justify DecoFinance features such as:

- trust score and grade outputs;
- recommended loan limits and rates;
- project-linked loan applications;
- milestone and escrow-state visibility;
- dispute-triggered contract freeze logic.

## 4. Financing Channels and Barriers

### 4.1 Common Funding Sources
| Channel | Typical Use | Indicative Rate Range |
|------|------|------|
| Bank Loans | established firms with usable records | 5.5% to 8.0% |
| Finance Companies | faster but more expensive funding | 8% to 15% |
| Private Lending | emergency or short-tenor borrowing | 10% to 20% |
| Own Funds | retained cash and owner injections | n/a |

### 4.2 Underwriting Barriers
| Barrier | Product Relevance |
|------|------|
| Lack of collateral | increases need for operational trust indicators |
| Thin credit history | raises value of project-performance signals |
| Incomplete financial statements | requires alternative evidence of quality and stability |
| Perceived industry risk | supports sector-specific scoring rather than generic SME scoring |
| Slow approval process | supports dashboard, PDF report, and audit-ready review outputs |

## 5. Operational Risk and Safety Context

### 5.1 Workplace Risk
| Metric | Directional Signal |
|------|------|
| annual accident volume | still meaningful in renovation and fit-out work |
| severe injury exposure | high impact on business interruption risk |
| manual handling risk | relevant to the 16kg-related workflow assumptions |

### 5.2 Why OSH Is Part of Trust Scoring
DecoFinance includes OSH data because safety weakness is not only a compliance issue. It also affects:

- project delay risk;
- dispute probability;
- business interruption risk;
- lender confidence in execution capability.

### 5.3 Operational Fields Reflected in the App
The implemented system already tracks:

- OSH policy in place;
- safety training coverage;
- heavy lifting compliance;
- lifting equipment availability;
- safety incident count;
- ESG policy level;
- green material ratio.

## 6. Contractor Licensing and Verification Context

### 6.1 Minor Works and Qualification Signals
Key market review signals include:

- business registration validity;
- licence type and class;
- insurance validity;
- professional memberships;
- project count completed;
- average project value.

### 6.2 Product Relevance
These signals directly support:

- bid eligibility decisions;
- trust-score quality;
- credit report verification sections;
- dashboard backlog monitoring.

## 7. Credit and Trust Distribution Assumptions

The following simplified distribution is suitable for demo and classroom discussion.

| Grade | Score Range | Illustrative Share |
|------|------|------|
| AAA | 751 to 1000 | 5% |
| AA | 701 to 750 | 10% |
| A | 651 to 700 | 20% |
| BBB | 601 to 650 | 30% |
| BB | 551 to 600 | 20% |
| B | 501 to 550 | 10% |
| C | 0 to 500 | 5% |

This distribution supports the current UI and reporting language around score, grade, risk level, and pricing recommendations.

## 8. Disputes and Project Finance Context

### 8.1 Why Disputes Matter
In renovation projects, disputes over workmanship, delay, scope, and billing can quickly damage both repayment capacity and customer confidence.

### 8.2 Product Implications
This is why DecoFinance includes:

- project bidding and contractor selection;
- milestones and evidence submission;
- escrow-style ledger entries;
- dispute cases;
- smart-contract lifecycle states;
- frozen-state handling during unresolved conflict.

## 9. Market Opportunity Framing

DecoFinance is positioned around three linked value propositions:

1. Better underwriting visibility for lenders and reviewers.
2. Better contractor selection and control for customers.
3. Better financing credibility for qualified contractors.

## 10. Data Quality Note

The figures in this document are directional planning figures synthesized from course-project assumptions, public-industry style references, and business framing used throughout the repo. They are appropriate for design discussion, reporting context, and demo narration, but should be replaced with verified source packs before real-world commercial deployment.

## 11. Version History
| Version | Date | Summary |
|------|------|------|
| v1.0 | 2026-03-03 | Initial market context draft |
| v1.1 | 2026-03-09 | Reframed to support DecoFinance trust, OSH, dispute, and project-finance positioning |
