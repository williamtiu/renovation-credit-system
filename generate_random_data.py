import argparse
import random
from datetime import datetime, timezone
from datetime import date, timedelta

from app import create_app
from models.audit_log import AuditLog
from models.company import Company
from models.credit_score import CreditScore
from models.database import db
from models.dispute_case import DisputeCase
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from models.user import User
from services.credit_scorer import CreditScorer
from services.dispute_service import create_dispute, resolve_dispute
from services.escrow_service import create_planned_entry, release_milestone_amount
from services.smart_contract_service import (
    get_or_create_contract,
    register_bid_acceptance,
    register_dispute_opened,
    register_dispute_resolved,
    register_milestone_approval,
    register_milestone_creation,
    register_milestone_submission,
)


DISTRICTS = ['Hong Kong Island', 'Kowloon', 'New Territories']
SERVICE_TYPES = ['Residential Renovation', 'Commercial Fit-out', 'Kitchen Refurbishment', 'Bathroom Upgrades']
ESG_LEVELS = ['advanced', 'standard', 'basic', 'none']


def parse_args():
    parser = argparse.ArgumentParser(description='Generate random DecoFinance data.')
    parser.add_argument('--count', type=int, default=10, help='Base number used to scale generated entities.')
    parser.add_argument('--init', action='store_true', help='Drop and recreate all database tables before generation.')
    return parser.parse_args()


def random_date(year_start=2015, year_end=2026):
    start = date(year_start, 1, 1)
    end = date(year_end, 12, 31)
    return start + timedelta(days=random.randint(0, (end - start).days))


def create_user(username, email, role):
    user = User(username=username, email=email, role=role)
    user.set_password('password123')
    db.session.add(user)
    return user


def create_companies(base_count):
    companies = []
    company_users = []
    scorer = CreditScorer()
    user_offset = User.query.count()
    company_offset = Company.query.count()

    for index in range(base_count):
        record_index = company_offset + index
        company_user = create_user(
            f'builder_rand_{user_offset + index}',
            f'builder_rand_{user_offset + index}@example.com',
            'company_user',
        )
        db.session.flush()

        company = Company(
            company_name=f'Deco Builder {record_index + 1}',
            company_name_en=f'Deco Builder {record_index + 1} Limited',
            business_registration=f'{random.randint(10000000, 99999999)}-{record_index:03d}',
            established_date=random_date(2010, 2024),
            registered_capital=random.randint(300000, 6000000),
            contact_person=f'Contact {record_index + 1}',
            contact_position=random.choice(['Director', 'Project Lead', 'Operations Manager']),
            phone=f'{random.randint(20000000, 99999999)}',
            email=f'company_{record_index + 1}@decofinance.example',
            address=f'{record_index + 10} Harbour Road',
            employee_count=random.randint(5, 60),
            annual_revenue=random.randint(800000, 20000000),
            project_count_completed=random.randint(3, 120),
            average_project_value=random.randint(80000, 600000),
            main_service_type=random.choice(SERVICE_TYPES),
            licence_class=random.choice(['Class I', 'Class II']),
            licence_categories=random.choice(['A,B', 'B,C', 'A,C']),
            licence_expiry_date=random_date(2026, 2028),
            licence_verification_status=random.choice(['verified', 'verified', 'pending']),
            insurance_provider=random.choice(['HK Insure', 'Secure Build', 'Pacific Cover']),
            insurance_policy_number=f'POL-{record_index + 2000}',
            insurance_expiry_date=random_date(2026, 2028),
            insurance_verification_status=random.choice(['verified', 'verified', 'pending']),
            safety_training_coverage=random.randint(45, 100),
            safety_incident_count=random.randint(0, 3),
            esg_policy_level=random.choice(ESG_LEVELS),
            green_material_ratio=random.randint(5, 65),
            status=random.choice(['active', 'active', 'active', 'suspended']),
            owner_user_id=company_user.id,
            current_assets=random.uniform(50000.0, 1000000.0),
            current_liabilities=random.uniform(10000.0, 500000.0),
            total_cash=random.uniform(10000.0, 200000.0),
            total_liabilities=random.uniform(20000.0, 800000.0),
            shareholders_equity=random.uniform(30000.0, 500000.0),
            audited_financials_uploaded=True,
            tax_returns_uploaded=True,
            minor_works_contractor_registration=f'MWC-{random.randint(1000, 9999)}',
            minor_works_registration_verified=True,
            insurance_documents_uploaded=True,
            insurance_verified=True,
            osh_safety_officer_license=f'OSH-{random.randint(1000, 9999)}',     
            osh_safety_officer_verified=True
        )
        company.is_verified_for_bidding = (
            company.status == 'active' and
            company.licence_verification_status == 'verified' and
            company.insurance_verification_status == 'verified'
        )
        db.session.add(company)
        db.session.flush()
        company_user.company_id = company.id

        score_result = scorer.calculate_score(company)
        score = scorer.save_score(company, score_result, notes='Random generator score')
        db.session.add(score)
        company.trust_score_cached = score_result['total_score']
        company.risk_level = score_result['risk_level']

        companies.append(company)
        company_users.append(company_user)

    db.session.flush()
    return companies, company_users


