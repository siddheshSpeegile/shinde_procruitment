import re
from flask import Blueprint, request, g
from models import Role, UserAccount
from utils import success_response, error_response, hash_password, require_permission

users_bp = Blueprint('users', __name__, url_prefix='/api')

USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{3,30}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MOBILE_RE = re.compile(r'^\d{10}$')
MIN_PASSWORD = 8


def _serialize(u):
    return {
        'user_id': u['user_id'],
        'username': u['username'],
        'full_name': u.get('full_name'),
        'email': u['email'],
        'mobile_number': u.get('mobile_number'),
        'status': u['status'],
        'role_id': u['role_id'],
        'role_name': u.get('role_name'),
        'created_date': u['created_date'].isoformat() if u.get('created_date') else None,
    }


def _clean(value):
    return (value or '').strip() if isinstance(value, str) else ''


def _password_error(password, username):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD:
        return f"Password must be at least {MIN_PASSWORD} characters."
    if len(password) > 128:
        return "Password is too long."
    if username and password.lower() == username.lower():
        return "Password must not be the same as the username."
    return None


def _role_or_error(role_id):
    """Returns (role_row, role_text, None) or (None, None, error_response)."""
    try:
        role = Role.get_by_id(int(role_id))
    except (TypeError, ValueError):
        role = None
    if not role or role.get('status') not in (None, 'active'):
        return None, None, error_response("Choose a valid role.", 400)
    # "User".role only allows 'admin' / 'user' (User_role_check); the real role is role_id.
    text = 'admin' if str(role['role_name']).lower().startswith('admin') else 'user'
    return role, text, None


def _is_admin_user(u):
    return u.get('role') == 'admin' or str(u.get('role_name') or '').lower().startswith('admin')


def _fields_error(email, mobile):
    if not EMAIL_RE.match(email):
        return "Enter a valid email address."
    if mobile and not MOBILE_RE.match(mobile):
        return "Mobile number must be 10 digits."
    return None


@users_bp.route('/users', methods=['GET'])
@require_permission('user.view')
def list_users():
    rows = UserAccount.list_all()
    if rows is None:
        return error_response("Failed to fetch users. Run migration 004_user_profile.sql if you have not yet.", 500)
    return success_response([_serialize(r) for r in rows], "Users fetched successfully")


@users_bp.route('/users', methods=['POST'])
@require_permission('user.create')
def create_user():
    data = request.get_json(silent=True) or {}
    username = _clean(data.get('username'))
    email = _clean(data.get('email'))
    full_name = _clean(data.get('full_name')) or None
    mobile = _clean(data.get('mobile_number')) or None
    password = data.get('password')

    if not USERNAME_RE.match(username):
        return error_response("Username must be 3 to 30 letters, numbers, dot, dash or underscore.", 400)
    err = _fields_error(email, mobile) or _password_error(password, username)
    if err:
        return error_response(err, 400)
    _, role_text, role_err = _role_or_error(data.get('role_id'))
    if role_err:
        return role_err
    if UserAccount.username_taken(username):
        return error_response("That username is already taken.", 409)
    if UserAccount.email_taken(email):
        return error_response("That email address is already used by another user.", 409)

    user_id = UserAccount.create(username, hash_password(password), email, role_text, int(data['role_id']),
                                 full_name, mobile, g.current_user['user_id'])
    if not user_id:
        return error_response("Failed to create the user.", 500)
    return success_response(_serialize(UserAccount.get(user_id)), "User created", 201)


@users_bp.route('/users/<int:user_id>', methods=['PUT'])
@require_permission('user.edit')
def update_user(user_id):
    target = UserAccount.get(user_id)
    if not target:
        return error_response("User not found", 404)
    data = request.get_json(silent=True) or {}
    email = _clean(data.get('email'))
    full_name = _clean(data.get('full_name')) or None
    mobile = _clean(data.get('mobile_number')) or None
    err = _fields_error(email, mobile)
    if err:
        return error_response(err, 400)
    role, role_text, role_err = _role_or_error(data.get('role_id'))
    if role_err:
        return role_err
    if UserAccount.email_taken(email, exclude_id=user_id):
        return error_response("That email address is already used by another user.", 409)

    changing_role = int(data['role_id']) != (target['role_id'] or 0)
    if changing_role:
        if user_id == g.current_user['user_id']:
            return error_response("You cannot change your own role.", 400)
        if _is_admin_user(target) and role_text != 'admin' and target['status'] == 'active' \
                and UserAccount.count_active_admins(exclude_id=user_id) == 0:
            return error_response("This is the last active Administrator. Make another user an Administrator first.", 400)

    UserAccount.update(user_id, email, role_text if changing_role else (target['role'] or role_text),
                       int(data['role_id']), full_name, mobile, g.current_user['user_id'])
    return success_response(_serialize(UserAccount.get(user_id)), "User updated")


@users_bp.route('/users/<int:user_id>/status', methods=['PATCH'])
@require_permission('user.activate')
def set_user_status(user_id):
    target = UserAccount.get(user_id)
    if not target:
        return error_response("User not found", 404)
    status = (request.get_json(silent=True) or {}).get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    if status == 'inactive':
        if user_id == g.current_user['user_id']:
            return error_response("You cannot deactivate your own account.", 400)
        if _is_admin_user(target) and target['status'] == 'active' and UserAccount.count_active_admins(exclude_id=user_id) == 0:
            return error_response("This is the last active Administrator and cannot be deactivated.", 400)
    UserAccount.set_status(user_id, status, g.current_user['user_id'])
    return success_response(_serialize(UserAccount.get(user_id)), f"User is now {status}")


@users_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@require_permission('user.reset_password')
def reset_password(user_id):
    target = UserAccount.get(user_id)
    if not target:
        return error_response("User not found", 404)
    password = (request.get_json(silent=True) or {}).get('password')
    err = _password_error(password, target['username'])
    if err:
        return error_response(err, 400)
    UserAccount.set_password(user_id, hash_password(password), g.current_user['user_id'])
    return success_response({'user_id': user_id}, "Password reset")
