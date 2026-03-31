from models.database import db
from models.escrow_ledger_entry import EscrowLedgerEntry


def create_planned_entry(project_id, amount, created_by_user_id=None, milestone_id=None, note=None):
    entry = EscrowLedgerEntry(
        project_id=project_id,
        milestone_id=milestone_id,
        entry_type='planned',
        amount=amount,
        reference_note=note,
        created_by_user_id=created_by_user_id,
    )
    db.session.add(entry)
    return entry


def freeze_project_entries(project_id, created_by_user_id=None, note='Frozen due to dispute'):
    planned_entries = EscrowLedgerEntry.query.filter(
        EscrowLedgerEntry.project_id == project_id,
        EscrowLedgerEntry.entry_type.in_(['planned', 'held'])
    ).all()

    frozen_entries = []
    for entry in planned_entries:
        frozen = EscrowLedgerEntry(
            project_id=entry.project_id,
            milestone_id=entry.milestone_id,
            entry_type='frozen',
            amount=entry.amount,
            reference_note=note,
            created_by_user_id=created_by_user_id,
        )
        db.session.add(frozen)
        frozen_entries.append(frozen)
    return frozen_entries


def release_milestone_amount(project_id, milestone_id, amount, created_by_user_id=None, note='Released after approval'):
    entry = EscrowLedgerEntry(
        project_id=project_id,
        milestone_id=milestone_id,
        entry_type='released',
        amount=amount,
        reference_note=note,
        created_by_user_id=created_by_user_id,
    )
    db.session.add(entry)
    return entry