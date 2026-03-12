from datetime import datetime, timezone

from models.dispute_case import DisputeCase
from services.escrow_service import freeze_project_entries


def create_dispute(project, opened_by_user_id, dispute_type, description, milestone=None, company_id=None):
    dispute = DisputeCase(
        project_id=project.id,
        milestone_id=milestone.id if milestone else None,
        opened_by_user_id=opened_by_user_id,
        against_company_id=company_id,
        dispute_type=dispute_type,
        description=description,
    )
    project.status = 'disputed'
    if milestone is not None:
        milestone.status = 'disputed'
    freeze_project_entries(project.id, created_by_user_id=opened_by_user_id)
    return dispute


def resolve_dispute(dispute, resolution_summary):
    dispute.status = 'resolved'
    dispute.resolution_summary = resolution_summary
    dispute.resolved_at = datetime.now(timezone.utc)

    remaining_open_disputes = [
        item for item in dispute.project.disputes
        if item.id != dispute.id and item.status == 'open'
    ]
    if dispute.milestone is not None:
        milestone_has_open_dispute = any(item.milestone_id == dispute.milestone_id for item in remaining_open_disputes)
        if not milestone_has_open_dispute:
            dispute.milestone.status = 'submitted' if dispute.milestone.submitted_at else 'planned'

    if not remaining_open_disputes:
        if any(milestone.status == 'submitted' for milestone in dispute.project.milestones):
            dispute.project.status = 'in_progress'
        elif dispute.project.accepted_bid_id:
            dispute.project.status = 'contracted'
        else:
            dispute.project.status = 'open_for_bids'

    return dispute