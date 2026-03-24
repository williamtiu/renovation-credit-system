from datetime import datetime, timezone, timedelta
from models.credit_score import CreditScore
import json

class CreditScorer:
    """
    新的4大维度信托评分体系
    - 财务实力 (Financial Strength) - 最高 600 分
    - 运营稳定性 (Operational Stability) - 最高 250 分
    - 资质与认证 (Qualifications) - 最高 200 分
    - 客户评价 (Customer Reviews) - 最高 300 分
    """
    
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
        计算新的4大维度评分
        """
        # 1. 财务实力评分 (最高 600 分)
        financial_score = self._score_financial_strength(company)
        
        # 2. 运营稳定性评分 (最高 250 分)
        operational_score = self._score_operational_stability(company)
        
        # 3. 资质与认证评分 (最高 200 分)
        qualification_score = self._score_qualifications(company)
        
        # 4. 客户评价评分 (最高 300 分)
        customer_review_score = self._score_customer_reviews(company)
        
        # 计算总分
        total_score = (
            financial_score +
            operational_score +
            qualification_score +
            customer_review_score
        )
        
        # 限制在 0-1000 之间
        total_score = max(0, min(1000, total_score))
        
        # 获取信用等级
        credit_grade = self._get_credit_grade(total_score)
        
        # 获取风险等级
        risk_level = self._get_risk_level(total_score)
        
        # 计算推荐贷款额度
        recommended_limit = self._calculate_loan_limit(company, credit_grade)
        
        # 获取推荐利率
        recommended_rate = self.INTEREST_RATES.get(credit_grade, 8.0)
        
        # 识别风险因素
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
            'risk_factors': risk_factors
        }
    
    def _score_financial_strength(self, company):
        """
        财务实力评分 (最高 600 分)
        
        包含5个指标：
        1. 注册资本 (30-150 分)
        2. 年营收 (30-150 分)
        3. 流动比率 (30-150 分)
        4. 现金比率 (30-150 分)
        5. 债务权益比 (30-150 分)
        """
        score = 0
        
        # 1. 注册资本 (30-150 分)
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
        else:
            score += 30
        
        # 2. 年营收 (30-150 分)
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
        else:
            score += 30
        
        # 3. 流动比率 (30-150 分)
        if company.current_assets and company.current_liabilities and company.current_liabilities > 0:
            current_ratio = company.current_assets / company.current_liabilities
            if current_ratio > 1.6:
                score += 150
            elif current_ratio >= 1.1:
                score += 100
            else:
                score += 50
        else:
            score += 50
        
        # 4. 现金比率 (30-150 分)
        if company.total_cash and company.total_liabilities and company.total_liabilities > 0:
            cash_ratio = company.total_cash / company.total_liabilities
            if cash_ratio > 1.6:
                score += 150
            elif cash_ratio >= 1.1:
                score += 100
            else:
                score += 50
        else:
            score += 50
        
        # 5. 债务权益比 (30-150 分)
        if company.total_liabilities and company.shareholders_equity and company.shareholders_equity > 0:
            debt_to_equity = company.total_liabilities / company.shareholders_equity
            if debt_to_equity < 1:
                score += 150
            elif debt_to_equity <= 2:
                score += 100
            else:
                score += 50
        else:
            score += 50
        
        return score
    
    def _score_operational_stability(self, company):
        """
        运营稳定性评分 (最高 250 分)
        
        包含3个指标：
        1. 成立年限 (20-100 分)
        2. 完成项目数 (20-100 分)
        3. 员工人数 (20-50 分)
        """
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
        else:
            score += 20
        
        return score
    
    def _score_qualifications(self, company):
        """
        资质与认证评分 (最高 200 分)
        
        包含3个必须项和2个加分项：
        1. Business Registration and Company Registration (必须) - 50 分
        2. Minor Works Contractor Registration (必须) - 50 分
        3. Insurance Status (上传+验证) - 50 分
        4. OSH Safety Officer (有合格人员) - 50 分
        5. ISO Certification (加分) - 0-50 分
        """
        score = 0
        
        if company.business_registration:
            score += 50
        
        if company.minor_works_contractor_registration and company.minor_works_registration_verified:
            score += 50
        elif company.minor_works_contractor_registration:
            score += 25
        
        if company.insurance_documents_uploaded and company.insurance_verified:
            score += 50
        elif company.insurance_documents_uploaded:
            score += 25
        
        if company.osh_safety_officer_license and company.osh_safety_officer_verified:
            score += 50
        elif company.osh_safety_officer_license:
            score += 25
        
        if company.iso_certified:
            score += 50
        
        return score
    
    def _score_customer_reviews(self, company):
        """
        客户评价评分 (最高 300 分)
        
        包含2个部分：
        1. 客户评分平均值 (1-5分) - 30-150 分
        2. DecoFinance 主观评估 - 0-150 分
        """
        score = 0
        
        avg_rating = getattr(company, 'average_rating', None)
        if avg_rating is not None:
            rating_score = 30 + (avg_rating - 1) * 30
            score += rating_score
        else:
            score += 30
        
        subjective_score = self._subjective_assessment(company)
        score += subjective_score
        
        return score
    
    def _subjective_assessment(self, company):
        """
        DecoFinance 主观评估 (0-150 分)
        """
        score = 50
        
        if company.status == 'active':
            score += 20
        elif company.status == 'suspended':
            score -= 30
        elif company.status == 'blacklisted':
            score -= 50
        
        if company.district in ['Remote Area', 'Unknown']:
            score -= 20
        else:
            score += 20
        
        if company.main_service_type in ['Commercial Renovation', 'Large Scale Projects']:
            score += 15
        else:
            score += 10
        
        if company.audited_financials_uploaded:
            score += 20
        
        if company.tax_returns_uploaded:
            score += 20
        
        if company.professional_memberships:
            score += 15
        
        green_ratio = getattr(company, 'green_material_ratio', None)
        if green_ratio is not None:
            if green_ratio >= 40:
                score += 20
            elif green_ratio >= 20:
                score += 10
        
        return max(0, min(150, score))
    
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
        
        if not company.registered_capital:
            risk_factors.append('Missing registered capital information')
        
        if not company.annual_revenue:
            risk_factors.append('Missing annual revenue information')
        
        if company.current_assets and company.current_liabilities and company.current_liabilities > 0:
            current_ratio = company.current_assets / company.current_liabilities
            if current_ratio < 1.1:
                risk_factors.append(f'Current ratio too low ({current_ratio:.2f})')
        
        if company.total_cash and company.total_liabilities and company.total_liabilities > 0:
            cash_ratio = company.total_cash / company.total_liabilities
            if cash_ratio < 1.1:
                risk_factors.append(f'Cash ratio too low ({cash_ratio:.2f})')
        
        if company.total_liabilities and company.shareholders_equity and company.shareholders_equity > 0:
            debt_to_equity = company.total_liabilities / company.shareholders_equity
            if debt_to_equity > 2:
                risk_factors.append(f'Debt to equity ratio too high ({debt_to_equity:.2f})')
        
        if company.established_date:
            established = company.established_date
            if isinstance(established, datetime):
                established = established.date()
            today = datetime.now(timezone.utc).date()
            years = (today - established).days / 365
            if years < 2:
                risk_factors.append('Short operating history')
        
        if not company.project_count_completed or company.project_count_completed < 10:
            risk_factors.append('Limited project completion history')
        
        if not company.employee_count or company.employee_count < 10:
            risk_factors.append('Small employee base')
        
        if not company.business_registration:
            risk_factors.append('Missing business registration')
        
        if not company.minor_works_contractor_registration:
            risk_factors.append('Missing minor works contractor registration')
        elif not company.minor_works_registration_verified:
            risk_factors.append('Minor works registration not verified')
        
        if not company.insurance_documents_uploaded:
            risk_factors.append('Insurance documents not uploaded')
        elif not company.insurance_verified:
            risk_factors.append('Insurance not verified')
        
        if not company.osh_safety_officer_license:
            risk_factors.append('Missing OSH safety officer information')
        elif not company.osh_safety_officer_verified:
            risk_factors.append('OSH safety officer not verified')
        
        avg_rating = getattr(company, 'average_rating', None)
        if avg_rating is not None and avg_rating < 3:
            risk_factors.append(f'Low average customer rating ({avg_rating:.1f}/5)')
        
        subjective_score = self._subjective_assessment(company)
        if subjective_score < 50:
            risk_factors.append('Low subjective assessment score')
        
        if company.status != 'active':
            risk_factors.append(f'Company status is {company.status}')
        
        return risk_factors
    
    def save_score(self, company, scoring_result, notes=None):
        credit_score = CreditScore(
            company_id=company.id,
            credit_score=scoring_result['total_score'],
            credit_grade=scoring_result['credit_grade'],
            financial_score=scoring_result['financial_score'],
            operational_score=scoring_result['operational_score'],
            qualification_score=scoring_result['qualification_score'],
            customer_review_score=scoring_result['customer_review_score'],
            risk_level=scoring_result['risk_level'],
            risk_factors=json.dumps(scoring_result['risk_factors'], ensure_ascii=False),
            recommended_loan_limit=scoring_result['recommended_loan_limit'],
            recommended_interest_rate=scoring_result['recommended_interest_rate'],
            scoring_model_version='v2.0-new-4-dimensions',
            expires_at=datetime.now(timezone.utc) + timedelta(days=180),
            notes=notes
        )
        
        return credit_score
