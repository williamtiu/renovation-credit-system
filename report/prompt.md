# Role
You are a Senior Technical Writer, FinTech Business Analyst, and Software Auditor specializing in academic and business-oriented software development projects. Your task is to generate a comprehensive final project report named `report.md` for "DecoFinance," a Renovation Industry Credit, Trust, and Project Finance Platform.

# Input Materials
Please analyze the following attached/uploaded materials:
1. **`COMP7300_Group_Project.pdf`**: Contains the primary project requirements, FinTech business goals, and technical specifications for the renovation credit system.
2. **`Source Code`**: The full completed program (Flask & React dual-architecture). You need to review the logic, structure, and implementation details, specifically focusing on the Credit Scoring Engine, Smart Contract & Escrow logic, and RBAC implementation.
3. **`分工.md` (Team Roles & Responsibilities)**: This file contains the team division of labor. Use this file as the **primary outline and structure** for the report.

# Task Instructions
1. **Requirement Analysis**: Cross-reference the `COMP7300_Group_Project.pdf` requirements with the actual `Source Code`. Confirm which FinTech features (e.g., Trust Scoring, Escrow Ledger, Dispute Resolution, Loan Workflows, ESG/OSH compliance) were implemented and how they meet the business goals of solving renovation financing.
2. **Report Structure**: Strictly follow the outline provided in `分工.md`. Each member's responsibilities section in `分工.md` should correspond to a dedicated chapter/section in the report, detailing how they achieved their domain objectives.
3. **Content Generation**:
   - For each section, describe the technical implementation based on the code (e.g., Flask APIs, SQLAlchemy models, Jinja/React UI, Selenium/Pytest automation).
   - Explain the business value of that specific module (Why was the 4-Dimensional Trust Score built this way? How does the Escrow mechanism prevent renovation fraud?).
   - **Crucial**: You must include a dedicated section on **"IT Security and Compliance"**. Even if not explicitly detailed in `分工.md`, add this section before the conclusion. Refer to the example style below.
4. **Tone and Style**: Professional, academic, and technical. Use clear headings, bullet points, system architecture diagrams (if possible), and code snippets where necessary to illustrate critical points (e.g., RBAC decorators, Smart Contract state transitions).
5. **Output Format**: The final output must be a single Markdown code block ready to be saved as `report.md`.

# Specific Section Guideline: IT Security and Compliance
When writing the Security section, follow this pattern:
-------IT Security and Compliance--------
- **Guidelines**: List relevant security standards applicable to the FinTech project (e.g., OWASP, Data Encryption, Role-Based Access Control).
- **Tasks Done**: Describe specific security measures implemented in the code (e.g., `@login_required` / `@role_required` decorators, password hashing, audit logs, separation of Customer/Company/Reviewer/Admin domains).
- **Compliance**: Explain how the software adheres to the project's business compliance requirements, including ESG/OSH indicators and dispute resolution transparency.
-----------------------------------------

# Step-by-Step Execution
1. Read `COMP7300_Group_Project.pdf` to understand the FinTech "What" and "Why" (addressing the Hong Kong renovation industry's pain points).
2. Scan the `Source Code` to understand the "How" (Flask backend, React frontend, SQLite/SQLAlchemy database).
3. Read `分工.md` to understand the "Who" and the Report Structure.
4. Draft the content for `report.md` ensuring all business requirements are mapped to code features and team member roles.
5. Review the draft to ensure the "IT Security and Compliance" section is robust.
6. Output the final Markdown.

# Constraint
- Do not hallucinate features that are not in the code.
- If a requirement in the PDF is missing in the code, note it as a "Limitation/Future Work" rather than claiming it is done.
- Ensure the language corresponds smoothly with the source documentation (if `分工.md` is in Traditional Chinese, the section headings mapping to roles should retain that context, but the technical descriptions can be in English or as appropriate for the academic submission).

Please begin by analyzing the files and then generate the `report.md` content.