import logging
"""
🏠 DecoFinance
Decorator trust, project finance, and risk intelligence for renovation companies

Features:
- Renovation Company Data Management
- Credit Score System
- Project-Backed Financing
- Risk Assessment
- Banking Integration

Tech Stack: Flask + Jinja2 + SQLite
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, g
from models.database import init_db, db
from models.user import User
from models.company import Company
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.dispute_case import DisputeCase
from models.smart_contract_agreement import SmartContractAgreement
from models.consent_record import ConsentRecord
from models.audit_log import AuditLog
from models.company_verification import CompanyVerification, LoanReferral, Bank
from services.credit_scorer import CreditScorer
from datetime import datetime
import os
from sqlalchemy import inspect, text

from config import config


COMPANY_SCHEMA_PATCHES = {
    'osh_policy_in_place': 'BOOLEAN DEFAULT 0',
    'safety_training_coverage': 'INTEGER',
    'heavy_lifting_compliance': 'BOOLEAN DEFAULT 0',
    'lifting_equipment_available': 'BOOLEAN DEFAULT 0',
    'safety_incident_count': 'INTEGER DEFAULT 0',
    'esg_policy_level': "VARCHAR(20) DEFAULT 'none'",
    'green_material_ratio': 'INTEGER',
}


def _ensure_company_schema_columns():
    inspector = inspect(db.engine)
    if 'companies' not in inspector.get_table_names():
        return

    existing_columns = {column['name'] for column in inspector.get_columns('companies')}
    for column_name, ddl in COMPANY_SCHEMA_PATCHES.items():
        if column_name not in existing_columns:
            db.session.execute(text(f'ALTER TABLE companies ADD COLUMN {column_name} {ddl}'))
    db.session.commit()


def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Fallbacks in case config isn't thoroughly mapped for these yet
    if not app.config.get('SECRET_KEY'):
        app.config['SECRET_KEY'] = 'renovation-credit-system-2026'
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///renovation_credit.db'
    
    # Initialize Database
    db.init_app(app)
    
    with app.app_context():
        # Models need to be imported for creation
        db.create_all()
        _ensure_company_schema_columns()
    
    # Global before_request for user loading
    @app.before_request
    def load_logged_in_user():
        user_id = session.get('user_id')
        if user_id is None:
            g.user = None
        else:
            g.user = db.session.get(User, user_id)
            
    # Import Routes
    from routes.auth import auth_bp
    from routes.main import main_bp
    from routes.companies import companies_bp
    from routes.loans import loans_bp
    from routes.api import api_bp
    from routes.projects import projects_bp
    from routes.disputes import disputes_bp
    from routes.admin import admin_bp
    from routes.verifications import verifications_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(companies_bp, url_prefix='/companies')
    app.register_blueprint(loans_bp, url_prefix='/loans')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(projects_bp, url_prefix='/projects')
    app.register_blueprint(disputes_bp, url_prefix='/disputes')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(verifications_bp, url_prefix='/verifications')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
