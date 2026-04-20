from datetime import datetime, timezone

from flask import Blueprint, flash, g, redirect, render_template, request, url_for
from werkzeug.exceptions import HTTPException
from utils.template_helper import render_template_with_lang_fallback

from models.company import Company
from models.credit_score import CreditScore
from models.database import db, get_or_404
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from services.audit_service import log_action
from utils.auth_helper import login_required, role_required, require_ownership

loans_bp = Blueprint('loans', __name__)


def _can_access_loan(application):
    if g.user.role in ['admin', 'reviewer']:
        return True
    if g.user.role == 'company_user':
        return g.user.company_id == application.company_id
    return False


def _visible_projects_for_company(company_id):
    if not company_id:
        return []
    projects = Project.query.order_by(Project.created_at.desc()).all()
    return [
        project for project in projects
        if project.accepted_bid_id and any(bid.id == project.accepted_bid_id and bid.company_id == company_id for bid in project.bids)
    ]

@loans_bp.route('/')
@role_required('company_user', 'admin', 'reviewer')
def list_loans():
    status = request.args.get('status', '')
    
    query = LoanApplication.query

    if g.user.role == 'company_user':
        query = query.filter_by(company_id=g.user.company_id)
    
    if status:
        query = query.filter_by(application_status=status)
    
    applications = query.order_by(LoanApplication.applied_at.desc()).all()
    
    return render_template_with_lang_fallback('loans/list.html',
                         applications=applications,
                         status=status)

@loans_bp.route('/add', methods=['GET', 'POST'])
@role_required('company_user', 'admin')
def add_application():
    if request.method == 'POST':
        try:
            company_id = int(request.form['company_id'])
            company = db.session.get(Company, company_id)
            
            if not company:
                flash('Company not found.', 'error')
                return redirect(url_for('loans.add_application'))

            if g.user.role == 'company_user':
                require_ownership(g.user.company_id == company_id)

            project_id = int(request.form['project_id']) if request.form.get('project_id') else None
            if project_id is not None:
                project = db.session.get(Project, project_id)
                if not project or not project.accepted_bid_id or not any(bid.id == project.accepted_bid_id and bid.company_id == company_id for bid in project.bids):
                    flash('Selected project is not linked to the specified company.', 'error')
                    return redirect(url_for('loans.add_application'))
            
            latest_score = CreditScore.query.filter_by(company_id=company_id).order_by(CreditScore.scored_at.desc()).first()
            
            application = LoanApplication(
                company_id=company_id,
                loan_amount=float(request.form['loan_amount']),
                loan_purpose=request.form['loan_purpose'],
                loan_term_months=int(request.form.get('loan_term_months', 12)),
                expected_interest_rate=float(request.form.get('expected_interest_rate', 0)),
                collateral_type=request.form.get('collateral_type'),
                collateral_value=float(request.form.get('collateral_value', 0)),
                guarantor=request.form.get('guarantor'),
                bank_name=request.form.get('bank_name_other') if request.form.get('bank_name') == 'Others' else request.form.get('bank_name'),
                bank_officer=request.form.get('bank_officer'),
                project_id=project_id,
                credit_score_at_application=latest_score.credit_score if latest_score else None,
                credit_grade_at_application=latest_score.credit_grade if latest_score else None
            )
            
            db.session.add(application)
            db.session.flush()
            log_action('loan_application_created', 'LoanApplication', application.id, {'company_id': company_id})
            db.session.commit()
            
            flash('Loan application submitted successfully.', 'success')
            return redirect(url_for('loans.view_application', id=application.id))
            
        except HTTPException:
            raise
        except Exception as e:
            db.session.rollback()
            flash(f'Failed to submit application: {str(e)}', 'error')
    
    if g.user.role == 'admin':
        companies = Company.query.all()
        projects = Project.query.filter(Project.accepted_bid_id.isnot(None)).all()
        for p in projects:
            p.awarded_company_id = next((b.company_id for b in p.bids if b.id == p.accepted_bid_id), 'none')
    else:
        companies = Company.query.filter_by(id=g.user.company_id, status='active').all()
        projects = _visible_projects_for_company(g.user.company_id)
        for p in projects:
            p.awarded_company_id = g.user.company_id
        
    return render_template_with_lang_fallback('loans/form.html', companies=companies, projects=projects, application=None)

