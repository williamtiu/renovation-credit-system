"""
公司验证模型 - 用于管理公司上线与验证流程
"""

from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class CompanyVerification(db.Model):
    """公司验证记录"""
    
    __tablename__ = 'company_verifications'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # 验证状态
    # provisional: 初始上传，等待审核
    # external_verification_pending: 等待外部验证
    # external_verification_in_progress: 外部验证进行中
    # validated: 验证通过
    # rejected: 验证被拒绝
    status = db.Column(db.String(30), default='provisional', nullable=False)
    
    # 文件上传状态
    audited_financials_uploaded = db.Column(db.Boolean, default=False)
    business_registration_uploaded = db.Column(db.Boolean, default=False)
    company_registration_uploaded = db.Column(db.Boolean, default=False)
    insurance_certificate_uploaded = db.Column(db.Boolean, default=False)
    osh_license_uploaded = db.Column(db.Boolean, default=False)
    project_photos_uploaded = db.Column(db.Boolean, default=False)
    invoices_uploaded = db.Column(db.Boolean, default=False)
    
    # 离线同意书状态
    offline_consent_submitted = db.Column(db.Boolean, default=False)
    offline_consent_submitted_at = db.Column(db.DateTime)
    offline_consent_file_path = db.Column(db.String(200))
    
    # 外部验证记录
    bd_verification_status = db.Column(db.String(20), default='not_requested')  # not_requested, pending, verified, rejected
    bd_verification_reference = db.Column(db.String(100))
    bd_verification_date = db.Column(db.Date)
    insurance_verification_status = db.Column(db.String(20), default='not_requested')
    insurance_verification_reference = db.Column(db.String(100))
    insurance_verification_date = db.Column(db.Date)
    ird_verification_status = db.Column(db.String(20), default='not_requested')
    ird_verification_reference = db.Column(db.String(100))
    ird_verification_date = db.Column(db.Date)
    tu_verification_status = db.Column(db.String(20), default='not_requested')
    tu_verification_reference = db.Column(db.String(100))
    tu_verification_date = db.Column(db.Date)
    
    # 管理员审核记录
    admin_review_status = db.Column(db.String(20), default='pending')  # pending,补件, approved, rejected
    admin_reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    admin_reviewed_at = db.Column(db.DateTime)
    admin_review_notes = db.Column(db.Text)
    admin_rejection_reason = db.Column(db.Text)
    
    # 最终核定
    final_status = db.Column(db.String(20), default='pending')  # pending, validated, rejected
    final_approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    final_approved_at = db.Column(db.DateTime)
    final_approval_notes = db.Column(db.Text)
    final_rejection_reason = db.Column(db.Text)
    
    # 稽核日志
    audit_trail = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # 关系
    company = db.relationship('Company', backref='verifications')
    admin_reviewer = db.relationship('User', foreign_keys=[admin_reviewed_by])
    final_approver = db.relationship('User', foreign_keys=[final_approved_by])
    
    def __repr__(self):
        return f'<CompanyVerification {self.id}: {self.company_id} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'status': self.status,
            'files': {
                'audited_financials_uploaded': self.audited_financials_uploaded,
                'business_registration_uploaded': self.business_registration_uploaded,
                'company_registration_uploaded': self.company_registration_uploaded,
                'insurance_certificate_uploaded': self.insurance_certificate_uploaded,
                'osh_license_uploaded': self.osh_license_uploaded,
                'project_photos_uploaded': self.project_photos_uploaded,
                'invoices_uploaded': self.invoices_uploaded,
            },
            'offline_consent': {
                'submitted': self.offline_consent_submitted,
                'submitted_at': self.offline_consent_submitted_at.isoformat() if self.offline_consent_submitted_at else None,
                'file_path': self.offline_consent_file_path,
            },
            'external_verification': {
                'bd': {
                    'status': self.bd_verification_status,
                    'reference': self.bd_verification_reference,
                    'date': self.bd_verification_date.isoformat() if self.bd_verification_date else None,
                },
                'insurance': {
                    'status': self.insurance_verification_status,
                    'reference': self.insurance_verification_reference,
                    'date': self.insurance_verification_date.isoformat() if self.insurance_verification_date else None,
                },
                'ird': {
                    'status': self.ird_verification_status,
                    'reference': self.ird_verification_reference,
                    'date': self.ird_verification_date.isoformat() if self.ird_verification_date else None,
                },
                'tu': {
                    'status': self.tu_verification_status,
                    'reference': self.tu_verification_reference,
                    'date': self.tu_verification_date.isoformat() if self.tu_verification_date else None,
                },
            },
            'admin_review': {
                'status': self.admin_review_status,
                'reviewed_by': self.admin_reviewed_by,
                'reviewed_at': self.admin_reviewed_at.isoformat() if self.admin_reviewed_at else None,
                'notes': self.admin_review_notes,
                'rejection_reason': self.admin_rejection_reason,
            },
            'final': {
                'status': self.final_status,
                'approved_by': self.final_approved_by,
                'approved_at': self.final_approved_at.isoformat() if self.final_approved_at else None,
                'approval_notes': self.final_approval_notes,
                'rejection_reason': self.final_rejection_reason,
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class LoanReferral(db.Model):
    """贷款转介记录"""
    
    __tablename__ = 'loan_referrals'
    
    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # 转介状态
    # pending: 待审核
    # consent_pending: 等待同意
    # consent_submitted: 同意已提交
    # under_review: 审核中
    # report_generated: 报告已生成
    # delivered: 已交付
    # bank_evaluation: 银行评估中
    # bank_approved: 银行批准
    # bank_rejected: 银行拒绝
    status = db.Column(db.String(30), default='pending', nullable=False)
    
    # 同意书状态
    consent_submitted = db.Column(db.Boolean, default=False)
    consent_submitted_at = db.Column(db.DateTime)
    consent_file_path = db.Column(db.String(200))
    
    # 评估报告
    report_generated = db.Column(db.Boolean, default=False)
    report_generated_at = db.Column(db.DateTime)
    report_file_path = db.Column(db.String(200))
    report_version = db.Column(db.String(20))
    
    # 交付记录
    delivered = db.Column(db.Boolean, default=False)
    delivered_at = db.Column(db.DateTime)
    delivery_method = db.Column(db.String(50))  # api, secure_transfer
    delivery_reference = db.Column(db.String(100))
    delivered_to_bank_id = db.Column(db.Integer, db.ForeignKey('banks.id'))
    
    # 银行信息
    bank_name = db.Column(db.String(100))
    bank_contact_person = db.Column(db.String(100))
    bank_reference_number = db.Column(db.String(50))
    bank_evaluation_result = db.Column(db.Text)
    bank_decision = db.Column(db.String(30))  # approved, rejected, conditional
    bank_decision_at = db.Column(db.DateTime)
    
    # 稽核日志
    audit_trail = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # 关系
    loan_application = db.relationship('LoanApplication', backref='referrals')
    company = db.relationship('Company', backref='referrals')
    bank = db.relationship('Bank', foreign_keys=[delivered_to_bank_id])
    
    def __repr__(self):
        return f'<LoanReferral {self.id}: {self.loan_application_id} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'loan_application_id': self.loan_application_id,
            'company_id': self.company_id,
            'status': self.status,
            'consent': {
                'submitted': self.consent_submitted,
                'submitted_at': self.consent_submitted_at.isoformat() if self.consent_submitted_at else None,
                'file_path': self.consent_file_path,
            },
            'report': {
                'generated': self.report_generated,
                'generated_at': self.report_generated_at.isoformat() if self.report_generated_at else None,
                'file_path': self.report_file_path,
                'version': self.report_version,
            },
            'delivery': {
                'delivered': self.delivered,
                'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
                'method': self.delivery_method,
                'reference': self.delivery_reference,
                'to_bank_id': self.delivered_to_bank_id,
            },
            'bank': {
                'name': self.bank_name,
                'contact_person': self.bank_contact_person,
                'reference_number': self.bank_reference_number,
                'evaluation_result': self.bank_evaluation_result,
                'decision': self.bank_decision,
                'decision_at': self.bank_decision_at.isoformat() if self.bank_decision_at else None,
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Bank(db.Model):
    """合作银行信息"""
    
    __tablename__ = 'banks'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    code = db.Column(db.String(20), unique=True)
    contact_person = db.Column(db.String(100))
    contact_email = db.Column(db.String(100))
    contact_phone = db.Column(db.String(20))
    address = db.Column(db.String(300))
    api_endpoint = db.Column(db.String(200))
    api_key = db.Column(db.String(100))
    active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    def __repr__(self):
        return f'<Bank {self.id}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_en': self.name_en,
            'code': self.code,
            'contact_person': self.contact_person,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'address': self.address,
            'api_endpoint': self.api_endpoint,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
