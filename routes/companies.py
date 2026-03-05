"""
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash
from models.database import db
from models.company import Company
from models.credit_score import CreditScore
from services.credit_scorer import CreditScorer
from datetime import datetime
from utils.auth_helper import login_required

companies_bp = Blueprint('companies', __name__)

@companies_bp.route('/')
@login_required
def list_companies():
    """Company List"""
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

@companies_bp.route('/add')
@companies_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_company():
    """Documnetation translated"""
    if request.method == 'POST':
        try:
            established_date = None
            if request.form.get('established_date'):
                established_date = datetime.strptime(request.form['established_date'], '%Y-%m-%d')
            
            company = Company(
                company_name=request.form['company_name'],
                business_registration=request.form['business_registration'],
                established_date=established_date,
                registered_capital=float(request.form.get('registered_capital', 0)),
                contact_person=request.form.get('contact_person'),
                phone=request.form.get('phone'),
                email=request.form.get('email'),
                address=request.form.get('address'),
                district=request.form.get('district'),
                employee_count=int(request.form.get('employee_count', 0)),
                annual_revenue=float(request.form.get('annual_revenue', 0)),
                project_count_completed=int(request.form.get('project_count_completed', 0)),
                average_project_value=float(request.form.get('average_project_value', 0)),
                main_service_type=request.form.get('main_service_type'),
                has_license=request.form.get('has_license') == 'on',
                license_type=request.form.get('license_type'),
                iso_certified=request.form.get('iso_certified') == 'on',
                professional_memberships=request.form.get('professional_memberships'),
                bank_account_years=int(request.form.get('bank_account_years', 0)),
                existing_loans=float(request.form.get('existing_loans', 0)),
                loan_repayment_history=request.form.get('loan_repayment_history', 'Good')
            )
            
            db.session.add(company)
            db.session.commit()
            
            flash('✅  Text Success Text ', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return render_template('companies/form.html', company=None)

@companies_bp.route('/<int:id>')
def view_company(id):
    """ViewCompany Details"""
    company = Company.query.get_or_404(id)
    
    credit_scores = CreditScore.query.filter_by(company_id=id).order_by(CreditScore.scored_at.desc()).all()
    latest_score = credit_scores[0] if credit_scores else None
    
    loan_applications = company.loan_applications
    
    return render_template('companies/detail.html',
                         company=company,
                         latest_score=latest_score,
                         credit_scores=credit_scores,
                         loan_applications=loan_applications)

@companies_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
def edit_company(id):
    """Documnetation translated"""
    company = Company.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            company.company_name = request.form['company_name']
            company.business_registration = request.form['business_registration']
            
            if request.form.get('established_date'):
                company.established_date = datetime.strptime(request.form['established_date'], '%Y-%m-%d')
            
            company.registered_capital = float(request.form.get('registered_capital', 0))
            company.contact_person = request.form.get('contact_person')
            company.phone = request.form.get('phone')
            company.email = request.form.get('email')
            company.address = request.form.get('address')
            company.district = request.form.get('district')
            company.employee_count = int(request.form.get('employee_count', 0))
            company.annual_revenue = float(request.form.get('annual_revenue', 0))
            company.project_count_completed = int(request.form.get('project_count_completed', 0))
            company.has_license = request.form.get('has_license') == 'on'
            company.license_type = request.form.get('license_type')
            company.iso_certified = request.form.get('iso_certified') == 'on'
            company.bank_account_years = int(request.form.get('bank_account_years', 0))
            company.existing_loans = float(request.form.get('existing_loans', 0))
            company.loan_repayment_history = request.form.get('loan_repayment_history', 'Good')
            
            db.session.commit()
            
            flash('✅  Text Success Text ', 'success')
            return redirect(url_for('companies.view_company', id=company.id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return render_template('companies/form.html', company=company)

@companies_bp.route('/<int:id>/score', methods=['POST'])
def calculate_score(id):
    """Documnetation translated"""
    company = Company.query.get_or_404(id)
    
    try:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        
        credit_score = scorer.save_score(company, result, notes=' Text Score Text ')
        db.session.add(credit_score)
        db.session.commit()
        
        company.risk_level = result['risk_level']
        db.session.commit()
        
        flash(f'✅ Credit Score Text ：{result["total_score"]}  Text  ({result["credit_grade"]} Text )', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'❌ Score Text Failed：{str(e)}', 'error')
    
    return redirect(url_for('companies.view_company', id=company.id))

@companies_bp.route('/<int:id>/delete', methods=['POST'])
def delete_company(id):
    """Delete Company"""
    company = Company.query.get_or_404(id)
    
    try:
        db.session.delete(company)
        db.session.commit()
        flash('✅  Text Success Text ', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'❌  Text Failed：{str(e)}', 'error')
    
    return redirect(url_for('companies.list_companies'))
