"""
贷款转介服务 - 管理贷款转介流程
"""

from datetime import datetime, timezone
from flask import g
from models.company_verification import LoanReferral, Bank
from models.loan_application import LoanApplication
from models.company import Company
from models.audit_log import AuditLog
from models.database import db
from services.audit_service import log_action
from services.report_service import build_credit_report_pdf
from services.credit_scorer import CreditScorer
from models.credit_score import CreditScore


def can_referral_be_submitted(loan_application):
    """检查贷款转介是否可以提交"""
    if not loan_application:
        return False, "Loan application not found"
    
    if loan_application.application_status != 'approved':
        return False, "Loan application must be approved"
    
    company = Company.query.get(loan_application.company_id)
    if not company:
        return False, "Company not found"
    
    # 检查公司是否已完成验证
    from services.verification_service import get_active_verification
    active_verification = get_active_verification(company.id)
    if not active_verification:
        return False, "Company must be fully verified"
    
    # 检查是否已有有效的转介记录
    existing_referral = LoanReferral.query.filter_by(
        loan_application_id=loan_application.id
    ).first()
    if existing_referral and existing_referral.status in ['delivered', 'bank_approved', 'bank_rejected']:
        return False, "Referral already exists for this loan application"
    
    return True, "Ready to submit"


def submit_loan_referral(loan_application_id, consent_file_path=None):
    """提交贷款转介申请"""
    loan_application = LoanApplication.query.get(loan_application_id)
    if not loan_application:
        return None, "Loan application not found"
    
    # 检查是否可以提交
    can_submit, message = can_referral_be_submitted(loan_application)
    if not can_submit:
        return None, message
    
    # 创建转介记录
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
        'loan_referral_submitted',
        'LoanReferral',
        referral.id,
        {
            'loan_application_id': loan_application_id,
            'company_id': loan_application.company_id,
            'loan_amount': loan_application.loan_amount,
        }
    )
    
    return referral, "Referral submitted successfully"


def admin_review_referral(referral_id, admin_user_id, action, notes=None, rejection_reason=None):
    """管理员审核转介申请"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None, "Referral not found"
    
    if action == 'approve':
        referral.status = 'under_review'
        referral.updated_at = datetime.now(timezone.utc)
        
        log_action(
            'referral_admin_approved',
            'LoanReferral',
            referral_id,
            {
                'approved_by': admin_user_id,
                'notes': notes
            }
        )
        
        db.session.commit()
        return referral, "Referral approved for review"
    
    elif action == 'reject':
        referral.status = 'rejected'
        referral.admin_rejection_reason = rejection_reason
        referral.updated_at = datetime.now(timezone.utc)
        
        log_action(
            'referral_admin_rejected',
            'LoanReferral',
            referral_id,
            {
                'rejected_by': admin_user_id,
                'rejection_reason': rejection_reason,
                'notes': notes
            }
        )
        
        db.session.commit()
        return referral, "Referral rejected"
    
    return None, "Invalid action"


def generate_referral_package(referral_id, admin_user_id):
    """生成转介评估报告包"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None, "Referral not found"
    
    if referral.status != 'under_review':
        return None, "Referral must be under review to generate package"
    
    # 获取公司和最新评分
    company = Company.query.get(referral.company_id)
    if not company:
        return None, "Company not found"
    
    latest_score = CreditScore.query.filter_by(company_id=company.id).order_by(CreditScore.scored_at.desc()).first()
    
    # 构建报告
    from services.verification_service import get_verification_status
    verification = referral.company.verifications[0] if referral.company.verifications else None
    verification_status = get_verification_status(verification) if verification else {}
    
    report_data = {
        'referral_id': referral.id,
        'generated_at': datetime.now(timezone.utc),
        'company': company.to_dict(),
        'loan_application': {
            'id': referral.loan_application_id,
            'amount': referral.loan_application.loan_amount,
            'purpose': referral.loan_application.loan_purpose,
            'term_months': referral.loan_application.loan_term_months,
            'status': referral.loan_application.application_status,
        },
        'credit_score': {
            'score': latest_score.credit_score if latest_score else None,
            'grade': latest_score.credit_grade if latest_score else None,
            'risk_level': latest_score.risk_level if latest_score else None,
        },
        'verification_status': verification_status,
        'score_components': latest_score.score_components if latest_score else None,
        'risk_factors': latest_score.risk_factors if latest_score else None,
        'audit_trail': [
            {
                'action': log.action,
                'timestamp': log.created_at.isoformat(),
                'details': log.details_json,
            }
            for log in referral.company.verifications[0].audit_trail
        ] if referral.company.verifications else [],
    }
    
    # 生成PDF报告
    try:
        pdf_bytes = build_credit_report_pdf(company, report_data)
        report_file_path = f"reports/referral-{referral.id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
        
        referral.report_generated = True
        referral.report_generated_at = datetime.now(timezone.utc)
        referral.report_file_path = report_file_path
        referral.report_version = 'v1.0'
        referral.status = 'report_generated'
        referral.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        log_action(
            'referral_package_generated',
            'LoanReferral',
            referral_id,
            {
                'report_version': 'v1.0',
                'report_file_path': report_file_path,
                'generated_by': admin_user_id,
            }
        )
        
        return report_data, "Report package generated successfully"
        
    except Exception as e:
        return None, f"Failed to generate report: {str(e)}"


