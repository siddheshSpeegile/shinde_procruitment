from werkzeug.security import generate_password_hash, check_password_hash
import json
from functools import wraps
from flask import request, jsonify

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
