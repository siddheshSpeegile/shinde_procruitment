from werkzeug.security import generate_password_hash, check_password_hash
import json
from functools import wraps
from flask import request, jsonify, current_app, g
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

def hash_password(password):
    """Hash a password"""
    return generate_password_hash(password)

def verify_password(password, hash):
    """Verify a password against its hash"""
    return check_password_hash(hash, password)

def success_response(data=None, message="Success", status_code=200):
    """Create a standard success response"""
    response = {
        'success': True,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code

def error_response(message="Error", status_code=400, data=None):
    """Create a standard error response"""
    response = {
        'success': False,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code

def validate_json(*required_fields):
    """Decorator to validate JSON request body"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return error_response("Request must be JSON", 400)
            
            data = request.get_json()
            if not data:
                return error_response("Empty request body", 400)
            
            for field in required_fields:
                if field not in data or data[field] is None:
                    return error_response(f"Missing required field: {field}", 400)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ---------------------------------------------------------------------------
# Signed login tokens, checked on every API request (see security.py). A token
# carries just the user id (and 'mobile' for the app); the user's status and
# role are read fresh from the database on every request, so deactivating
# someone or changing their role takes effect immediately.
# ---------------------------------------------------------------------------
TOKEN_MAX_AGE = 60 * 60  # seconds; matches the admin panel's one hour session
MOBILE_TOKEN_MAX_AGE = 30 * 24 * 60 * 60  # the app stays signed in for 30 days
_DEFAULT_SECRET = 'dev-secret-key-change-this'


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='shinde-auth')


def make_token(user_id, client=None):
    data = {'uid': user_id}
    if client == 'mobile':
        data['c'] = 'mobile'
    return _serializer().dumps(data)


def read_token(token):
    """User id of a valid, unexpired token. Raises SignatureExpired / BadSignature."""
    s = _serializer()
    data = s.loads(token, max_age=MOBILE_TOKEN_MAX_AGE)
    if data.get('c') != 'mobile':
        s.loads(token, max_age=TOKEN_MAX_AGE)
    return data.get('uid')


def user_id_from_token(token):
    """Who a login token belongs to (signature checked, expiry ignored). Used only to label audit entries."""
    try:
        return _serializer().loads(token).get('uid')
    except Exception:
        return None


def _has_permission(user, key):
    """Administrators can do everything; other roles need the permission key in the role table."""
    if user.get('role') == 'admin':
        return True
    role_id = user.get('role_id')
    if not role_id:
        return False
    from models import Role  # imported here to avoid a circular import
    role = Role.get_by_id(role_id)
    if role and str(role.get('role_name', '')).lower().startswith('admin'):
        return True
    perms = Role.get_permissions(role_id) or []
    return any(p['permission_key'] == key for p in perms)


def require_permission(key):
    """Decorator: the caller must send 'Authorization: Bearer <token>' from a login, and their role must have `key`."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if current_app.config['SECRET_KEY'] == _DEFAULT_SECRET:
                # The default key is public (it is in the source code), so tokens could be forged.
                return error_response("Server is not configured for user management: set a private SECRET_KEY.", 503)
            header = request.headers.get('Authorization', '')
            if not header.startswith('Bearer '):
                return error_response("Please sign in again.", 401)
            try:
                uid = read_token(header[7:])
            except SignatureExpired:
                return error_response("Your session has ended. Please sign in again.", 401)
            except BadSignature:
                return error_response("Please sign in again.", 401)
            from models import User
            user = User.get_by_id(uid)
            if not user or user.get('status') != 'active':
                return error_response("This account is not active.", 401)
            if not _has_permission(user, key):
                return error_response("You do not have permission to do this.", 403)
            g.current_user = user
            return f(*args, **kwargs)
        return wrapper
    return decorator


has_permission = _has_permission


def _token_user(token, expiring=True):
    """User row for a token (signature checked), or None. Inactive users never count.
    expiring=False ignores the token's age."""
    if not token:
        return None
    try:
        uid = read_token(token) if expiring else _serializer().loads(token).get('uid')
    except Exception:
        return None
    from models import User
    user = User.get_by_id(uid)
    return user if user and user.get('status') == 'active' else None


def _bearer():
    header = request.headers.get('Authorization', '')
    return header[7:] if header.startswith('Bearer ') else ''


def current_user_optional():
    """The signed-in user from a valid, unexpired token, or None. Never rejects the request.
    Used where the action is allowed for everyone but behaves differently for approvers."""
    if current_app.config['SECRET_KEY'] == _DEFAULT_SECRET:
        return None  # tokens could be forged with the public default key
    return _token_user(_bearer())


def notification_viewer():
    """Who is reading notifications: the token's user (even if the token is older than an hour,
    because the mobile app stays signed in), or None."""
    if current_app.config['SECRET_KEY'] == _DEFAULT_SECRET:
        return None
    return _token_user(_bearer(), expiring=False)
