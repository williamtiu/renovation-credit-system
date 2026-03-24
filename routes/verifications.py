"""
公司验证路由 - 管理公司上线与验证流程
"""

from datetime import datetime, timezone
from flask import Blueprint, flash, g, redirect, render_template, request, url_for
from werkzeug.exceptions import HTTPException
from utils.template_helper import render_template_with_lang_fallback

from models.company import Company
from models.company_verification import CompanyVerification, LoanReferral, Bank
from models.database import db, get_or_404
from models.loan_application import LoanApplication
from services.audit_service import log_action
from services.verification_service import (
    create_verification as svc_create_verification, 
    update_verification_files as svc_update_verification_files, 
    submit_offline_consent as svc_submit_offline_consent,
    request_external_verification as svc_request_external_verification,
    record_external_verification_result as svc_record_external_verification_result,
    admin_review_verification as svc_admin_review_verification,
    admin_final_approve_verification as svc_admin_final_approve_verification,
    admin_reject_verification as svc_admin_reject_verification,
    get_verification_status,
    get_active_verification,
    get_verification_history,
    create_bank,
    get_active_banks
)
from services.referral_service import (
    submit_loan_referral as svc_submit_loan_referral,
    admin_review_referral as svc_admin_review_referral,
    generate_referral_package as svc_generate_referral_package,
    deliver_referral_to_bank as svc_deliver_referral_to_bank,
    record_bank_evaluation as svc_record_bank_evaluation
)
from utils.auth_helper import login_required, role_required, require_ownership

verifications_bp = Blueprint('verifications', __name__)


def _can_manage_verification(user, verification):
    """检查用户是否可以管理验证"""
    if user.role in ['admin', 'reviewer']:
        return True
    return False


def _can_view_verification(user, verification):
    """检查用户是否可以查看验证"""
    if user.role in ['admin', 'reviewer']:
        return True
    if user.role == 'company_user':
        return user.company_id == verification.company_id
    return False


@verifications_bp.route('/<int:company_id>/verification')
@login_required
def view_verification(company_id):
    """查看公司验证状态"""
    company = get_or_404(Company, company_id)
    require_ownership(_can_view_verification(g.user, None))
    
    # 获取最新的验证记录
    verification = CompanyVerification.query.filter_by(company_id=company_id).order_by(CompanyVerification.created_at.desc()).first()
    
    if not verification:
        # 如果没有验证记录，创建一个新的
        verification = svc_create_verification(company_id)
    
    status = get_verification_status(verification)
    
    return render_template_with_lang_fallback(
        'verifications/detail.html',
        company=company,
        verification=verification,
        status=status,
    )


@verifications_bp.route('/<int:company_id>/verification/upload-files', methods=['POST'])
@login_required
def upload_verification_files(company_id):
    """上传验证文件"""
    company = get_or_404(Company, company_id)
    require_ownership(_can_manage_verification(g.user, None))
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        verification = svc_create_verification(company_id)
    
    files = {
        'audited_financials_uploaded': request.form.get('audited_financials_uploaded') == 'on',
        'business_registration_uploaded': request.form.get('business_registration_uploaded') == 'on',
        'company_registration_uploaded': request.form.get('company_registration_uploaded') == 'on',
        'insurance_certificate_uploaded': request.form.get('insurance_certificate_uploaded') == 'on',
        'osh_license_uploaded': request.form.get('osh_license_uploaded') == 'on',
        'project_photos_uploaded': request.form.get('project_photos_uploaded') == 'on',
        'invoices_uploaded': request.form.get('invoices_uploaded') == 'on',
    }
    
    verification = svc_update_verification_files(verification.id, files)
    
    if verification:
        flash('Files uploaded successfully.', 'success')
    else:
        flash('Failed to upload files.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/submit-consent', methods=['POST'])
@login_required
def submit_verification_consent(company_id):
    """提交离线同意书"""
    company = get_or_404(Company, company_id)
    require_ownership(_can_manage_verification(g.user, None))
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    file_path = request.form.get('consent_file_path')
    verification = svc_submit_offline_consent(verification.id, file_path)
    
    if verification:
        flash('Offline consent submitted successfully.', 'success')
    else:
        flash('Failed to submit consent.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/request-external', methods=['POST'])
