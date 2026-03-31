"""
Language Helper Utility for DecoFinance
Provides language switching functionality between English and Chinese
"""

from flask import session, request, redirect, url_for
from functools import wraps

# Supported languages
SUPPORTED_LANGUAGES = ['en', 'ch']
DEFAULT_LANGUAGE = 'en'

def get_current_language():
    """Get current language from session or default to 'en'"""
    return session.get('language', DEFAULT_LANGUAGE)

def set_language(lang):
    """Set language in session"""
    if lang in SUPPORTED_LANGUAGES:
        session['language'] = lang
        return True
    return False

def get_template_name(base_name):
    """
    Get template name based on current language.
    For Chinese, append _ch before extension.
    For English, use original name.
    
    Example:
    - base_name = 'auth/login.html'
    - Current lang = 'ch' -> 'auth/login_ch.html'
    - Current lang = 'en' -> 'auth/login.html'
    """
    if get_current_language() == 'ch':
        # Insert _ch before .html
        if base_name.endswith('.html'):
            return base_name[:-5] + '_ch.html'
    return base_name

def lang_required(f):
    """Decorator to ensure language is set in session"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'language' not in session:
            session['language'] = DEFAULT_LANGUAGE
        return f(*args, **kwargs)
    return decorated_function
