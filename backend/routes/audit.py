from flask import Blueprint, request
from audit_log import list_entries
from utils import success_response, error_response, require_permission

audit_bp = Blueprint('audit', __name__, url_prefix='/api')


@audit_bp.route('/audit-logs', methods=['GET'])
@require_permission('audit_log.view')
def get_audit_logs():
    """Newest first. Query: limit (default 300, max 1000), source = mobile | panel | unknown."""
    try:
        limit = max(1, min(int(request.args.get('limit', 300)), 1000))
    except ValueError:
        return error_response("limit must be a number", 400)
    rows = list_entries(limit, request.args.get('source'))
    if rows is None:
        return error_response("Failed to fetch the audit log. Run migration 005_audit_log.sql if you have not yet.", 500)
    return success_response([{
        'id': r['audit_id'],
        'at': r['created_date'].isoformat() if r['created_date'] else None,
        'user_id': r['user_id'],
        'username': r['username'],
        'role': r['role_name'],
        'source': r['source'],
        'method': r['method'],
        'path': r['path'],
        'action': r['action'],
        'status': r['status_code'],
        'message': r['message'],
        'details': r['details'],
    } for r in rows], "Audit log fetched successfully")
