from flask import Blueprint
from models import Role, Permission
from utils import success_response, error_response

roles_bp = Blueprint('roles', __name__, url_prefix='/api')


@roles_bp.route('/roles', methods=['GET'])
def get_roles():
    """List every role"""
    roles = Role.get_all()
    if roles is None:
        return error_response("Failed to fetch roles", 500)
    return success_response(roles, "Roles fetched successfully")


@roles_bp.route('/roles/<int:role_id>/permissions', methods=['GET'])
def get_role_permissions(role_id):
    """Permissions currently granted to one role"""
    role = Role.get_by_id(role_id)
    if not role:
        return error_response("Role not found", 404)

    permissions = Role.get_permissions(role_id)
    if permissions is None:
        return error_response("Failed to fetch role permissions", 500)

    return success_response(permissions, "Role permissions fetched successfully")


@roles_bp.route('/permissions', methods=['GET'])
def get_permissions():
    """Every permission that exists in the system (for building a
    role-edit checkbox list later)"""
    permissions = Permission.get_all()
    if permissions is None:
        return error_response("Failed to fetch permissions", 500)
    return success_response(permissions, "Permissions fetched successfully")


@roles_bp.route('/roles/<int:role_id>/permissions', methods=['PUT'])
def update_role_permissions(role_id):
    """Replace a role's ENTIRE permission set - not additive. Sending
    permission_ids: [] clears every permission from this role."""
    from flask import request
    data = request.get_json()

    if data is None or 'permission_ids' not in data:
        return error_response("permission_ids is required (can be an empty list)", 400)

    role = Role.get_by_id(role_id)
    if not role:
        return error_response("Role not found", 404)

    permission_ids = data.get('permission_ids')
    if not isinstance(permission_ids, list):
        return error_response("permission_ids must be a list", 400)

    success = Role.set_permissions(role_id, permission_ids)

    if success:
        return success_response({'role_id': role_id, 'permission_ids': permission_ids}, "Role permissions updated successfully")
    else:
        return error_response("Failed to update role permissions", 500)