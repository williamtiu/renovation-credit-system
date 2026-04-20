from datetime import datetime, timezone

from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for
from utils.template_helper import render_template_with_lang_fallback

from models.company import Company
from models.database import db, get_or_404
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from services.audit_service import log_action
from services.escrow_service import create_planned_entry, release_milestone_amount
from services.project_service import accept_bid, company_can_bid
from services.smart_contract_service import (
    get_or_create_contract,
    register_bid_acceptance,
    register_milestone_approval,
    register_milestone_creation,
    register_milestone_submission,
)
from utils.auth_helper import login_required, role_required, require_ownership


projects_bp = Blueprint('projects', __name__)


def _current_user_company():
    if not g.user or not g.user.company_id:
        return None
    return db.session.get(Company, g.user.company_id)


def _company_has_project_access(project, company_id):
    if not company_id:
        return False
    if any(bid.company_id == company_id for bid in project.bids):
        return True
    return bool(project.accepted_bid_id and any(bid.id == project.accepted_bid_id and bid.company_id == company_id for bid in project.bids))


def _require_project_access(project):
    if g.user.role in ['admin', 'reviewer']:
        return
    if g.user.role == 'customer':
        require_ownership(project.customer_user_id == g.user.id)
        return
    if g.user.role == 'company_user':
        company = _current_user_company()
        require_ownership(project.status == 'open_for_bids' or _company_has_project_access(project, company.id if company else None))
        return
    require_ownership(False)


def _apply_project_form(project):
    project.title = request.form['title'].strip()
    project.description = request.form.get('description') or None
    project.property_type = request.form.get('property_type') or None
    project.property_address = request.form.get('property_address') or None
    project.district = request.form.get('district') or None
    project.budget_amount = float(request.form.get('budget_amount', 0) or 0)
    project.target_start_date = datetime.strptime(request.form['target_start_date'], '%Y-%m-%d').date() if request.form.get('target_start_date') else None
    project.target_end_date = datetime.strptime(request.form['target_end_date'], '%Y-%m-%d').date() if request.form.get('target_end_date') else None


def _milestone_has_open_disputes(milestone):
    return any(
        dispute.status == 'open' and dispute.milestone_id in [None, milestone.id]
        for dispute in milestone.project.disputes
    )


@projects_bp.route('/')
@login_required
def list_projects():
    if g.user.role == 'customer':
        projects = Project.query.filter_by(customer_user_id=g.user.id).order_by(Project.created_at.desc()).all()
    elif g.user.role == 'company_user':
        company = _current_user_company()
        visible_projects = Project.query.order_by(Project.created_at.desc()).all()
        projects = [
            project for project in visible_projects
            if project.status == 'open_for_bids' or _company_has_project_access(project, company.id if company else None)
        ]
    else:
        projects = Project.query.order_by(Project.created_at.desc()).all()
    return render_template_with_lang_fallback('projects/list.html', projects=projects)


@projects_bp.route('/add', methods=['GET', 'POST'])
@role_required('customer', 'admin')
def add_project():
    if request.method == 'POST':
        project = Project(customer_user_id=g.user.id, status=request.form.get('status', 'open_for_bids'))
        _apply_project_form(project)
        db.session.add(project)
        db.session.flush()
        get_or_create_contract(project, actor_user_id=g.user.id)
        log_action('project_created', 'Project', project.id, {'title': project.title})
        db.session.commit()
        flash('Project created successfully.', 'success')
        return redirect(url_for('projects.view_project', id=project.id))
    return render_template_with_lang_fallback('projects/form.html', project=None)


@projects_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@role_required('customer', 'admin')
def edit_project(id):
    project = get_or_404(Project, id)
    require_ownership(project.customer_user_id == g.user.id or g.user.role == 'admin')

    if request.method == 'POST':
        if g.user.role != 'admin' and project.status not in ['draft', 'open_for_bids']:
            flash('Only draft or open-for-bids projects can be edited.', 'warning')
            return redirect(url_for('projects.view_project', id=project.id))

        _apply_project_form(project)
        log_action('project_updated', 'Project', project.id, {'title': project.title})
        db.session.commit()
        flash('Project updated successfully.', 'success')
        return redirect(url_for('projects.view_project', id=project.id))

    return render_template_with_lang_fallback('projects/form.html', project=project)


@projects_bp.route('/<int:id>')
@login_required
def view_project(id):
    project = get_or_404(Project, id)
    _require_project_access(project)
    has_contract = project.smart_contract is not None
    if not has_contract:
        get_or_create_contract(project, actor_user_id=g.user.id if g.user else None)
        db.session.commit()
    return render_template_with_lang_fallback('projects/detail.html', project=project)


@projects_bp.route('/<int:id>/bids', methods=['POST'])
@role_required('company_user', 'admin')
def submit_bid(id):
    project = get_or_404(Project, id)
    if project.status != 'open_for_bids':
        flash('This project is not accepting bids.', 'warning')
        return redirect(url_for('projects.view_project', id=id))

    company = db.session.get(Company, g.user.company_id)
    if not company_can_bid(company):
        flash('Your company is not verified for bidding.', 'danger')
        return redirect(url_for('projects.view_project', id=id))

    existing_bid = ProjectBid.query.filter(
        ProjectBid.project_id == project.id,
        ProjectBid.company_id == company.id,
        ProjectBid.status.in_(['submitted', 'shortlisted', 'accepted'])
    ).first()
    if existing_bid:
        flash('Your company already has an active bid on this project.', 'warning')
        return redirect(url_for('projects.view_project', id=id))

    bid = ProjectBid(
        project_id=project.id,
        company_id=company.id,
        submitted_by_user_id=g.user.id,
        bid_amount=float(request.form['bid_amount']),
        proposed_duration_days=int(request.form.get('proposed_duration_days', 0) or 0),
        proposal_summary=request.form.get('proposal_summary'),
        notes=request.form.get('notes'),
    )
    db.session.add(bid)
    log_action('bid_submitted', 'ProjectBid', target_id=None, details={'project_id': project.id, 'company_id': company.id})
    db.session.commit()
    flash('Bid submitted successfully.', 'success')
    return redirect(url_for('projects.view_project', id=id))


