from datetime import datetime, timezone, timedelta
from models.credit_score import CreditScore
import json

class CreditScorer:
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
        financial_score = self._score_financial_strength(company)
        operational_score = self._score_operational_stability(company)
        credit_history_score = self._score_credit_history(company)
        qualification_score = self._score_qualifications(company)
        industry_risk_score = self._score_industry_risk(company)
        compliance_adjustment = self._score_compliance_adjustment(company)
        
        total_score = (
            financial_score +
            operational_score +
            credit_history_score +
            qualification_score +
            industry_risk_score +
            compliance_adjustment
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
            'compliance_adjustment': compliance_adjustment,
            'recommended_loan_limit': recommended_limit,
            'recommended_interest_rate': recommended_rate,
            'risk_factors': risk_factors
        }
    
    def _score_financial_strength(self, company):
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
        score = 0
        
        if company.has_license:
            score += 60
        
        if company.iso_certified:
            score += 25
        
        if company.professional_memberships:
            score += 15

        if getattr(company, 'insurance_verification_status', None) == 'verified':
            score += 15
        
        return score
    
    def _score_industry_risk(self, company):
        score = 50
        
        high_risk_districts = ['Remote Area', 'Unknown']
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

    def _score_compliance_adjustment(self, company):
        adjustment = 0

        if getattr(company, 'licence_verification_status', None) == 'verified':
            adjustment += 30
        elif getattr(company, 'licence_verification_status', None) == 'rejected':
            adjustment -= 40

        if getattr(company, 'insurance_verification_status', None) == 'verified':
            adjustment += 20
        elif getattr(company, 'insurance_verification_status', None) == 'rejected':
            adjustment -= 20

        if getattr(company, 'dispute_count_cached', 0) > 0:
            adjustment -= min(40, company.dispute_count_cached * 10)

        if getattr(company, 'osh_policy_in_place', False):
            adjustment += 20
        else:
            adjustment -= 15

        training_coverage = getattr(company, 'safety_training_coverage', None)
        if training_coverage is not None:
            if training_coverage >= 90:
                adjustment += 20
            elif training_coverage >= 80:
                adjustment += 10
            elif training_coverage < 60:
                adjustment -= 20
            else:
                adjustment -= 5

        if getattr(company, 'heavy_lifting_compliance', False):
            adjustment += 10
        else:
            adjustment -= 10

        if getattr(company, 'lifting_equipment_available', False):
            adjustment += 5
        else:
            adjustment -= 5

        safety_incident_count = getattr(company, 'safety_incident_count', 0) or 0
        if safety_incident_count > 0:
            adjustment -= min(30, safety_incident_count * 10)

        esg_policy_level = (getattr(company, 'esg_policy_level', None) or 'none').lower()
        if esg_policy_level == 'advanced':
            adjustment += 15
        elif esg_policy_level == 'basic':
            adjustment += 8
        else:
            adjustment -= 5

        green_material_ratio = getattr(company, 'green_material_ratio', None)
        if green_material_ratio is not None:
            if green_material_ratio >= 40:
                adjustment += 10
            elif green_material_ratio >= 20:
                adjustment += 5

        return adjustment
    
    def _get_credit_grade(self, score):
        for (min_score, max_score), grade in self.CREDIT_GRADES.items():
            if min_score <= score <= max_score:
                return grade
        return 'C'
    
    def _get_risk_level(self, score):
        if score >= 700:
            return 'low'
        elif score >= 550:
            return 'medium'
        else:
            return 'high'
    
    def _calculate_loan_limit(self, company, credit_grade):
        multiplier = self.LOAN_MULTIPLIERS.get(credit_grade, 0.5)
        
        if company.annual_revenue:
            return company.annual_revenue * multiplier
        elif company.registered_capital:
            return company.registered_capital * multiplier * 0.5
        else:
            return 0
    
    def _identify_risk_factors(self, company):
        risk_factors = []
        
        if not company.has_license:
            risk_factors.append('Missing contractor licence information')
        
        if company.established_date:
            established = company.established_date
            if isinstance(established, datetime):
                established = established.date()
            today = datetime.now(timezone.utc).date()
            years = (today - established).days / 365
            if years < 2:
                risk_factors.append('Short operating history')
        
        if company.existing_loans and company.annual_revenue and company.annual_revenue > 0:
            debt_ratio = company.existing_loans / company.annual_revenue
            if debt_ratio > 0.7:
                risk_factors.append('High debt-to-revenue ratio')
        
        if company.loan_repayment_history in ['poor', 'Poor']:
            risk_factors.append('Poor loan repayment history')
        
        if not company.annual_revenue or company.annual_revenue < 1000000:
            risk_factors.append('Low annual revenue')

        if getattr(company, 'licence_verification_status', None) != 'verified':
            risk_factors.append('Licence verification incomplete')

        if getattr(company, 'insurance_verification_status', None) != 'verified':
            risk_factors.append('Insurance verification incomplete')

        if not getattr(company, 'osh_policy_in_place', False):
            risk_factors.append('OSH policy evidence missing')

        training_coverage = getattr(company, 'safety_training_coverage', None)
        if training_coverage is None:
            risk_factors.append('Safety training coverage not disclosed')
        elif training_coverage < 80:
            risk_factors.append(f'Safety training coverage below target ({training_coverage}%)')

        if not getattr(company, 'heavy_lifting_compliance', False):
            risk_factors.append('16kg handling control not confirmed')

        if not getattr(company, 'lifting_equipment_available', False):
            risk_factors.append('Lifting equipment availability not confirmed')

        safety_incident_count = getattr(company, 'safety_incident_count', 0) or 0
        if safety_incident_count > 0:
            risk_factors.append(f'{safety_incident_count} safety incident(s) recorded in the last 12 months')

        esg_policy_level = (getattr(company, 'esg_policy_level', None) or 'none').lower()
        if esg_policy_level == 'none':
            risk_factors.append('ESG governance framework not declared')

        green_material_ratio = getattr(company, 'green_material_ratio', None)
        if green_material_ratio is not None and green_material_ratio < 20:
            risk_factors.append(f'Green material adoption remains low ({green_material_ratio}%)')

        if getattr(company, 'dispute_count_cached', 0) > 0:
            risk_factors.append(f'Open dispute history count: {company.dispute_count_cached}')
        
        if company.status != 'active':
            risk_factors.append(f'Company status is {company.status}')
        
        return risk_factors
    
    def save_score(self, company, scoring_result, notes=None):
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
            scoring_model_version='v1.1-decofinance',
            expires_at=datetime.now(timezone.utc) + timedelta(days=180),
            notes=notes
        )
        
        return credit_score
