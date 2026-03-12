"""
"""

from models.database import db
from datetime import datetime, timezone

def utc_now():
    """Documnetation translated"""
    return datetime.now(timezone.utc)

class CreditScore(db.Model):
    """Documnetation translated"""
    
    __tablename__ = 'credit_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    credit_score = db.Column(db.Integer)
    credit_grade = db.Column(db.String(5))
    
    financial_strength_score = db.Column(db.Integer)
    registered_capital_score = db.Column(db.Integer)
    revenue_score = db.Column(db.Integer)
    
    operational_stability_score = db.Column(db.Integer)
    years_in_business_score = db.Column(db.Integer)
    project_completion_score = db.Column(db.Integer)
    
    credit_history_score = db.Column(db.Integer)
    repayment_history_score = db.Column(db.Integer)
    existing_debt_score = db.Column(db.Integer)
    
    qualification_score = db.Column(db.Integer)
    license_score = db.Column(db.Integer)
    certification_score = db.Column(db.Integer)
    
    industry_risk_score = db.Column(db.Integer)
    district_risk_score = db.Column(db.Integer)
    
    risk_level = db.Column(db.String(20))  # low, medium, high
    risk_factors = db.Column(db.Text)
    
    recommended_loan_limit = db.Column(db.Float)
    recommended_interest_rate = db.Column(db.Float)
    
    scoring_model_version = db.Column(db.String(20), default='v1.0')
    
    scored_at = db.Column(db.DateTime, default=utc_now)
    expires_at = db.Column(db.DateTime)
    
    notes = db.Column(db.Text)
    
    def __repr__(self):
        return f'<CreditScore {self.company_id}: {self.credit_score}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'credit_score': self.credit_score,
            'trust_score': self.credit_score,
            'credit_grade': self.credit_grade,
            'financial_strength_score': self.financial_strength_score,
            'operational_stability_score': self.operational_stability_score,
            'credit_history_score': self.credit_history_score,
            'qualification_score': self.qualification_score,
            'industry_risk_score': self.industry_risk_score,
            'risk_level': self.risk_level,
            'risk_factors': self.risk_factors,
            'recommended_loan_limit': self.recommended_loan_limit,
            'recommended_interest_rate': self.recommended_interest_rate,
            'scored_at': self.scored_at.isoformat() if self.scored_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
