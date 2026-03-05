import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.database import db
from models.company import Company
from models.loan_application import LoanApplication
from datetime import date

def run_tests():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            # Reset database
            db.drop_all()
            db.create_all()
            
            # Create mock data
            comp = Company(
                company_name="Test Company", 
                business_registration="12345678",
                established_date=date(2020, 1, 1),
                contact_person="Tester",
                phone="12345678",
                email="test@test.com",
                address="Test Address"
            )
            db.session.add(comp)
            db.session.commit()
            
            loan = LoanApplication(
                company_id=comp.id, 
                loan_amount=100000, 
                loan_term_months=12,
                application_status='pending',
                credit_score_at_application=800,
                credit_grade_at_application='A'
            )
            db.session.add(loan)
            db.session.commit()
            
        routes = [
            '/',
            '/dashboard',
            '/about',
            '/companies/',
            '/companies/add',
            '/companies/1',
            '/companies/1/edit',
            '/loans/',
            '/loans/add',
            '/loans/1',
            '/loans/1/review'
        ]
        
        all_passed = True
        for route in routes:
            try:
                response = client.get(route)
                if response.status_code not in [200, 302]:
                    print(f"❌ Error on {route}: {response.status_code}")
                    if response.status_code == 500:
                         print(response.data.decode('utf-8'))
                    all_passed = False
                else:
                    print(f"✅ Success: {route} returned {response.status_code}")
            except Exception as e:
                print(f"❌ Exception on {route}: {str(e)}")
                all_passed = False
                
        if all_passed:
            print("\n🎉 All routes tested successfully!")
        else:
            print("\n⚠️ Some routes failed.")

if __name__ == '__main__':
    run_tests()