@role_required('admin', 'reviewer')
def request_external_verification_route(company_id):
    """请求外部验证"""
    company = get_or_404(Company, company_id)
    verification_type = request.form.get('verification_type')
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    verification = svc_request_external_verification(verification.id, verification_type, g.user.id)
    
    if verification:
        flash(f'External verification requested for {verification_type}.', 'success')
    else:
        flash('Failed to request external verification.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/record-external-result', methods=['POST'])
@role_required('admin', 'reviewer')
def record_external_verification_result_route(company_id):
    """记录外部验证结果"""
    company = get_or_404(Company, company_id)
    verification_type = request.form.get('verification_type')
    result = request.form.get('result')
    reference = request.form.get('reference')
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    verification = svc_record_external_verification_result(verification.id, verification_type, result, reference, g.user.id)
    
    if verification:
        flash(f'External verification result recorded for {verification_type}.', 'success')
    else:
        flash('Failed to record external verification result.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/admin-review', methods=['POST'])
@role_required('admin', 'reviewer')
def admin_review_verification(company_id):
    """管理员初审验证"""
    company = get_or_404(Company, company_id)
    status = request.form.get('status')
    notes = request.form.get('notes')
    rejection_reason = request.form.get('rejection_reason')
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    verification = svc_admin_review_verification(verification.id, g.user.id, status, notes, rejection_reason)
    
    if verification:
        flash('Admin review completed.', 'success')
    else:
        flash('Failed to complete admin review.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/final-approve', methods=['POST'])
@role_required('admin')
def admin_final_approve_verification_route(company_id):
    """管理员最终批准验证"""
    company = get_or_404(Company, company_id)
    notes = request.form.get('notes')
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    verification = svc_admin_final_approve_verification(verification.id, g.user.id, notes)
    
    if verification:
        flash('Verification approved successfully.', 'success')
    else:
        flash('Failed to approve verification.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/reject', methods=['POST'])
