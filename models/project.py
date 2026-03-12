from models.database import db
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    customer_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    property_type = db.Column(db.String(100))
    property_address = db.Column(db.String(300))
    district = db.Column(db.String(50))
    budget_amount = db.Column(db.Float, nullable=False, default=0.0)
    target_start_date = db.Column(db.Date)
    target_end_date = db.Column(db.Date)
    status = db.Column(db.String(30), nullable=False, default='draft')
    accepted_bid_id = db.Column(db.Integer, db.ForeignKey('project_bids.id', use_alter=True, name='fk_projects_accepted_bid_id'))
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    customer = db.relationship('User', foreign_keys=[customer_user_id], backref='projects')
    bids = db.relationship('ProjectBid', foreign_keys='ProjectBid.project_id', backref='project', lazy=True)
    milestones = db.relationship('ProjectMilestone', backref='project', lazy=True, order_by='ProjectMilestone.sequence_no')
    ledger_entries = db.relationship('EscrowLedgerEntry', backref='project', lazy=True)
    disputes = db.relationship('DisputeCase', backref='project', lazy=True)
    loans = db.relationship('LoanApplication', backref='project', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_user_id': self.customer_user_id,
            'title': self.title,
            'description': self.description,
            'property_type': self.property_type,
            'property_address': self.property_address,
            'district': self.district,
            'budget_amount': self.budget_amount,
            'status': self.status,
            'accepted_bid_id': self.accepted_bid_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }