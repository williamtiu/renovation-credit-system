import os
from app import create_app
from models.database import db
from models.company import Company
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from models.user import User

app = create_app()

with app.app_context():
    # Clear existing data
    db.drop_all()
    db.create_all()

    # Create admin user
    admin = User(username='admin')
    admin.set_password('password123')
    db.session.add(admin)

    # Insert sample English data
    c1 = Company(
        id=1,
        company_name='Elite Renovation Ltd.',
        business_registration='12345678-000-11-22-3',
        address='123 King\'s Road, Hong Kong',
        district='Hong Kong Island',
        phone='23456789',
        email='contact@elitereno.hk',
        registered_capital=500000.0,
        annual_revenue=2000000.0,
        employee_count=15,
        contact_person='John Doe'
    )
    
    c2 = Company(
        id=2,
        company_name='Budget Fixers Co.',
        business_registration='87654321-000-11-22-3',
        address='456 Nathan Road, Kowloon',
        district='Kowloon',
        phone='21234567',
        email='info@budgetfixers.hk',
        registered_capital=100000.0,
        annual_revenue=500000.0,
        employee_count=5,
        contact_person='Jane Smith'
    )

    db.session.add(c1)
    db.session.add(c2)
    db.session.commit()

    # Credit Scores
    s1 = CreditScore(
        company_id=1,
        credit_score=85,
        credit_grade='A',
        risk_level='Low',
        financial_strength_score=90,
        operational_stability_score=85,
        industry_risk_score=80
    )

    s2 = CreditScore(
        company_id=2,
        credit_score=65,
        credit_grade='C',
        risk_level='Medium',
        financial_strength_score=60,
        operational_stability_score=70,
        industry_risk_score=65
    )

    db.session.add(s1)
    db.session.add(s2)
    db.session.commit()

    # Loan Applications
    l1 = LoanApplication(
        company_id=1,
        loan_amount=300000.0,
        loan_term_months=24,
        application_status='approved',
        loan_purpose='Material Purchase',
        expected_interest_rate=4.5,
        approved_amount=300000.0,
        approved_interest_rate=4.5
    )

    l2 = LoanApplication(
        company_id=2,
        loan_amount=150000.0,
        loan_term_months=12,
        application_status='pending',
        loan_purpose='Equipment Upgrade',
        expected_interest_rate=6.0
    )

    db.session.add(l1)
    db.session.add(l2)
    db.session.commit()

    print("Successfully populated database with English test data.")
