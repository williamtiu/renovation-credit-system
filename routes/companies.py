import json
from io import BytesIO
from datetime import datetime, timezone

from flask import Blueprint, flash, g, redirect, render_template, request, send_file, url_for

from models.company import Company
from models.credit_score import CreditScore
from models.audit_log import AuditLog
from models.dispute_case import DisputeCase
from models.database import db, get_or_404
from models.loan_application import LoanApplication
from models.project_bid import ProjectBid
from services.audit_service import log_action
from services.credit_scorer import CreditScorer
from services.report_service import build_credit_report_pdf
from utils.auth_helper import can_manage_company, login_required, role_required, require_ownership

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
    return (
        status == 'active' and
        company.has_license and
        company.licence_verification_status == 'verified' and
        company.insurance_verification_status == 'verified' and
        company.osh_policy_in_place and
        company.heavy_lifting_compliance and
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
    company.established_date = _parse_date_value(request.form.get('established_date'))
    company.registered_capital = _parse_float_value(request.form.get('registered_capital'), 0.0) or 0.0
    company.contact_person = request.form.get('contact_person') or None
    company.contact_position = request.form.get('contact_position') or None
    company.phone = request.form.get('phone') or None
    company.email = request.form.get('email') or None
    company.address = request.form.get('address') or None
    company.district = request.form.get('district') or None
    company.employee_count = _parse_int_value(request.form.get('employee_count'), 0) or 0
    company.annual_revenue = _parse_float_value(request.form.get('annual_revenue'), 0.0) or 0.0
    company.project_count_completed = _parse_int_value(request.form.get('project_count_completed'), 0) or 0
    company.average_project_value = _parse_float_value(request.form.get('average_project_value'), 0.0) or 0.0
    company.main_service_type = request.form.get('main_service_type') or None
    company.has_license = _parse_checkbox('has_license')
    company.license_type = request.form.get('license_type') or None
    company.licence_number = request.form.get('licence_number') or None
    company.licence_class = request.form.get('licence_class') or None
    company.licence_categories = request.form.get('licence_categories') or None
    company.licence_expiry_date = _parse_date_value(request.form.get('licence_expiry_date'))
    company.licence_verification_status = request.form.get('licence_verification_status', 'pending')
    company.iso_certified = _parse_checkbox('iso_certified')
    company.professional_memberships = request.form.get('professional_memberships') or None
    company.insurance_provider = request.form.get('insurance_provider') or None
    company.insurance_policy_number = request.form.get('insurance_policy_number') or None
    company.insurance_expiry_date = _parse_date_value(request.form.get('insurance_expiry_date'))
    company.insurance_verification_status = request.form.get('insurance_verification_status', 'pending')
    company.osh_policy_in_place = _parse_checkbox('osh_policy_in_place')
    company.safety_training_coverage = _clamp_percentage(_parse_int_value(request.form.get('safety_training_coverage')))
    company.heavy_lifting_compliance = _parse_checkbox('heavy_lifting_compliance')
    company.lifting_equipment_available = _parse_checkbox('lifting_equipment_available')
    company.safety_incident_count = _parse_int_value(request.form.get('safety_incident_count'), 0) or 0
    company.esg_policy_level = (request.form.get('esg_policy_level') or 'none').lower()
    company.green_material_ratio = _clamp_percentage(_parse_int_value(request.form.get('green_material_ratio')))
    company.bank_account_years = _parse_int_value(request.form.get('bank_account_years'), 0) or 0
    company.existing_loans = _parse_float_value(request.form.get('existing_loans'), 0.0) or 0.0
    company.loan_repayment_history = request.form.get('loan_repayment_history', 'Good')


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


def _build_credit_report(company, latest_score, credit_scores, loan_applications, project_bids, disputes):
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
    osh_status = 'verified' if company.osh_policy_in_place and company.heavy_lifting_compliance and (training_coverage or 0) >= 80 else 'review'
    esg_status = 'verified' if (company.esg_policy_level or 'none') in ['basic', 'advanced'] else 'review'

    verification_checks = [
        {
            'label': 'Company status',
            'value': company.status or 'unknown',
            'status': 'verified' if company.status == 'active' else 'review',
        },
        {
            'label': 'Contractor licence',
            'value': company.licence_verification_status or 'pending',
            'status': company.licence_verification_status or 'pending',
        },
        {
            'label': 'Insurance cover',
            'value': company.insurance_verification_status or 'pending',
            'status': company.insurance_verification_status or 'pending',
        },
        {
            'label': 'Bid eligibility',
            'value': 'eligible' if company.is_verified_for_bidding else 'restricted',
            'status': 'verified' if company.is_verified_for_bidding else 'review',
        },
        {
            'label': 'OSH controls',
            'value': f'{training_coverage or 0}% training · 16kg rule ' + ('aligned' if company.heavy_lifting_compliance else 'not confirmed'),
            'status': osh_status,
        },
        {
            'label': 'ESG readiness',
            'value': (company.esg_policy_level or 'none').replace('_', ' '),
            'status': esg_status,
        },
    ]

    score_components = []
    if latest_score:
        score_components = [
            {'label': 'Financial strength', 'score': latest_score.financial_strength_score or 0, 'max_score': 300},
            {'label': 'Operational stability', 'score': latest_score.operational_stability_score or 0, 'max_score': 250},
            {'label': 'Credit behaviour', 'score': latest_score.credit_history_score or 0, 'max_score': 250},
            {'label': 'Qualifications', 'score': latest_score.qualification_score or 0, 'max_score': 100},
            {'label': 'Industry and business risk', 'score': latest_score.industry_risk_score or 0, 'max_score': 100},
        ]

    risk_factors = _build_monitoring_alerts(company, latest_score, overdue_accounts, open_disputes)
    if not risk_factors and not latest_score:
        risk_factors = ['No calculated score is available yet. Generate a score to unlock the full risk analysis.']

    recent_monitoring_activity = []
    for score in credit_scores[:3]:
        recent_monitoring_activity.append({
            'type': 'Score refresh',
            'date': score.scored_at,
            'detail': f'{score.credit_score} / {score.credit_grade}',
        })
    for application in sorted(loan_applications, key=lambda item: item.applied_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:3]:
        recent_monitoring_activity.append({
            'type': 'Loan application',
            'date': application.applied_at,
            'detail': f'HK$ {application.loan_amount:,.0f} · {application.application_status}',
        })
    for dispute in sorted(disputes, key=lambda item: item.opened_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:3]:
        recent_monitoring_activity.append({
            'type': 'Dispute case',
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
            'contact_person': company.contact_person,
            'contact_position': company.contact_position,
            'phone': company.phone,
            'email': company.email,
            'address': company.address,
            'district': company.district,
            'main_service_type': company.main_service_type,
            'years_in_business': years_in_business,
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
            'policy_in_place': company.osh_policy_in_place,
            'training_coverage': training_coverage,
            'heavy_lifting_compliance': company.heavy_lifting_compliance,
            'lifting_equipment_available': company.lifting_equipment_available,
            'incident_count': company.safety_incident_count or 0,
        },
        'esg_profile': {
            'policy_level': company.esg_policy_level or 'none',
            'green_material_ratio': company.green_material_ratio,
            'iso_certified': company.iso_certified,
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


def _load_credit_report_context(company_id):
    company = get_or_404(Company, company_id)
    credit_scores = CreditScore.query.filter_by(company_id=company_id).order_by(CreditScore.scored_at.desc()).all()
    latest_score = credit_scores[0] if credit_scores else None
    loan_applications = LoanApplication.query.filter_by(company_id=company_id).order_by(LoanApplication.applied_at.desc()).all()
    project_bids = ProjectBid.query.filter_by(company_id=company_id).order_by(ProjectBid.created_at.desc()).all()
    disputes = DisputeCase.query.filter_by(against_company_id=company_id).order_by(DisputeCase.opened_at.desc()).all()
    report = _build_credit_report(company, latest_score, credit_scores, loan_applications, project_bids, disputes)

    return company, credit_scores, latest_score, report


@companies_bp.route('/compare-report')
@role_required('admin', 'reviewer')
def compare_reports():
    district = request.args.get('district', '').strip()
    risk_level = request.args.get('risk_level', '').strip()
    grade = request.args.get('grade', '').strip()
    verification = request.args.get('verification', '').strip()
    selected_company_ids = [int(value) for value in request.args.getlist('company_ids') if value.isdigit()]

    query = Company.query
    if district:
        query = query.filter(Company.district == district)
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
        company, _, latest_score, report = _load_credit_report_context(company_id)
        compare_reports.append({
            'company': company,
            'latest_score': latest_score,
            'report': report,
        })

    districts = [
        item[0] for item in db.session.query(Company.district).filter(Company.district.isnot(None)).distinct().order_by(Company.district.asc()).all()
        if item[0]
    ]
    grades = [
        item[0] for item in db.session.query(CreditScore.credit_grade).filter(CreditScore.credit_grade.isnot(None)).distinct().order_by(CreditScore.credit_grade.asc()).all()
        if item[0]
    ]

    return render_template(
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
    
    return render_template('companies/list.html',
                         companies=companies,
                         search=search,
                         status=status)

@companies_bp.route('/add', methods=['GET', 'POST'])
@role_required('admin', 'reviewer', 'company_user')
def add_company():
    if request.method == 'POST':
        try:
            company = Company(owner_user_id=g.user.id)
            _apply_company_form(company)
            company.is_verified_for_bidding = _derive_bid_eligibility(company)
            
            db.session.add(company)
            db.session.flush()
            if g.user.role == 'company_user' and g.user.company_id is None:
                g.user.company_id = company.id
            db.session.commit()
            log_action('company_created', 'Company', company.id, {'company_name': company.company_name})
            db.session.commit()
            
            flash('Company created successfully.', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Failed to create company: {str(e)}', 'error')
    
    return render_template('companies/form.html', company=None)

@companies_bp.route('/<int:id>')
@login_required
def view_company(id):
    company = get_or_404(Company, id)
    
    credit_scores = CreditScore.query.filter_by(company_id=id).order_by(CreditScore.scored_at.desc()).all()
    latest_score = credit_scores[0] if credit_scores else None
    
    loan_applications = company.loan_applications
    
    return render_template('companies/detail.html',
                         company=company,
                         latest_score=latest_score,
                         credit_scores=credit_scores,
                         loan_applications=loan_applications,
                         compliance_alerts=_build_compliance_alerts(company))


@companies_bp.route('/<int:id>/credit-report')
@login_required
def view_credit_report(id):
    company, credit_scores, latest_score, report = _load_credit_report_context(id)

    return render_template(
        'companies/report.html',
        company=company,
        latest_score=latest_score,
        credit_scores=credit_scores,
        report=report,
    )


@companies_bp.route('/<int:id>/credit-report/download')
@login_required
def download_credit_report(id):
    company, _, _, report = _load_credit_report_context(id)
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
    
    if request.method == 'POST':
        try:
            _apply_company_form(company)
            company.is_verified_for_bidding = _derive_bid_eligibility(company)
            
            db.session.commit()
            log_action('company_updated', 'Company', company.id, {'company_name': company.company_name})
            db.session.commit()
            
            flash('Company updated successfully.', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Failed to update company: {str(e)}', 'error')
    
    return render_template('companies/form.html', company=company)

@companies_bp.route('/<int:id>/score', methods=['POST'])
@login_required
def calculate_score(id):
    company = get_or_404(Company, id)
    require_ownership(can_manage_company(g.user, company) or g.user.role == 'customer')
    
    try:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        
        credit_score = scorer.save_score(company, result, notes=' Text Score Text ')
        db.session.add(credit_score)
        company.risk_level = result['risk_level']
        company.trust_score_cached = result['total_score']
        company.is_verified_for_bidding = _derive_bid_eligibility(company)
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
