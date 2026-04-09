import os
import sys
from datetime import datetime

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.company import Company
from models.database import db
from models.dispute_case import DisputeCase
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from models.user import User
from services.credit_scorer import CreditScorer
from services.dispute_service import create_dispute
from services.escrow_service import create_planned_entry
from services.project_service import accept_bid


def _run_workflow_assertions():
    app = create_app()

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
            company_name='Quality Renovation',
            business_registration='BR12345678',
            established_date=datetime(2015, 1, 15).date(),
            registered_capital=5000000,
            contact_person='Casey Wong',
            phone='21234567',
            email='info@qualityreno.com.hk',
            address='123 Queen Road Central',
            district='Hong Kong Island',
            employee_count=35,
            annual_revenue=25000000,
            project_count_completed=85,
            average_project_value=300000,
            main_service_type='Residential Renovation',
            licence_number='LIC-001',
            licence_class='Class I',
            licence_categories='A,B',
            licence_verification_status='verified',
            insurance_provider='HK Insure',
            insurance_policy_number='POL-001',
            insurance_verification_status='verified',
            bank_account_years=8,
            existing_loans=2000000,
            loan_repayment_history='Good',
            status='active',
            is_verified_for_bidding=True,
            owner_user_id=company_user.id,
        )
        db.session.add(company)
        db.session.flush()
        company_user.company_id = company.id

        scorer = CreditScorer()
        score_result = scorer.calculate_score(company)
        score_record = scorer.save_score(company, score_result, notes='System test')
        db.session.add(score_record)

        project = Project(
            customer_user_id=customer.id,
            title='Apartment renovation',
            description='Kitchen and bathroom refit',
            budget_amount=400000,
            status='open_for_bids',
        )
        db.session.add(project)
        db.session.flush()

        bid = ProjectBid(
            project_id=project.id,
            company_id=company.id,
            submitted_by_user_id=company_user.id,
            bid_amount=380000,
            proposed_duration_days=75,
            proposal_summary='End-to-end renovation package',
        )
        db.session.add(bid)
        db.session.flush()

        accept_bid(project, bid)

        milestone = ProjectMilestone(
            project_id=project.id,
            sequence_no=1,
            name='Demolition',
            planned_percentage=20,
            planned_amount=80000,
            status='planned',
        )
        db.session.add(milestone)
        db.session.flush()
        create_planned_entry(project.id, milestone.planned_amount, created_by_user_id=customer.id, milestone_id=milestone.id)

        dispute = create_dispute(project, customer.id, 'quality_issue', 'Tile finish does not match spec', milestone=milestone, company_id=company.id)
        db.session.add(dispute)

        loan = LoanApplication(
            company_id=company.id,
            project_id=project.id,
            loan_amount=500000,
            loan_purpose='Working capital for renovation materials',
            loan_term_months=24,
            credit_score_at_application=score_result['total_score'],
            credit_grade_at_application=score_result['credit_grade'],
            application_status='pending',
        )
        db.session.add(loan)
        db.session.commit()

        frozen_entries = EscrowLedgerEntry.query.filter_by(project_id=project.id, entry_type='frozen').count()
        dispute_count = DisputeCase.query.count()

        assert score_result['total_score'] >= 600
        assert project.status == 'disputed'
        assert bid.status == 'accepted'
        assert milestone.status == 'disputed'
        assert frozen_entries >= 1
        assert dispute_count == 1
        assert loan.project_id == project.id


def test_system_workflow():
    _run_workflow_assertions()


def run_tests():
    _run_workflow_assertions()

    print('System workflow test passed.')


if __name__ == '__main__':
    run_tests()