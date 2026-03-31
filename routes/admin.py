from flask import Blueprint, render_template
from utils.template_helper import render_template_with_lang_fallback

from models.audit_log import AuditLog
from utils.auth_helper import role_required


admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/audit-logs')
@role_required('admin', 'reviewer')
def audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
    return render_template_with_lang_fallback('admin/audit_logs.html', logs=logs)