from flask import Blueprint, flash, g, redirect, render_template, request, url_for

from models.database import db, get_or_404
from models.dispute_case import DisputeCase
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from services.audit_service import log_action
from services.dispute_service import create_dispute, resolve_dispute
from services.smart_contract_service import register_dispute_opened, register_dispute_resolved
from utils.auth_helper import login_required, role_required, require_ownership


disputes_bp = Blueprint('disputes', __name__)


def _current_user_company_id():
    return g.user.company_id if g.user and g.user.company_id else None


def _company_participates_in_project(project, company_id):
    if not company_id:
        return False
    return any(bid.company_id == company_id for bid in project.bids)


@disputes_bp.route('/')
@login_required
def list_disputes():
    disputes = DisputeCase.query.order_by(DisputeCase.opened_at.desc()).all()
    if g.user.role == 'customer':
        disputes = [item for item in disputes if item.project.customer_user_id == g.user.id]
    elif g.user.role == 'company_user':
        company_id = _current_user_company_id()
        disputes = [
            item for item in disputes
            if item.against_company_id == company_id or item.opened_by_user_id == g.user.id
        ]
    return render_template('disputes/list.html', disputes=disputes)


@disputes_bp.route('/add', methods=['POST'])
@role_required('customer', 'company_user', 'admin')
def add_dispute():
    project = get_or_404(Project, int(request.form['project_id']))
    company_id = None
    if g.user.role == 'customer':
        require_ownership(project.customer_user_id == g.user.id)
    elif g.user.role == 'company_user':
        company_id = _current_user_company_id()
        require_ownership(_company_participates_in_project(project, company_id))

    accepted_bid = db.session.get(ProjectBid, project.accepted_bid_id) if project.accepted_bid_id else None
    milestone = None
    if request.form.get('milestone_id'):
        milestone = get_or_404(ProjectMilestone, int(request.form['milestone_id']))
        require_ownership(milestone.project_id == project.id)

    dispute = create_dispute(
        project=project,
        opened_by_user_id=g.user.id,
        dispute_type=request.form['dispute_type'],
        description=request.form['description'],
        milestone=milestone,
        company_id=company_id or (accepted_bid.company_id if accepted_bid else None),
    )
    db.session.add(dispute)
    db.session.flush()
    register_dispute_opened(project, dispute, actor_user_id=g.user.id)
    log_action('dispute_opened', 'DisputeCase', target_id=None, details={'project_id': project.id})
    db.session.commit()
    flash('Dispute opened and payment states frozen.', 'warning')
    return redirect(url_for('projects.view_project', id=project.id))


@disputes_bp.route('/<int:id>/resolve', methods=['POST'])
@role_required('reviewer', 'admin')
def mark_resolved(id):
    dispute = get_or_404(DisputeCase, id)
    if dispute.status == 'resolved':
        flash('This dispute is already resolved.', 'info')
        return redirect(url_for('disputes.list_disputes'))

    resolve_dispute(dispute, request.form.get('resolution_summary', 'Resolved by reviewer.'))
    register_dispute_resolved(dispute, actor_user_id=g.user.id)
    log_action('dispute_resolved', 'DisputeCase', dispute.id, {'project_id': dispute.project_id})
    db.session.commit()
    flash('Dispute resolved.', 'success')
    return redirect(url_for('disputes.list_disputes'))