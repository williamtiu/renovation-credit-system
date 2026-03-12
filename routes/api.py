from functools import wraps

from flask import Blueprint, g, jsonify, request

from models.company import Company
from models.credit_score import CreditScore
from models.database import db, get_or_404
from models.dispute_case import DisputeCase
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from services.smart_contract_service import get_or_create_contract
from services.credit_scorer import CreditScorer
from utils.auth_helper import can_manage_company

api_bp = Blueprint('api', __name__)


def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if getattr(g, 'user', None) is None:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not g.user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 403
        return f(*args, **kwargs)

    return decorated_function


def api_role_required(*roles):
    def decorator(f):
        @wraps(f)
        @api_login_required
        def decorated_function(*args, **kwargs):
            if g.user.role not in roles:
                return jsonify({'success': False, 'error': 'Forbidden'}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def _company_has_project_access(project, company_id):
    if not company_id:
        return False
    return any(bid.company_id == company_id for bid in project.bids)


def _can_access_project(project):
    if g.user.role in ['admin', 'reviewer']:
        return True
    if g.user.role == 'customer':
        return project.customer_user_id == g.user.id
    if g.user.role == 'company_user':
        return project.status == 'open_for_bids' or _company_has_project_access(project, g.user.company_id)
    return False

@api_bp.route('/companies', methods=['GET', 'POST'])
@api_login_required
def get_companies():
    if request.method == 'POST':
        if g.user.role not in ['admin', 'reviewer', 'company_user']:
            return jsonify({'success': False, 'error': 'Forbidden'}), 403
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
@api_login_required
def get_company(id):
    company = get_or_404(Company, id)
    return jsonify({
        'success': True,
        'data': company.to_dict()
    })

@api_bp.route('/companies/<int:id>/score', methods=['POST'])
@api_login_required
def calculate_score_api(id):
    company = get_or_404(Company, id)
    if not can_manage_company(g.user, company):
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    
    try:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        
        credit_score = scorer.save_score(company, result)
        db.session.add(credit_score)
        
        company.risk_level = result['risk_level']
        company.trust_score_cached = result['total_score']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'score_id': credit_score.id,
                'credit_score': result['total_score'],
                'credit_grade': result['credit_grade'],
                'trust_score': result['total_score'],
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
@api_role_required('admin', 'reviewer')
def get_credit_scores():
    scores = CreditScore.query.order_by(CreditScore.scored_at.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'data': [score.to_dict() for score in scores]
    })

@api_bp.route('/loans', methods=['GET'])
@api_role_required('admin', 'reviewer')
def get_loans():
    applications = LoanApplication.query.order_by(LoanApplication.applied_at.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'data': [app.to_dict() for app in applications]
    })

@api_bp.route('/stats', methods=['GET'])
@api_role_required('admin', 'reviewer')
def get_statistics():
    stats = {
        'total_companies': Company.query.count(),
        'active_companies': Company.query.filter_by(status='active').count(),
        'total_loans': LoanApplication.query.count(),
        'approved_loans': LoanApplication.query.filter_by(application_status='approved').count(),
        'pending_loans': LoanApplication.query.filter_by(application_status='pending').count(),
        'total_credit_scores': CreditScore.query.count(),
        'total_projects': Project.query.count(),
        'open_projects': Project.query.filter_by(status='open_for_bids').count(),
        'total_disputes': DisputeCase.query.count(),
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


@api_bp.route('/projects', methods=['GET'])
@api_login_required
def get_projects():
    projects = Project.query.order_by(Project.created_at.desc()).limit(50).all()
    if g.user.role == 'customer':
        projects = [project for project in projects if project.customer_user_id == g.user.id]
    elif g.user.role == 'company_user':
        projects = [project for project in projects if project.status == 'open_for_bids' or _company_has_project_access(project, g.user.company_id)]
    return jsonify({'success': True, 'data': [project.to_dict() for project in projects]})


@api_bp.route('/projects/<int:id>/bids', methods=['GET'])
@api_login_required
def get_project_bids(id):
    project = get_or_404(Project, id)
    if not _can_access_project(project):
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    bids = ProjectBid.query.filter_by(project_id=id).order_by(ProjectBid.created_at.desc()).all()
    return jsonify({'success': True, 'data': [bid.to_dict() for bid in bids]})


@api_bp.route('/projects/<int:id>/milestones', methods=['GET'])
@api_login_required
def get_project_milestones(id):
    project = get_or_404(Project, id)
    if not _can_access_project(project):
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    milestones = ProjectMilestone.query.filter_by(project_id=id).order_by(ProjectMilestone.sequence_no.asc()).all()
    return jsonify({'success': True, 'data': [milestone.to_dict() for milestone in milestones]})


@api_bp.route('/projects/<int:id>/contract', methods=['GET'])
@api_login_required
def get_project_contract(id):
    project = get_or_404(Project, id)
    if not _can_access_project(project):
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    has_contract = project.smart_contract is not None
    contract = project.smart_contract or get_or_create_contract(project)
    if not has_contract:
        db.session.commit()
    return jsonify({'success': True, 'data': contract.to_dict()})


@api_bp.route('/disputes', methods=['GET'])
@api_role_required('admin', 'reviewer')
def get_disputes():
    disputes = DisputeCase.query.order_by(DisputeCase.opened_at.desc()).limit(50).all()
    return jsonify({'success': True, 'data': [dispute.to_dict() for dispute in disputes]})
