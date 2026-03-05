"""
"""

from flask import Blueprint, render_template
from models.database import db
from models.company import Company
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from datetime import datetime

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Home"""
    total_companies = Company.query.count()
    active_companies = Company.query.filter_by(status='active').count()
    total_loans = LoanApplication.query.count()
    approved_loans = LoanApplication.query.filter_by(application_status='approved').count()
    
    recent_scores = CreditScore.query.order_by(CreditScore.scored_at.desc()).limit(5).all()
    
    recent_applications = LoanApplication.query.order_by(LoanApplication.applied_at.desc()).limit(5).all()
    
    return render_template('index.html',
                         total_companies=total_companies,
                         active_companies=active_companies,
                         total_loans=total_loans,
                         approved_loans=approved_loans,
                         recent_scores=recent_scores,
                         recent_applications=recent_applications)

@main_bp.route('/dashboard')
def dashboard():
    """Dashboard"""
    # Credit Grade Distribution
    grade_distribution = db.session.query(
        CreditScore.credit_grade,
        db.func.count(CreditScore.id)
    ).group_by(CreditScore.credit_grade).all()
    
    # Loan Status Statistics
    loan_status_stats = db.session.query(
        LoanApplication.application_status,
        db.func.count(LoanApplication.id)
    ).group_by(LoanApplication.application_status).all()
    
    risk_distribution = db.session.query(
        Company.risk_level,
        db.func.count(Company.id)
    ).group_by(Company.risk_level).all()
    
    return render_template('dashboard.html',
                         grade_distribution=grade_distribution,
                         loan_status_stats=loan_status_stats,
                         risk_distribution=risk_distribution)

@main_bp.route('/about')
def about():
    """Documnetation translated"""
    return render_template('about.html')
