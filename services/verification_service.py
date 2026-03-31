"""
公司验证服务 - 管理公司上线与验证流程
"""

from datetime import datetime, timezone
from flask import g
from models.company_verification import CompanyVerification, LoanReferral, Bank
from models.company import Company
from models.loan_application import LoanApplication
from models.audit_log import AuditLog
from models.database import db
from services.audit_service import log_action


def create_verification(company_id, files_uploaded=None):
    """创建新的验证记录"""
    files_uploaded = files_uploaded or {}
    
    verification = CompanyVerification(
        company_id=company_id,
        status='provisional',
        audited_financials_uploaded=files_uploaded.get('audited_financials_uploaded', False),
        business_registration_uploaded=files_uploaded.get('business_registration_uploaded', False),
        company_registration_uploaded=files_uploaded.get('company_registration_uploaded', False),
        insurance_certificate_uploaded=files_uploaded.get('insurance_certificate_uploaded', False),
        osh_license_uploaded=files_uploaded.get('osh_license_uploaded', False),
        project_photos_uploaded=files_uploaded.get('project_photos_uploaded', False),
        invoices_uploaded=files_uploaded.get('invoices_uploaded', False),
    )
    
    db.session.add(verification)
    db.session.commit()
    
    log_action(
        'verification_created',
        'CompanyVerification',
        verification.id,
        {'company_id': company_id, 'status': 'provisional'}
    )
    
    return verification


def update_verification_files(verification_id, files):
    """更新验证文件上传状态"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    for field, value in files.items():
        if hasattr(verification, field):
            setattr(verification, field, value)
    
    verification.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    
    log_action(
        'verification_files_updated',
        'CompanyVerification',
        verification_id,
        {'files': files}
    )
    
    return verification


def submit_offline_consent(verification_id, file_path=None):
    """提交离线同意书"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    verification.offline_consent_submitted = True
    verification.offline_consent_submitted_at = datetime.now(timezone.utc)
    verification.offline_consent_file_path = file_path
    verification.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'offline_consent_submitted',
        'CompanyVerification',
        verification_id,
        {'file_path': file_path}
    )
    
    return verification


def request_external_verification(verification_id, verification_type, admin_user_id):
    """请求外部验证（BD/保险/IRD/TU）"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    if verification_type == 'bd':
        verification.bd_verification_status = 'pending'
    elif verification_type == 'insurance':
        verification.insurance_verification_status = 'pending'
    elif verification_type == 'ird':
        verification.ird_verification_status = 'pending'
    elif verification_type == 'tu':
        verification.tu_verification_status = 'pending'
    
    verification.admin_review_status = 'pending'
    verification.admin_reviewed_by = admin_user_id
    verification.admin_reviewed_at = datetime.now(timezone.utc)
    verification.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'external_verification_requested',
        'CompanyVerification',
        verification_id,
        {'verification_type': verification_type, 'requested_by': admin_user_id}
    )
    
    return verification


def record_external_verification_result(verification_id, verification_type, result, reference=None, verifier_user_id=None):
    """记录外部验证结果"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    if verification_type == 'bd':
        verification.bd_verification_status = result
        verification.bd_verification_reference = reference
        verification.bd_verification_date = datetime.now(timezone.utc).date()
    elif verification_type == 'insurance':
        verification.insurance_verification_status = result
        verification.insurance_verification_reference = reference
        verification.insurance_verification_date = datetime.now(timezone.utc).date()
    elif verification_type == 'ird':
        verification.ird_verification_status = result
        verification.ird_verification_reference = reference
        verification.ird_verification_date = datetime.now(timezone.utc).date()
    elif verification_type == 'tu':
        verification.tu_verification_status = result
        verification.tu_verification_reference = reference
        verification.tu_verification_date = datetime.now(timezone.utc).date()
    
    verification.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'external_verification_result_recorded',
        'CompanyVerification',
        verification_id,
        {
            'verification_type': verification_type,
            'result': result,
            'reference': reference,
            'recorded_by': verifier_user_id
        }
    )
    
    return verification


