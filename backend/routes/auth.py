# from flask import Blueprint, request
# from models import User
# from utils import success_response, error_response, validate_json, hash_password, verify_password

# auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# @auth_bp.route('/login', methods=['POST'])
# @validate_json('username', 'password')
# def login():
#     """User login endpoint"""
#     data = request.get_json()
#     username = data.get('username')
#     password = data.get('password')
    
#     user = User.get_by_username(username)
    
#     if not user:
#         return error_response("User not found", 401)
    
#     if not verify_password(password, user['Password_Hash']):
#         return error_response("Invalid password", 401)
    
#     if user['Status'] != 'active':
#         return error_response("User account is inactive", 401)
    
#     # Return user info (in production, generate JWT token here)
#     # response_data = {
#     #     'user_id': user['User_ID'],
#     #     'username': user['Username'],
#     #     'email': user['Email'],
#     #     'role': user['Role']
#     # }

#     response_data = {
#     'user_id': user['user_id'],       # was User_ID
#     'username': user['username'],     # was Username
#     'email': user['email'],           # was Email
#     'role': user['role']              # was Role
# }
    
#     return success_response(response_data, "Login successful")

# @auth_bp.route('/register', methods=['POST'])
# @validate_json('username', 'password', 'email')
# def register():
#     """User registration endpoint"""
#     data = request.get_json()
#     username = data.get('username')
#     password = data.get('password')
#     email = data.get('email')
    
#     # Check if user exists
#     existing_user = User.get_by_username(username)
#     if existing_user:
#         return error_response("Username already exists", 400)
    
#     # Create user
#     password_hash = hash_password(password)
#     user_id = User.create(username, password_hash, email)
    
#     if user_id:
#         return success_response({'user_id': user_id}, "User registered successfully", 201)
#     else:
#         return error_response("Failed to create user", 500)

from flask import Blueprint, request
from models import User, Role
from utils import success_response, error_response, validate_json, hash_password, verify_password, make_token
from audit_log import request_source
from security import login_locked, record_failed_login, clear_failed_logins

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
@validate_json('username', 'password')
def login():
    """User login endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not isinstance(username, str) or not isinstance(password, str):
        return error_response("Enter your username and password.", 400)

    if login_locked(username):
        return error_response("Too many wrong attempts. Please wait 15 minutes and try again.", 429)

    user = User.get_by_username(username)

    # One message for an unknown user and a wrong password, so usernames cannot be guessed.
    if not user or not verify_password(password, user['password_hash']):
        record_failed_login(username)
        return error_response("Wrong username or password", 401)

    if user['status'] != 'active':
        return error_response("User account is inactive", 401)

    clear_failed_logins(username)

    # "User".role only allows 'admin' / 'user' (User_role_check); the real
    # role is "User".role_id -> role.role_name, returned as extra fields
    # so clients that only read 'role' keep working.
    role_id = user.get('role_id')
    role_row = Role.get_by_id(role_id) if role_id else None

    # Return user info (in production, generate JWT token here)
    response_data = {
        'user_id': user['user_id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'role_id': role_id,
        'role_name': role_row['role_name'] if role_row else None,
        'photo_url': user.get('photo_url'),
        # Proves who you are on every request: one hour for the panel, 30 days for the app.
        'token': make_token(user['user_id'], 'mobile' if request_source() == 'mobile' else None),
    }

    return success_response(response_data, "Login successful")

@auth_bp.route('/register', methods=['POST'])
@validate_json('username', 'password', 'email')
def register():
    """User registration endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    # Check if user exists
    existing_user = User.get_by_username(username)
    if existing_user:
        return error_response("Username already exists", 400)
    
    # Create user
    password_hash = hash_password(password)
    user_id = User.create(username, password_hash, email)
    
    if user_id:
        return success_response({'user_id': user_id}, "User registered successfully", 201)
    else:
        return error_response("Failed to create user", 500)