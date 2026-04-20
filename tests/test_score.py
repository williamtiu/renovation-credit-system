
from app import create_app
from models.database import db
from models.company import Company
from services.credit_scorer import CreditScorer

app = create_app()
with app.app_context():
    company = db.session.get(Company, 1)
    if company:
        scorer = CreditScorer()
        result = scorer.calculate_score(company)
        print('Result:', result)
        try:
            cs = scorer.save_score(company, result)
            print('Saved:', cs)
        except Exception as e:
            print('Error:', e)
    else:
        print('Company not found')