def admin_review_verification(verification_id, admin_user_id, status, notes=None, rejection_reason=None):
    """管理员初审验证记录"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    verification.admin_review_status = status
    verification.admin_reviewed_by = admin_user_id
    verification.admin_reviewed_at = datetime.now(timezone.utc)
    verification.admin_review_notes = notes
    verification.admin_rejection_reason = rejection_reason
    verification.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'verification_admin_reviewed',
        'CompanyVerification',
        verification_id,
        {
            'status': status,
            'reviewed_by': admin_user_id,
            'notes': notes,
            'rejection_reason': rejection_reason
        }
    )
    
    return verification


def admin_final_approve_verification(verification_id, admin_user_id, notes=None):
    """管理员最终批准验证"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    verification.final_status = 'validated'
    verification.final_approved_by = admin_user_id
    verification.final_approved_at = datetime.now(timezone.utc)
    verification.final_approval_notes = notes
    verification.updated_at = datetime.now(timezone.utc)
    
    # 更新公司状态
    company = Company.query.get(verification.company_id)
    if company:
        company.licence_verification_status = 'verified' if verification.bd_verification_status == 'verified' else 'pending'
        company.insurance_verification_status = 'verified' if verification.insurance_verification_status == 'verified' else 'pending'
        company.status = 'active'
    
    db.session.commit()
    
    log_action(
        'verification_final_approved',
        'CompanyVerification',
        verification_id,
        {
            'approved_by': admin_user_id,
            'notes': notes
        }
    )
    
    # 触发评分计算
    from services.credit_scorer import CreditScorer
    scorer = CreditScorer()
    result = scorer.calculate_score(company)
    scorer.save_score(company, result, notes='Verification completed - trust score recalculated')
    
    return verification


def admin_reject_verification(verification_id, admin_user_id, rejection_reason, notes=None):
    """管理员拒绝验证"""
    verification = CompanyVerification.query.get(verification_id)
    if not verification:
        return None
    
    verification.final_status = 'rejected'
    verification.final_approved_by = admin_user_id
    verification.final_approved_at = datetime.now(timezone.utc)
    verification.final_rejection_reason = rejection_reason
    verification.final_approval_notes = notes
    verification.updated_at = datetime.now(timezone.utc)
    
    # 更新公司状态
    company = Company.query.get(verification.company_id)
    if company:
        company.status = 'suspended'
    
    db.session.commit()
    
    log_action(
        'verification_rejected',
        'CompanyVerification',
        verification_id,
        {
            'rejected_by': admin_user_id,
            'rejection_reason': rejection_reason,
            'notes': notes
        }
    )
    
    return verification


def get_verification_status(verification):
    """获取验证状态摘要"""
    status_summary = {
        'files_completed': all([
            verification.audited_financials_uploaded,
            verification.business_registration_uploaded,
            verification.company_registration_uploaded,
            verification.insurance_certificate_uploaded,
            verification.osh_license_uploaded,
            verification.project_photos_uploaded,
            verification.invoices_uploaded,
        ]),
        'offline_consent_submitted': verification.offline_consent_submitted,
        'external_verification_completed': all([
            verification.bd_verification_status == 'verified',
            verification.insurance_verification_status == 'verified',
            verification.ird_verification_status == 'verified',
            verification.tu_verification_status == 'verified',
        ]),
        'admin_review_completed': verification.admin_review_status == 'approved',
        'final_approved': verification.final_status == 'validated',
    }
    
    status_summary['can_request_external'] = (
        status_summary['files_completed'] and
        status_summary['offline_consent_submitted'] and
        verification.status == 'provisional'
    )
    
    status_summary['can_final_approve'] = (
        status_summary['external_verification_completed'] and
        status_summary['admin_review_completed'] and
        verification.admin_review_status != 'rejected'
    )
    
    return status_summary


