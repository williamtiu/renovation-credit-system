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
    company_registration_number = db.Column(db.String(50))
    established_date = db.Column(db.Date)
    registered_capital = db.Column(db.Float)
    
    contact_person = db.Column(db.String(100))
    contact_position = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.String(300))
    
    employee_count = db.Column(db.Integer)
    annual_revenue = db.Column(db.Float)
    project_count_completed = db.Column(db.Integer)
    average_project_value = db.Column(db.Float)
    main_service_type = db.Column(db.String(100))
    licence_class = db.Column(db.String(50))
    licence_categories = db.Column(db.String(100))
    licence_expiry_date = db.Column(db.Date)
    licence_verification_status = db.Column(db.String(30), default='pending')
    osh_officer_role = db.Column(db.String(100))
    osh_officer_license_number = db.Column(db.String(100))
    insurance_provider = db.Column(db.String(100))
    insurance_policy_number = db.Column(db.String(100))
    insurance_expiry_date = db.Column(db.Date)
    insurance_verification_status = db.Column(db.String(30), default='pending')
    safety_training_coverage = db.Column(db.Integer)
    safety_incident_count = db.Column(db.Integer, default=0)
    esg_policy_level = db.Column(db.String(20), default='none')
    green_material_ratio = db.Column(db.Integer)
    owner_user_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True, name='fk_companies_owner_user_id'))
    
    # 新增财务指标字段（用于新的评分体系）
    current_assets = db.Column(db.Float, default=0.0)  # 流动资产
    current_liabilities = db.Column(db.Float, default=0.0)  # 流动负债
    total_cash = db.Column(db.Float, default=0.0)  # 现金总额
    total_liabilities = db.Column(db.Float, default=0.0)  # 总负债
    shareholders_equity = db.Column(db.Float, default=0.0)  # 股东权益
    audited_financials_uploaded = db.Column(db.Boolean, default=False)  # 是否上传经审计的财务报表
    tax_returns_uploaded = db.Column(db.Boolean, default=False)  # 是否上传纳税申报表
    
    # 新增资质与认证字段
    minor_works_contractor_registration = db.Column(db.String(100), default=None)  # 小型工程承建商注册号
    minor_works_registration_verified = db.Column(db.Boolean, default=False)  # 小型工程注册验证状态
    insurance_documents_uploaded = db.Column(db.Boolean, default=False)  # 保险文件是否上传
    insurance_verified = db.Column(db.Boolean, default=False)  # 保险验证状态
    osh_safety_officer_license = db.Column(db.String(100), default=None)  # OSH安全主任执照号
    osh_safety_officer_verified = db.Column(db.Boolean, default=False)  # OSH安全主任验证状态
    
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
            'company_registration_number': self.company_registration_number,
            'established_date': self.established_date.isoformat() if self.established_date else None,
            'registered_capital': self.registered_capital,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'employee_count': self.employee_count,
            'annual_revenue': self.annual_revenue,
            'project_count_completed': self.project_count_completed,
            'main_service_type': self.main_service_type,
            'licence_class': self.licence_class,
            'licence_categories': self.licence_categories,
            'licence_verification_status': self.licence_verification_status,
            'osh_officer_role': self.osh_officer_role,
            'osh_officer_license_number': self.osh_officer_license_number,
            'insurance_verification_status': self.insurance_verification_status,
            'safety_training_coverage': self.safety_training_coverage,
            'safety_incident_count': self.safety_incident_count,
            'esg_policy_level': self.esg_policy_level,
            'green_material_ratio': self.green_material_ratio,
            'status': self.status,
            'risk_level': self.risk_level,
            'trust_score_cached': self.trust_score_cached,
            'is_verified_for_bidding': self.is_verified_for_bidding,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # 新增财务指标
            'current_assets': self.current_assets,
            'current_liabilities': self.current_liabilities,
            'total_cash': self.total_cash,
            'total_liabilities': self.total_liabilities,
            'shareholders_equity': self.shareholders_equity,
            'audited_financials_uploaded': self.audited_financials_uploaded,
            'tax_returns_uploaded': self.tax_returns_uploaded,
            # 新增资质认证
            'minor_works_contractor_registration': self.minor_works_contractor_registration,
            'minor_works_registration_verified': self.minor_works_registration_verified,
            'insurance_documents_uploaded': self.insurance_documents_uploaded,
            'insurance_verified': self.insurance_verified,
            'osh_safety_officer_license': self.osh_safety_officer_license,
            'osh_safety_officer_verified': self.osh_safety_officer_verified,
        }
