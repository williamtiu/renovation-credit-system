import os
import sys
from datetime import date

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.company import Company
from models.database import db
from models.loan_application import LoanApplication
from models.project import Project
from models.user import User


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.test_client() as client:
        with app.app_context():
            db.drop_all()
            db.create_all()

            admin = User(usercompany_name='admin', email='admin@test.com', role='admin')
            admin.set_password('password123')
            customer = User(usercompany_name='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            company_user = User(usercompany_name='builder', email='builder@test.com', role='company_user')
            company_user.set_password('password123')
            db.session.add_all([admin, customer, company_user])
            db.session.flush()

            company = Company(
                company_company_name='Test Company',
                business_registration='12345678',
                established_date=date(2020, 1, 1),
                contact_person='Tester',
                phone='12345678',
                email='test@test.com',
                address='Test Address',
                owner_user_id=company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                
                safety_training_coverage=85,
                
                lifting_equipment_available=True,
                esg_policy_level='basic',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(company)
            db.session.flush()
            company_user.company_id = company.id

            project = Project(customer_user_id=customer.id, title='Test Project', budget_amount=50000, status='open_for_bids')
            db.session.add(project)
            db.session.flush()

            loan = LoanApplication(
                company_id=company.id,
                project_id=project.id,
                loan_amount=100000,
                loan_term_months=12,
                application_status='pending',
                credit_score_at_application=800,
                credit_grade_at_application='A'
            )
            db.session.add(loan)
            db.session.commit()

            with client.session_transaction() as session:
                session['user_id'] = admin.id

        yield client


def _route_list():
    return [
        '/',
        '/dashboard',
        '/about',
        '/companies/',
        '/companies/add',
        '/companies/1',
        '/companies/1/credit-report',
        '/companies/1/credit-report/download',
        '/companies/compare-report',
        '/companies/1/edit',
        '/loans/',
        '/loans/add',
        '/loans/1',
        '/loans/1/review',
        '/projects/',
        '/projects/1',
        '/disputes/',
        '/admin/audit-logs',
    ]


@pytest.mark.parametrize('route', _route_list())
def test_route_status_codes(client, route):
    response = client.get(route)
    assert response.status_code in [200, 302], f'Unexpected status for {route}: {response.status_code}'


def run_tests():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.test_client() as client:
        with app.app_context():
            db.drop_all()
            db.create_all()

            admin = User(usercompany_name='admin', email='admin@test.com', role='admin')
            admin.set_password('password123')
            customer = User(usercompany_name='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            company_user = User(usercompany_name='builder', email='builder@test.com', role='company_user')
            company_user.set_password('password123')
            db.session.add_all([admin, customer, company_user])
            db.session.flush()

            company = Company(
                company_company_name='Test Company',
                business_registration='12345678',
                established_date=date(2020, 1, 1),
                contact_person='Tester',
                phone='12345678',
                email='test@test.com',
                address='Test Address',
                owner_user_id=company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                
                safety_training_coverage=85,
                
                lifting_equipment_available=True,
                esg_policy_level='basic',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(company)
            db.session.flush()
            company_user.company_id = company.id

            project = Project(customer_user_id=customer.id, title='Test Project', budget_amount=50000, status='open_for_bids')
            db.session.add(project)
            db.session.flush()

            loan = LoanApplication(
                company_id=company.id,
                project_id=project.id,
                loan_amount=100000,
                loan_term_months=12,
                application_status='pending',
                credit_score_at_application=800,
                credit_grade_at_application='A'
            )
            db.session.add(loan)
            db.session.commit()

            with client.session_transaction() as session:
                session['user_id'] = admin.id

        all_passed = True
        for route in _route_list():
            response = client.get(route)
            if response.status_code not in [200, 302]:
                print(f'ERROR {route}: {response.status_code}')
                all_passed = False
            else:
                print(f'OK {route}: {response.status_code}')

        if all_passed:
            print('\nAll routes tested successfully!')
        else:
            print('\nSome routes failed.')


if __name__ == '__main__':
    run_tests()