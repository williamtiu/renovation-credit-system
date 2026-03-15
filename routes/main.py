from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, current_app, render_template, send_from_directory

from models.company import Company
from models.credit_score import CreditScore
from models.database import db
from models.dispute_case import DisputeCase
from models.loan_application import LoanApplication
from models.project import Project
from sqlalchemy import case

main_bp = Blueprint('main', __name__)


def _month_bucket_labels(month_count=6):
    current = datetime.now(timezone.utc)
    labels = []
    for index in range(month_count - 1, -1, -1):
        year = current.year
        month = current.month - index
        while month <= 0:
            month += 12
            year -= 1
        while month > 12:
            month -= 12
            year += 1
        labels.append(f'{year}-{month:02d}')
    return labels


def _build_monthly_count_series(records, date_getter, month_count=6):
    labels = _month_bucket_labels(month_count)
    buckets = OrderedDict((label, 0) for label in labels)

    for record in records:
        value = date_getter(record)
        if not value:
            continue
        label = value.strftime('%Y-%m')
        if label in buckets:
            buckets[label] += 1

    return [{'label': label, 'value': value} for label, value in buckets.items()]


def _build_recent_score_series(scores, limit=8):
    ordered_scores = sorted(scores, key=lambda score: score.scored_at or datetime.min.replace(tzinfo=timezone.utc))[-limit:]
    return [
        {
            'label': score.scored_at.strftime('%m-%d') if score.scored_at else 'n/a',
            'value': score.credit_score or 0,
        }
        for score in ordered_scores
    ]

@main_bp.route('/')
def index():
    """Home"""
    total_companies = Company.query.count()
    active_companies = Company.query.filter_by(status='active').count()
    total_loans = LoanApplication.query.count()
    approved_loans = LoanApplication.query.filter_by(application_status='approved').count()
    total_projects = Project.query.count()
    open_projects = Project.query.filter_by(status='open_for_bids').count()
    total_disputes = DisputeCase.query.count()
    
    recent_scores = CreditScore.query.order_by(CreditScore.scored_at.desc()).limit(5).all()
    
    recent_applications = LoanApplication.query.order_by(LoanApplication.applied_at.desc()).limit(5).all()
    recent_projects = Project.query.order_by(Project.created_at.desc()).limit(5).all()
    
    return render_template('index.html',
                         total_companies=total_companies,
                         active_companies=active_companies,
                         total_loans=total_loans,
                         approved_loans=approved_loans,
                         total_projects=total_projects,
                         open_projects=open_projects,
                         total_disputes=total_disputes,
                         recent_scores=recent_scores,
                         recent_applications=recent_applications,
                         recent_projects=recent_projects)

