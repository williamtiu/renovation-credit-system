import os
import socket
import sys
import threading
import time
import tempfile
from contextlib import closing
from datetime import date
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from werkzeug.serving import make_server

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app import create_app
from models.audit_log import AuditLog
from models.company import Company
from models.credit_score import CreditScore
from models.database import db
from models.escrow_ledger_entry import EscrowLedgerEntry
from models.project import Project
from models.user import User


def _free_port():
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
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


def _build_driver(download_dir=None):
    attempts = []

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--window-size=1440,1200')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    if download_dir:
        chrome_options.add_experimental_option('prefs', {
            'download.default_directory': download_dir,
            'download.prompt_for_download': False,
            'download.directory_upgrade': True,
            'plugins.always_open_pdf_externally': True,
        })

    edge_options = webdriver.EdgeOptions()
    edge_options.add_argument('--headless=new')
    edge_options.add_argument('--window-size=1440,1200')
    edge_options.add_argument('--disable-gpu')
    if download_dir:
        edge_options.add_experimental_option('prefs', {
            'download.default_directory': download_dir,
            'download.prompt_for_download': False,
            'download.directory_upgrade': True,
            'plugins.always_open_pdf_externally': True,
        })

    for label, builder in [
        ('chrome', lambda: webdriver.Chrome(options=chrome_options)),
        ('edge', lambda: webdriver.Edge(options=edge_options)),
    ]:
        try:
            driver = builder()
            if download_dir and hasattr(driver, 'execute_cdp_cmd'):
                driver.execute_cdp_cmd('Page.setDownloadBehavior', {'behavior': 'allow', 'downloadPath': download_dir})
            return driver
        except WebDriverException as exc:
            attempts.append(f'{label}: {exc}')

    pytest.skip('No Selenium-compatible browser available. ' + ' | '.join(attempts))


def _wait_for_download(download_dir, timeout=10):
    end_time = time.time() + timeout
    while time.time() < end_time:
        pdf_files = list(Path(download_dir).glob('*.pdf'))
        if pdf_files and not list(Path(download_dir).glob('*.crdownload')) and not list(Path(download_dir).glob('*.tmp')):
            return pdf_files[0]
        time.sleep(0.25)
    raise AssertionError('Expected a PDF download but no completed file was found.')


def _login(driver, wait, live_server, username, password='password123'):
    driver.get(f'{live_server}/auth/login')
    username_input = wait.until(EC.presence_of_element_located((By.ID, 'username')))
    username_input.clear()
    username_input.send_keys(username)
    password_input = driver.find_element(By.ID, 'password')
    password_input.clear()
    password_input.send_keys(password)
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    wait.until(EC.presence_of_element_located((By.LINK_TEXT, 'Logout')))


def _register(driver, wait, live_server, username, email, role, password='password123'):
    driver.get(f'{live_server}/auth/register')
    wait.until(EC.presence_of_element_located((By.ID, 'username'))).send_keys(username)
    driver.find_element(By.ID, 'email').send_keys(email)
    Select(driver.find_element(By.ID, 'role')).select_by_value(role)
    driver.find_element(By.ID, 'password').send_keys(password)
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    wait.until(EC.presence_of_element_located((By.ID, 'username')))


def _set_checkbox(driver, element_id, checked=True):
    checkbox = driver.find_element(By.ID, element_id)
    if checkbox.is_selected() != checked:
        checkbox.click()


def _logout(driver, wait):
    wait.until(EC.presence_of_element_located((By.LINK_TEXT, 'Logout'))).click()
    wait.until(EC.presence_of_element_located((By.ID, 'username')))


def _open_project_from_list(driver, wait, live_server, title):
    driver.get(f'{live_server}/projects/')
    project_link = wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                f"//tr[td[normalize-space()='{title}']]//a[contains(@href, '/projects/') and normalize-space()='View']",
            )
        )
    )
    project_link.click()
    wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), title))


