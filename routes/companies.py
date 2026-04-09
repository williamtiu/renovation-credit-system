import json
import os
from io import BytesIO
from datetime import datetime, timezone

from flask import Blueprint, flash, g, redirect, render_template, request, send_file, url_for, jsonify
from utils.template_helper import render_template_with_lang_fallback

from models.company import Company
from models.company_document import CompanyDocument
from models.credit_score import CreditScore
from models.audit_log import AuditLog
from models.dispute_case import DisputeCase
from models.database import db, get_or_404
from models.loan_application import LoanApplication
from models.project_bid import ProjectBid
from services.audit_service import log_action
from services.credit_scorer import CreditScorer
from services.report_service import build_credit_report_pdf
from services.company_document_service import (
    upload_multiple_documents,
    get_company_documents,
    get_document_by_id,
    verify_document,
    reject_document,
    delete_document,
    get_document_file_path
)
from utils.auth_helper import can_manage_company, company_user_can_add, login_required, role_required, require_ownership

companies_bp = Blueprint('companies', __name__)


def _parse_int_value(raw_value, default=None):
    if raw_value in (None, ''):
        return default
    return int(raw_value)


def _parse_float_value(raw_value, default=None):
    if raw_value in (None, ''):
        return default
    return float(raw_value)


def _parse_date_value(raw_value):
    if not raw_value:
        return None
    return datetime.strptime(raw_value, '%Y-%m-%d').date()


def _parse_checkbox(field_name):
    return request.form.get(field_name) == 'on'


def _clamp_percentage(value):
    if value is None:
        return None
    return max(0, min(100, value))


def _derive_bid_eligibility(company):
    status = company.status or 'active'
    training_coverage = company.safety_training_coverage or 0
    # Check if company has license by verifying if licence_class or licence_categories is present
    has_license = bool(company.licence_class or company.licence_categories)
    return (
        status == 'active' and
        has_license and
        company.licence_verification_status == 'verified' and
        company.insurance_verification_status == 'verified' and
        training_coverage >= 80
    )


def _days_until(date_value):
    if not date_value:
        return None
    return (date_value - datetime.now(timezone.utc).date()).days


def _build_compliance_alerts(company):
    today = datetime.now(timezone.utc).date()
    alerts = []

    if company.licence_verification_status != 'verified':
        alerts.append('Contractor licence is not fully verified.')
    if company.insurance_verification_status != 'verified':
        alerts.append('Insurance cover is not fully verified.')
    if company.licence_expiry_date and company.licence_expiry_date <= today:
        alerts.append('Contractor licence has expired.')
    if company.insurance_expiry_date and company.insurance_expiry_date <= today:
        alerts.append('Insurance cover has expired.')
    if not company.is_verified_for_bidding:
        alerts.append('Company is currently restricted from bidding.')

    return alerts


def _apply_company_form(company):
    company.company_name = request.form['company_name'].strip()
    company.company_name_en = request.form.get('company_name_en') or None
    company.business_registration = request.form['business_registration'].strip()
    company.company_registration_number = request.form.get('company_registration_number') or None
    company.established_date = _parse_date_value(request.form.get('established_date'))
    company.registered_capital = _parse_float_value(request.form.get('registered_capital'), 0.0) or 0.0
    company.contact_person = request.form.get('contact_person') or None
    company.contact_position = request.form.get('contact_position') or None
    company.phone = request.form.get('phone') or None
    company.email = request.form.get('email') or None
    company.address = request.form.get('address') or None
    company.employee_count = _parse_int_value(request.form.get('employee_count'), 0) or 0
    company.annual_revenue = _parse_float_value(request.form.get('annual_revenue'), 0.0) or 0.0
    company.current_assets = _parse_float_value(request.form.get('current_assets'), 0.0) or 0.0
    company.current_liabilities = _parse_float_value(request.form.get('current_liabilities'), 0.0) or 0.0
    company.total_cash = _parse_float_value(request.form.get('total_cash'), 0.0) or 0.0
    company.total_liabilities = _parse_float_value(request.form.get('total_liabilities'), 0.0) or 0.0
    company.shareholders_equity = _parse_float_value(request.form.get('shareholders_equity'), 0.0) or 0.0
    
    # Financial Ratios override
    def _parse_optional_float(val):
        parsed = _parse_float_value(val, None)
        return parsed if parsed is not None else None
        
    company.manual_current_ratio = _parse_optional_float(request.form.get('manual_current_ratio'))
    company.manual_cash_ratio = _parse_optional_float(request.form.get('manual_cash_ratio'))
    company.manual_debt_to_equity_ratio = _parse_optional_float(request.form.get('manual_debt_to_equity_ratio'))

    company.project_count_completed = _parse_int_value(request.form.get('project_count_completed'), 0) or 0
    company.average_project_value = _parse_float_value(request.form.get('average_project_value'), 0.0) or 0.0
    company.main_service_type = request.form.get('main_service_type') or None
    company.licence_class = request.form.get('licence_class') or None
    company.licence_categories = request.form.get('licence_categories') or None
    company.licence_expiry_date = _parse_date_value(request.form.get('licence_expiry_date'))
    company.licence_verification_status = request.form.get('licence_verification_status', 'pending')
    company.osh_officer_role = request.form.get('osh_officer_role') or None
    company.osh_officer_license_number = request.form.get('osh_officer_license_number') or None
    company.insurance_provider = request.form.get('insurance_provider') or None
    company.insurance_policy_number = request.form.get('insurance_policy_number') or None
    company.insurance_expiry_date = _parse_date_value(request.form.get('insurance_expiry_date'))
    company.insurance_verification_status = request.form.get('insurance_verification_status', 'pending')
    company.safety_training_coverage = _clamp_percentage(_parse_int_value(request.form.get('safety_training_coverage')))
    company.safety_incident_count = _parse_int_value(request.form.get('safety_incident_count'), 0) or 0
    company.esg_policy_level = (request.form.get('esg_policy_level') or 'none').lower()
    company.green_material_ratio = _clamp_percentage(_parse_int_value(request.form.get('green_material_ratio')))


