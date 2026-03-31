"""
Configuration Management
Supports multiple environments: Development, Staging, Production
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///renovation_credit_v2.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    
    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Security Features
    SESSION_COOKIE_SECURE = True  # Only send cookie over HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    
    # Rate Limiting
    RATELIMIT_DEFAULT = '100 per hour'
    RATELIMIT_STORAGE_URL = 'memory://'
    
    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
    
    # Email (for notifications)
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS') or True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.environ.get('LOG_FILE') or 'app.log'
    
    # API
    API_RATE_LIMIT = '1000 per hour'
    
    # Subscription Plans
    SUBSCRIPTION_PLANS = {
        'starter': {
            'price': 0,
            'companies_limit': 1,
            'applications_per_month': 3,
            'features': ['basic_scoring', 'email_support']
        },
        'professional': {
            'price': 99,
            'companies_limit': 10,
            'applications_per_month': -1,  # unlimited
            'features': ['advanced_scoring', 'api_access', 'priority_support', 'ai_insights']
        },
        'enterprise': {
            'price': 499,
            'companies_limit': -1,  # unlimited
            'applications_per_month': -1,
            'features': ['custom_scoring', 'dedicated_support', 'sla', 'white_label', 'onboarding']
        }
    }


class DevelopmentConfig(Config):
    """Development environment"""
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    LOG_LEVEL = 'DEBUG'


class StagingConfig(Config):
    """Staging environment"""
    DEBUG = False
    TESTING = True
    LOG_LEVEL = 'INFO'


class ProductionConfig(Config):
    """Production environment"""
    DEBUG = False
    TESTING = False
    LOG_LEVEL = 'WARNING'
    
    # Stronger security in production
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DATABASE_URL = os.environ.get('DATABASE_URL')


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