def deliver_referral_to_bank(referral_id, bank_id, delivery_method='api', delivery_reference=None):
    """安全交付转介报告给银行"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None, "Referral not found"
    
    if referral.status != 'report_generated':
        return None, "Report package must be generated before delivery"
    
    bank = Bank.query.get(bank_id)
    if not bank:
        return None, "Bank not found"
    
    # 交付报告
    referral.delivered = True
    referral.delivered_at = datetime.now(timezone.utc)
    referral.delivery_method = delivery_method
    referral.delivery_reference = delivery_reference
    referral.delivered_to_bank_id = bank_id
    referral.bank_name = bank.name
    referral.status = 'delivered'
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'referral_report_delivered',
        'LoanReferral',
        referral_id,
        {
            'bank_id': bank_id,
            'bank_name': bank.name,
            'method': delivery_method,
            'reference': delivery_reference,
        }
    )
    
    return referral, "Report delivered to bank successfully"


def record_bank_evaluation(referral_id, bank_decision, bank_evaluation_result=None):
    """记录银行评估结果"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None, "Referral not found"
    
    if referral.status != 'delivered':
        return None, "Referral must be delivered before recording bank decision"
    
    referral.bank_decision = bank_decision
    referral.bank_evaluation_result = bank_evaluation_result
    referral.bank_decision_at = datetime.now(timezone.utc)
    
    if bank_decision == 'approved':
        referral.status = 'bank_approved'
    elif bank_decision == 'rejected':
        referral.status = 'bank_rejected'
    elif bank_decision == 'conditional':
        referral.status = 'bank_evaluation'
    
    referral.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    log_action(
        'bank_evaluation_recorded',
        'LoanReferral',
        referral_id,
        {
            'decision': bank_decision,
            'evaluation_result': bank_evaluation_result,
        }
    )
    
    return referral, "Bank evaluation recorded successfully"


def get_referral_status(referral):
    """获取转介状态摘要"""
    status_summary = {
        'consent_submitted': referral.consent_submitted,
        'report_generated': referral.report_generated,
        'delivered': referral.delivered,
        'bank_decision': referral.bank_decision,
        'status': referral.status,
    }
    
    return status_summary


def get_referral_history(company_id):
    """获取公司的转介历史"""
    return LoanReferral.query.filter_by(
        company_id=company_id
    ).order_by(LoanReferral.created_at.desc()).all()


def get_active_referral_for_loan(loan_application_id):
    """获取贷款申请的活跃转介记录"""
    return LoanReferral.query.filter_by(
        loan_application_id=loan_application_id,
        status='delivered'
    ).first()


def get_referral_by_id(referral_id):
    """根据ID获取转介记录"""
    return LoanReferral.query.get(referral_id)


def update_referral_bank_info(referral_id, bank_name=None, bank_contact_person=None, bank_reference_number=None):
    """更新转介的银行信息"""
    referral = LoanReferral.query.get(referral_id)
    if not referral:
        return None
    
    if bank_name:
        referral.bank_name = bank_name
    if bank_contact_person:
        referral.bank_contact_person = bank_contact_person
    if bank_reference_number:
        referral.bank_reference_number = bank_reference_number
    
    referral.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    
    return referral