@pytest.fixture(scope='module')
def live_server():
    db_path = Path(__file__).resolve().parents[2] / 'instance' / 'selenium_test.db'
    os.environ['DATABASE_URL'] = f"sqlite:///{str(db_path).replace('\\', '/')}"
    port = _free_port()
    app = create_app()
    app.config['TESTING'] = True
    app.config['SESSION_COOKIE_SECURE'] = False

    with app.app_context():
        db.drop_all()
        db.create_all()

        customer = User(username='customer_ui', email='customer_ui@test.com', role='customer')
        customer.set_password('password123')
        company_user = User(username='builder_ui', email='builder_ui@test.com', role='company_user')
        company_user.set_password('password123')
        reviewer = User(username='reviewer_ui', email='reviewer_ui@test.com', role='reviewer')
        reviewer.set_password('password123')
        db.session.add_all([customer, company_user, reviewer])
        db.session.flush()

        company = Company(
            company_name='UI Builder Co',
            company_name_en='UI Builder Company Limited',
            business_registration='99887766',
            established_date=date(2020, 1, 1),
            contact_person='UI Tester',
            phone='12345678',
            email='ui-builder@test.com',
            district='Kowloon',
            annual_revenue=3000000,
            trust_score_cached=730,
            risk_level='low',
            status='active',
            owner_user_id=company_user.id,
            licence_verification_status='verified',
            insurance_verification_status='verified',
            is_verified_for_bidding=True,
        )
        db.session.add(company)
        db.session.flush()
        company_user.company_id = company.id

        peer_company = Company(
            company_name='Alt Builder Co',
            company_name_en='Alt Builder Limited',
            business_registration='11223344',
            established_date=date(2017, 4, 1),
            district='Hong Kong Island',
            annual_revenue=2200000,
            trust_score_cached=640,
            risk_level='medium',
            status='active',
            owner_user_id=company_user.id,
            licence_verification_status='verified',
            insurance_verification_status='verified',
            is_verified_for_bidding=True,
        )
        db.session.add(peer_company)
        db.session.flush()

        db.session.add_all([
            CreditScore(
                company_id=company.id,
                credit_score=730,
                credit_grade='AA',
                financial_strength_score=220,
                operational_stability_score=180,
                credit_history_score=175,
                qualification_score=80,
                industry_risk_score=75,
                risk_level='low',
                risk_factors='["Insurance renewal due within 30 days"]',
                recommended_loan_limit=3500000,
                recommended_interest_rate=4.0,
            ),
            CreditScore(
                company_id=peer_company.id,
                credit_score=640,
                credit_grade='BBB',
                financial_strength_score=180,
                operational_stability_score=160,
                credit_history_score=150,
                qualification_score=70,
                industry_risk_score=80,
                risk_level='medium',
                risk_factors='["Moderate debt pressure"]',
                recommended_loan_limit=2100000,
                recommended_interest_rate=5.5,
            ),
            AuditLog(actor_user_id=reviewer.id, action='trust_score_calculated', target_type='Company', target_id=company.id, details_json='{"score": 730}'),
            AuditLog(actor_user_id=reviewer.id, action='company_updated', target_type='Company', target_id=company.id, details_json='{"field": "verification"}'),
        ])
        db.session.commit()

    server = ServerThread(app, port)
    server.start()
    time.sleep(1)

    try:
        yield f'http://127.0.0.1:{port}'
    finally:
        server.stop()
        os.environ.pop('DATABASE_URL', None)
        if db_path.exists():
            db_path.unlink()


def test_customer_creates_project_and_company_submits_bid(live_server):
    driver = _build_driver()
    wait = WebDriverWait(driver, 10)

    try:
        _login(driver, wait, live_server, 'customer_ui')
        driver.get(f'{live_server}/projects/add')

        wait.until(EC.presence_of_element_located((By.ID, 'title'))).send_keys('Selenium Project')
        driver.find_element(By.ID, 'budget_amount').send_keys('280000')
        driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Selenium Project'))
        _logout(driver, wait)

        _login(driver, wait, live_server, 'builder_ui')
        _open_project_from_list(driver, wait, live_server, 'Selenium Project')
        wait.until(EC.presence_of_element_located((By.NAME, 'bid_amount'))).send_keys('250000')
        driver.find_element(By.NAME, 'proposed_duration_days').send_keys('75')
        driver.find_element(By.NAME, 'proposal_summary').send_keys('Selenium browser bid submission')
        driver.find_element(By.CSS_SELECTOR, 'form[action$="/bids"] button[type="submit"]').click()

        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Bid submitted successfully.'))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), '250,000'))
    finally:
        driver.quit()


