import unittest
from app import create_app, db
from models.user import User
class UITestCase(unittest.TestCase):
    def setUp(self):
        self.app_obj = create_app()
        self.app_obj.config['TESTING'] = True
        self.app_obj.config['WTF_CSRF_ENABLED'] = False
        self.app_obj.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = self.app_obj.test_client()
        with self.app_obj.app_context():
            db.create_all()
            u = User(username='test_user', email='test@deco.com', role='company_user')
            u.set_password('pass')
            db.session.add(u)
            db.session.commit()

    def tearDown(self):
        with self.app_obj.app_context():
            db.session.remove()
            db.drop_all()

    def test_ui_endpoints(self):
        self.app.post('/auth/login', data={'username': 'test_user', 'password': 'pass'}, follow_redirects=True)
        res = self.app.get('/companies/', follow_redirects=True)
        self.assertEqual(res.status_code, 200)

if __name__ == '__main__':
    unittest.main()