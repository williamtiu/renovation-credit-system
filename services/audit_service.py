import json

from flask import g

from models.audit_log import AuditLog
from models.database import db


def log_action(action, target_type, target_id=None, details=None, actor_user_id=None):
    details = details or {}
    if actor_user_id is None and getattr(g, 'user', None) is not None:
        actor_user_id = g.user.id

    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=json.dumps(details, ensure_ascii=False),
    )
    db.session.add(entry)
    return entry