def test_customer_accepts_bid_submits_milestone_and_opens_dispute(live_server):
    driver = _build_driver()
    wait = WebDriverWait(driver, 10)
    project_title = 'Milestone Dispute Project'

    try:
        _login(driver, wait, live_server, 'customer_ui')
        driver.get(f'{live_server}/projects/add')

        wait.until(EC.presence_of_element_located((By.ID, 'title'))).send_keys(project_title)
        driver.find_element(By.ID, 'budget_amount').send_keys('360000')
        driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), project_title))
        _logout(driver, wait)

        _login(driver, wait, live_server, 'builder_ui')
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.presence_of_element_located((By.NAME, 'bid_amount'))).send_keys('340000')
        driver.find_element(By.NAME, 'proposed_duration_days').send_keys('90')
        driver.find_element(By.NAME, 'proposal_summary').send_keys('Full scope renovation bid for dispute flow')
        driver.find_element(By.CSS_SELECTOR, 'form[action$="/bids"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Bid submitted successfully.'))
        _logout(driver, wait)

        _login(driver, wait, live_server, 'customer_ui')
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'form[action*="/accept"] button[type="submit"]'))).click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Bid accepted and project contracted.'))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'contracted'))

        driver.find_element(By.NAME, 'sequence_no').send_keys('1')
        driver.find_element(By.NAME, 'name').send_keys('Initial demolition')
        driver.find_element(By.NAME, 'planned_amount').send_keys('70000')
        driver.find_element(By.NAME, 'planned_percentage').send_keys('20')
        driver.find_element(By.CSS_SELECTOR, 'form[action$="/milestones/add"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Milestone created successfully.'))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Initial demolition'))
        _logout(driver, wait)

        _login(driver, wait, live_server, 'builder_ui')
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.presence_of_element_located((By.NAME, 'evidence_notes'))).send_keys('Photos and site notes uploaded for review')
        driver.find_element(By.CSS_SELECTOR, 'form[action*="/milestones/"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Milestone submitted for approval.'))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'submitted'))
        _logout(driver, wait)

        _login(driver, wait, live_server, 'customer_ui')
        _open_project_from_list(driver, wait, live_server, project_title)
        Select(wait.until(EC.presence_of_element_located((By.ID, 'milestone_id')))).select_by_visible_text('1. Initial demolition')
        driver.find_element(By.NAME, 'dispute_type').send_keys('quality_issue')
        driver.find_element(By.NAME, 'description').send_keys('Finish quality is below expected standard.')
        dispute_form = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'form[action$="/disputes/add"]')))
        driver.execute_script('arguments[0].submit();', dispute_form)

        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Dispute opened and payment states frozen.'))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'disputed'))

        driver.get(f'{live_server}/disputes/')
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), project_title))
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'quality_issue'))
    finally:
        driver.quit()


def test_reviewer_can_compare_reports_and_download_pdf(live_server):
    with tempfile.TemporaryDirectory() as download_dir:
        driver = _build_driver(download_dir=download_dir)
        wait = WebDriverWait(driver, 10)

        try:
            _login(driver, wait, live_server, 'reviewer_ui')
            driver.get(f'{live_server}/dashboard')

            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Score Trend'))
            wait.until(EC.presence_of_element_located((By.ID, 'score-trend-chart')))
            wait.until(EC.presence_of_element_located((By.ID, 'dispute-trend-chart')))

            driver.find_element(By.LINK_TEXT, 'Compare Reports').click()
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Compare Company Reports'))

            Select(wait.until(EC.presence_of_element_located((By.ID, 'verification')))).select_by_visible_text('Verified')
            driver.find_element(By.CSS_SELECTOR, 'form[action$="/compare-report"] button[type="submit"]').click()
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Select Companies'))

            checkboxes = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'input[name="company_ids"]')))
            for checkbox in checkboxes[:2]:
                if not checkbox.is_selected():
                    checkbox.click()

            driver.find_element(By.XPATH, "//button[normalize-space()='Compare selected']").click()
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Side-By-Side Summary'))
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Alt Builder Co'))

            driver.find_element(By.LINK_TEXT, 'Open report').click()
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Audit Snapshot'))
            wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Recent Audit Timeline'))

            driver.find_element(By.LINK_TEXT, 'Download PDF').click()
            downloaded_file = _wait_for_download(download_dir)
            assert downloaded_file.name.endswith('.pdf')
        finally:
            driver.quit()


