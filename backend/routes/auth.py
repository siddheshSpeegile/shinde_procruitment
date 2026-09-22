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
from models import User
from utils import success_response, error_response, validate_json, hash_password, verify_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
@validate_json('username', 'password')
def login():
    """User login endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.get_by_username(username)
    
    if not user:
        return error_response("User not found", 401)
    
    if not verify_password(password, user['password_hash']):
        return error_response("Invalid password", 401)
    
    if user['status'] != 'active':
        return error_response("User account is inactive", 401)
    
    # Return user info (in production, generate JWT token here)
    response_data = {
        'user_id': user['user_id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role']
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