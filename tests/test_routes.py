import os
import sys
from datetime import date

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.audit_log import AuditLog
from models.company import Company
from models.credit_score import CreditScore
from models.database import db
from models.loan_application import LoanApplication
from models.project import Project
from models.user import User


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.drop_all()
            db.create_all()

            admin = User(username='admin', email='admin@test.com', role='admin')
            admin.set_password('password123')
            customer = User(username='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            company_user = User(username='builder', email='builder@test.com', role='company_user')
            company_user.set_password('password123')
            db.session.add_all([admin, customer, company_user])
            db.session.flush()

            company = Company(
                company_name='Test Company',
                company_name_en='Test Company Limited',
                business_registration='12345678',
                established_date=date(2020, 1, 1),
                contact_person='Tester',
                phone='12345678',
                email='test@test.com',
                address='Test Address',
                annual_revenue=2500000,
                existing_loans=200000,
                loan_repayment_history='Good',
                trust_score_cached=742,
                risk_level='low',
                owner_user_id=company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                osh_policy_in_place=True,
                safety_training_coverage=72,
                heavy_lifting_compliance=False,
                lifting_equipment_available=False,
                safety_incident_count=1,
                esg_policy_level='basic',
                green_material_ratio=18,
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(company)
            db.session.flush()
            company_user.company_id = company.id

            peer_company = Company(
                company_name='Peer Builder',
                company_name_en='Peer Builder Limited',
                business_registration='87654321',
                established_date=date(2018, 6, 1),
                district='Hong Kong Island',
                annual_revenue=4300000,
                trust_score_cached=680,
                risk_level='medium',
                owner_user_id=company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(peer_company)
            db.session.flush()

            project = Project(
                customer_user_id=customer.id,
                title='Test Project',
                budget_amount=100000,
                status='open_for_bids',
            )
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

            score = CreditScore(
                company_id=company.id,
                credit_score=742,
                credit_grade='AA',
                financial_score=220,
                operational_score=180,
                qualification_score=80,
                customer_review_score=190,
                risk_level='low',
                risk_factors='["Low annual revenue concentration", "Insurance renewal due within review window"]',
                recommended_loan_limit=3500000,
                recommended_interest_rate=4.0,
            )
            db.session.add(score)

            peer_score = CreditScore(
                company_id=peer_company.id,
                credit_score=680,
                credit_grade='A',
                financial_score=190,
                operational_score=170,
                qualification_score=75,
                customer_review_score=165,
                risk_level='medium',
                risk_factors='["Moderate leverage"]',
                recommended_loan_limit=2800000,
                recommended_interest_rate=4.5,
            )
            db.session.add(peer_score)

            audit_log = AuditLog(
                actor_user_id=admin.id,
                action='trust_score_calculated',
                target_type='Company',
                target_id=company.id,
                details_json='{"score": 742}',
            )
            db.session.add(audit_log)
            db.session.commit()

            with client.session_transaction() as session:
                session['user_id'] = admin.id

        yield client


def test_routes(client):
    routes = [
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
    for route in routes:
        response = client.get(route)
        assert response.status_code in [200, 302], f'Failed at {route}'


def test_dashboard_shows_underwriting_sections(client):
    response = client.get('/dashboard')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'DecoFinance Risk Management Dashboard' in body
    assert 'Score Trend' in body
    assert 'Dispute Trend' in body
    assert 'Comparison Filters' in body
    assert 'Portfolio Overview' in body
    assert 'Credit Watchlist' in body
    assert 'Recent Score Activity' in body
    assert 'Safety review backlog' in body
    assert 'ESG-ready companies' in body


def test_dashboard_hides_compare_workspace_for_customer(client):
    with client.session_transaction() as session:
        session['user_id'] = 2

    response = client.get('/dashboard')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'Comparison Filters' not in body
    assert 'Open Compare Workspace' not in body
    assert 'Review Audit Trail' not in body
    assert 'Compare Reports' not in body
    assert 'Browse Companies' in body


def test_credit_report_shows_bureau_style_sections(client):
    response = client.get('/companies/1/credit-report')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert '信貸報告 / Credit Report' in body
    assert 'Score Summary' in body
    assert 'Verification And Compliance' in body
    assert 'OSH And ESG Signals' in body
    assert 'Real-Time Risk Alerts' in body
    assert 'Audit Snapshot' in body
    assert 'Recent Audit Timeline' in body


def test_compare_workspace_filters_and_compares(client):
    response = client.get('/companies/compare-report?grade=A&verification=verified&company_ids=1&company_ids=2')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'Compare Company Reports' in body
    assert 'Side-By-Side Summary' in body
    assert 'Peer Builder' in body


def test_credit_report_pdf_download_returns_pdf(client):
    response = client.get('/companies/1/credit-report/download')
    assert response.status_code == 200
    assert response.mimetype == 'application/pdf'
    assert response.headers['Content-Disposition'].startswith('attachment;')
    assert response.data.startswith(b'%PDF')