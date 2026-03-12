from models.database import db
from models.project_bid import ProjectBid


def company_can_bid(company):
    return bool(
        company
        and company.status == 'active'
        and company.is_verified_for_bidding
    )


def accept_bid(project, bid):
    for existing_bid in project.bids:
        existing_bid.status = 'accepted' if existing_bid.id == bid.id else 'declined'
    project.accepted_bid_id = bid.id
    project.status = 'contracted'
    db.session.flush()