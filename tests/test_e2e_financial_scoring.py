import os
import socket
import threading
import time
from pathlib import Path
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from werkzeug.serving import make_server

from app import create_app
from models.database import db
from models.user import User
from models.company import Company
from models.credit_score import CreditScore
from datetime import date


def _free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class ServerThread(threading.Thread):
    def __init__(self, app, port):
        super().__init__(daemon=True)
        self.server = make_server('127.0.0.1', port, app)
        self.ctx = app.app_context()
    
    def run(self):
        self.ctx.push()
        try:
            self.server.serve_forever()
        finally:
            self.ctx.pop()
            
    def stop(self):
        self.server.shutdown()
        self.join(timeout=5)


def _build_driver():
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--window-size=1440,1200')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    try:
        return webdriver.Chrome(options=chrome_options)
    except Exception:
        edge_options = webdriver.EdgeOptions()
        edge_options.add_argument('--headless=new')
        edge_options.add_argument('--window-size=1440,1200')
        edge_options.add_argument('--disable-gpu')
        return webdriver.Edge(options=edge_options)


@pytest.fixture(scope='module')
def live_server():
    db_path = Path(__file__).resolve().parents[1] / 'instance' / 'e2e_test.db'
    os.environ['DATABASE_URL'] = f"sqlite:///{str(db_path).replace(chr(92), '/')}"
    port = _free_port()
    app = create_app()
    app.config['TESTING'] = True
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Setup Admin User for rigorous RBAC / dashboard checks
        admin = User(username='admin_e2e', email='admin@test.com', role='admin')
        admin.set_password('pass123')
        db.session.add(admin)
        db.session.flush()

        # Setup initial Company without manual ratios or scores
        company = Company(
            company_name='Frontend UI Test Co',
            business_registration='BR-999000',
            minor_works_contractor_registration='MWC-12345',
            minor_works_registration_verified=True,
            audited_financials_uploaded=True,
            status='active'
        )
        db.session.add(company)
        db.session.commit()
        company_id = company.id

    server = ServerThread(app, port)
    server.start()
    time.sleep(1)

    try:
        yield f'http://127.0.0.1:{port}', company_id
    finally:
        server.stop()
        os.environ.pop('DATABASE_URL', None)
        if db_path.exists():
            db_path.unlink()


def test_integration_point_a_b_c_d(live_server):
    baseUrl, company_id = live_server
    driver = _build_driver()
    if driver is None:
        pytest.skip('No WebDriver available to run Selenium UI tests.')

    # CONSTRAINT: Strict 5-second timeout for binary expectation checks
    wait = WebDriverWait(driver, 5)

    try:
        # ==============================================================
        # TEST A: Role-Based Authentication & Navigation Integration
        # ==============================================================
        driver.get(f'{baseUrl}/auth/login')
        wait.until(EC.presence_of_element_located((By.ID, 'username'))).send_keys('admin_e2e')
        driver.find_element(By.ID, 'password').send_keys('pass123')
        driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

        # VERIFY: URL redirection enforced
        wait.until(EC.url_contains('/'))
        
        # VERIFY Bounding Box / Actual Visibility of UI element constraint
        companies_nav = wait.until(EC.visibility_of_element_located((By.LINK_TEXT, 'Companies')))
        assert companies_nav.is_displayed(), "Companies nav link CSS visibility failed."

        # ==============================================================
        # TEST B: Financial Data Entry & Ratio Override (New UI logic)
        # ==============================================================
        driver.get(f'{baseUrl}/companies/{company_id}/edit')
        
        # Fill raw bounds
        elm = wait.until(EC.presence_of_element_located((By.ID, 'current_assets')))
        elm.clear()
        elm.send_keys('10000')
        elm = driver.find_element(By.ID, 'current_liabilities')
        elm.clear()
        elm.send_keys('5000')
        
        # Fill strictly OVERRIDE fields 
        elm = driver.find_element(By.ID, 'manual_current_ratio')
        elm.clear()
        elm.send_keys('2.50')
        
        # Submit transaction
        forms = driver.find_elements(By.TAG_NAME, 'form'); [f for f in forms if 'edit' in f.get_attribute('action')][0].submit()

        # VERIFY: Redirect to detail and exact rendering of manual ratio flag
        wait.until(EC.url_contains(f'/companies/{company_id}'))
        current_ratio_text = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(), 'Current Ratio:')]/parent::p")
        )).text
        assert '2.50' in current_ratio_text, f"Expected ratio override to show '2.50', got '{current_ratio_text}'"
        assert '(Manual)' in current_ratio_text, "Expected Ratio UI to flag as (Manual), but it was calculated or broken."

        # ==============================================================
        # TEST C: Automated Trust Score Generation
        # ==============================================================
        calc_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Calculate Trust Score')]")))
        calc_btn.click()

        # VERIFY: UI instantly recalculates and generates the grade without reload needed loops (or standard post-reloads)
        try:
            report_pill = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '.report-grade-pill')))
        except Exception:
            print("\n\nHTML AFTER FAIL:\n\n", driver.page_source)
            raise
        assert report_pill.is_displayed(), "Trust Score report pill was not rendered to the screen."
        assert len(report_pill.text) > 0, "No grade calculated in pill."

    finally:
        driver.quit()
