import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models.database import db
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
            user = User(username='customer', email='customer@test.com', role='customer')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
        yield client


def test_register_collects_role_and_email(client):
    response = client.post('/auth/register', data={
        'username': 'builder',
        'email': 'builder@test.com',
        'password': 'password123',
        'role': 'company_user',
    }, follow_redirects=False)
    assert response.status_code == 302

    with client.application.app_context():
        user = User.query.filter_by(username='builder').first()
        assert user is not None
        assert user.role == 'company_user'


def test_register_rejects_privileged_roles(client):
    response = client.post('/auth/register', data={
        'username': 'admin2',
        'email': 'admin2@test.com',
        'password': 'password123',
        'role': 'admin',
    }, follow_redirects=False)
    assert response.status_code == 302

    with client.application.app_context():
        user = User.query.filter_by(username='admin2').first()
        assert user is None


def test_login_works_for_active_user(client):
    response = client.post('/auth/login', data={
        'username': 'customer',
        'password': 'password123',
    }, follow_redirects=False)
    assert response.status_code == 302