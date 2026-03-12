import json
from datetime import datetime, timezone

from models.database import db
from models.dispute_case import DisputeCase
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.project_milestone import ProjectMilestone
from models.smart_contract_agreement import SmartContractAgreement


def utc_now():
    return datetime.now(timezone.utc)


def _base_terms(project):
    return {
        'project_title': project.title,
        'property_type': project.property_type,
        'district': project.district,
        'budget_amount': project.budget_amount,
        'escrow_currency': 'HKD',
        'release_rule': 'Funds release after customer approval of milestone evidence.',
        'dispute_rule': 'Open disputes freeze payable milestone amounts until reviewer resolution.',
    }


def _dump_json(payload):
    return json.dumps(payload, ensure_ascii=False)


def _load_events(contract):
    if not contract.event_log_json:
        return []
    try:
        return json.loads(contract.event_log_json)
    except (TypeError, ValueError):
        return []


def _sync_contract_metrics(contract):
    planned_total = sum(
        entry.amount for entry in EscrowLedgerEntry.query.filter_by(project_id=contract.project_id, entry_type='planned').all()
    )
    released_total = sum(
        entry.amount for entry in EscrowLedgerEntry.query.filter_by(project_id=contract.project_id, entry_type='released').all()
    )
    frozen_total = sum(
        entry.amount for entry in EscrowLedgerEntry.query.filter_by(project_id=contract.project_id, entry_type='frozen').all()
    )
    milestones = ProjectMilestone.query.filter_by(project_id=contract.project_id).all()
    open_disputes = DisputeCase.query.filter_by(project_id=contract.project_id, status='open').count()

    contract.escrow_balance = max(planned_total - released_total, 0.0)
    contract.released_amount = released_total
    contract.frozen_amount = frozen_total
    contract.milestones_total = len(milestones)
    contract.approved_milestones = sum(1 for milestone in milestones if milestone.status == 'approved')
    contract.dispute_count = open_disputes

    if open_disputes > 0:
        contract.status = 'frozen'
    elif contract.accepted_bid_id is None:
        contract.status = 'draft'
    elif contract.milestones_total and contract.approved_milestones == contract.milestones_total:
        contract.status = 'completed'
    elif any(milestone.status == 'submitted' for milestone in milestones):
        contract.status = 'milestone_submitted'
    elif contract.activated_at is not None:
        contract.status = 'active'
    else:
        contract.status = 'draft'


def _append_event(contract, event_type, details=None, actor_user_id=None):
    events = _load_events(contract)
    events.append({
        'event_type': event_type,
        'details': details or {},
        'actor_user_id': actor_user_id,
        'created_at': utc_now().isoformat(),
    })
    contract.event_log_json = _dump_json(events[-50:])
    contract.last_event_at = utc_now()


def get_or_create_contract(project, actor_user_id=None):
    contract = SmartContractAgreement.query.filter_by(project_id=project.id).first()
    if contract is None:
        contract = SmartContractAgreement(
            project_id=project.id,
            customer_user_id=project.customer_user_id,
            contract_code=f'DF-SC-{project.id:05d}',
            budget_amount=project.budget_amount or 0.0,
            terms_json=_dump_json(_base_terms(project)),
            event_log_json='[]',
        )
        db.session.add(contract)
        db.session.flush()
        _append_event(contract, 'contract_initialized', {'project_status': project.status}, actor_user_id=actor_user_id)

    _sync_contract_metrics(contract)
    return contract


def register_bid_acceptance(project, bid, actor_user_id=None):
    contract = get_or_create_contract(project, actor_user_id=actor_user_id)
    contract.accepted_bid_id = bid.id
    contract.contractor_company_id = bid.company_id
    contract.activated_at = contract.activated_at or utc_now()
    _append_event(contract, 'bid_accepted', {
        'bid_id': bid.id,
        'company_id': bid.company_id,
        'bid_amount': bid.bid_amount,
    }, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract


def register_milestone_creation(project, milestone, actor_user_id=None):
    contract = get_or_create_contract(project, actor_user_id=actor_user_id)
    terms = contract.parsed_terms()
    milestone_terms = terms.setdefault('milestones', [])
    milestone_terms.append({
        'milestone_id': milestone.id,
        'sequence_no': milestone.sequence_no,
        'name': milestone.name,
        'planned_amount': milestone.planned_amount,
        'planned_percentage': milestone.planned_percentage,
    })
    contract.terms_json = _dump_json(terms)
    _append_event(contract, 'milestone_created', {'milestone_id': milestone.id, 'name': milestone.name}, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract


def register_milestone_submission(milestone, actor_user_id=None):
    contract = get_or_create_contract(milestone.project, actor_user_id=actor_user_id)
    _append_event(contract, 'milestone_submitted', {'milestone_id': milestone.id, 'name': milestone.name}, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract


def register_milestone_approval(milestone, actor_user_id=None):
    contract = get_or_create_contract(milestone.project, actor_user_id=actor_user_id)
    _append_event(contract, 'milestone_approved', {
        'milestone_id': milestone.id,
        'name': milestone.name,
        'released_amount': milestone.planned_amount,
    }, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract


def register_dispute_opened(project, dispute, actor_user_id=None):
    contract = get_or_create_contract(project, actor_user_id=actor_user_id)
    _append_event(contract, 'dispute_opened', {
        'dispute_id': dispute.id,
        'dispute_type': dispute.dispute_type,
        'status': dispute.status,
    }, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract


def register_dispute_resolved(dispute, actor_user_id=None):
    contract = get_or_create_contract(dispute.project, actor_user_id=actor_user_id)
    _append_event(contract, 'dispute_resolved', {
        'dispute_id': dispute.id,
        'resolution_summary': dispute.resolution_summary,
    }, actor_user_id=actor_user_id)
    _sync_contract_metrics(contract)
    return contract