@projects_bp.route('/<int:project_id>/bids/<int:bid_id>/accept', methods=['POST'])
@role_required('customer', 'admin')
def accept_project_bid(project_id, bid_id):
    project = get_or_404(Project, project_id)
    require_ownership(project.customer_user_id == g.user.id or g.user.role == 'admin')
    bid = get_or_404(ProjectBid, bid_id)
    if bid.project_id != project.id:
        abort(404)
    if project.status != 'open_for_bids':
        flash('This project can no longer accept bids.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))
    if project.accepted_bid_id and project.accepted_bid_id != bid.id:
        flash('A bid has already been accepted for this project.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))

    accept_bid(project, bid)
    register_bid_acceptance(project, bid, actor_user_id=g.user.id)
    log_action('bid_accepted', 'ProjectBid', bid.id, {'project_id': project.id})
    db.session.commit()
    flash('Bid accepted and project contracted.', 'success')
    return redirect(url_for('projects.view_project', id=project.id))


@projects_bp.route('/<int:id>/milestones/add', methods=['GET', 'POST'])
@role_required('customer', 'admin')
def add_milestone(id):
    project = get_or_404(Project, id)
    if request.method == 'GET':
        return redirect(url_for('projects.view_project', id=project.id))
    require_ownership(project.customer_user_id == g.user.id or g.user.role == 'admin')
    if project.status not in ['contracted', 'in_progress']:
        flash('Milestones can only be added after a bid has been accepted.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))

    milestone = ProjectMilestone(
        project_id=project.id,
        sequence_no=int(request.form['sequence_no']),
        name=request.form['name'],
        description=request.form.get('description'),
        planned_percentage=float(request.form.get('planned_percentage', 0) or 0),
        planned_amount=float(request.form.get('planned_amount', 0) or 0),
        due_date=datetime.strptime(request.form['due_date'], '%Y-%m-%d').date() if request.form.get('due_date') else None,
    )
    db.session.add(milestone)
    db.session.flush()
    create_planned_entry(project.id, milestone.planned_amount, created_by_user_id=g.user.id, milestone_id=milestone.id, note=milestone.name)
    register_milestone_creation(project, milestone, actor_user_id=g.user.id)
    log_action('milestone_created', 'ProjectMilestone', milestone.id, {'project_id': project.id})
    db.session.commit()
    flash('Milestone created successfully.', 'success')
    return redirect(url_for('projects.view_project', id=project.id))


@projects_bp.route('/milestones/<int:id>/submit', methods=['POST'])
@role_required('company_user', 'admin')
def submit_milestone(id):
    milestone = get_or_404(ProjectMilestone, id)
    project = milestone.project
    company = _current_user_company() if g.user.role == 'company_user' else None
    accepted_bid = db.session.get(ProjectBid, project.accepted_bid_id) if project.accepted_bid_id else None

    if g.user.role == 'company_user':
        require_ownership(company is not None and accepted_bid is not None and accepted_bid.company_id == company.id)
    if project.status not in ['contracted', 'in_progress']:
        flash('Milestones can only be submitted for contracted projects.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))
    if milestone.status != 'planned':
        flash('Only planned milestones can be submitted.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))

    milestone.status = 'submitted'
    milestone.submitted_at = datetime.now(timezone.utc)
    milestone.evidence_notes = request.form.get('evidence_notes')
    milestone.submitted_by_user_id = g.user.id
    if project.status == 'contracted':
        project.status = 'in_progress'
    register_milestone_submission(milestone, actor_user_id=g.user.id)
    log_action('milestone_submitted', 'ProjectMilestone', milestone.id, {'project_id': milestone.project_id})
    db.session.commit()
    flash('Milestone submitted for approval.', 'success')
    return redirect(url_for('projects.view_project', id=milestone.project_id))


@projects_bp.route('/milestones/<int:id>/approve', methods=['POST'])
@role_required('customer', 'admin')
def approve_milestone(id):
    milestone = get_or_404(ProjectMilestone, id)
    project = milestone.project
    require_ownership(project.customer_user_id == g.user.id or g.user.role == 'admin')
    if milestone.status != 'submitted':
        flash('Only submitted milestones can be approved.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))
    if _milestone_has_open_disputes(milestone):
        flash('Resolve open disputes before approving this milestone.', 'warning')
        return redirect(url_for('projects.view_project', id=project.id))

    milestone.status = 'approved'
    milestone.approved_at = datetime.now(timezone.utc)
    milestone.reviewed_by_user_id = g.user.id
    release_milestone_amount(project.id, milestone.id, milestone.planned_amount, created_by_user_id=g.user.id)
    remaining_unapproved = any(item.id != milestone.id and item.status not in ['approved', 'released'] for item in project.milestones)
    project.status = 'completed' if not remaining_unapproved and project.milestones else 'in_progress'
    register_milestone_approval(milestone, actor_user_id=g.user.id)
    log_action('milestone_approved', 'ProjectMilestone', milestone.id, {'project_id': project.id})
    db.session.commit()
    flash('Milestone approved.', 'success')
    return redirect(url_for('projects.view_project', id=project.id))