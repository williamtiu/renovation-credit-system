"""
"""

from flask import Blueprint, jsonify, request
from models.database import db
from models.company import Company
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from services.credit_scorer import CreditScorer

api_bp = Blueprint('api', __name__)

@api_bp.route('/companies', methods=['GET', 'POST'])
def get_companies():
    """Documnetation translated"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            company = Company(
                company_name=data.get('company_name'),
                business_registration=data.get('business_registration'),
                established_date=data.get('established_date'),
                registered_capital=data.get('registered_capital'),
                annual_revenue=data.get('annual_revenue'),
                employee_count=data.get('employee_count'),
                project_count_completed=data.get('project_count_completed'),
                contact_person=data.get('contact_person'),
                phone=data.get('phone'),
                email=data.get('email'),
                address=data.get('address'),
                district=data.get('district'),
                has_license=data.get('has_license', False),
                iso_certified=data.get('iso_certified', False),
                bank_account_years=data.get('bank_account_years'),
                existing_loans=data.get('existing_loans', 0),
                loan_repayment_history=data.get('loan_repayment_history', 'Good'),
                status='active'
            )
            
            db.session.add(company)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Company created successfully',
                'data': company.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
    
    companies = Company.query.all()
    return jsonify({
        'success': True,
        'data': [company.to_dict() for company in companies]
    })

@api_bp.route('/companies/<int:id>', methods=['GET'])
def get_company(id):
    """Documnetation translated"""
    company = Company.query.get_or_404(id)
    return jsonify({
        'success': True,
        'data': company.to_dict()
    })

@api_bp.route('/companies/<int:id>/score', methods=['POST'])
def calculate_score_api(id):
    """Documnetation translated"""
    company = Company.query.get_or_404(id)
    
    try:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        
        credit_score = scorer.save_score(company, result)
        db.session.add(credit_score)
        
        company.risk_level = result['risk_level']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'score_id': credit_score.id,
                'credit_score': result['total_score'],
                'credit_grade': result['credit_grade'],
                'risk_level': result['risk_level'],
                'recommended_loan_limit': result['recommended_loan_limit'],
                'recommended_interest_rate': result['recommended_interest_rate'],
                'risk_factors': result['risk_factors']
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/credit-scores', methods=['GET'])
def get_credit_scores():
    """Documnetation translated"""
    scores = CreditScore.query.order_by(CreditScore.scored_at.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'data': [score.to_dict() for score in scores]
    })

@api_bp.route('/loans', methods=['GET'])
def get_loans():
    """Documnetation translated"""
    applications = LoanApplication.query.order_by(LoanApplication.applied_at.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'data': [app.to_dict() for app in applications]
    })

@api_bp.route('/stats', methods=['GET'])
def get_statistics():
    """Documnetation translated"""
    stats = {
        'total_companies': Company.query.count(),
        'active_companies': Company.query.filter_by(status='active').count(),
        'total_loans': LoanApplication.query.count(),
        'approved_loans': LoanApplication.query.filter_by(application_status='approved').count(),
        'pending_loans': LoanApplication.query.filter_by(application_status='pending').count(),
        'total_credit_scores': CreditScore.query.count()
    }
    
    # Credit Grade Distribution
    grade_dist = db.session.query(
        CreditScore.credit_grade,
        db.func.count(CreditScore.id)
    ).group_by(CreditScore.credit_grade).all()
    
    stats['grade_distribution'] = {grade: count for grade, count in grade_dist}
    
    return jsonify({
        'success': True,
        'data': stats
    })
