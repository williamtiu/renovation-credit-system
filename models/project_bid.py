from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class ProjectBid(db.Model):
    __tablename__ = 'project_bids'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    submitted_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    bid_amount = db.Column(db.Float, nullable=False)
    proposed_duration_days = db.Column(db.Integer)
    proposal_summary = db.Column(db.Text)
    notes = db.Column(db.Text)
    status = db.Column(db.String(30), nullable=False, default='submitted')
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    submitted_by = db.relationship('User', foreign_keys=[submitted_by_user_id], backref='submitted_bids')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'company_id': self.company_id,
            'bid_amount': self.bid_amount,
            'proposed_duration_days': self.proposed_duration_days,
            'proposal_summary': self.proposal_summary,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }