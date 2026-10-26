from flask import Blueprint, request
from models import Notification
from utils import success_response, error_response

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api')


def _user_id():
    """Optional ?userId= - whose 'read' state to use. No login is enforced on this API."""
    raw = request.args.get('userId')
    try:
        return int(raw) if raw else None
    except ValueError:
        return None


def _serialize(n):
    return {
        'id': n['notification_id'],
        'type': n['type'],
        'title': n['title'],
        'message': n['message'],
        'po_id': n['po_id'],
        'created_at': n['created_date'].isoformat() if n['created_date'] else None,
        'is_read': bool(n['is_read']),
    }


@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Newest first. Query: userId (read state), limit (default 50, max 200), unreadOnly=1.
    Also creates any missing 'delayed' alerts, so no background job is needed."""
    try:
        limit = max(1, min(int(request.args.get('limit', 50)), 200))
    except ValueError:
        return error_response("limit must be a number", 400)
    unread_only = request.args.get('unreadOnly') in ('1', 'true', 'yes')
    user_id = _user_id()

    Notification.sync_delayed()
    rows = Notification.list_for_user(user_id, limit, unread_only)
    if rows is None:
        return error_response("Failed to fetch notifications", 500)

    return success_response({
        'items': [_serialize(r) for r in rows],
        'unread_count': Notification.unread_count(user_id),
    }, "Notifications fetched successfully")


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_count():
    """Small request for the bell badge."""
    Notification.sync_delayed()
    return success_response({'unread_count': Notification.unread_count(_user_id())}, "OK")


@notifications_bp.route('/notifications/read', methods=['POST'])
def mark_notifications_read():
    """Body: {"user_id": 3, "ids": [1, 2]} or {"user_id": 3, "all": true}"""
    data = request.get_json(silent=True) or {}
    try:
        user_id = int(data.get('user_id'))
    except (TypeError, ValueError):
        return error_response("user_id is required", 400)

    if data.get('all'):
        Notification.mark_read(user_id)
    else:
        ids = data.get('ids')
        if not isinstance(ids, list) or not ids:
            return error_response("ids (a list) or all=true is required", 400)
        try:
            ids = [int(i) for i in ids]
        except (TypeError, ValueError):
            return error_response("ids must be numbers", 400)
        Notification.mark_read(user_id, ids)

    return success_response({'unread_count': Notification.unread_count(user_id)}, "Marked as read")
