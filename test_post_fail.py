from app import create_app
from models.database import db
from models.project import Project
from models.company import Company
from models.user import User

app = create_app()
app.config['TESTING'] = True

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    project = Project.query.filter(Project.accepted_bid_id.isnot(None), Project.customer_user_id.isnot(None)).first()
    other_company = Company.query.filter(Company.id != 10).first()
    print("Project id:", project.id)
    print("Wrong Company id:", other_company.id)

    client = app.test_client()
    with client.session_transaction() as sess:
        sess['user_id'] = admin.id
    
    data = {
        'company_id': str(other_company.id),
        'project_id': str(project.id),
        'loan_amount': '1000',
        'loan_purpose': 'Test Wrong Company',
        'loan_term_months': '12',
        'bank_name': 'MOX Bank',
        'expected_interest_rate': '5',
        'collateral_value': '0',
    }
    
    res = client.post('/loans/add', data=data, follow_redirects=True)
    res_text = res.data.decode('utf-8')
    if 'submitted successfully' in res_text:
        print('SUCCESS!')
    elif 'Selected project is not linked' in res_text:
        print('FAILED: Not linked error')
    else:
        print('Other output.')