@main_bp.route('/dashboard')
def dashboard():
    """Dashboard"""
    # Credit Grade Distribution
    grade_distribution = db.session.query(
        CreditScore.credit_grade,
        db.func.count(CreditScore.id)
    ).group_by(CreditScore.credit_grade).all()
    
    # Loan Status Statistics
    loan_status_stats = db.session.query(
        LoanApplication.application_status,
        db.func.count(LoanApplication.id)
    ).group_by(LoanApplication.application_status).all()
    
    risk_distribution = db.session.query(
        Company.risk_level,
        db.func.count(Company.id)
    ).group_by(Company.risk_level).all()

    project_status_stats = db.session.query(
        Project.status,
        db.func.count(Project.id)
    ).group_by(Project.status).all()

    dispute_status_stats = db.session.query(
        DisputeCase.status,
        db.func.count(DisputeCase.id)
    ).group_by(DisputeCase.status).all()

    total_companies = Company.query.count()
    verified_companies = Company.query.filter_by(is_verified_for_bidding=True).count()
    total_projects = Project.query.count()
    open_disputes = DisputeCase.query.filter_by(status='open').count()
    scored_companies = CreditScore.query.with_entities(CreditScore.company_id).distinct().count()
    average_trust_score = db.session.query(db.func.avg(CreditScore.credit_score)).scalar() or 0
    approved_loan_volume = db.session.query(
        db.func.coalesce(
            db.func.sum(
                case(
                    (LoanApplication.approved_amount.isnot(None), LoanApplication.approved_amount),
                    else_=LoanApplication.loan_amount,
                )
            ),
            0,
        )
    ).filter(LoanApplication.application_status == 'approved').scalar() or 0
    verification_backlog = Company.query.filter(
        db.or_(
            Company.licence_verification_status != 'verified',
            Company.insurance_verification_status != 'verified',
        )
    ).count()
    safety_review_backlog = Company.query.filter(
        db.or_(
            Company.osh_policy_in_place.is_(False),
            Company.heavy_lifting_compliance.is_(False),
            Company.safety_training_coverage.is_(None),
            Company.safety_training_coverage < 80,
            Company.safety_incident_count > 0,
        )
    ).count()
    esg_ready_companies = Company.query.filter(Company.esg_policy_level.in_(['basic', 'advanced'])).count()

    watchlist_companies = Company.query.filter(
        db.or_(
            Company.risk_level == 'high',
            Company.dispute_count_cached > 0,
            Company.status != 'active',
            Company.safety_incident_count > 0,
            Company.heavy_lifting_compliance.is_(False),
            Company.safety_training_coverage < 80,
        )
    ).order_by(Company.updated_at.desc()).limit(6).all()

    recent_scores = CreditScore.query.order_by(CreditScore.scored_at.desc()).limit(8).all()
    pending_loans = LoanApplication.query.filter(LoanApplication.application_status.in_(['pending', 'under_review'])).order_by(LoanApplication.applied_at.desc()).limit(8).all()
    score_trend_series = _build_recent_score_series(CreditScore.query.order_by(CreditScore.scored_at.asc()).all())
    dispute_trend_series = _build_monthly_count_series(
        DisputeCase.query.order_by(DisputeCase.opened_at.asc()).all(),
        lambda dispute: dispute.opened_at,
    )
    district_filter_options = [
        district[0] for district in db.session.query(Company.district).filter(Company.district.isnot(None)).distinct().order_by(Company.district.asc()).all()
        if district[0]
    ]
    grade_filter_options = [
        grade[0] for grade in db.session.query(CreditScore.credit_grade).filter(CreditScore.credit_grade.isnot(None)).distinct().order_by(CreditScore.credit_grade.asc()).all()
        if grade[0]
    ]
    
    return render_template('dashboard.html',
                         total_companies=total_companies,
                         verified_companies=verified_companies,
                         total_projects=total_projects,
                         open_disputes=open_disputes,
                         scored_companies=scored_companies,
                         average_trust_score=average_trust_score,
                         approved_loan_volume=approved_loan_volume,
                         verification_backlog=verification_backlog,
                         safety_review_backlog=safety_review_backlog,
                         esg_ready_companies=esg_ready_companies,
                         grade_distribution=grade_distribution,
                         loan_status_stats=loan_status_stats,
                         risk_distribution=risk_distribution,
                         project_status_stats=project_status_stats,
                         dispute_status_stats=dispute_status_stats,
                         watchlist_companies=watchlist_companies,
                         recent_scores=recent_scores,
                         pending_loans=pending_loans,
                         score_trend_series=score_trend_series,
                         dispute_trend_series=dispute_trend_series,
                         district_filter_options=district_filter_options,
                         grade_filter_options=grade_filter_options)

@main_bp.route('/about')
def about():
    return render_template('about.html')


def _new_ui_dist_dir():
    return Path(current_app.root_path) / 'DecoFinance Project Overview' / 'dist'


@main_bp.route('/new-ui')
@main_bp.route('/new-ui/')
def new_ui_index():
    dist_dir = _new_ui_dist_dir()
    index_file = dist_dir / 'index.html'
    if not index_file.exists():
        return (
            'New UI build not found. Run "npm run build" in "DecoFinance Project Overview" first.',
            503,
        )
    return send_from_directory(dist_dir, 'index.html')


@main_bp.route('/new-ui/<path:path>')
def new_ui_assets(path):
    dist_dir = _new_ui_dist_dir()
    target = dist_dir / path
    if target.exists() and target.is_file():
        return send_from_directory(dist_dir, path)

    index_file = dist_dir / 'index.html'
    if not index_file.exists():
        return (
            'New UI build not found. Run "npm run build" in "DecoFinance Project Overview" first.',
            503,
        )
    return send_from_directory(dist_dir, 'index.html')
