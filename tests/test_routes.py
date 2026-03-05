import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import date
from app import create_app
from models.database import db
from models.company import Company
from models.loan_application import LoanApplication

@pytest.fixture
def client():
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
            
        yield client

def test_routes(client):
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
    for route in routes:
        response = client.get(route)
        print(f"Testing {route}: {response.status_code}")
        if response.status_code == 500:
            print(f"Error on {route}: {response.data.decode('utf-8')}")
        assert response.status_code in [200, 302], f"Failed at {route}"
