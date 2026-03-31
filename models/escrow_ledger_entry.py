from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class EscrowLedgerEntry(db.Model):
    __tablename__ = 'escrow_ledger_entries'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    milestone_id = db.Column(db.Integer, db.ForeignKey('project_milestones.id'))
    entry_type = db.Column(db.String(30), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='HKD')
    status = db.Column(db.String(30), nullable=False, default='active')
    reference_note = db.Column(db.String(255))
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    milestone = db.relationship('ProjectMilestone', backref='ledger_entries')
    created_by = db.relationship('User', foreign_keys=[created_by_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'milestone_id': self.milestone_id,
            'entry_type': self.entry_type,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'reference_note': self.reference_note,
        }