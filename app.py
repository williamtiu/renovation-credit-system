import logging
"""
🏠 Renovation Credit System
Based on TransUnion (TU) model, providing Credit Score services for Renovation Companies

Features:
- Renovation Company Data Management
- Credit Score System
- Loan Applications Processing
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
from services.credit_scorer import CreditScorer
from datetime import datetime
import os

from config import config

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
    
    # Global before_request for user loading
    @app.before_request
    def load_logged_in_user():
        user_id = session.get('user_id')
        if user_id is None:
            g.user = None
        else:
            g.user = User.query.get(user_id)
            
    # Import Routes
    from routes.auth import auth_bp
    from routes.main import main_bp
    from routes.companies import companies_bp
    from routes.loans import loans_bp
    from routes.api import api_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(companies_bp, url_prefix='/companies')
    app.register_blueprint(loans_bp, url_prefix='/loans')
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