def _build_monitoring_alerts(company, latest_score, overdue_accounts, open_disputes):
    alerts = _parse_risk_factors(latest_score.risk_factors if latest_score else None)

    licence_days = _days_until(company.licence_expiry_date)
    if licence_days is not None and licence_days <= 60:
        alerts.append(f'Licence expires in {max(licence_days, 0)} day(s)')

    insurance_days = _days_until(company.insurance_expiry_date)
    if insurance_days is not None and insurance_days <= 60:
        alerts.append(f'Insurance expires in {max(insurance_days, 0)} day(s)')

    if overdue_accounts > 0:
        alerts.append(f'{overdue_accounts} overdue credit account(s) need review')

    if open_disputes:
        alerts.append(f'{len(open_disputes)} open dispute case(s) remain unresolved')

    deduped_alerts = []
    seen = set()
    for alert in alerts:
        if alert not in seen:
            deduped_alerts.append(alert)
            seen.add(alert)
    return deduped_alerts


def _parse_risk_factors(raw_value):
    if not raw_value:
        return []

    try:
        parsed = json.loads(raw_value)
    except (TypeError, ValueError):
        return [str(raw_value)]

    if isinstance(parsed, list):
        return [str(item) for item in parsed]
    return [str(parsed)]


def _log_details(log_entry):
    if not log_entry or not log_entry.details_json:
        return {}

    try:
        return json.loads(log_entry.details_json)
    except (TypeError, ValueError):
        return {}


def _format_audit_event(log_entry, label=None):
    if not log_entry:
        return None

    details = _log_details(log_entry)
    return {
        'label': label or log_entry.action.replace('_', ' ').title(),
        'action': log_entry.action,
        'actor': log_entry.actor.username if log_entry.actor else 'system',
        'created_at': log_entry.created_at,
        'details': details,
    }


def _build_audit_snapshot(company, loan_applications, disputes):
    loan_ids = [application.id for application in loan_applications]
    dispute_ids = [dispute.id for dispute in disputes if dispute.id]

    company_logs = AuditLog.query.filter_by(target_type='Company', target_id=company.id).order_by(AuditLog.created_at.desc()).all()
    loan_logs = AuditLog.query.filter(
        AuditLog.target_type == 'LoanApplication',
        AuditLog.target_id.in_(loan_ids) if loan_ids else db.text('0=1')
    ).order_by(AuditLog.created_at.desc()).all()
    dispute_logs = AuditLog.query.filter(
        AuditLog.target_type == 'DisputeCase',
        AuditLog.target_id.in_(dispute_ids) if dispute_ids else db.text('0=1')
    ).order_by(AuditLog.created_at.desc()).all()

    score_log = next((log for log in company_logs if log.action == 'trust_score_calculated'), None)
    verification_log = next((log for log in company_logs if log.action in ['company_updated', 'company_created']), None)
    loan_decision_log = next((log for log in loan_logs if log.action in ['loan_application_approved', 'loan_application_rejected', 'loan_disbursed']), None)
    dispute_log = next((log for log in dispute_logs if log.action in ['dispute_resolved', 'dispute_opened']), None)

    combined_logs = sorted(
        company_logs[:8] + loan_logs[:8] + dispute_logs[:8],
        key=lambda log: log.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:10]

    return {
        'last_score_refresh': _format_audit_event(score_log, 'Last score refresh'),
        'last_verification_update': _format_audit_event(verification_log, 'Last verification update'),
        'last_loan_decision': _format_audit_event(loan_decision_log, 'Last loan decision'),
        'last_dispute_action': _format_audit_event(dispute_log, 'Last dispute action') if dispute_log else (
            {
                'label': 'Last dispute action',
                'action': 'dispute_opened',
                'actor': disputes[0].opened_by.username if disputes and disputes[0].opened_by else 'system',
                'created_at': disputes[0].opened_at if disputes else None,
                'details': {'status': disputes[0].status, 'type': disputes[0].dispute_type} if disputes else {},
            }
            if disputes else None
        ),
        'timeline': [
            {
                'label': log.action.replace('_', ' ').title(),
                'actor': log.actor.username if log.actor else 'system',
                'created_at': log.created_at,
                'target_type': log.target_type,
                'details': _log_details(log),
            }
            for log in combined_logs
        ],
    }


