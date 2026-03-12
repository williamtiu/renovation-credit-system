from functools import wraps
from flask import session, redirect, url_for, flash, g, abort

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        if getattr(g, 'user', None) is not None and not g.user.is_active:
            session.pop('user_id', None)
            flash('Your account is inactive.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if g.user is None or g.user.role not in roles:
                flash('You do not have permission to access this page.', 'danger')
                return redirect(url_for('main.index'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def can_manage_company(user, company):
    if user is None:
        return False
    if user.role == 'admin':
        return True
    if user.role == 'reviewer':
        return True
    return user.company_id == company.id


def require_ownership(condition):
    if not condition:
        abort(403)