def create_customers(base_count):
    customers = []
    user_offset = User.query.count()
    for index in range(max(2, base_count // 2)):
        customer = create_user(
            f'customer_rand_{user_offset + index}',
            f'customer_rand_{user_offset + index}@example.com',
            'customer',
        )
        customers.append(customer)
    reviewer = create_user(f'reviewer_rand_{user_offset}', f'reviewer_rand_{user_offset}@example.com', 'reviewer')
    admin = create_user(f'admin_rand_{user_offset}', f'admin_rand_{user_offset}@example.com', 'admin')
    return customers, reviewer, admin


def build_project_data(customers, companies, company_users, reviewer, base_count):
    projects = []
    project_offset = Project.query.count()

    for index in range(base_count):
        customer = random.choice(customers)
        project = Project(
            customer_user_id=customer.id,
            title=f'Random Project {project_offset + index + 1}',
            description='Generated renovation project for bulk testing.',
            property_type=random.choice(['Residential', 'Commercial']),
            property_address=f'{index + 1} Test Avenue',
            district=random.choice(DISTRICTS),
            budget_amount=random.randint(100000, 900000),
            target_start_date=random_date(2026, 2026),
            target_end_date=random_date(2026, 2027),
            status='open_for_bids',
        )
        db.session.add(project)
        db.session.flush()
        get_or_create_contract(project, actor_user_id=customer.id)

        bid_candidates = random.sample(list(zip(companies, company_users)), k=min(len(companies), random.randint(1, min(3, len(companies)))))
        bids = []
        for company, company_user in bid_candidates:
            bid = ProjectBid(
                project_id=project.id,
                company_id=company.id,
                submitted_by_user_id=company_user.id,
                bid_amount=max(project.budget_amount * random.uniform(0.85, 1.05), 10000),
                proposed_duration_days=random.randint(30, 150),
                proposal_summary='Generated bid for stress and demo data.',
                status='submitted',
            )
            db.session.add(bid)
            bids.append((bid, company_user))

        db.session.flush()

        if bids and random.choice([True, True, False]):
            accepted_bid, _ = random.choice(bids)
            for bid, _ in bids:
                bid.status = 'accepted' if bid.id == accepted_bid.id else 'declined'
            project.accepted_bid_id = accepted_bid.id
            project.status = 'contracted'
            register_bid_acceptance(project, accepted_bid, actor_user_id=customer.id)

            milestone_count = random.randint(1, 3)
            for milestone_index in range(milestone_count):
                milestone = ProjectMilestone(
                    project_id=project.id,
                    sequence_no=milestone_index + 1,
                    name=f'Milestone {milestone_index + 1}',
                    description='Generated milestone',
                    planned_percentage=round(100 / milestone_count, 2),
                    planned_amount=round(project.budget_amount / milestone_count, 2),
                    due_date=random_date(2026, 2027),
                )
                db.session.add(milestone)
                db.session.flush()
                create_planned_entry(project.id, milestone.planned_amount, created_by_user_id=customer.id, milestone_id=milestone.id, note=milestone.name)
                register_milestone_creation(project, milestone, actor_user_id=customer.id)

                if random.choice([True, False]):
                    milestone.status = 'submitted'
                    milestone.submitted_by_user_id = accepted_bid.submitted_by_user_id
                    milestone.evidence_notes = 'Generated evidence package.'
                    milestone.submitted_at = datetime.now(timezone.utc)
                    register_milestone_submission(milestone, actor_user_id=accepted_bid.submitted_by_user_id)

                if milestone.status == 'submitted' and random.choice([True, False]):
                    milestone.status = 'approved'
                    milestone.reviewed_by_user_id = customer.id
                    milestone.approved_at = datetime.now(timezone.utc)
                    release_milestone_amount(project.id, milestone.id, milestone.planned_amount, created_by_user_id=customer.id)
                    register_milestone_approval(milestone, actor_user_id=customer.id)

            if random.choice([True, False, False]):
                latest_milestone = project.milestones[-1] if project.milestones else None
                dispute = create_dispute(
                    project=project,
                    opened_by_user_id=customer.id,
                    dispute_type=random.choice(['quality_issue', 'delay', 'billing']),
                    description='Generated dispute for contract freeze scenario.',
                    milestone=latest_milestone,
                    company_id=accepted_bid.company_id,
                )
                db.session.add(dispute)
                db.session.flush()
                register_dispute_opened(project, dispute, actor_user_id=customer.id)
                if random.choice([True, False]):
                    resolve_dispute(dispute, 'Generated reviewer resolution.')
                    register_dispute_resolved(dispute, actor_user_id=reviewer.id)

            if random.choice([True, True, False]):
                company = accepted_bid.company
                latest_score = CreditScore.query.filter_by(company_id=company.id).order_by(CreditScore.scored_at.desc()).first()
                loan = LoanApplication(
                    company_id=company.id,
                    project_id=project.id,
                    loan_amount=round(project.budget_amount * random.uniform(0.35, 0.8), 2),
                    loan_purpose='Generated working capital facility',
                    loan_term_months=random.choice([12, 18, 24]),
                    expected_interest_rate=random.choice([4.0, 4.5, 5.5, 6.5]),
                    application_status=random.choice(['pending', 'under_review', 'approved']),
                    approved_amount=round(project.budget_amount * random.uniform(0.25, 0.7), 2),
                    approved_interest_rate=random.choice([4.0, 4.5, 5.0, 6.0]),
                    credit_score_at_application=latest_score.credit_score if latest_score else None,
                    credit_grade_at_application=latest_score.credit_grade if latest_score else None,
                )
                if loan.application_status != 'approved':
                    loan.approved_amount = None
                    loan.approved_interest_rate = None
                db.session.add(loan)

        projects.append(project)

    return projects


def main():
    args = parse_args()
    random.seed()
    app = create_app()

    with app.app_context():
        if args.init:
            db.drop_all()
            db.create_all()

        companies, company_users = create_companies(args.count)
        customers, reviewer, admin = create_customers(args.count)
        db.session.flush()
        projects = build_project_data(customers, companies, company_users, reviewer, args.count)

        db.session.add(AuditLog(action='random_data_generated', target_type='System', details_json=f'{{"count": {args.count}, "projects": {len(projects)}}}'))
        db.session.commit()

        print(f'Generated random DecoFinance data set with base count {args.count}.')
        print(f'Companies: {len(companies)} | Customers: {len(customers)} | Projects: {len(projects)}')
        print('Default generated password for created users: password123')


if __name__ == '__main__':
    main()