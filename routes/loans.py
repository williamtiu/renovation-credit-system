"""
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash
from models.database import db
from models.company import Company
from models.loan_application import LoanApplication
from models.credit_score import CreditScore
from datetime import datetime, timezone
from utils.auth_helper import login_required

loans_bp = Blueprint('loans', __name__)

@loans_bp.route('/')
@login_required
def list_loans():
    """List of Loan Applications"""
    status = request.args.get('status', '')
    
    query = LoanApplication.query
    
    if status:
        query = query.filter_by(application_status=status)
    
    applications = query.order_by(LoanApplication.applied_at.desc()).all()
    
    return render_template('loans/list.html',
                         applications=applications,
                         status=status)

@loans_bp.route('/add', methods=['GET', 'POST'])
def add_application():
    """New Loan Application"""
    if request.method == 'POST':
        try:
            company_id = int(request.form['company_id'])
            company = Company.query.get(company_id)
            
            if not company:
                flash('❌  Text ', 'error')
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
                bank_name=request.form.get('bank_name'),
                bank_officer=request.form.get('bank_officer'),
                credit_score_at_application=latest_score.credit_score if latest_score else None,
                credit_grade_at_application=latest_score.credit_grade if latest_score else None
            )
            
            db.session.add(application)
            db.session.commit()
            
            flash('✅ Loan Applications Text Success Text ', 'success')
            return redirect(url_for('loans.view_application', id=application.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'❌  Text Failed：{str(e)}', 'error')
    
    companies = Company.query.filter_by(status='active').all()
    return render_template('loans/form.html', companies=companies, application=None)

@loans_bp.route('/<int:id>')
def view_application(id):
    """Documnetation translated"""
    application = LoanApplication.query.get_or_404(id)
    company = Company.query.get(application.company_id)
    
    return render_template('loans/detail.html',
                         application=application,
                         company=company)

@loans_bp.route('/<int:id>/review', methods=['GET', 'POST'])
def review_application(id):
    """Approve Loan Application"""
    application = LoanApplication.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            action = request.form.get('action')
            
            if action == 'approve':
                application.application_status = 'approved'
                application.approval_date = datetime.now(timezone.utc)
                application.approved_amount = float(request.form.get('approved_amount', application.loan_amount))
                application.approved_interest_rate = float(request.form.get('approved_interest_rate'))
                application.approval_conditions = request.form.get('approval_conditions')
                
                flash('✅ Loan ApplicationsApproved', 'success')
                
            elif action == 'reject':
                application.application_status = 'rejected'
                application.rejection_reason = request.form.get('rejection_reason')
                
                flash('❌ Loan Applications Text Reject', 'error')
            
            db.session.commit()
            return redirect(url_for('loans.view_application', id=application.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'❌ Approve/RejectFailed：{str(e)}', 'error')
    
    return render_template('loans/review.html', application=application)

@loans_bp.route('/<int:id>/disburse', methods=['POST'])
def disburse_loan(id):
    """Documnetation translated"""
    application = LoanApplication.query.get_or_404(id)
    
    if application.application_status != 'approved':
        flash('❌  Text Approved Text ', 'error')
        return redirect(url_for('loans.view_application', id=id))
    
    try:
        application.disbursement_date = datetime.now(timezone.utc)
        application.disbursement_amount = application.approved_amount
        application.outstanding_balance = application.approved_amount
        application.repayment_status = 'current'
        
        from datetime import timedelta
        application.first_repayment_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        db.session.commit()
        flash('✅  Text Success Text ', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return redirect(url_for('loans.view_application', id=id))

@loans_bp.route('/<int:id>/repay', methods=['POST'])
def repay_loan(id):
    """Documnetation translated"""
    application = LoanApplication.query.get_or_404(id)
    
    if application.repayment_status == 'completed':
        flash('❌  Text ', 'error')
        return redirect(url_for('loans.view_application', id=id))
    
    try:
        repayment_amount = float(request.form.get('repayment_amount'))
        
        if repayment_amount > application.outstanding_balance:
            flash('❌  Text ', 'error')
        else:
            application.total_repaid += repayment_amount
            application.outstanding_balance -= repayment_amount
            
            if application.outstanding_balance <= 0:
                application.repayment_status = 'completed'
            
            db.session.commit()
            flash(f'✅  Text Success：HKD {repayment_amount:,.2f}', 'success')
            
    except Exception as e:
        db.session.rollback()
        flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return redirect(url_for('loans.view_application', id=id))

@loans_bp.route('/<int:id>/delete', methods=['POST'])
def delete_application(id):
    """Documnetation translated"""
    application = LoanApplication.query.get_or_404(id)
    
    try:
        db.session.delete(application)
        db.session.commit()
        flash('✅ Loan Applications Text Success Text ', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return redirect(url_for('loans.list_loans'))
