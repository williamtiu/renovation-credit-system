"""
"""

from models.database import db
from datetime import datetime, timezone

def utc_now():
    """Documnetation translated"""
    return datetime.now(timezone.utc)

class CreditScore(db.Model):
    """新的4大维度评分模型"""
    
    __tablename__ = 'credit_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # 新的4大维度评分
    financial_score = db.Column(db.Integer)  # 财务实力 (0-600)
    operational_score = db.Column(db.Integer)  # 运营稳定 (0-250)
    qualification_score = db.Column(db.Integer)  # 资质认证 (0-200)
    customer_review_score = db.Column(db.Integer)  # 客户评价 (0-300)
    
    credit_score = db.Column(db.Integer)  # 总分 (0-1000)
    credit_grade = db.Column(db.String(5))  # AAA, AA, A, BBB, BB, B, C
    
    risk_level = db.Column(db.String(20))  # low, medium, high
    risk_factors = db.Column(db.Text)
    
    recommended_loan_limit = db.Column(db.Float)
    recommended_interest_rate = db.Column(db.Float)
    
    scoring_model_version = db.Column(db.String(20), default='v2.0')
    
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
            'financial_score': self.financial_score,
            'operational_score': self.operational_score,
            'qualification_score': self.qualification_score,
            'customer_review_score': self.customer_review_score,
            'risk_level': self.risk_level,
            'risk_factors': self.risk_factors,
            'recommended_loan_limit': self.recommended_loan_limit,
            'recommended_interest_rate': self.recommended_interest_rate,
            'scoring_model_version': self.scoring_model_version,
            'scored_at': self.scored_at.isoformat() if self.scored_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
