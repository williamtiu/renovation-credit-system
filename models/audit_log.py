from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(120), nullable=False)
    target_type = db.Column(db.String(80), nullable=False)
    target_id = db.Column(db.Integer)
    details_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    actor = db.relationship('User', foreign_keys=[actor_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'actor_user_id': self.actor_user_id,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details_json': self.details_json,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }