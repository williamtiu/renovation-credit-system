import os
from app import create_app
from datetime import date
from models.database import db
from models.audit_log import AuditLog
from models.company import Company
from models.credit_score import CreditScore
from models.dispute_case import DisputeCase
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.loan_application import LoanApplication
from models.project import Project
from models.project_bid import ProjectBid
from models.project_milestone import ProjectMilestone
from models.user import User

app = create_app()

with app.app_context():
    # Clear existing data
    db.drop_all()
    db.create_all()

    # Create users
    admin = User(username='admin', email='admin@example.com', role='admin')
    admin.set_password('password123')
    reviewer = User(username='reviewer', email='reviewer@example.com', role='reviewer')
    reviewer.set_password('password123')
    # customer = User(username='customer', email='customer@example.com', role='customer')
    # customer.set_password('password123')
    # company_user = User(username='builder1', email='builder1@example.com', role='company_user')
    # company_user.set_password('password123')
    db.session.add(admin)
    db.session.add(reviewer)
    # db.session.add(customer)
    # db.session.add(company_user)
    db.session.flush()

    # Insert sample English data
    # c1 = Company(
    #     id=1,
    #     company_name='Elite Renovation Ltd.',
    #     business_registration='12345678-000-11-22-3',
    #     address='123 King\'s Road, Hong Kong',
    #     district='Hong Kong Island',
    #     phone='23456789',
    #     email='contact@elitereno.hk',
    #     registered_capital=5000000.0,
    #     annual_revenue=20000000.0,
    #     employee_count=35,
    #     project_count_completed=60,
    #     contact_person='John Doe',
    #     contact_position='Director',
    #     company_name_en='Elite Renovation Limited',
    #     has_license=True,
    #     licence_number='LIC-1001',
    #     licence_class='Class I',
    #     licence_categories='A,B',
    #     licence_expiry_date=date(2027, 12, 31),
    #     licence_verification_status='verified',
    #     insurance_provider='HK Insure',
    #     insurance_policy_number='POL-2001',
    #     insurance_expiry_date=date(2027, 6, 30),
    #     insurance_verification_status='verified',
    #     osh_policy_in_place=True,
    #     safety_training_coverage=96,
    #     heavy_lifting_compliance=True,
    #     lifting_equipment_available=True,
    #     safety_incident_count=0,
    #     esg_policy_level='advanced',
    #     green_material_ratio=42,
    #     is_verified_for_bidding=True,
    #     owner_user_id=company_user.id,
    #     trust_score_cached=756,
    #     # 新增财务指标
    #     current_assets=8000000.0,
    #     current_liabilities=4000000.0,
    #     total_cash=3000000.0,
    #     total_liabilities=5000000.0,
    #     shareholders_equity=5000000.0,
    #     audited_financials_uploaded=True,
    #     tax_returns_uploaded=True,
    #     # 新增资质认证
    #     minor_works_contractor_registration='MW-2024-001',
    #     minor_works_registration_verified=True,
    #     insurance_documents_uploaded=True,
    #     insurance_verified=True,
    #     osh_safety_officer_license='OSH-001',
    #     osh_safety_officer_verified=True,
    # )
    
    # c2 = Company(
    #     id=2,
    #     company_name='Budget Fixers Co.',
    #     business_registration='87654321-000-11-22-3',
    #     address='456 Nathan Road, Kowloon',
    #     district='Kowloon',
    #     phone='21234567',
    #     email='info@budgetfixers.hk',
    #     registered_capital=1000000.0,
    #     annual_revenue=5000000.0,
    #     employee_count=10,
    #     project_count_completed=25,
    #     contact_person='Jane Smith',
    #     company_name_en='Budget Fixers Company',
    #     osh_policy_in_place=False,
    #     safety_training_coverage=55,
    #     heavy_lifting_compliance=False,
    #     lifting_equipment_available=False,
    #     safety_incident_count=2,
    #     esg_policy_level='none',
    #     green_material_ratio=8,
    #     licence_verification_status='pending',
    #     insurance_verification_status='pending',
    #     trust_score_cached=543,
    #     # 新增财务指标
    #     current_assets=2000000.0,
    #     current_liabilities=1500000.0,
    #     total_cash=800000.0,
    #     total_liabilities=1800000.0,
    #     shareholders_equity=1200000.0,
    #     audited_financials_uploaded=False,
    #     tax_returns_uploaded=False,
    #     # 新增资质认证
    #     minor_works_contractor_registration=None,
    #     minor_works_registration_verified=False,
    #     insurance_documents_uploaded=False,
    #     insurance_verified=False,
    #     osh_safety_officer_license=None,
    #     osh_safety_officer_verified=False,
    # )

    # db.session.add(c1)
    # db.session.add(c2)
    # db.session.commit()
    # company_user.company_id = c1.id
    # db.session.commit()

    # Credit Scores
    # s1 = CreditScore(
    #     company_id=1,
    #     credit_score=756,
    #     credit_grade='A',
    #     risk_level='low',
    #     financial_score=550,
    #     operational_score=200,
    #     qualification_score=200,
    #     customer_review_score=201,
    #     risk_factors='["Verified licence", "Verified insurance", "ISO certified", "OSH safety officer"]',
    #     recommended_loan_limit=3000000,
    #     recommended_interest_rate=4.5,
    # )

    # s2 = CreditScore(
    #     company_id=2,
    #     credit_score=543,
    #     credit_grade='B',
    #     risk_level='medium',
    #     financial_score=350,
    #     operational_score=150,
    #     qualification_score=100,
    #     customer_review_score=100,
    #     risk_factors='["Verification incomplete", "No ISO certification", "No OSH safety officer"]',
    #     recommended_loan_limit=250000,
    #     recommended_interest_rate=8.0,
    # )

    # db.session.add(s1)
    # db.session.add(s2)
    # db.session.commit()

    # # Loan Applications
    # l1 = LoanApplication(
    #     company_id=1,
    #     loan_amount=300000.0,
    #     loan_term_months=24,
    #     application_status='approved',
    #     loan_purpose='Material Purchase',
    #     expected_interest_rate=4.5,
    #     approved_amount=300000.0,
    #     approved_interest_rate=4.5
    # )

    # l2 = LoanApplication(
    #     company_id=2,
    #     loan_amount=150000.0,
    #     loan_term_months=12,
    #     application_status='pending',
    #     loan_purpose='Equipment Upgrade',
    #     expected_interest_rate=6.0
    # )

    # db.session.add(l1)
    # db.session.add(l2)
    # db.session.commit()

    # project = Project(
    #     customer_user_id=customer.id,
    #     title='Mid-level apartment renovation',
    #     description='Kitchen, bathroom, and flooring upgrade.',
    #     property_type='Residential',
    #     property_address='88 Harbour Road, Wan Chai',
    #     district='Hong Kong Island',
    #     budget_amount=450000,
    #     target_start_date=date(2026, 4, 1),
    #     target_end_date=date(2026, 7, 15),
    #     status='open_for_bids',
    # )
    # db.session.add(project)
    # db.session.flush()

    # bid = ProjectBid(
    #     project_id=project.id,
    #     company_id=c1.id,
    #     submitted_by_user_id=company_user.id,
    #     bid_amount=430000,
    #     proposed_duration_days=90,
    #     proposal_summary='Full renovation with staged milestone delivery.',
    #     status='submitted',
    # )
    # db.session.add(bid)
    # db.session.flush()

    # milestone = ProjectMilestone(
    #     project_id=project.id,
    #     sequence_no=1,
    #     name='Demolition and site prep',
    #     planned_percentage=20,
    #     planned_amount=90000,
    #     status='planned',
    # )
    # db.session.add(milestone)
    # db.session.flush()

    # db.session.add(EscrowLedgerEntry(project_id=project.id, milestone_id=milestone.id, entry_type='planned', amount=90000, reference_note='Initial milestone'))
    # db.session.add(AuditLog(action='seed_data_created', target_type='Project', target_id=project.id))
    db.session.commit()

    print("Successfully populated database with English test data.")
