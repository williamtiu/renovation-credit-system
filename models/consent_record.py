from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class ConsentRecord(db.Model):
    __tablename__ = 'consent_records'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    consent_type = db.Column(db.String(50), nullable=False)
    granted_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    granted_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    status = db.Column(db.String(30), nullable=False, default='granted')
    notes = db.Column(db.Text)

    granted_by = db.relationship('User', foreign_keys=[granted_by_user_id])
