from flask_sqlalchemy import SQLAlchemy
from flask import abort
import os

db = SQLAlchemy()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'renovation_credit.db')

def init_db():
    """Documnetation translated"""
    db.create_all()
    print(f"✅ Database initialized：{DATABASE_PATH}")


def get_or_404(model, object_id):
    instance = db.session.get(model, object_id)
    if instance is None:
        abort(404)
    return instance
