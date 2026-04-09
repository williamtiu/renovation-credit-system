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
    bid = next((b for b in project.bids if b.id == project.accepted_bid_id), None)
    print("Project id:", project.id)
    print("Company id:", bid.company_id)

    client = app.test_client()
    with client.session_transaction() as sess:
        sess['user_id'] = admin.id
    
    data = {
        'company_id': str(bid.company_id),
        'project_id': str(project.id),
        'loan_amount': '1000',
        'loan_purpose': 'Test',
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
        import re
        import html
        flashes = re.findall(r'flash-[a-z]+">\s*(.*?)\s*<button', res_text, re.DOTALL)
        print('Other flashes:', [html.unescape(f.strip()) for f in flashes])
