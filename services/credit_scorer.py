from datetime import datetime, timezone, timedelta
from models.credit_score import CreditScore
import json

class CreditScorer:
    """
    Scoring Engine Design
    - Financial Strength - Max 400 (40%)
    - Operational Stability - Max 250 (25%)
    - Qualifications and Compliance - Max 200 (20%)
    - Customer and Social Reputation - Max 150 (15%)
    """
    
    CREDIT_GRADES = {
        (900, 1000): 'AAA',
        (800, 899): 'AA',
        (700, 799): 'A',
        (600, 699): 'BBB',
        (500, 599): 'BB',
        (400, 499): 'B',
        (0, 399): 'C'
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

    def save_score(self, company, score_data, notes=None):
        if score_data.get('status') != 'Validated':
            raise Exception(f"Cannot save unvalidated score: {score_data.get('missing_items')}")
        cs = CreditScore(
            company_id=company.id,
            financial_score=score_data.get('financial_score', 0),
            operational_score=score_data.get('operational_score', 0),
            qualification_score=score_data.get('qualification_score', 0),
            customer_review_score=score_data.get('customer_review_score', 0),
            credit_score=score_data.get('total_score', 0),
            credit_grade=score_data.get('credit_grade', ''),
            risk_level=score_data.get('risk_level', ''),
            risk_factors=json.dumps(score_data.get('risk_factors', [])),
            recommended_loan_limit=score_data.get('recommended_loan_limit', 0),
            recommended_interest_rate=score_data.get('recommended_interest_rate', 0),
            notes=notes
        )
        return cs

    def calculate_score(self, company):
        """
        Calculate score based on the 4 dimensions.
        """
        missing_items = []

        # Check mandatory qualifications
        if not company.business_registration:
            missing_items.append('Business Registration is required')
        if not company.minor_works_contractor_registration or not getattr(company, 'minor_works_registration_verified', False):
            missing_items.append('Minor Works Contractor Registration is required and must be verified')

        # 1. Financial Strength (Max 400)
        # If financials are missing, it cannot be computed
        if not company.audited_financials_uploaded:
            fin_missing = ['Audited Financials are required for Financial Strength dimension']
            financial_score = 'Incomplete'
        else:
            fin_missing = []
            financial_score = self._score_financial_strength(company)
            
        if fin_missing:
            missing_items.extend(fin_missing)

        # 2. Operational Stability (Max 250)
        operational_score = self._score_operational_stability(company)

        # 3. Qualifications and Compliance (Max 200)
        qualification_score = self._score_qualifications(company)

        # 4. Customer and Social Reputation (Max 150)
        customer_review_score = self._score_customer_reviews(company)

        if missing_items:
            # If audited financials are missing or mandatory checks fail
            return {
                'total_score': None,
                'credit_grade': 'Incomplete',
                'risk_level': 'High',
                'financial_score': 'Incomplete' if fin_missing else financial_score,
                'operational_score': operational_score,
                'qualification_score': qualification_score,
                'customer_review_score': customer_review_score,
                'recommended_loan_limit': 0,
                'recommended_interest_rate': None,
                'status': 'Not fully validated',
                'missing_items': missing_items,
                'risk_factors': self._identify_risk_factors(company)
            }

        # Compute total score
        total_score = (
            financial_score +
            operational_score +
            qualification_score +
            customer_review_score
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
            'qualification_score': qualification_score,
            'customer_review_score': customer_review_score,
            'recommended_loan_limit': recommended_limit,
            'recommended_interest_rate': recommended_rate,
            'risk_factors': risk_factors,
            'status': 'Validated',
            'missing_items': []
        }

    def _score_financial_strength(self, company):
        """
        Financial Strength (0-400)
        F_raw = (0-500)
        F = (F_raw / 500) * 400
        """
        raw_score = 0

        # 1. Registered Capital (0-100)
        cap = company.registered_capital or 0
        if cap >= 5000000:
            raw_score += 100
        elif cap >= 2500000:
            raw_score += 80
        elif cap >= 500000:
            raw_score += 60
        else:
            raw_score += 40

        # 2. Annual Revenue (0-100)
        rev = company.annual_revenue or 0
        if rev >= 5000000:
            raw_score += 100
        elif rev >= 2500000:
            raw_score += 80
        elif rev >= 1000000:
            raw_score += 60
        elif rev >= 500000:
            raw_score += 40
        elif rev >= 100000:
            raw_score += 30
        elif rev >= 10000:
            raw_score += 20
        else:
            raw_score += 10

        # 3. Current Ratio (0-100)
        current_ratio = getattr(company, "manual_current_ratio", None)
        if current_ratio is None and getattr(company, "current_assets", None) and getattr(company, "current_liabilities", None) and company.current_liabilities > 0:
            current_ratio = company.current_assets / company.current_liabilities

        if current_ratio is not None:
            if current_ratio > 1.6:
                raw_score += 100
            elif current_ratio >= 1.1:
                raw_score += 70
            else:
                raw_score += 40
        else:
            raw_score += 40

        # 4. Cash Ratio (0-100)
        cash_ratio = getattr(company, "manual_cash_ratio", None)
        if cash_ratio is None and getattr(company, "total_cash", None) and getattr(company, "total_liabilities", None) and company.total_liabilities > 0:
            cash_ratio = company.total_cash / company.total_liabilities

        if cash_ratio is not None:
            if cash_ratio > 1.6:
                raw_score += 100
            elif cash_ratio >= 1.1:
                raw_score += 70
            else:
                raw_score += 40
        else:
            raw_score += 40

        # 5. Debt to Equity (0-100)
        de_ratio = getattr(company, "manual_debt_to_equity_ratio", None)
        if de_ratio is None and getattr(company, "total_liabilities", None) and getattr(company, "shareholders_equity", None) and company.shareholders_equity > 0:
            de_ratio = company.total_liabilities / company.shareholders_equity

        if de_ratio is not None:
            if de_ratio < 1:
                raw_score += 100
            elif de_ratio <= 2:
                raw_score += 70
            else:
                raw_score += 40
        else:
            raw_score += 40

        # Final mapped score (0-400 scale)
        final_score = int((raw_score / 500.0) * 400)
        return final_score

    def _score_operational_stability(self, company):
        """
        Operational Stability (0-250)
        """
        score = 0

        # Years of operation (0-100)
        if company.established_date:
            established = company.established_date
            if isinstance(established, datetime):
                established = established.date()
            today = datetime.now(timezone.utc).date()
            years = (today - established).days / 365
            if years >= 10:
                score += 100
            elif years >= 5:
                score += 60
            elif years >= 1:
                score += 40
            else:
                score += 0
        
        # Completed projects (0-100)
        proj = company.project_count_completed or 0
        if proj >= 100:
            score += 100
        elif proj >= 50:
            score += 80
        elif proj >= 10:
            score += 60
        else:
            score += 30

        # Employee count (0-50)
        emp = company.employee_count or 0
        if emp >= 50:
            score += 50
        elif emp >= 20:
            score += 30
        elif emp >= 5:
            score += 20
        else:
            score += 0

        return score

    def _score_qualifications(self, company):
        """
        Qualifications and Compliance (0-200)
        """
        score = 0

        if company.insurance_documents_uploaded and getattr(company, 'insurance_verified', False): 
            score += 80

        if company.osh_safety_officer_license and getattr(company, 'osh_safety_officer_verified', False):
            score += 80

        # Additional certifications proxy
        if company.esg_policy_level in ['basic', 'advanced']:
            score += 40

        return score

    def _score_customer_reviews(self, company):
        """
        Customer and Social Reputation (0-150)
        """
        rating_score = 0

        avg_rating = getattr(company, 'average_rating', None) or 0
        if avg_rating >= 4.5:
            rating_score = 100
        elif avg_rating >= 4.0:
            rating_score = 80
        elif avg_rating >= 3.0:
            rating_score = 60
        elif avg_rating >= 1.0:
            rating_score = 30
        else:
            rating_score = 0

        sub_score = self._subjective_assessment(company)

        return min(150, rating_score + sub_score)

    def _subjective_assessment(self, company):
        """
        DecoFinance subjective assessment (0-50)
        """
        score = 25

        if company.status == 'active':
            score += 10
        elif company.status == 'suspended':
            score -= 15
        elif company.status == 'blacklisted':
            score -= 25

        if company.main_service_type in ['Commercial Renovation', 'Large Scale Projects']:
            score += 10

        green_ratio = getattr(company, 'green_material_ratio', None)
        if green_ratio is not None:
            if green_ratio >= 40:
                score += 5

        return max(0, min(50, score))

    def _get_credit_grade(self, score):
        for score_range, grade in self.CREDIT_GRADES.items():
            if score_range[0] <= score <= score_range[1]:
                return grade
        return 'C'

    def _get_risk_level(self, score):
        if score >= 800:
            return 'Low'
        elif score >= 600:
            return 'Medium'
        else:
            return 'High'

    def _calculate_loan_limit(self, company, grade):
        if grade in ['C', 'Incomplete']:
            return 0
        base_limit = 1000000
        if company.registered_capital:
            base_limit = max(base_limit, company.registered_capital * 0.5)
        multiplier = self.LOAN_MULTIPLIERS.get(grade, 0)
        return int(base_limit * multiplier)
        
    def _identify_risk_factors(self, company):
        factors = []
        if company.status in ['suspended', 'blacklisted']:
            factors.append('Company status is not active')
        if not company.audited_financials_uploaded:
            factors.append('Missing audited financials')
        return factors