from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class ProjectMilestone(db.Model):
    __tablename__ = 'project_milestones'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    sequence_no = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    planned_percentage = db.Column(db.Float)
    planned_amount = db.Column(db.Float, nullable=False, default=0.0)
    due_date = db.Column(db.Date)
    submitted_at = db.Column(db.DateTime)
    approved_at = db.Column(db.DateTime)
    status = db.Column(db.String(30), nullable=False, default='planned')
    evidence_notes = db.Column(db.Text)
    submitted_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    submitted_by = db.relationship('User', foreign_keys=[submitted_by_user_id])
    reviewed_by = db.relationship('User', foreign_keys=[reviewed_by_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'sequence_no': self.sequence_no,
            'name': self.name,
            'planned_percentage': self.planned_percentage,
            'planned_amount': self.planned_amount,
            'status': self.status,
            'evidence_notes': self.evidence_notes,
        }