def create_loan_referral(loan_application_id, consent_file_path=None):
    """创建贷款转介记录"""
    loan_application = LoanApplication.query.get(loan_application_id)
    if not loan_application:
        return None
    
    referral = LoanReferral(
        loan_application_id=loan_application_id,
        company_id=loan_application.company_id,
        status='pending',
        consent_submitted=False,
        consent_file_path=consent_file_path,
    )
    
    db.session.add(referral)
    db.session.commit()
    
    log_action(
        'loan_referral_created',
        'LoanReferral',
        referral.id,
        {'loan_application_id': loan_application_id, 'company_id': loan_application.company_id}
    )
    
    return referral


def submit_referral_consent(referral_id, file_path=None):
    """提交转介同意书"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None
    
    referral.consent_submitted = True
    referral.consent_submitted_at = datetime.now(timezone.utc)
    referral.consent_file_path = file_path
    referral.status = 'consent_submitted'
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'referral_consent_submitted',
        'LoanReferral',
        referral_id,
        {'file_path': file_path}
    )
    
    return referral


def generate_referral_report(referral_id, report_version='v1.0'):
    """生成转介评估报告包"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None
    
    referral.report_generated = True
    referral.report_generated_at = datetime.now(timezone.utc)
    referral.report_version = report_version
    referral.status = 'report_generated'
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'referral_report_generated',
        'LoanReferral',
        referral_id,
        {'version': report_version}
    )
    
    return referral


def deliver_referral_report(referral_id, bank_id, delivery_method='api', delivery_reference=None):
    """安全交付转介报告给银行"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None
    
    referral.delivered = True
    referral.delivered_at = datetime.now(timezone.utc)
    referral.delivery_method = delivery_method
    referral.delivery_reference = delivery_reference
    referral.delivered_to_bank_id = bank_id
    referral.status = 'delivered'
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'referral_report_delivered',
        'LoanReferral',
        referral_id,
        {
            'bank_id': bank_id,
            'method': delivery_method,
            'reference': delivery_reference
        }
    )
    
    return referral


def record_bank_decision(referral_id, bank_decision, bank_evaluation_result=None, bank_decision_at=None):
    """记录银行决策"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None
    
    referral.bank_decision = bank_decision
    referral.bank_evaluation_result = bank_evaluation_result
    referral.bank_decision_at = bank_decision_at or datetime.now(timezone.utc)
    
    if bank_decision == 'approved':
        referral.status = 'bank_approved'
    elif bank_decision == 'rejected':
        referral.status = 'bank_rejected'
    elif bank_decision == 'conditional':
        referral.status = 'bank_evaluation'
    
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'bank_decision_recorded',
        'LoanReferral',
        referral_id,
        {
            'decision': bank_decision,
            'evaluation_result': bank_evaluation_result
        }
    )
    
    return referral


def get_active_verification(company_id):
    """获取公司的有效验证记录"""
    return CompanyVerification.query.filter_by(
        company_id=company_id,
        final_status='validated'
    ).order_by(CompanyVerification.final_approved_at.desc()).first()


def get_verification_history(company_id):
    """获取公司的验证历史"""
    return CompanyVerification.query.filter_by(
        company_id=company_id
    ).order_by(CompanyVerification.created_at.desc()).all()


def get_referral_by_loan_application(loan_application_id):
    """根据贷款申请获取转介记录"""
    return LoanReferral.query.filter_by(loan_application_id=loan_application_id).first()


def get_active_referral(company_id):
    """获取公司的有效转介记录"""
    return LoanReferral.query.filter_by(
        company_id=company_id,
        status='delivered'
    ).order_by(LoanReferral.delivered_at.desc()).first()


def create_bank(name, code, contact_person=None, contact_email=None, contact_phone=None, address=None, api_endpoint=None, api_key=None):
    """创建合作银行"""
    bank = Bank(
        name=name,
        code=code,
        contact_person=contact_person,
        contact_email=contact_email,
        contact_phone=contact_phone,
        address=address,
        api_endpoint=api_endpoint,
        api_key=api_key,
        active=True,
    )
    
    db.session.add(bank)
    db.session.commit()
    
    return bank


def get_active_banks():
    """获取所有活跃的合作银行"""
    return Bank.query.filter_by(active=True).all()
