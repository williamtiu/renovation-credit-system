import json
from datetime import datetime, timezone

from models.database import db


def utc_now():
    return datetime.now(timezone.utc)


class SmartContractAgreement(db.Model):
    __tablename__ = 'smart_contract_agreements'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, unique=True)
    accepted_bid_id = db.Column(db.Integer, db.ForeignKey('project_bids.id'))
    customer_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    contractor_company_id = db.Column(db.Integer, db.ForeignKey('companies.id'))
    contract_code = db.Column(db.String(50), nullable=False, unique=True)
    status = db.Column(db.String(30), nullable=False, default='draft')
    budget_amount = db.Column(db.Float, nullable=False, default=0.0)
    escrow_balance = db.Column(db.Float, nullable=False, default=0.0)
    released_amount = db.Column(db.Float, nullable=False, default=0.0)
    frozen_amount = db.Column(db.Float, nullable=False, default=0.0)
    milestones_total = db.Column(db.Integer, nullable=False, default=0)
    approved_milestones = db.Column(db.Integer, nullable=False, default=0)
    dispute_count = db.Column(db.Integer, nullable=False, default=0)
    terms_json = db.Column(db.Text)
    event_log_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    activated_at = db.Column(db.DateTime)
    last_event_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    project = db.relationship('Project', backref=db.backref('smart_contract', uselist=False))
    accepted_bid = db.relationship('ProjectBid', foreign_keys=[accepted_bid_id])
    customer = db.relationship('User', foreign_keys=[customer_user_id])
    contractor_company = db.relationship('Company', foreign_keys=[contractor_company_id])

    def parsed_terms(self):
        if not self.terms_json:
            return {}
        try:
            return json.loads(self.terms_json)
        except (TypeError, ValueError):
            return {}

    def parsed_events(self):
        if not self.event_log_json:
            return []
        try:
            return json.loads(self.event_log_json)
        except (TypeError, ValueError):
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'accepted_bid_id': self.accepted_bid_id,
            'customer_user_id': self.customer_user_id,
            'contractor_company_id': self.contractor_company_id,
            'contract_code': self.contract_code,
            'status': self.status,
            'budget_amount': self.budget_amount,
            'escrow_balance': self.escrow_balance,
            'released_amount': self.released_amount,
            'frozen_amount': self.frozen_amount,
            'milestones_total': self.milestones_total,
            'approved_milestones': self.approved_milestones,
            'dispute_count': self.dispute_count,
            'terms': self.parsed_terms(),
            'events': self.parsed_events(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'activated_at': self.activated_at.isoformat() if self.activated_at else None,
            'last_event_at': self.last_event_at.isoformat() if self.last_event_at else None,
        }