from services.credit_scorer import CreditScorer
from models.company import Company
from app import create_app, db

app = create_app()
with app.app_context():
    # Create a test company object
    c = Company()
    print('Testing credit scorer...')
    
    # Test the calculate method
    scorer = CreditScorer()
    try:
        score = scorer.calculate(c)
        print(f'Score: {score}')
        print('Test passed!')
    except Exception as e:
        print(f'Error: {e}')
        print('Test failed!')