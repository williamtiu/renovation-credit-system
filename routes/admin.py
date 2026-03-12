from flask import Blueprint, render_template

from models.audit_log import AuditLog
from utils.auth_helper import role_required


admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/audit-logs')
@role_required('admin', 'reviewer')
def audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
    return render_template('admin/audit_logs.html', logs=logs)