def test_full_customer_and_company_user_journeys(live_server):
    driver = _build_driver()
    wait = WebDriverWait(driver, 10)
    unique_suffix = str(int(time.time()))

    customer_username = f'customer_journey_{unique_suffix}'
    customer_email = f'customer_journey_{unique_suffix}@test.com'
    company_username = f'builder_journey_{unique_suffix}'
    company_email = f'builder_journey_{unique_suffix}@test.com'
    project_title = f'Journey Flat Renovation {unique_suffix}'

    try:
        # Customer journey: register, login, and create project request with category/size/style details.
        _register(driver, wait, live_server, customer_username, customer_email, 'customer')
        _login(driver, wait, live_server, customer_username)
        driver.get(f'{live_server}/projects/add')

        wait.until(EC.presence_of_element_located((By.ID, 'title'))).send_keys(project_title)
        driver.find_element(By.ID, 'property_type').send_keys('Flat - Residential')
        driver.find_element(By.ID, 'description').send_keys('Size: 680 sqft; Style: Scandinavian modern')
        driver.find_element(By.ID, 'property_address').send_keys('88 Testing Road, Kowloon')
        driver.find_element(By.ID, 'district').send_keys('Kowloon')
        driver.find_element(By.ID, 'budget_amount').send_keys('420000')
        driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), project_title))
        _logout(driver, wait)

        # Decoration company journey: register/login, complete profile setup (license + consent simulation), then submit bid.
        _register(driver, wait, live_server, company_username, company_email, 'company_user')
        _login(driver, wait, live_server, company_username)
        driver.get(f'{live_server}/companies/add')

        wait.until(EC.presence_of_element_located((By.ID, 'company_name'))).send_keys(f'Journey Builder {unique_suffix}')
        driver.find_element(By.ID, 'business_registration').send_keys(f'BR{unique_suffix[-8:]}')
        driver.find_element(By.ID, 'contact_person').send_keys('Journey Manager')
        driver.find_element(By.ID, 'phone').send_keys('23456789')
        driver.find_element(By.ID, 'email').send_keys(company_email)
        driver.find_element(By.ID, 'district').send_keys('Kowloon')
        driver.find_element(By.ID, 'annual_revenue').send_keys('2800000')

        # Simulate BD license and TU consent readiness through compliance profile fields.
        _set_checkbox(driver, 'has_license', True)
        driver.find_element(By.ID, 'license_type').send_keys('Minor Works Contractor')
        driver.find_element(By.ID, 'licence_number').send_keys(f'LIC-{unique_suffix[-6:]}')
        Select(driver.find_element(By.ID, 'licence_verification_status')).select_by_value('verified')
        driver.find_element(By.ID, 'insurance_provider').send_keys('Trusted Insurer')
        Select(driver.find_element(By.ID, 'insurance_verification_status')).select_by_value('verified')
        _set_checkbox(driver, 'osh_policy_in_place', True)
        _set_checkbox(driver, 'heavy_lifting_compliance', True)
        _set_checkbox(driver, 'lifting_equipment_available', True)
        driver.find_element(By.ID, 'safety_training_coverage').send_keys('90')
        Select(driver.find_element(By.ID, 'esg_policy_level')).select_by_value('basic')

        driver.find_element(By.CSS_SELECTOR, 'button[type="submit"].btn-primary').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Company created successfully.'))

        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.presence_of_element_located((By.NAME, 'bid_amount'))).send_keys('398000')
        driver.find_element(By.NAME, 'proposed_duration_days').send_keys('80')
        driver.find_element(By.NAME, 'proposal_summary').send_keys('Turnkey delivery with milestone reporting')
        driver.find_element(By.CSS_SELECTOR, 'form[action$="/bids"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Bid submitted successfully.'))
        _logout(driver, wait)

        # Customer continues: review bids, accept/sign contract, add milestone, then approve after company submission.
        _login(driver, wait, live_server, customer_username)
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'form[action*="/accept"] button[type="submit"]'))).click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Bid accepted and project contracted.'))

        driver.find_element(By.NAME, 'sequence_no').send_keys('1')
        driver.find_element(By.NAME, 'name').send_keys('Waterproofing and prep')
        driver.find_element(By.NAME, 'planned_amount').send_keys('100000')
        driver.find_element(By.NAME, 'planned_percentage').send_keys('25')
        driver.find_element(By.CSS_SELECTOR, 'form[action$="/milestones/add"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Milestone created successfully.'))
        _logout(driver, wait)

        _login(driver, wait, live_server, company_username)
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.presence_of_element_located((By.NAME, 'evidence_notes'))).send_keys('Progress photos and delivery checklist uploaded')
        driver.find_element(By.CSS_SELECTOR, 'form[action*="/milestones/"] button[type="submit"]').click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Milestone submitted for approval.'))
        _logout(driver, wait)

        _login(driver, wait, live_server, customer_username)
        _open_project_from_list(driver, wait, live_server, project_title)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'form[action*="/approve"] button[type="submit"]'))).click()
        wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), 'Milestone approved.'))

        with create_app().app_context():
            project = Project.query.filter_by(title=project_title).first()
            assert project is not None
            released_entries = EscrowLedgerEntry.query.filter_by(project_id=project.id, entry_type='released').count()
            assert released_entries >= 1
    finally:
        driver.quit()