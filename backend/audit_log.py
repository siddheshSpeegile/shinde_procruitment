"""Server-side audit trail.

record_request() is called from app.py after every request. It stores a row for each
successful change (POST / PUT / PATCH / DELETE) so the admin panel's Audit Logs screen
can show what happened in BOTH the mobile app and the panel. It never stops or changes
a response: any problem while logging is printed and ignored.
"""
import json
import random
import re
from flask import request
from database import db
from utils import user_id_from_token

CHANGING = ('POST', 'PUT', 'PATCH', 'DELETE')
# Not worth logging: they only mark things read or look up prices.
SKIP = ('/api/audit-logs', '/api/notifications/read', '/api/pricing/last-batch')
SECRET = re.compile(r'pass(word)?|secret|token', re.I)
MAX_DETAILS = 4000  # characters
RETENTION_DAYS = 90  # older entries are deleted automatically

MASTER = r'(categories|genders|patterns|colors|sizes|gst-rates)'
# (method, path pattern, readable text). {1}, {2} are the pattern's groups; {po} is the new order number.
DESCRIBE = [
    ('POST', r'/api/auth/login', 'Signed in'),
    ('POST', r'/api/auth/register', 'Registered an account'),
    ('POST', r'/api/purchase-order', 'Created order PO-{po}'),
    ('POST', r'/api/orders/(\d+)/approve', 'Approved PO-{1}'),
    ('POST', r'/api/orders/(\d+)/reject', 'Rejected PO-{1}'),
    ('PUT', r'/api/orders/(\d+)', 'Edited PO-{1}'),
    ('PATCH', r'/api/orders/(\d+)/status', 'Changed status of PO-{1}'),
    ('PATCH', r'/api/orders/(\d+)/mark-delivered', 'Marked PO-{1} as delivered'),
    ('PATCH', r'/api/orders/(\d+)/expected-delivery-date', 'Changed expected date of PO-{1}'),
    ('PATCH', r'/api/orders/(\d+)/payment-status', 'Changed payment status of PO-{1}'),
    ('POST', r'/api/vendors', 'Added a vendor'),
    ('PUT', r'/api/vendors/(\d+)/logo', 'Updated logo of vendor #{1}'),
    ('PUT', r'/api/vendors/(\d+)', 'Edited vendor #{1}'),
    ('PATCH', r'/api/vendors/(\d+)/status', 'Changed status of vendor #{1}'),
    ('POST', r'/api/products', 'Added a product'),
    ('PUT', r'/api/products/(\d+)', 'Edited product #{1}'),
    ('POST', r'/api/variants/quick', 'Added a variant'),
    ('POST', r'/api/variants', 'Added a variant'),
    ('POST', r'/api/assign-sizes', 'Assigned sizes to a variant'),
    ('POST', r'/api/' + MASTER, 'Added to {1}'),
    ('PUT', r'/api/' + MASTER + r'/(\d+)', 'Edited {1} #{2}'),
    ('PATCH', r'/api/' + MASTER + r'/(\d+)/status', 'Changed status of {1} #{2}'),
    ('POST', r'/api/cart', 'Added to cart'),
    ('DELETE', r'/api/cart', 'Removed from cart'),
    ('POST', r'/api/users', 'Created a user'),
    ('PUT', r'/api/users/(\d+)', 'Edited user #{1}'),
    ('PATCH', r'/api/users/(\d+)/status', 'Changed status of user #{1}'),
    ('POST', r'/api/users/(\d+)/reset-password', 'Reset password of user #{1}'),
    ('PUT', r'/api/roles/(\d+)/permissions', 'Changed permissions of role #{1}'),
]


def redact(v):
    if isinstance(v, list):
        return [redact(x) for x in v]
    if isinstance(v, dict):
        return {k: ('********' if SECRET.search(str(k)) else redact(x)) for k, x in v.items()}
    return v


