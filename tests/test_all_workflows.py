import unittest
from app import create_app, db
from models.user import User
from models.company import Company
from models.loan_application import LoanApplication
import datetime

class WorkflowTestCase(unittest.TestCase):
    def setUp(self):
        self.app_obj = create_app()
        self.app_obj.config['TESTING'] = True
        self.app_obj.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = self.app_obj.test_client()
        with self.app_obj.app_context():
            db.create_all()

    def tearDown(self):
        with self.app_obj.app_context():
            db.session.remove()
            db.drop_all()

    def test_full_workflow(self):
        with self.app_obj.app_context():
            admin = User(username='admin', email='a@d.com', role='admin')
            com_user = User(username='company', email='c@d.com', role='company_user')
            admin.set_password('pass')
            com_user.set_password('pass')
            db.session.add_all([admin, com_user])
            db.session.commit()
            company = Company(owner_user_id=com_user.id, company_name='Deco LLC', business_registration='1234')
            db.session.add(company)
            db.session.commit()
            loan = LoanApplication(company_id=company.id, loan_amount=500, loan_term_months=12, application_status='pending', applied_at=datetime.datetime.utcnow())
            db.session.add(loan)
            db.session.commit()
            # external action
            loan.application_status = 'approved'
            loan.bank_name = 'Bank'
            db.session.commit()
            self.assertEqual(loan.application_status, 'approved')
            self.assertEqual(loan.bank_name, 'Bank')

if __name__ == '__main__':
    unittest.main()