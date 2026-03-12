# 🏠 DecoFinance

![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/flask-3.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

DecoFinance is a renovation trust and financing platform built around decorator verification, sector-specific credit scoring, OSH-aware compliance review, ESG readiness, project-backed lending, and live risk monitoring. It helps lenders and platform operators review contractor quality, manage loan workflows, track milestones, and monitor disputes, safety posture, and exposure in one system.

## 📑 Table of Contents
1. [Architecture & Design](#-architecture--design)
2. [Core Features](#-core-features)
3. [Installation](#-installation)
4. [Getting Started (Demo & Test Info)](#-getting-started-demo--test-info)
5. [Testing & Tools](#-testing--tools)
6. [Documentation](#-documentation)
7. [Project Structure](#-project-structure)

## 🏗 Architecture & Design
The system follows a standard **MVC (Model-View-Controller)** pattern built with Python, enabling a clean separation between data, business logic, and presentation.
*   **Backend:** Python 3, Flask, SQLAlchemy (ORM)
*   **Frontend:** HTML5, Bootstrap 4, Jinja2 Templates, FontAwesome
*   **Database:** SQLite (default for fast development & local runs) or easily upgradable to PostgreSQL
*   **Scoring Model Structure:** 
    A tailored 5-dimension evaluation model capping at 1000 points total:
    *   *Financial Strength (300 points)*
    *   *Operational Stability (250 points)*
    *   *Credit History (250 points)*
    *   *Team Assessment (100 points)*
    *   *Industry Risk (100 points)*

## ✨ Core Features
*   🏢 **Company Management**: Register, classify, and maintain profiles across different tier brackets of local renovation companies.
*   📊 **Credit Scoring Engine**: Automatically calculate sector-specific scores and map them to standardized credit grades and risk levels.
*   🦺 **OSH And ESG Signals**: Capture workplace-safety controls, 16kg handling readiness, training coverage, and ESG maturity as part of DecoFinance trust review.
*   💰 **Loan Processing Hub**: End-to-end lifecycle management of business loan applications, underwriting review, and repayment monitoring.
*   🧱 **Project And Escrow Workflows**: Manage customer projects, bids, milestones, escrow releases, and dispute handling.
*   🤝 **Smart Contract Engine**: Automatically translate bid acceptance, milestone approval, escrow release, and dispute freezes into a governed contract lifecycle.
*   📈 **Risk Data Dashboard**: Portfolio views for score trends, pending decisions, exposure, watchlists, dispute activity, and real-time safety backlogs.
*   🔒 **Administration System**: Restricted, authenticated access routing tailored for platform reviewers and administrators.

## 🚀 Installation

1. **Clone the repository** and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/renovation-credit-system.git
   cd renovation-credit-system
   ```

2. **Create and activate a virtual environment**:
   *Windows:*
   ```cmd
   python -m venv .venv
   .venv\Scripts\activate
   ```
   *macOS/Linux:*
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   A sample environment variable file is provided. Copy it to create your active configuration.
   ```bash
   cp .env.example .env
   ```

## 🎯 Getting Started (Demo & Test Info)

To instantly interact with the platform as a new user without manually filling out forms first, you can automatically seed the database with mock records.

1. **Initialize & Seed the Database**:
   The built-in script effectively recreates your tables from scratch and registers a default **admin user**, two placeholder **renovation companies**, **credit scores**, and **loan applications**.
   ```bash
   python seed_db.py
   ```

   To generate larger randomized demo data sets, run:
   *   **Windows Prompted Generator**: `./generate_random_data.bat`
   *   **Manual Python**: `python generate_random_data.py --count 25 --init`

2. **Launch the Server**:
   Pick any of the three commands below to fire up the system on `http://localhost:5001`.
   *   **Using Windows Script**: `.\start.bat`
   *   **Using Bash Script**: `./start.sh`
   *   **Using Manual Python**: `python app.py`

3. **Demo Login Credentials**:
   Head over to [http://localhost:5001](http://localhost:5001) in your browser.
   *   **Username:** `admin`
   *   **Password:** `password123`

## 🧪 Testing & Tools

We've provided comprehensive automated scripts that ensure all core services are intact.

*   **1. Run Mock System Tests:**
    Performs a localized integration check testing the core credit scoring downgrades and loan evaluations logic sequentially directly to the CLI interface.
    ```bash
    python tests/test_system.py
    ```

*   **2. Execute the Pytest Suite:**
    Bootstraps an in-memory SQL database array to silently and automatically verify that all URL Routes load smoothly ensuring 200/302 HTTP status codes responses.
    ```bash
    pytest
    ```

## 📚 Documentation
For a precise deep dive outlining the scope of operations and API architectures, please refer to our internal specifications defined logically inside the `docs/` folder:
*   📝 [01_Requirements_en.md](docs/01_Requirements_en.md) - System scoping and operational user roles
*   🏗 [02_Architecture_en.md](docs/02_Architecture_en.md) - Cloud hosting layout & internal application blueprint
*   🗄 [03_Database_en.md](docs/03_Database_en.md) - Entity-Relationship diagram concepts and fields mapping
*   🔌 [04_API_en.md](docs/04_API_en.md) - Exposed Application Programming Interfaces
*   🤝 [11_Smart_Contract_System.md](docs/11_Smart_Contract_System.md) - Application-layer contract lifecycle for escrow and disputes

## 📁 Project Structure
```text
renovation-credit-system/
├── app.py                # Main Flask entry-point
├── config.py             # Global environmental & security configurations
├── seed_db.py            # Development sample data generator
├── start.bat / start.sh  # Quickstart terminal executables
├── /models               # Database Schemas (User, Company, Loan, CreditScore)
├── /routes               # Application URL View Controllers
├── /services             # Complex logic (Credit Scoring Engine logic)
├── /templates            # HTML Jinja2 Views
├── /static               # UI styles & scripts
├── /tests                # Pytest unit and functional integration suites
└── /docs                 # Extensive markdown project documentation
```
