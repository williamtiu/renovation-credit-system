from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class DisputeCase(db.Model):
    __tablename__ = 'dispute_cases'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    milestone_id = db.Column(db.Integer, db.ForeignKey('project_milestones.id'))
    opened_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    against_company_id = db.Column(db.Integer, db.ForeignKey('companies.id'))
    dispute_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), nullable=False, default='open')
    resolution_summary = db.Column(db.Text)
    opened_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    resolved_at = db.Column(db.DateTime)

    milestone = db.relationship('ProjectMilestone', backref='disputes')
    opened_by = db.relationship('User', foreign_keys=[opened_by_user_id], backref='opened_disputes')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'milestone_id': self.milestone_id,
            'opened_by_user_id': self.opened_by_user_id,
            'dispute_type': self.dispute_type,
            'description': self.description,
            'status': self.status,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }