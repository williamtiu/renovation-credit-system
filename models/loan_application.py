"""
"""

from models.database import db
from datetime import datetime, timezone
from sqlalchemy import func

def utc_now():
    """Documnetation translated"""
    return datetime.now(timezone.utc)

class LoanApplication(db.Model):
    """Documnetation translated"""
    
    __tablename__ = 'loan_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    loan_amount = db.Column(db.Float, nullable=False)
    loan_purpose = db.Column(db.String(200))
    loan_term_months = db.Column(db.Integer)
    expected_interest_rate = db.Column(db.Float)
    
    collateral_type = db.Column(db.String(100))
    collateral_value = db.Column(db.Float)
    guarantor = db.Column(db.String(200))
    
    bank_name = db.Column(db.String(100))
    bank_officer = db.Column(db.String(100))
    bank_reference_number = db.Column(db.String(50))
    
    application_status = db.Column(db.String(30), default='pending')  # pending, under_review, approved, rejected, withdrawn
    approval_date = db.Column(db.Date)
    approved_amount = db.Column(db.Float)
    approved_interest_rate = db.Column(db.Float)
    approval_conditions = db.Column(db.Text)
    
    credit_score_at_application = db.Column(db.Integer)
    credit_grade_at_application = db.Column(db.String(5))
    
    disbursement_date = db.Column(db.Date)
    disbursement_amount = db.Column(db.Float)
    first_repayment_date = db.Column(db.Date)
    
    repayment_status = db.Column(db.String(30))  # current, overdue, defaulted, completed
    total_repaid = db.Column(db.Float, default=0.0)
    outstanding_balance = db.Column(db.Float, default=0.0)
    overdue_days = db.Column(db.Integer, default=0)
    
    applied_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    
    def __repr__(self):
        return f'<LoanApplication {self.id}: {self.company_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'loan_amount': self.loan_amount,
            'loan_purpose': self.loan_purpose,
            'loan_term_months': self.loan_term_months,
            'application_status': self.application_status,
            'approved_amount': self.approved_amount,
            'approved_interest_rate': self.approved_interest_rate,
            'credit_score_at_application': self.credit_score_at_application,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'approval_date': self.approval_date.isoformat() if self.approval_date else None
        }
