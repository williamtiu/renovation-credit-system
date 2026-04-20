from app import create_app
from models.database import db
from models.user import User
from models.company import Company
from models.project import Project
from models.project_bid import ProjectBid

app = create_app()
with app.app_context():
    # 1. Get a customer, a company user, and a company
    customer = User.query.filter_by(role='customer').first()
    company = Company.query.first()
    company_user = User.query.filter_by(company_id=company.id).first()
    
    if not customer or not company:
        print("Need both a customer and a company in DB.")
        exit(1)
        
    print(f"Using Customer: {customer.username}, Company: {company.company_name}")
    
    # 2. Create a project
    new_proj = Project(
        customer_user_id=customer.id,
        title=f"Sample Test Renovation Project for {company.company_name}",
        description="Demo purpose solely to show up in the New Loan Application dropdown.",
        budget_amount=500000,
        status="bidding"
    )
    db.session.add(new_proj)
    db.session.commit()
    
    # 3. Create a bid from the company
    new_bid = ProjectBid(
        project_id=new_proj.id,
        company_id=company.id,
        submitted_by_user_id=company_user.id if company_user else 1, # fallback
        bid_amount=450000,
        status="accepted" # Instantly accept it
    )
    db.session.add(new_bid)
    db.session.commit()
    
    # 4. Link the accepted bid to the project
    new_proj.accepted_bid_id = new_bid.id
    new_proj.status = "in_progress"
    db.session.commit()
    
    print(f"SUCCESS! Project '{new_proj.title}' (ID {new_proj.id}) is now officially linked to Company '{company.company_name}' (ID {company.id}).")
    print("Go to http://localhost:5001/loans/add, select this Company, and you will see the Project in the dropdown!")
