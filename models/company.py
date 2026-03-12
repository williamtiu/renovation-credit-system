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
    company_name_en = db.Column(db.String(200))
    business_registration = db.Column(db.String(50), unique=True, nullable=False)
    established_date = db.Column(db.Date)
    registered_capital = db.Column(db.Float)
    
    contact_person = db.Column(db.String(100))
    contact_position = db.Column(db.String(100))
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
    licence_number = db.Column(db.String(100))
    licence_class = db.Column(db.String(50))
    licence_categories = db.Column(db.String(100))
    licence_expiry_date = db.Column(db.Date)
    licence_verification_status = db.Column(db.String(30), default='pending')
    iso_certified = db.Column(db.Boolean, default=False)
    professional_memberships = db.Column(db.String(300))
    insurance_provider = db.Column(db.String(100))
    insurance_policy_number = db.Column(db.String(100))
    insurance_expiry_date = db.Column(db.Date)
    insurance_verification_status = db.Column(db.String(30), default='pending')
    osh_policy_in_place = db.Column(db.Boolean, default=False)
    safety_training_coverage = db.Column(db.Integer)
    heavy_lifting_compliance = db.Column(db.Boolean, default=False)
    lifting_equipment_available = db.Column(db.Boolean, default=False)
    safety_incident_count = db.Column(db.Integer, default=0)
    esg_policy_level = db.Column(db.String(20), default='none')
    green_material_ratio = db.Column(db.Integer)
    owner_user_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True, name='fk_companies_owner_user_id'))
    
    bank_account_years = db.Column(db.Integer)
    existing_loans = db.Column(db.Float)
    loan_repayment_history = db.Column(db.String(20))
    
    status = db.Column(db.String(20), default='active')  # active, suspended, blacklisted
    risk_level = db.Column(db.String(20))  # low, medium, high
    trust_score_cached = db.Column(db.Integer)
    dispute_count_cached = db.Column(db.Integer, default=0)
    is_verified_for_bidding = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    credit_scores = db.relationship('CreditScore', backref='company', lazy=True)
    loan_applications = db.relationship('LoanApplication', backref='company', lazy=True)
    projects_bid = db.relationship('ProjectBid', backref='company', lazy=True)
    disputes = db.relationship('DisputeCase', backref='company', lazy=True)
    
    def __repr__(self):
        return f'<Company {self.company_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'company_name_en': self.company_name_en,
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
            'licence_verification_status': self.licence_verification_status,
            'insurance_verification_status': self.insurance_verification_status,
            'osh_policy_in_place': self.osh_policy_in_place,
            'safety_training_coverage': self.safety_training_coverage,
            'heavy_lifting_compliance': self.heavy_lifting_compliance,
            'lifting_equipment_available': self.lifting_equipment_available,
            'safety_incident_count': self.safety_incident_count,
            'esg_policy_level': self.esg_policy_level,
            'green_material_ratio': self.green_material_ratio,
            'status': self.status,
            'risk_level': self.risk_level,
            'trust_score_cached': self.trust_score_cached,
            'is_verified_for_bidding': self.is_verified_for_bidding,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