@role_required('admin')
def admin_reject_verification(company_id):
    """管理员拒绝验证"""
    company = get_or_404(Company, company_id)
    rejection_reason = request.form.get('rejection_reason')
    notes = request.form.get('notes')
    
    verification = CompanyVerification.query.filter_by(company_id=company_id).first()
    if not verification:
        flash('Verification record not found.', 'error')
        return redirect(url_for('verifications.view_verification', company_id=company_id))
    
    verification = svc_admin_reject_verification(verification.id, g.user.id, rejection_reason, notes)
    
    if verification:
        flash('Verification rejected.', 'error')
    else:
        flash('Failed to reject verification.', 'error')
    
    return redirect(url_for('verifications.view_verification', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/history')
@login_required
def verification_history(company_id):
    """查看验证历史"""
    company = get_or_404(Company, company_id)
    require_ownership(_can_view_verification(g.user, None))
    
    history = get_verification_history(company_id)
    
    return render_template_with_lang_fallback(
        'verifications/history.html',
        company=company,
        history=history,
    )


@verifications_bp.route('/<int:company_id>/verification/banks')
@role_required('admin', 'reviewer')
def list_banks(company_id):
    """列出合作银行"""
    company = get_or_404(Company, company_id)
    
    banks = get_active_banks()
    
    return render_template_with_lang_fallback(
        'verifications/banks.html',
        company=company,
        banks=banks,
    )


@verifications_bp.route('/<int:company_id>/verification/add-bank', methods=['POST'])
@role_required('admin')
def add_bank(company_id):
    """添加合作银行"""
    company = get_or_404(Company, company_id)
    
    name = request.form.get('name')
    code = request.form.get('code')
    contact_person = request.form.get('contact_person')
    contact_email = request.form.get('contact_email')
    contact_phone = request.form.get('contact_phone')
    address = request.form.get('address')
    api_endpoint = request.form.get('api_endpoint')
    api_key = request.form.get('api_key')
    
    bank = create_bank(name, code, contact_person, contact_email, contact_phone, address, api_endpoint, api_key)
    
    if bank:
        flash('Bank added successfully.', 'success')
    else:
        flash('Failed to add bank.', 'error')
    
    return redirect(url_for('verifications.list_banks', company_id=company_id))


@verifications_bp.route('/<int:company_id>/verification/referrals')
@login_required
def list_referrals(company_id):
    """列出转介记录"""
    company = get_or_404(Company, company_id)
    require_ownership(_can_view_verification(g.user, None))
    
    referrals = LoanReferral.query.filter_by(company_id=company_id).order_by(LoanReferral.created_at.desc()).all()
    
    return render_template_with_lang_fallback(
        'verifications/referrals.html',
        company=company,
        referrals=referrals,
    )


@verifications_bp.route('/<int:company_id>/verification/submit-referral', methods=['POST'])
@login_required
def submit_referral(company_id):
    """提交贷款转介"""
    company = get_or_404(Company, company_id)
    
    loan_application_id = request.form.get('loan_application_id')
    consent_file_path = request.form.get('consent_file_path')
    
    referral, message = svc_submit_loan_referral(loan_application_id, consent_file_path)
    
    if referral:
        flash(message, 'success')
    else:
        flash(message, 'error')
    
    return redirect(url_for('verifications.list_referrals', company_id=company_id))


@verifications_bp.route('/<int:referral_id>/referral/review', methods=['POST'])
@role_required('admin', 'reviewer')
def review_referral(referral_id):
    """审核转介申请"""
    referral = get_or_404(LoanReferral, referral_id)
    
    action = request.form.get('action')
    notes = request.form.get('notes')
    rejection_reason = request.form.get('rejection_reason')
    
    referral, message = svc_admin_review_referral(referral_id, g.user.id, action, notes, rejection_reason)
    
    if referral:
        flash(message, 'success' if action == 'approve' else 'error')
    else:
        flash(message, 'error')
    
    return redirect(url_for('verifications.list_referrals', company_id=referral.company_id))


@verifications_bp.route('/<int:referral_id>/referral/generate-report', methods=['POST'])
@role_required('admin', 'reviewer')
def generate_referral_report(referral_id):
    """生成转介报告包"""
    referral = get_or_404(LoanReferral, referral_id)
    
    report_data, message = svc_generate_referral_package(referral_id, g.user.id)
    
    if report_data:
        flash(message, 'success')
    else:
        flash(message, 'error')
    
    return redirect(url_for('verifications.list_referrals', company_id=referral.company_id))


@verifications_bp.route('/<int:referral_id>/referral/deliver', methods=['POST'])
@role_required('admin', 'reviewer')
def deliver_referral(referral_id):
    """交付转介报告"""
    referral = get_or_404(LoanReferral, referral_id)
    
    bank_id = request.form.get('bank_id')
    delivery_method = request.form.get('delivery_method', 'api')
    delivery_reference = request.form.get('delivery_reference')
    
    referral, message = svc_deliver_referral_to_bank(referral_id, bank_id, delivery_method, delivery_reference)
    
    if referral:
        flash(message, 'success')
    else:
        flash(message, 'error')
    
    return redirect(url_for('verifications.list_referrals', company_id=referral.company_id))


@verifications_bp.route('/<int:referral_id>/referral/record-bank-decision', methods=['POST'])
@role_required('admin', 'reviewer')
def record_bank_decision(referral_id):
    """记录银行决策"""
    referral = get_or_404(LoanReferral, referral_id)
    
    bank_decision = request.form.get('bank_decision')
    bank_evaluation_result = request.form.get('bank_evaluation_result')
    
    referral, message = svc_record_bank_evaluation(referral_id, bank_decision, bank_evaluation_result)
    
    if referral:
        flash(message, 'success')
    else:
        flash(message, 'error')
    
    return redirect(url_for('verifications.list_referrals', company_id=referral.company_id))
