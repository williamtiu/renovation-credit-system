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
from models.project_bid import ProjectBid
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

            admin = User(username='admin', email='admin@test.com', role='admin')
            admin.set_password('password123')
            reviewer = User(username='reviewer', email='reviewer@test.com', role='reviewer')
            reviewer.set_password('password123')
            customer = User(username='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            owner = User(username='builder', email='builder@test.com', role='company_user')
            owner.set_password('password123')
            outsider = User(username='outsider', email='outsider@test.com', role='company_user')
            outsider.set_password('password123')
            db.session.add_all([admin, reviewer, customer, owner, outsider])
            db.session.flush()

            company = Company(
                company_name='Owner Company',
                business_registration='12345678',
                established_date=date(2020, 1, 1),
                owner_user_id=owner.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                is_verified_for_bidding=True,
                status='active',
            )
            other_company = Company(
                company_name='Other Company',
                business_registration='87654321',
                established_date=date(2019, 1, 1),
                owner_user_id=outsider.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add_all([company, other_company])
            db.session.flush()
            owner.company_id = company.id
            outsider.company_id = other_company.id

            project = Project(customer_user_id=customer.id, title='Linked Project', budget_amount=100000, status='contracted')
            db.session.add(project)
            db.session.flush()

            bid = ProjectBid(project_id=project.id, company_id=company.id, submitted_by_user_id=owner.id, bid_amount=95000, status='accepted')
            db.session.add(bid)
            db.session.flush()
            project.accepted_bid_id = bid.id

            loan = LoanApplication(
                company_id=company.id,
                project_id=project.id,
                loan_amount=100000,
                loan_term_months=12,
                application_status='approved',
                approved_amount=100000,
                outstanding_balance=100000,
                repayment_status='current',
            )
            other_loan = LoanApplication(
                company_id=other_company.id,
                loan_amount=80000,
                loan_term_months=12,
                application_status='pending',
            )
            db.session.add_all([loan, other_loan])
            db.session.commit()

        yield client


def _login_as(client, user_id):
    with client.session_transaction() as session:
        session['user_id'] = user_id


def test_company_user_only_sees_own_loans(client):
    _login_as(client, 4)
    response = client.get('/loans/')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'Owner Company' in body
    assert 'Other Company' not in body


def test_company_user_cannot_view_other_company_loan(client):
    _login_as(client, 4)
    response = client.get('/loans/2')
    assert response.status_code == 403


def test_customer_cannot_access_loan_workspace(client):
    _login_as(client, 3)
    response = client.get('/loans/')
    assert response.status_code == 302


def test_admin_cannot_open_company_only_application_form(client):
    _login_as(client, 1)
    response = client.get('/loans/add', follow_redirects=False)
    assert response.status_code == 302


def test_company_user_cannot_apply_for_other_company(client):
    _login_as(client, 4)
    response = client.post('/loans/add', data={
        'company_id': 2,
        'loan_amount': 120000,
        'loan_purpose': 'Unauthorized submission',
        'loan_term_months': 12,
    }, follow_redirects=False)
    assert response.status_code == 403


def test_company_user_can_apply_for_owned_company(client):
    _login_as(client, 4)
    response = client.post('/loans/add', data={
        'company_id': 1,
        'project_id': 1,
        'loan_amount': 120000,
        'loan_purpose': 'Working capital',
        'loan_term_months': 12,
    }, follow_redirects=False)
    assert response.status_code == 302

    with client.application.app_context():
        applications = LoanApplication.query.filter_by(company_id=1).all()
        assert len(applications) == 2


def test_company_user_cannot_link_loan_to_unawarded_project(client):
    with client.application.app_context():
        project = Project(customer_user_id=3, title='Unawarded Project', budget_amount=90000, status='open_for_bids')
        db.session.add(project)
        db.session.flush()
        db.session.add(ProjectBid(project_id=project.id, company_id=1, submitted_by_user_id=4, bid_amount=88000, status='submitted'))
        db.session.commit()

    _login_as(client, 4)
    response = client.post('/loans/add', data={
        'company_id': 1,
        'project_id': 2,
        'loan_amount': 110000,
        'loan_purpose': 'Should be blocked',
        'loan_term_months': 12,
    }, follow_redirects=False)
    assert response.status_code == 403


def test_company_user_cannot_repay_other_company_loan(client):
    _login_as(client, 4)
    response = client.post('/loans/2/repay', data={'repayment_amount': 1000}, follow_redirects=False)
    assert response.status_code == 403


def test_admin_can_view_all_loans(client):
    _login_as(client, 1)
    response = client.get('/loans/')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'Owner Company' in body
    assert 'Other Company' in body