@loans_bp.route('/<int:id>')
@role_required('company_user', 'admin', 'reviewer')
def view_application(id):
    application = get_or_404(LoanApplication, id)
    require_ownership(_can_access_loan(application))
    company = db.session.get(Company, application.company_id)
    
    return render_template_with_lang_fallback('loans/detail.html',
                         application=application,
                         company=company)

@loans_bp.route('/<int:id>/review', methods=['GET', 'POST'])
@role_required('reviewer', 'admin')
def review_application(id):
    application = get_or_404(LoanApplication, id)
    
    if request.method == 'POST':
        try:
            action = request.form.get('action')
            
            if action == 'approve':
                application.application_status = 'approved'
                application.approval_date = datetime.now(timezone.utc)
                application.decision_at = datetime.now(timezone.utc)
                application.reviewed_by_user_id = g.user.id
                application.approved_amount = float(request.form.get('approved_amount', application.loan_amount))
                application.approved_interest_rate = float(request.form.get('approved_interest_rate'))
                application.approval_conditions = request.form.get('approval_conditions')
                log_action('loan_application_approved', 'LoanApplication', application.id, {'approved_amount': application.approved_amount})
                
                flash('Loan application approved.', 'success')
                
            elif action == 'reject':
                application.application_status = 'rejected'
                application.decision_at = datetime.now(timezone.utc)
                application.reviewed_by_user_id = g.user.id
                application.rejection_reason = request.form.get('rejection_reason')
                log_action('loan_application_rejected', 'LoanApplication', application.id, {'reason': application.rejection_reason})
                
                flash('Loan application rejected.', 'error')
            
            db.session.commit()
            return redirect(url_for('loans.view_application', id=application.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Approval failed: {str(e)}', 'error')
    
    return render_template_with_lang_fallback('loans/review.html', application=application)

@loans_bp.route('/<int:id>/disburse', methods=['POST'])
@role_required('reviewer', 'admin')
def disburse_loan(id):
    application = get_or_404(LoanApplication, id)
    
    if application.application_status != 'approved':
        flash('Application must be approved before disbursement.', 'error')
        return redirect(url_for('loans.view_application', id=id))
    
    try:
        application.disbursement_date = datetime.now(timezone.utc)
        application.disbursement_amount = application.approved_amount
        application.outstanding_balance = application.approved_amount
        application.repayment_status = 'current'
        
        from datetime import timedelta
        application.first_repayment_date = datetime.now(timezone.utc) + timedelta(days=30)
        log_action('loan_disbursed', 'LoanApplication', application.id, {'disbursement_amount': application.disbursement_amount})
        
        db.session.commit()
        flash('Loan disbursed successfully.', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to disburse loan: {str(e)}', 'error')
    
    return redirect(url_for('loans.view_application', id=id))

@loans_bp.route('/<int:id>/repay', methods=['POST'])
@role_required('company_user', 'admin', 'reviewer')
def repay_loan(id):
    application = get_or_404(LoanApplication, id)
    require_ownership(_can_access_loan(application))
    
    if application.repayment_status == 'completed':
        flash('This loan is already fully repaid.', 'error')
        return redirect(url_for('loans.view_application', id=id))
    
    try:
        repayment_amount = float(request.form.get('repayment_amount'))
        
        if repayment_amount > application.outstanding_balance:
            flash('Repayment amount cannot exceed the outstanding balance.', 'error')
        else:
            application.total_repaid += repayment_amount
            application.outstanding_balance -= repayment_amount
            
            if application.outstanding_balance <= 0:
                application.repayment_status = 'completed'
            
            log_action('loan_repayment_recorded', 'LoanApplication', application.id, {'repayment_amount': repayment_amount})
            db.session.commit()
            flash(f'Repayment recorded: HKD {repayment_amount:,.2f}', 'success')
            
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to record repayment: {str(e)}', 'error')
    
    return redirect(url_for('loans.view_application', id=id))

@loans_bp.route('/<int:id>/delete', methods=['POST'])
@role_required('admin')
def delete_application(id):
    application = get_or_404(LoanApplication, id)
    
    try:
        log_action('loan_application_deleted', 'LoanApplication', application.id)
        db.session.delete(application)
        db.session.commit()
        flash('Loan application deleted successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to delete application: {str(e)}', 'error')
    
    return redirect(url_for('loans.list_loans'))