def request_source():
    """Which app sent the request. The mobile app sends X-Client: mobile; older builds are told apart by their user agent."""
    explicit = (request.headers.get('X-Client') or '').lower()
    if explicit in ('mobile', 'panel'):
        return explicit
    ua = (request.headers.get('User-Agent') or '').lower()
    if 'mozilla' in ua:
        return 'panel'      # a web browser
    if ua:
        return 'mobile'     # okhttp (Android), CFNetwork (iOS), Expo...
    return 'unknown'


def _describe(method, path, response_data):
    for m, pattern, text in DESCRIBE:
        match = re.fullmatch(pattern, path)
        if m == method and match:
            values = {str(i + 1): g for i, g in enumerate(match.groups())}
            values['po'] = (response_data or {}).get('po_id', '?') if isinstance(response_data, dict) else '?'
            return re.sub(r'\{(\w+)\}', lambda x: str(values.get(x.group(1), '?')), text)
    return f"{method} {path[len('/api'):]}"


def _actor(body, response_data):
    """(user_id, username, role_name) of whoever did it, or (None, name_or_None, None)."""
    token = (request.headers.get('Authorization') or '')[7:] if (request.headers.get('Authorization') or '').startswith('Bearer ') else ''
    candidates = []
    uid = user_id_from_token(token) if token else None
    if uid:
        candidates.append(uid)
    if isinstance(response_data, dict) and request.path == '/api/auth/login' and response_data.get('user_id'):
        candidates.append(response_data['user_id'])
    if isinstance(body, dict) and str(body.get('updated_by') or '').isdigit():
        candidates.append(int(body['updated_by']))
    for cid in candidates:
        rows = db.execute_query(
            'SELECT u.user_id, u.username, COALESCE(r.role_name, u.role) AS role_name '
            'FROM "User" u LEFT JOIN role r ON r.role_id = u.role_id WHERE u.user_id = %s', (cid,))
        if rows:
            return rows[0]['user_id'], rows[0]['username'], rows[0]['role_name']
    typed = body.get('username') if isinstance(body, dict) and request.path == '/api/auth/login' else None
    return None, typed, None


def record_request(response):
    try:
        path = request.path
        if (request.method not in CHANGING or not path.startswith('/api/') or path in SKIP
                or not 200 <= response.status_code < 300):
            return
        is_json = response.mimetype == 'application/json'
        data = response.get_json(silent=True) if is_json else None
        response_data = data.get('data') if isinstance(data, dict) else None
        message = data.get('message') if isinstance(data, dict) else None

        if request.mimetype == 'application/json':
            body = request.get_json(silent=True)
        else:
            body = '(file upload)' if request.files else None
        details = json.dumps({'body': redact(body)}, default=str)
        if len(details) > MAX_DETAILS:
            details = json.dumps({'body': '(too large to store)'})

        user_id, username, role_name = _actor(body, response_data)
        db.execute_insert(
            """
            INSERT INTO audit_log (user_id, username, role_name, source, method, path, action, status_code, message, details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
            RETURNING audit_id
            """,
            (user_id, username, role_name, request_source(), request.method, path[:255],
             _describe(request.method, path, response_data), response.status_code, message, details))
        if random.random() < 0.02:  # now and then, drop entries older than the retention period
            db.execute_update("DELETE FROM audit_log WHERE created_date < NOW() - make_interval(days => %s)", (RETENTION_DAYS,))
    except Exception as e:  # logging must never break the request
        print(f"Audit log error: {e}")


def list_entries(limit=300, source=None):
    query = """
    SELECT audit_id, created_date, user_id, username, role_name, source, method, path,
           action, status_code, message, details
    FROM audit_log
    """
    params = []
    if source in ('mobile', 'panel', 'unknown'):
        query += " WHERE source = %s"
        params.append(source)
    query += " ORDER BY created_date DESC, audit_id DESC LIMIT %s"
    params.append(limit)
    return db.execute_query(query, tuple(params))
