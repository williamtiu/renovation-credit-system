"""
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.database import db
from models.company import Company
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from services.credit_scorer import CreditScorer
from datetime import datetime, timezone, timedelta

def print_test_header(test_name):
    """Documnetation translated"""
    print(f"\n{'='*60}")
    print(f"🧪  Value: {test_name}")
    print('='*60)

def print_test_result(passed, message=""):
    """Documnetation translated"""
    if passed:
        print(f"✅  Value: {message}")
    else:
        print(f"❌ Failed：{message}")
    return passed

def run_tests():
    """Documnetation translated"""
    app = create_app()
    
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("✅ Target ")
        
        tests_passed = 0
        tests_failed = 0
        
        print_test_header(" Create Renovation Company")
        
        try:
            company1 = Company(
                company_name=" Test ",
                business_registration="BR12345678",
                established_date=datetime(2015, 1, 15),
                registered_capital=5000000,
                contact_person=" Test ",
                phone="21234567",
                email="info@qualityreno.com.hk",
                address=" Test  123  Test ",
                district=" Test ",
                employee_count=35,
                annual_revenue=25000000,
                project_count_completed=85,
                average_project_value=300000,
                main_service_type="Residential Renovation",
                has_license=True,
                license_type=" Test ",
                iso_certified=True,
                professional_memberships=" Test ",
                bank_account_years=8,
                existing_loans=2000000,
                loan_repayment_history="Good",
                status="active"
            )
            db.session.add(company1)
            db.session.commit()
            print_test_result(True, f"Success Value: {company1.company_name}")
            tests_passed += 1
        except Exception as e:
            print_test_result(False, f" Test Failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Create Low Quality Company")
        
        try:
            company2 = Company(
                company_name=" Test ",
                business_registration="BR87654321",
                established_date=datetime(2024, 6, 1),
                registered_capital=100000,
                contact_person=" Test ",
                phone="98765432",
                email="quick@reno.com",
                address=" Test ",
                district="Other",
                employee_count=5,
                annual_revenue=800000,
                project_count_completed=3,
                has_license=False,
                iso_certified=False,
                bank_account_years=1,
                existing_loans=500000,
                loan_repayment_history="Fair",
                status="active"
            )
            db.session.add(company2)
            db.session.commit()
            print_test_result(True, f"Success Value: {company2.company_name}")
            tests_passed += 1
        except Exception as e:
            print_test_result(False, f" Test Failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Calculate Score - High Quality ")
        
        try:
            scorer = CreditScorer()
            result = scorer.calculate_score(company1)
            
            print(f"📊  Details:")
            print(f"    Value: {result['total_score']}")
            print(f"    Value: {result['credit_grade']}")
            print(f"    Value: {result['risk_level']}")
            print(f"    Value: HK$ {result['recommended_loan_limit']:,.0f}")
            print(f"    Value: {result['recommended_interest_rate']}%")
            print(f"\n📋  Details:")
            print(f"    Value: {result['financial_score']}/300")
            print(f"    Value: {result['operational_score']}/250")
            print(f"    Value: {result['credit_history_score']}/250")
            print(f"    Value: {result['qualification_score']}/100")
            print(f"    Value: {result['industry_risk_score']}/100")
            
            if result['risk_factors']:
                print(f"\n⚠️  Details:")
                for factor in result['risk_factors']:
                    print(f"   - {factor}")
            
            passed = (
                result['total_score'] >= 600 and
                result['credit_grade'] in ['AAA', 'AA', 'A', 'BBB'] and
                result['risk_level'] == 'low'
            )
            print_test_result(passed, f" Test ")
            
            if passed:
                tests_passed += 1
            else:
                tests_failed += 1
                
        except Exception as e:
            print_test_result(False, f"Score calculation failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Calculate Score - Low Quality ")
        
        try:
            result2 = scorer.calculate_score(company2)
            
            print(f"📊  Details:")
            print(f"    Value: {result2['total_score']}")
            print(f"    Value: {result2['credit_grade']}")
            print(f"    Value: {result2['risk_level']}")
            
            passed = (
                result2['total_score'] < result['total_score'] and
                result2['risk_level'] in ['medium', 'high']
            )
            print_test_result(passed, f"Score properly downgraded ")
            
            if passed:
                tests_passed += 1
            else:
                tests_failed += 1
                
        except Exception as e:
            print_test_result(False, f"Score calculation failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Test ")
        
        try:
            credit_score = scorer.save_score(company1, result, notes=" Test ")
            db.session.add(credit_score)
            db.session.commit()
            
            saved_score = CreditScore.query.filter_by(company_id=company1.id).first()
            passed = (
                saved_score is not None and
                saved_score.credit_score == result['total_score'] and
                saved_score.credit_grade == result['credit_grade']
            )
            print_test_result(passed, f" Application Success (ID: {saved_score.id})")
            
            if passed:
                tests_passed += 1
            else:
                tests_failed += 1
                
        except Exception as e:
            db.session.rollback()
            print_test_result(False, f"Score saving failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Test ")
        
        try:
            application = LoanApplication(
                company_id=company1.id,
                loan_amount=5000000,
                loan_purpose=" Test Equipment Test ",
                loan_term_months=36,
                expected_interest_rate=4.5,
                collateral_type="Equipment",
                collateral_value=3000000,
                bank_name=" Test ",
                credit_score_at_application=result['total_score'],
                credit_grade_at_application=result['credit_grade']
            )
            db.session.add(application)
            db.session.commit()
            
            print_test_result(True, f" Application Success (ID: {application.id})")
            print(f"    Value: HK$ {application.loan_amount:,.0f}")
            print(f"    Value: {application.credit_score_at_application}")
            print(f"    Value: {application.credit_grade_at_application}")
            tests_passed += 1
            
        except Exception as e:
            db.session.rollback()
            print_test_result(False, f" Test Failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Test ")
        
        try:
            application.application_status = 'approved'
            application.approval_date = datetime.now(timezone.utc)
            application.approved_amount = 5000000
            application.approved_interest_rate = 4.0
            application.approval_conditions = " Test "
            db.session.commit()
            
            passed = (
                application.application_status == 'approved' and
                application.approved_interest_rate < application.expected_interest_rate
            )
            print_test_result(passed, f" Application Success ( Value: {application.approved_interest_rate}%)")
            
            if passed:
                tests_passed += 1
            else:
                tests_failed += 1
                
        except Exception as e:
            db.session.rollback()
            print_test_result(False, f" Test Failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Test ")
        
        try:
            total_companies = Company.query.count()
            total_scores = CreditScore.query.count()
            total_loans = LoanApplication.query.count()
            
            print(f"📊  Details:")
            print(f"    Value: {total_companies}")
            print(f"    Value: {total_scores}")
            print(f"    Value: {total_loans}")
            
            passed = (
                total_companies == 2 and
                total_scores == 1 and
                total_loans == 1
            )
            print_test_result(passed, " Test ")
            
            if passed:
                tests_passed += 1
            else:
                tests_failed += 1
                
        except Exception as e:
            print_test_result(False, f" Test Failed：{str(e)}")
            tests_failed += 1
        
        print_test_header(" Test ")
        
        total_tests = tests_passed + tests_failed
        pass_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊  Details:")
        print(f"    Value: {total_tests}")
        print(f"   ✅  Value: {tests_passed}")
        print(f"   ❌ Failed：{tests_failed}")
        print(f"    Value: {pass_rate:.1f}%")
        
        if tests_failed == 0:
            print(f"\n🎉  All tests passed successfully!")
            print(f"\n💡  Details:")
            print(f"   1.  Value: python app.py")
            print(f"   2.  Value: http://localhost:5001")
            print(f"   3.  Create Renovation Company")
            print(f"   4.  Test ")
            print(f"   5.  Test ")
        else:
            print(f"\n⚠️   Test  {tests_failed}  Test Failed， Test ")
        
        return tests_failed == 0

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🏠 Renovation Credit System - System Test ")
    print("Based on TransUnion (TU) Credit Score Model ")
    print("="*60)
    
    success = run_tests()
    
    sys.exit(0 if success else 1)
