"""
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'renovation_credit.db')

def init_db():
    """Documnetation translated"""
    db.create_all()
    print(f"✅ Database initialized：{DATABASE_PATH}")
