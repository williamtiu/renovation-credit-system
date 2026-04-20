import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.company import Company
from models.database import db
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.dispute_case import DisputeCase
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from models.smart_contract_agreement import SmartContractAgreement
from models.user import User


@pytest.fixture
def app_client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.drop_all()
            db.create_all()
            customer = User(usercompany_name='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            company_user = User(usercompany_name='builder', email='builder@test.com', role='company_user')
            company_user.set_password('password123')
            other_company_user = User(usercompany_name='other-builder', email='other-builder@test.com', role='company_user')
            other_company_user.set_password('password123')
            db.session.add_all([customer, company_user, other_company_user])
            db.session.flush()
            company = Company(
                company_company_name='Builder Co',
                business_registration='87654321',
                owner_user_id=company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(company)
            db.session.flush()
            company_user.company_id = company.id
            other_company = Company(
                company_company_name='Other Builder Co',
                business_registration='87654322',
                owner_user_id=other_company_user.id,
                licence_verification_status='verified',
                insurance_verification_status='verified',
                is_verified_for_bidding=True,
                status='active',
            )
            db.session.add(other_company)
            db.session.flush()
            other_company_user.company_id = other_company.id
            db.session.commit()
        yield client


def test_customer_can_create_project(app_client):
    with app_client.session_transaction() as session:
        session['user_id'] = 1

    response = app_client.post('/projects/add', data={
        'title': 'Kitchen project',
        'budget_amount': 100000,
        'status': 'open_for_bids',
    }, follow_redirects=False)
    assert response.status_code == 302

    with app_client.application.app_context():
        project = Project.query.filter_by(title='Kitchen project').first()
        contract = SmartContractAgreement.query.filter_by(project_id=project.id).first()
        assert contract is not None
        assert contract.status == 'draft'


def test_company_user_can_submit_bid(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Open Project', budget_amount=150000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 2

    response = app_client.post('/projects/1/bids', data={
        'bid_amount': 140000,
        'proposed_duration_days': 60,
        'proposal_summary': 'Scope covered',
    }, follow_redirects=False)
    assert response.status_code == 302


def test_contract_lifecycle_updates_with_milestones_and_disputes(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Lifecycle Project', budget_amount=180000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 2

    app_client.post('/projects/1/bids', data={
        'bid_amount': 170000,
        'proposed_duration_days': 90,
        'proposal_summary': 'Ready to deliver',
    }, follow_redirects=False)

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    with app_client.application.app_context():
        bid = ProjectBid.query.filter_by(project_id=1).first()

    app_client.post(f'/projects/1/bids/{bid.id}/accept', follow_redirects=False)
    app_client.post('/projects/1/milestones/add', data={
        'sequence_no': 1,
        'name': 'Deposit',
        'planned_amount': 60000,
        'planned_percentage': 33.33,
    }, follow_redirects=False)

    with app_client.session_transaction() as session:
        session['user_id'] = 2

    with app_client.application.app_context():
        milestone = ProjectMilestone.query.filter_by(project_id=1).first()

    app_client.post(f'/projects/milestones/{milestone.id}/submit', data={
        'evidence_notes': 'Photos uploaded',
    }, follow_redirects=False)

    with app_client.application.app_context():
        contract = SmartContractAgreement.query.filter_by(project_id=1).first()
        assert contract.status == 'milestone_submitted'

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    app_client.post('/disputes/add', data={
        'project_id': 1,
        'milestone_id': milestone.id,
        'dispute_type': 'quality_issue',
        'description': 'Need clarification before release.',
    }, follow_redirects=False)

    with app_client.application.app_context():
        contract = SmartContractAgreement.query.filter_by(project_id=1).first()
        dispute = DisputeCase.query.filter_by(project_id=1, status='open').first()
        assert contract.status == 'frozen'
        assert contract.dispute_count == 1

    reviewer_id = None
    with app_client.application.app_context():
        reviewer = User(usercompany_name='reviewer', email='reviewer@test.com', role='reviewer')
        reviewer.set_password('password123')
        db.session.add(reviewer)
        db.session.commit()
        reviewer_id = reviewer.id

    with app_client.session_transaction() as session:
        session['user_id'] = reviewer_id

    app_client.post(f'/disputes/{dispute.id}/resolve', data={
        'resolution_summary': 'Issue verified and cleared.',
    }, follow_redirects=False)

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    app_client.post(f'/projects/milestones/{milestone.id}/approve', follow_redirects=False)

    with app_client.application.app_context():
        contract = SmartContractAgreement.query.filter_by(project_id=1).first()
        assert contract.status == 'completed'
        assert contract.approved_milestones == 1
        assert contract.released_amount == 60000
        assert any(event['event_type'] == 'dispute_opened' for event in contract.parsed_events())
        assert any(event['event_type'] == 'milestone_approved' for event in contract.parsed_events())


def test_project_contract_api_returns_contract_data(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='API Project', budget_amount=90000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    response = app_client.get('/api/projects/1/contract')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['success'] is True
    assert payload['data']['status'] == 'draft'


def test_customer_can_edit_own_project(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Editable Project', budget_amount=90000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    response = app_client.post('/projects/1/edit', data={
        'title': 'Updated Project',
        'description': 'Expanded kitchen and bathroom scope',
        'property_type': 'Residential',
        'property_address': '1 Harbour Road',
        'district': 'Wan Chai',
        'budget_amount': 125000,
        'target_start_date': '2026-04-01',
        'target_end_date': '2026-06-30',
    }, follow_redirects=False)
    assert response.status_code == 302

    with app_client.application.app_context():
        project = db.session.get(Project, 1)
        assert project.title == 'Updated Project'
        assert project.budget_amount == 125000


def test_milestones_require_contracted_project(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='No Contract Yet', budget_amount=50000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    response = app_client.post('/projects/1/milestones/add', data={
        'sequence_no': 1,
        'name': 'Deposit',
        'planned_amount': 10000,
        'planned_percentage': 20,
    }, follow_redirects=False)
    assert response.status_code == 302

    with app_client.application.app_context():
        assert ProjectMilestone.query.count() == 0


def test_only_accepted_company_can_submit_milestone(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Protected Milestone Project', budget_amount=150000, status='contracted')
        db.session.add(project)
        db.session.flush()
        accepted_bid = ProjectBid(
            project_id=project.id,
            company_id=1,
            submitted_by_user_id=2,
            bid_amount=145000,
            proposed_duration_days=75,
            status='accepted',
        )
        db.session.add(accepted_bid)
        db.session.flush()
        project.accepted_bid_id = accepted_bid.id
        milestone = ProjectMilestone(project_id=project.id, sequence_no=1, company_name='Stage 1', planned_amount=50000, status='planned')
        db.session.add(milestone)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 3

    response = app_client.post('/projects/milestones/1/submit', data={'evidence_notes': 'Unauthorized upload'}, follow_redirects=False)
    assert response.status_code == 403

    with app_client.application.app_context():
        milestone = db.session.get(ProjectMilestone, 1)
        assert milestone.status == 'planned'


def test_open_dispute_blocks_milestone_approval(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Blocked Approval Project', budget_amount=160000, status='in_progress')
        db.session.add(project)
        db.session.flush()
        accepted_bid = ProjectBid(
            project_id=project.id,
            company_id=1,
            submitted_by_user_id=2,
            bid_amount=150000,
            proposed_duration_days=80,
            status='accepted',
        )
        db.session.add(accepted_bid)
        db.session.flush()
        project.accepted_bid_id = accepted_bid.id
        milestone = ProjectMilestone(project_id=project.id, sequence_no=1, company_name='Stage 1', planned_amount=40000, status='submitted')
        dispute = DisputeCase(project_id=project.id, milestone_id=milestone.id, opened_by_user_id=1, against_company_id=1, dispute_type='quality_issue', description='Issue still open')
        db.session.add_all([milestone, dispute])
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 1

    response = app_client.post('/projects/milestones/1/approve', follow_redirects=False)
    assert response.status_code == 302

    with app_client.application.app_context():
        milestone = db.session.get(ProjectMilestone, 1)
        released_entries = EscrowLedgerEntry.query.filter_by(project_id=1, milestone_id=1, entry_type='released').count()
        assert milestone.status == 'submitted'
        assert released_entries == 0


def test_company_user_cannot_open_dispute_on_unrelated_project(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Unrelated Project', budget_amount=120000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    with app_client.session_transaction() as session:
        session['user_id'] = 3

    response = app_client.post('/disputes/add', data={
        'project_id': 1,
        'dispute_type': 'quality_issue',
        'description': 'This company should not access the project.',
    }, follow_redirects=False)
    assert response.status_code == 403


def test_project_contract_api_requires_login(app_client):
    with app_client.application.app_context():
        project = Project(customer_user_id=1, title='Secure API Project', budget_amount=99000, status='open_for_bids')
        db.session.add(project)
        db.session.commit()

    response = app_client.get('/api/projects/1/contract')
    assert response.status_code == 401