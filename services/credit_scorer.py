"""
"""

from datetime import datetime, timezone, timedelta
from models.credit_score import CreditScore
import json

class CreditScorer:
    """Documnetation translated"""
    
    CREDIT_GRADES = {
        (751, 1000): 'AAA',
        (701, 750): 'AA',
        (651, 700): 'A',
        (601, 650): 'BBB',
        (551, 600): 'BB',
        (501, 550): 'B',
        (0, 500): 'C'
    }
    
    INTEREST_RATES = {
        'AAA': 3.5,
        'AA': 4.0,
        'A': 4.5,
        'BBB': 5.5,
        'BB': 6.5,
        'B': 8.0,
        'C': 10.0
    }
    
    LOAN_MULTIPLIERS = {
        'AAA': 2.0,
        'AA': 1.8,
        'A': 1.5,
        'BBB': 1.2,
        'BB': 0.8,
        'B': 0.5,
        'C': 0.2
    }
    
    def __init__(self):
        pass
    
    def calculate_score(self, company):
        """
        
        
        """
        
        financial_score = self._score_financial_strength(company)
        
        operational_score = self._score_operational_stability(company)
        
        credit_history_score = self._score_credit_history(company)
        
        qualification_score = self._score_qualifications(company)
        
        industry_risk_score = self._score_industry_risk(company)
        
        total_score = (
            financial_score +
            operational_score +
            credit_history_score +
            qualification_score +
            industry_risk_score
        )
        
        total_score = max(0, min(1000, total_score))
        
        credit_grade = self._get_credit_grade(total_score)
        
        risk_level = self._get_risk_level(total_score)
        
        recommended_limit = self._calculate_loan_limit(company, credit_grade)
        recommended_rate = self.INTEREST_RATES.get(credit_grade, 8.0)
        
        risk_factors = self._identify_risk_factors(company)
        
        return {
            'total_score': total_score,
            'credit_grade': credit_grade,
            'risk_level': risk_level,
            'financial_score': financial_score,
            'operational_score': operational_score,
            'credit_history_score': credit_history_score,
            'qualification_score': qualification_score,
            'industry_risk_score': industry_risk_score,
            'recommended_loan_limit': recommended_limit,
            'recommended_interest_rate': recommended_rate,
            'risk_factors': risk_factors
        }
    
    def _score_financial_strength(self, company):
        """Documnetation translated"""
        score = 0
        
        if company.registered_capital:
            if company.registered_capital >= 10000000:
                score += 150
            elif company.registered_capital >= 5000000:
                score += 120
            elif company.registered_capital >= 1000000:
                score += 90
            elif company.registered_capital >= 500000:
                score += 60
            else:
                score += 30
        
        if company.annual_revenue:
            if company.annual_revenue >= 50000000:
                score += 150
            elif company.annual_revenue >= 20000000:
                score += 120
            elif company.annual_revenue >= 10000000:
                score += 90
            elif company.annual_revenue >= 5000000:
                score += 60
            else:
                score += 30
        
        return score
    
    def _score_operational_stability(self, company):
        """Documnetation translated"""
        score = 0
        
        if company.established_date:
            established = company.established_date
            if isinstance(established, datetime):
                established = established.date()
            today = datetime.now(timezone.utc).date()
            years = (today - established).days / 365
            if years >= 10:
                score += 100
            elif years >= 5:
                score += 80
            elif years >= 3:
                score += 60
            elif years >= 1:
                score += 40
            else:
                score += 20
        
        if company.project_count_completed:
            if company.project_count_completed >= 100:
                score += 100
            elif company.project_count_completed >= 50:
                score += 80
            elif company.project_count_completed >= 20:
                score += 60
            elif company.project_count_completed >= 10:
                score += 40
            else:
                score += 20
        
        if company.employee_count:
            if company.employee_count >= 50:
                score += 50
            elif company.employee_count >= 20:
                score += 40
            elif company.employee_count >= 10:
                score += 30
            else:
                score += 20
        
        return score
    
    def _score_credit_history(self, company):
        """Documnetation translated"""
        score = 0
        
        repayment_map = {
            'excellent': 150,
            'good': 120,
            'Good': 120,
            'fair': 80,
            'Fair': 80,
            'poor': 40,
            'Poor': 40
        }
        score += repayment_map.get(company.loan_repayment_history, 80)
        
        if company.bank_account_years:
            if company.bank_account_years >= 5:
                score += 50
            elif company.bank_account_years >= 3:
                score += 40
            elif company.bank_account_years >= 1:
                score += 30
            else:
                score += 20
        
        if company.existing_loans and company.annual_revenue and company.annual_revenue > 0:
            debt_ratio = company.existing_loans / company.annual_revenue
            if debt_ratio < 0.3:
                score += 50
            elif debt_ratio < 0.5:
                score += 40
            elif debt_ratio < 0.7:
                score += 30
            else:
                score += 10
        else:
            score += 40
        
        return score
    
    def _score_qualifications(self, company):
        """Documnetation translated"""
        score = 0
        
        if company.has_license:
            score += 60
        
        if company.iso_certified:
            score += 25
        
        if company.professional_memberships:
            score += 15
        
        return score
    
    def _score_industry_risk(self, company):
        """Documnetation translated"""
        score = 50
        
        high_risk_districts = [' Text High Risk Text ']
        if company.district in high_risk_districts:
            score -= 20
        else:
            score += 20
        
        high_value_services = ['Commercial Renovation', 'Large Scale Projects']
        if company.main_service_type in high_value_services:
            score += 15
        else:
            score += 10
        
        if company.status == 'active':
            score += 15
        elif company.status == 'suspended':
            score -= 30
        elif company.status == 'blacklisted':
            score -= 50
        
        return max(0, min(100, score))
    
    def _get_credit_grade(self, score):
        """Documnetation translated"""
        for (min_score, max_score), grade in self.CREDIT_GRADES.items():
            if min_score <= score <= max_score:
                return grade
        return 'C'
    
    def _get_risk_level(self, score):
        """Documnetation translated"""
        if score >= 700:
            return 'low'
        elif score >= 550:
            return 'medium'
        else:
            return 'high'
    
    def _calculate_loan_limit(self, company, credit_grade):
        """Documnetation translated"""
        multiplier = self.LOAN_MULTIPLIERS.get(credit_grade, 0.5)
        
        if company.annual_revenue:
            return company.annual_revenue * multiplier
        elif company.registered_capital:
            return company.registered_capital * multiplier * 0.5
        else:
            return 0
    
    def _identify_risk_factors(self, company):
        """Documnetation translated"""
        risk_factors = []
        
        if not company.has_license:
            risk_factors.append(' Text ')
        
        if company.established_date:
            established = company.established_date
            if isinstance(established, datetime):
                established = established.date()
            today = datetime.now(timezone.utc).date()
            years = (today - established).days / 365
            if years < 2:
                risk_factors.append(' Text ')
        
        if company.existing_loans and company.annual_revenue and company.annual_revenue > 0:
            debt_ratio = company.existing_loans / company.annual_revenue
            if debt_ratio > 0.7:
                risk_factors.append(' Text High')
        
        if company.loan_repayment_history in ['poor', 'Poor']:
            risk_factors.append(' Text ')
        
        if not company.annual_revenue or company.annual_revenue < 1000000:
            risk_factors.append(' Text Low')
        
        if company.status != 'active':
            risk_factors.append(f' Text Status Text ：{company.status}')
        
        return risk_factors
    
    def save_score(self, company, scoring_result, notes=None):
        """Documnetation translated"""
        credit_score = CreditScore(
            company_id=company.id,
            credit_score=scoring_result['total_score'],
            credit_grade=scoring_result['credit_grade'],
            financial_strength_score=scoring_result['financial_score'],
            operational_stability_score=scoring_result['operational_score'],
            credit_history_score=scoring_result['credit_history_score'],
            qualification_score=scoring_result['qualification_score'],
            industry_risk_score=scoring_result['industry_risk_score'],
            risk_level=scoring_result['risk_level'],
            risk_factors=json.dumps(scoring_result['risk_factors'], ensure_ascii=False),
            recommended_loan_limit=scoring_result['recommended_loan_limit'],
            recommended_interest_rate=scoring_result['recommended_interest_rate'],
            expires_at=datetime.now(timezone.utc) + timedelta(days=180),
            notes=notes
        )
        
        return credit_score
