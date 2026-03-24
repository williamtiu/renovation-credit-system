from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from functools import wraps

from models.database import db
from models.user import User
from services.audit_service import log_action

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

SELF_REGISTRATION_ROLES = {'customer', 'company_user'}

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form.get('role', 'customer')

        if role not in SELF_REGISTRATION_ROLES:
            flash('Selected role is not available for self-registration.', 'danger')
            return redirect(url_for('auth.register'))
        
        existing_username = User.query.filter_by(username=username).first()
        existing_email = User.query.filter_by(email=email).first()
        if existing_username:
            flash('Username already exists.', 'danger')
            return redirect(url_for('auth.register'))
        if existing_email:
            flash('Email already exists.', 'danger')
            return redirect(url_for('auth.register'))
            
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        db.session.add(new_user)
        log_action('user_registered', 'User', details={'username': username, 'role': role}, actor_user_id=None)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    # Determine template based on language
    lang = session.get('language', 'en')
    if lang == 'ch':
        return render_template('zh/auth/register.html')
    return render_template('auth/register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        if user and not user.is_active:
            flash('Your account is inactive.', 'danger')
        elif user and user.check_password(password):
            session['user_id'] = user.id
            log_action('user_logged_in', 'User', user.id, {'username': user.username}, actor_user_id=user.id)
            db.session.commit()
            flash('Logged in successfully.', 'success')
            return redirect(url_for('main.index'))
            
        flash('Invalid username or password.', 'danger')
    
    # Determine template based on language
    lang = session.get('language', 'en')
    if lang == 'ch':
        return render_template('zh/auth/login.html')
    return render_template('auth/login.html')

@auth_bp.route('/logout')
def logout():
    if session.get('user_id'):
        log_action('user_logged_out', 'User', session.get('user_id'), actor_user_id=session.get('user_id'))
        db.session.commit()
    session.pop('user_id', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('auth.login'))
