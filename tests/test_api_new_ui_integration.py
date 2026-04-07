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

            customer = User(usercompany_name='customer', email='customer@test.com', role='customer')
            customer.set_password('password123')
            db.session.add(customer)
            db.session.commit()

        yield client


def test_api_auth_login_me_logout_flow(client):
    login = client.post('/api/auth/login', json={
        'identifier': 'customer@test.com',
        'password': 'password123',
    })
    assert login.status_code == 200
    login_json = login.get_json()
    assert login_json['success'] is True
    assert login_json['data']['role'] == 'customer'

    me = client.get('/api/auth/me')
    assert me.status_code == 200
    me_json = me.get_json()
    assert me_json['success'] is True
    assert me_json['data']['email'] == 'customer@test.com'

    logout = client.post('/api/auth/logout')
    assert logout.status_code == 200

    me_after_logout = client.get('/api/auth/me')
    assert me_after_logout.status_code == 401


def test_api_auth_register_rejects_privileged_roles(client):
    response = client.post('/api/auth/register', json={
        'name': 'admin2',
        'username': 'admin2',
        'email': 'admin2@test.com',
        'password': 'password123',
        'role': 'admin',
    })
    assert response.status_code == 400
    payload = response.get_json()
    assert payload['success'] is False

    with client.application.app_context():
        user = User.query.filter_by(usercompany_name='admin2').first()
        assert user is None


def test_developer_summary_requires_login(client):
    response = client.get('/api/developer/summary')
    assert response.status_code == 401


def test_developer_summary_returns_counts_when_logged_in(client):
    with client.application.app_context():
        user = User.query.filter_by(usercompany_name='customer').first()
        user_id = user.id

    with client.session_transaction() as session:
        session['user_id'] = user_id

    response = client.get('/api/developer/summary')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['success'] is True
    assert 'counts' in payload['data']
    assert 'api' in payload['data']


def test_new_ui_route_is_served_or_reports_missing_build(client):
    response = client.get('/new-ui/')
    assert response.status_code in [200, 503]

    if response.status_code == 503:
        assert 'New UI build not found' in response.get_data(as_text=True)


def test_new_ui_spa_fallback_for_unknown_path(client):
    response = client.get('/new-ui/some/deep/link')
    assert response.status_code in [200, 503]