def _load_latest_score_map(companies):
    latest_scores = {}
    for company in companies:
        latest_scores[company.id] = CreditScore.query.filter_by(company_id=company.id).order_by(CreditScore.scored_at.desc()).first()
    return latest_scores


def _build_credit_report(company, latest_score, credit_scores, loan_applications, project_bids, disputes, lang='en'):
    today = datetime.now(timezone.utc).date()
    years_in_business = None
    if company.established_date:
        years_in_business = max(0, int((today - company.established_date).days / 365.25))

    total_requested_amount = sum(application.loan_amount or 0 for application in loan_applications)
    approved_applications = [application for application in loan_applications if application.application_status == 'approved']
    total_approved_amount = sum((application.approved_amount or application.loan_amount or 0) for application in approved_applications)
    outstanding_balance = sum(application.outstanding_balance or 0 for application in loan_applications)
    overdue_accounts = sum(1 for application in loan_applications if (application.overdue_days or 0) > 0)

    accepted_bids = [bid for bid in project_bids if bid.status == 'accepted']
    open_disputes = [dispute for dispute in disputes if dispute.status == 'open']
    resolved_disputes = [dispute for dispute in disputes if dispute.status == 'resolved']
    training_coverage = company.safety_training_coverage
    osh_status = 'verified' if company.osh_safety_officer_verified and (training_coverage or 0) >= 80 else 'review'
    esg_status = 'verified' if (company.esg_policy_level or 'none') in ['basic', 'advanced'] else 'review'

    # 根据语言设置标签
    if lang == 'zh':
        verification_labels = {
            'Company status': '公司状态',
            'Contractor licence': '承建商牌照',
            'Insurance cover': '保险覆盖',
            'Bid eligibility': '投标资格',
            'OSH controls': 'OSH 管控',
            'ESG readiness': 'ESG 准备度',
        }
        score_labels = {
            'Financial strength': '财务实力',
            'Operational stability': '运营稳定性',
            'Qualifications': '资质认证',
            'Customer reviews': '客户评价',
        }
        monitoring_types = {
            'Score refresh': '评分刷新',
            'Loan application': '贷款申请',
            'Dispute case': '争议案件',
        }
    else:
        verification_labels = {}
        score_labels = {}
        monitoring_types = {}

    verification_checks = [
        {
            'label': verification_labels.get('Company status', 'Company status'),
            'value': company.status or 'unknown',
            'status': 'verified' if company.status == 'active' else 'review',
        },
        {
            'label': verification_labels.get('Contractor licence', 'Contractor licence'),
            'value': company.licence_verification_status or 'pending',
            'status': company.licence_verification_status or 'pending',
        },
        {
            'label': verification_labels.get('Insurance cover', 'Insurance cover'),
            'value': company.insurance_verification_status or 'pending',
            'status': company.insurance_verification_status or 'pending',
        },
        {
            'label': verification_labels.get('Bid eligibility', 'Bid eligibility'),
            'value': 'eligible' if company.is_verified_for_bidding else 'restricted',
            'status': 'verified' if company.is_verified_for_bidding else 'review',
        },
        {
            'label': verification_labels.get('OSH controls', 'OSH controls'),
            'value': f'{training_coverage or 0}% training · OSH verified: ' + ('Yes' if company.osh_safety_officer_verified else 'No'),
            'status': osh_status,
        },
        {
            'label': verification_labels.get('ESG readiness', 'ESG readiness'),
            'value': (company.esg_policy_level or 'none').replace('_', ' '),
            'status': esg_status,
        },
    ]

    score_components = []
    if latest_score:
        score_components = [
            {'label': score_labels.get('Financial strength', 'Financial strength'), 'score': latest_score.financial_score or 0, 'max_score': 600},
            {'label': score_labels.get('Operational stability', 'Operational stability'), 'score': latest_score.operational_score or 0, 'max_score': 250},
            {'label': score_labels.get('Qualifications', 'Qualifications'), 'score': latest_score.qualification_score or 0, 'max_score': 200},
            {'label': score_labels.get('Customer reviews', 'Customer reviews'), 'score': latest_score.customer_review_score or 0, 'max_score': 300},
        ]

    risk_factors = _build_monitoring_alerts(company, latest_score, overdue_accounts, open_disputes)
    if not risk_factors and not latest_score:
        risk_factors = ['No calculated score is available yet. Generate a score to unlock the full risk analysis.']

    recent_monitoring_activity = []
    for score in credit_scores[:3]:
        recent_monitoring_activity.append({
            'type': monitoring_types.get('Score refresh', 'Score refresh'),
            'date': score.scored_at,
            'detail': f'{score.credit_score} / {score.credit_grade}',
        })
    for application in sorted(loan_applications, key=lambda item: item.applied_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:3]:
        recent_monitoring_activity.append({
            'type': monitoring_types.get('Loan application', 'Loan application'),
            'date': application.applied_at,
            'detail': f'HK$ {application.loan_amount:,.0f} · {application.application_status}',
        })
    for dispute in sorted(disputes, key=lambda item: item.opened_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:3]:
        recent_monitoring_activity.append({
            'type': monitoring_types.get('Dispute case', 'Dispute case'),
            'date': dispute.opened_at,
            'detail': f'{dispute.dispute_type} · {dispute.status}',
        })
    recent_monitoring_activity.sort(key=lambda item: item['date'] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    audit_snapshot = _build_audit_snapshot(company, loan_applications, disputes)

    return {
        'report_id': f'RCS-{company.id:05d}-{datetime.now(timezone.utc):%Y%m%d}',
        'generated_at': datetime.now(timezone.utc),
        'subject': {
            'company_name': company.company_name,
            'company_name_en': company.company_name_en,
            'business_registration': company.business_registration,
            'company_registration_number': company.company_registration_number,
            'contact_person': company.contact_person,
            'contact_position': company.contact_position,
            'phone': company.phone,
            'email': company.email,
            'address': company.address,
            'main_service_type': company.main_service_type,
            'years_in_business': years_in_business,
        },
        'financials': {
            'current_assets': company.current_assets,
            'current_liabilities': company.current_liabilities,
            'total_cash': company.total_cash,
            'total_liabilities': company.total_liabilities,
            'shareholders_equity': company.shareholders_equity,
            'manual_current_ratio': company.manual_current_ratio,
            'manual_cash_ratio': company.manual_cash_ratio,
            'manual_debt_to_equity_ratio': company.manual_debt_to_equity_ratio,
        },
        'summary': {
            'score': latest_score.credit_score if latest_score else company.trust_score_cached,
            'grade': latest_score.credit_grade if latest_score else None,
            'risk_level': latest_score.risk_level if latest_score else (company.risk_level or 'unrated'),
            'recommended_loan_limit': latest_score.recommended_loan_limit if latest_score else None,
            'recommended_interest_rate': latest_score.recommended_interest_rate if latest_score else None,
            'score_date': latest_score.scored_at if latest_score else None,
            'model_version': latest_score.scoring_model_version if latest_score else 'v1.0',
        },
        'score_components': score_components,
        'verification_checks': verification_checks,
        'osh_profile': {
            'osh_officer_role': company.osh_officer_role,
            'osh_officer_license_number': company.osh_officer_license_number,
            'osh_safety_officer_license': company.osh_safety_officer_license,
            'osh_safety_officer_verified': company.osh_safety_officer_verified,
            'training_coverage': training_coverage,
            'incident_count': company.safety_incident_count or 0,
        },
        'esg_profile': {
            'policy_level': company.esg_policy_level or 'none',
            'green_material_ratio': company.green_material_ratio,
            'iso_certified': company.esg_policy_level in ['basic', 'advanced'],
        },
        'exposure': {
            'loan_application_count': len(loan_applications),
            'approved_application_count': len(approved_applications),
            'approval_rate': round((len(approved_applications) / len(loan_applications)) * 100, 1) if loan_applications else None,
            'total_requested_amount': total_requested_amount,
            'total_approved_amount': total_approved_amount,
            'outstanding_balance': outstanding_balance,
            'overdue_accounts': overdue_accounts,
        },
        'project_behaviour': {
            'bid_count': len(project_bids),
            'accepted_bid_count': len(accepted_bids),
            'bid_success_rate': round((len(accepted_bids) / len(project_bids)) * 100, 1) if project_bids else None,
            'open_dispute_count': len(open_disputes),
            'resolved_dispute_count': len(resolved_disputes),
            'reported_dispute_count': len(disputes),
        },
        'risk_factors': risk_factors,
        'score_history': [
            {
                'score': score.credit_score,
                'grade': score.credit_grade,
                'risk_level': score.risk_level,
                'scored_at': score.scored_at,
            }
            for score in credit_scores[:6]
        ],
        'recent_monitoring_activity': recent_monitoring_activity[:8],
        'recent_loans': sorted(loan_applications, key=lambda item: item.applied_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:5],
        'recent_bids': sorted(project_bids, key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:5],
        'recent_disputes': sorted(disputes, key=lambda item: item.opened_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:5],
        'audit_snapshot': audit_snapshot,
        'disclaimer': 'This DecoFinance bureau-style trust report summarises consented platform data, verification checks, OSH and ESG governance signals, scoring outputs, and lending behaviour. It is designed to support underwriting review and does not claim to reproduce a raw bureau file.',
    }


def _load_credit_report_context(company_id, lang='en'):
    company = get_or_404(Company, company_id)
    credit_scores = CreditScore.query.filter_by(company_id=company_id).order_by(CreditScore.scored_at.desc()).all()
    latest_score = credit_scores[0] if credit_scores else None
    loan_applications = LoanApplication.query.filter_by(company_id=company_id).order_by(LoanApplication.applied_at.desc()).all()
    project_bids = ProjectBid.query.filter_by(company_id=company_id).order_by(ProjectBid.created_at.desc()).all()
    disputes = DisputeCase.query.filter_by(against_company_id=company_id).order_by(DisputeCase.opened_at.desc()).all()
    report = _build_credit_report(company, latest_score, credit_scores, loan_applications, project_bids, disputes, lang=lang)

    return company, credit_scores, latest_score, report


@companies_bp.route('/compare-report')
@role_required('admin', 'reviewer')
def compare_reports():
    from flask import session
    lang = 'zh' if session.get('language') == 'ch' else 'en'
    
    district = request.args.get('district', '').strip()
    risk_level = request.args.get('risk_level', '').strip()
    grade = request.args.get('grade', '').strip()
    verification = request.args.get('verification', '').strip()
    selected_company_ids = [int(value) for value in request.args.getlist('company_ids') if value.isdigit()]

    query = Company.query
    if risk_level:
        query = query.filter(Company.risk_level == risk_level)
    if verification == 'verified':
        query = query.filter(Company.is_verified_for_bidding.is_(True))
    elif verification == 'review':
        query = query.filter(Company.is_verified_for_bidding.is_(False))

    candidate_companies = query.order_by(Company.company_name.asc()).all()
    latest_scores = _load_latest_score_map(candidate_companies)
    if grade:
        candidate_companies = [company for company in candidate_companies if latest_scores.get(company.id) and latest_scores[company.id].credit_grade == grade]

    compare_reports = []
    for company_id in selected_company_ids[:3]:
        company, _, latest_score, report = _load_credit_report_context(company_id, lang=lang)
        compare_reports.append({
            'company': company,
            'latest_score': latest_score,
            'report': report,
        })

    districts = []
    grades = [
        item[0] for item in db.session.query(CreditScore.credit_grade).filter(CreditScore.credit_grade.isnot(None)).distinct().order_by(CreditScore.credit_grade.asc()).all()
        if item[0]
    ]

    return render_template_with_lang_fallback(
        'companies/compare.html',
        candidate_companies=candidate_companies,
        latest_scores=latest_scores,
        compare_reports=compare_reports,
        selected_company_ids=selected_company_ids,
        filters={
            'district': district,
            'risk_level': risk_level,
            'grade': grade,
            'verification': verification,
        },
        district_options=districts,
        grade_options=grades,
    )

@companies_bp.route('/')
@login_required
def list_companies():
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    query = Company.query
    
    # 根据角色过滤数据访问范围
    if g.user.role == 'company_user':
        # 公司用户只能访问自己的公司
        query = query.filter_by(id=g.user.company_id)
    
    if search:
        query = query.filter(
            db.or_(
                Company.company_name.contains(search),
                Company.business_registration.contains(search)
            )
        )
    
    if status:
        query = query.filter_by(status=status)
    
    companies = query.order_by(Company.created_at.desc()).all()
    
    return render_template_with_lang_fallback('companies/list.html',
                         companies=companies,
                         search=search,
                         status=status)

@companies_bp.route('/add', methods=['GET', 'POST'])
@role_required('admin', 'reviewer', 'company_user')
def add_company():
    # 公司用户只能添加一个公司
    if g.user.role == 'company_user' and not company_user_can_add(g.user):
        from flask import session
        lang = session.get('language', 'en')
        if lang == 'ch':
            flash('您已经关联了一个公司，不能再添加新的公司。', 'warning')
        else:
            flash('You have already associated with a company and cannot add a new one.', 'warning')
        return redirect(url_for('companies.list_companies'))
    
    if request.method == 'POST':
        try:
            company = Company(owner_user_id=g.user.id)
            _apply_company_form(company)
            company.is_verified_for_bidding = _derive_bid_eligibility(company)
            
            db.session.add(company)
            db.session.flush()
            if g.user.role == 'company_user' and g.user.company_id is None:
                g.user.company_id = company.id
            
            # Handle document uploads if present
            if 'documents' in request.files:
                files = request.files.getlist('documents')
                document_types = request.form.getlist('document_types')
                
                if files and files[0].filename != '' and len(files) == len(document_types):
                    files_data = []
                    for i, file in enumerate(files):
                        if file.filename:
                            expiry_date_str = request.form.getlist('expiry_dates')[i] if i < len(request.form.getlist('expiry_dates')) else None
                            expiry_date = None
                            if expiry_date_str:
                                try:
                                    expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
                                except ValueError:
                                    pass
                            
                            files_data.append({
                                'file': file,
                                'document_type': document_types[i],
                                'description': None,
                                'expiry_date': expiry_date
                            })
                    
                    if files_data:
                        successful, failed = upload_multiple_documents(
                            company_id=company.id,
                            files_data=files_data,
                            uploaded_by=g.user.id
                        )
                        
                        if successful:
                            flash(f'Company created successfully with {len(successful)} document(s) uploaded.', 'success')
                        else:
                            flash('Company created but document upload failed.', 'warning')
                        
                        db.session.commit()
                        log_action('company_created', 'Company', company.id, {'company_name': company.company_name})
                        db.session.commit()
                        
                        return redirect(url_for('companies.view_company', id=company.id))
            
            db.session.commit()
            log_action('company_created', 'Company', company.id, {'company_name': company.company_name})
            db.session.commit()
            
            flash('Company created successfully.', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Failed to create company: {str(e)}', 'error')
    
    return render_template_with_lang_fallback('companies/form.html', company=None)

@companies_bp.route('/<int:id>')
@login_required
def view_company(id):
    company = get_or_404(Company, id)
    
    credit_scores = CreditScore.query.filter_by(company_id=id).order_by(CreditScore.scored_at.desc()).all()
    latest_score = credit_scores[0] if credit_scores else None
    
    loan_applications = company.loan_applications
    
    return render_template_with_lang_fallback('companies/detail.html',
                         company=company,
                         latest_score=latest_score,
                         credit_scores=credit_scores,
                         loan_applications=loan_applications,
                         compliance_alerts=_build_compliance_alerts(company))


@companies_bp.route('/<int:id>/credit-report')
@login_required
def view_credit_report(id):
    from flask import session
    lang = 'zh' if session.get('language') == 'ch' else 'en'
    
    company, credit_scores, latest_score, report = _load_credit_report_context(id, lang=lang)

    return render_template_with_lang_fallback(
        'companies/report.html',
        company=company,
        latest_score=latest_score,
        credit_scores=credit_scores,
        report=report,
    )


@companies_bp.route('/<int:id>/credit-report/download')
@login_required
def download_credit_report(id):
    from flask import session
    lang = 'zh' if session.get('language') == 'ch' else 'en'
    
    company, _, _, report = _load_credit_report_context(id, lang=lang)
    pdf_bytes = build_credit_report_pdf(company, report)
    download_name = f"credit-report-{company.id}-{company.business_registration}.pdf"

    return send_file(
        BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=download_name,
    )

@companies_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_company(id):
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company))
    
    # Get existing documents for display
    existing_documents = get_company_documents(company_id=id, active_only=True)
    
    if request.method == 'POST':
        try:
            _apply_company_form(company)
            company.is_verified_for_bidding = _derive_bid_eligibility(company)
            
            # Handle document uploads if present
            documents_uploaded = 0
            if 'documents' in request.files:
                files = request.files.getlist('documents')
                document_types = request.form.getlist('document_types')
                
                if files and files[0].filename != '' and len(files) == len(document_types):
                    files_data = []
                    for i, file in enumerate(files):
                        if file.filename:
                            expiry_date_str = request.form.getlist('expiry_dates')[i] if i < len(request.form.getlist('expiry_dates')) else None
                            expiry_date = None
                            if expiry_date_str:
                                try:
                                    expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
                                except ValueError:
                                    pass
                            
                            files_data.append({
                                'file': file,
                                'document_type': document_types[i],
                                'description': None,
                                'expiry_date': expiry_date
                            })
                    
                    if files_data:
                        successful, failed = upload_multiple_documents(
                            company_id=company.id,
                            files_data=files_data,
                            uploaded_by=g.user.id
                        )
                        documents_uploaded = len(successful)
                        
                        if failed:
                            error_messages = [f"{f['file_name']}: {f['error']}" for f in failed]
                            flash(f"Failed to upload {len(failed)} document(s): {'; '.join(error_messages)}", 'warning')
            
            db.session.commit()
            log_action('company_updated', 'Company', company.id, {'company_name': company.company_name})
            db.session.commit()
            
            if documents_uploaded > 0:
                flash(f'Company updated successfully with {documents_uploaded} new document(s).', 'success')
            else:
                flash('Company updated successfully.', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            error_msg = str(e)
            if 'Request Entity Too Large' in error_msg or '413' in error_msg:
                flash('File size too large. Maximum allowed size is 50MB total. Please upload smaller files.', 'error')
            else:
                flash(f'Failed to update company: {error_msg}', 'error')
    
    return render_template_with_lang_fallback('companies/form.html', 
                         company=company,
                         existing_documents=existing_documents)



@companies_bp.route('/<int:id>/score', methods=['GET', 'POST'])
@login_required
def calculate_score(id):
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'customer')

    if request.method == 'GET':
        return redirect(url_for('companies.view_company', id=company.id))

    try:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        
        credit_score = scorer.save_score(company, result, notes=' Text Score Text ')
        log_action('trust_score_calculated', 'Company', company.id, {'score': result['total_score']})
        db.session.commit()
        
        flash(f'Trust score calculated: {result["total_score"]} ({result["credit_grade"]})', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to calculate score: {str(e)}', 'error')
    
    return redirect(url_for('companies.view_company', id=company.id))

@companies_bp.route('/<int:id>/delete', methods=['POST'])
@role_required('admin')
def delete_company(id):
    company = get_or_404(Company, id)
    
    try:
        log_action('company_deleted', 'Company', company.id, {'company_name': company.company_name})
        db.session.delete(company)
        db.session.commit()
        flash('Company deleted successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to delete company: {str(e)}', 'error')
    
    return redirect(url_for('companies.list_companies'))


@companies_bp.route('/<int:id>/documents/upload', methods=['POST'])
@login_required
def upload_documents(id):
    """Upload multiple documents for a company"""
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'company_user' and g.user.company_id == company.id)
    
    print(f"\n{'='*60}")
    print(f"📤 开始上传文档 - 公司ID: {id}")
    print(f"用户: {g.user.username} (ID: {g.user.id})")
    print(f"{'='*60}")
    
    if 'documents' not in request.files:
        print("❌ 错误: 请求中没有 'documents' 字段")
        flash('No files selected.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    files = request.files.getlist('documents')
    document_types = request.form.getlist('document_types')
    descriptions = request.form.getlist('descriptions')
    expiry_dates = request.form.getlist('expiry_dates')
    
    print(f"📁 收到 {len(files)} 个文件")
    print(f"📋 文档类型: {document_types}")
    print(f"📝 描述: {descriptions}")
    
    if not files or files[0].filename == '':
        print("❌ 错误: 文件名为空")
        flash('No files selected.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    if len(files) != len(document_types):
        print(f"❌ 错误: 文件数({len(files)}) != 类型数({len(document_types)})")
        flash(f'Number of files ({len(files)}) must match number of document types ({len(document_types)}).', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    files_data = []
    for i, file in enumerate(files):
        print(f"\n   📄 处理文件 {i+1}: {file.filename}")
        print(f"      类型: {document_types[i]}")
        print(f"      描述: {descriptions[i] if i < len(descriptions) else 'None'}")
        
        expiry_date = None
        if i < len(expiry_dates) and expiry_dates[i]:
            try:
                expiry_date = datetime.strptime(expiry_dates[i], '%Y-%m-%d').date()
                print(f"      过期日期: {expiry_date}")
            except ValueError:
                print(f"      ⚠️  过期日期格式错误")
                pass
        
        files_data.append({
            'file': file,
            'document_type': document_types[i],
            'description': descriptions[i] if i < len(descriptions) else None,
            'expiry_date': expiry_date
        })
    
    try:
        successful, failed = upload_multiple_documents(
            company_id=id,
            files_data=files_data,
            uploaded_by=g.user.id
        )
        
        if successful:
            print(f"\n✅ 成功上传 {len(successful)} 个文档:")
            for doc in successful:
                print(f"   - {doc.file_name} (ID: {doc.id})")
            flash(f'Successfully uploaded {len(successful)} document(s).', 'success')
        
        if failed:
            print(f"\n❌ 失败 {len(failed)} 个文档:")
            error_messages = [f"{f['file_name']}: {f['error']}" for f in failed]
            for msg in error_messages:
                print(f"   - {msg}")
            flash(f"Failed to upload {len(failed)} document(s): {'; '.join(error_messages)}", 'warning')
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"\n💥 上传异常:")
        print(error_detail)
        flash(f'Upload failed: {str(e)}', 'error')
    
    print(f"{'='*60}\n")
    return redirect(url_for('companies.view_company', id=id))


@companies_bp.route('/<int:id>/documents')
@login_required
def list_documents(id):
    """List all documents for a company"""
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'company_user' and g.user.company_id == company.id)
    
    document_type = request.args.get('document_type')
    status = request.args.get('status')
    
    documents = get_company_documents(
        company_id=id,
        document_type=document_type,
        status=status
    )
    
    return jsonify({
        'documents': [doc.to_dict() for doc in documents]
    })


@companies_bp.route('/<int:id>/documents/<int:doc_id>/download')
@login_required
def download_document(id, doc_id):
    """Download a company document"""
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'company_user' and g.user.company_id == company.id)
    
    doc = get_document_by_id(doc_id)
    if not doc or doc.company_id != id:
        flash('Document not found.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    try:
        file_path = get_document_file_path(doc_id)
        if not file_path or not os.path.exists(file_path):
            flash('File not found on server.', 'error')
            return redirect(url_for('companies.view_company', id=id))
        
        log_action(
            'document_downloaded',
            'CompanyDocument',
            doc_id,
            {'downloaded_by': g.user.id}
        )
        
        return send_file(
            file_path,
            mimetype=doc.mime_type,
            as_attachment=True,
            download_name=doc.file_name
        )
        
    except Exception as e:
        flash(f'Download failed: {str(e)}', 'error')
        return redirect(url_for('companies.view_company', id=id))


@companies_bp.route('/<int:id>/documents/<int:doc_id>/view')
@login_required
def view_document(id, doc_id):
    """View a company document inline (for PDFs and images)"""
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'company_user' and g.user.company_id == company.id)
    
    doc = get_document_by_id(doc_id)
    if not doc or doc.company_id != id:
        flash('Document not found.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    try:
        file_path = get_document_file_path(doc_id)
        if not file_path or not os.path.exists(file_path):
            flash('File not found on server.', 'error')
            return redirect(url_for('companies.view_company', id=id))
        
        log_action(
            'document_viewed',
            'CompanyDocument',
            doc_id,
            {'viewed_by': g.user.id}
        )
        
        return send_file(
            file_path,
            mimetype=doc.mime_type,
            as_attachment=False
        )
        
    except Exception as e:
        flash(f'View failed: {str(e)}', 'error')
        return redirect(url_for('companies.view_company', id=id))


@companies_bp.route('/<int:id>/documents/<int:doc_id>/verify', methods=['POST'])
@role_required('admin', 'reviewer')
def verify_document_route(id, doc_id):
    """Verify a company document (admin/reviewer only)"""
    company = get_or_404(Company, id)
    
    doc = get_document_by_id(doc_id)
    if not doc or doc.company_id != id:
        flash('Document not found.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    notes = request.form.get('notes')
    
    try:
        verify_document(doc_id, g.user.id, notes)
        flash('Document verified successfully.', 'success')
    except Exception as e:
        flash(f'Verification failed: {str(e)}', 'error')
    
    return redirect(url_for('companies.view_company', id=id))


@companies_bp.route('/<int:id>/documents/<int:doc_id>/reject', methods=['POST'])
@role_required('admin', 'reviewer')
def reject_document_route(id, doc_id):
    """Reject a company document (admin/reviewer only)"""
    company = get_or_404(Company, id)
    
    doc = get_document_by_id(doc_id)
    if not doc or doc.company_id != id:
        flash('Document not found.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    reason = request.form.get('reason')
    if not reason:
        flash('Rejection reason is required.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    try:
        reject_document(doc_id, g.user.id, reason)
        flash('Document rejected.', 'warning')
    except Exception as e:
        flash(f'Rejection failed: {str(e)}', 'error')
    
    return redirect(url_for('companies.view_company', id=id))


@companies_bp.route('/<int:id>/documents/<int:doc_id>/delete', methods=['POST'])
@login_required
def delete_document_route(id, doc_id):
    """Delete a company document (soft delete)"""
    company = get_or_404(Company, id)
    
    doc = get_document_by_id(doc_id)
    if not doc or doc.company_id != id:
        if request.is_json:
            return jsonify({'success': False, 'error': 'Document not found'}), 404
        flash('Document not found.', 'error')
        return redirect(url_for('companies.view_company', id=id))
    
    # Check ownership
    is_owner = (
        g.user.role == 'admin' or 
        doc.uploaded_by == g.user.id or
        (g.user.role == 'company_user' and g.user.company_id == company.id)
    )
    
    if not is_owner:
        if request.is_json:
            return jsonify({'success': False, 'error': 'Permission denied'}), 403
        require_ownership(False)
    
    try:
        delete_document(doc_id, g.user.id)
        
        # Return JSON response for AJAX calls
        if request.is_json:
            return jsonify({'success': True})
        
        flash('Document deleted.', 'success')
    except Exception as e:
        if request.is_json:
            return jsonify({'success': False, 'error': str(e)}), 500
        flash(f'Deletion failed: {str(e)}', 'error')
    
    if not request.is_json:
        return redirect(url_for('companies.view_company', id=id))
    return jsonify({'success': True})
