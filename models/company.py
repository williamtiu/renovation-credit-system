"""
"""

from models.database import db
from datetime import datetime, timezone

def utc_now():
    """Documnetation translated"""
    return datetime.now(timezone.utc)

class Company(db.Model):
    """Documnetation translated"""
    
    __tablename__ = 'companies'
    
    id = db.Column(db.Integer, primary_key=True)
    
    company_name = db.Column(db.String(200), nullable=False)
    business_registration = db.Column(db.String(50), unique=True, nullable=False)
    established_date = db.Column(db.Date)
    registered_capital = db.Column(db.Float)
    
    contact_person = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.String(300))
    district = db.Column(db.String(50))
    
    employee_count = db.Column(db.Integer)
    annual_revenue = db.Column(db.Float)
    project_count_completed = db.Column(db.Integer)
    average_project_value = db.Column(db.Float)
    main_service_type = db.Column(db.String(100))
    
    has_license = db.Column(db.Boolean, default=False)
    license_type = db.Column(db.String(100))
    iso_certified = db.Column(db.Boolean, default=False)
    professional_memberships = db.Column(db.String(300))
    
    bank_account_years = db.Column(db.Integer)
    existing_loans = db.Column(db.Float)
    loan_repayment_history = db.Column(db.String(20))
    
    status = db.Column(db.String(20), default='active')  # active, suspended, blacklisted
    risk_level = db.Column(db.String(20))  # low, medium, high
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    credit_scores = db.relationship('CreditScore', backref='company', lazy=True)
    loan_applications = db.relationship('LoanApplication', backref='company', lazy=True)
    
    def __repr__(self):
        return f'<Company {self.company_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'business_registration': self.business_registration,
            'established_date': self.established_date.isoformat() if self.established_date else None,
            'registered_capital': self.registered_capital,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'employee_count': self.employee_count,
            'annual_revenue': self.annual_revenue,
            'project_count_completed': self.project_count_completed,
            'has_license': self.has_license,
            'status': self.status,
            'risk_level': self.risk_level,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
