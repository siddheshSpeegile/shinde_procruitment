"""Request protection: sign-in required for the whole API, permission checks on every change,
sign-in attempt limits and safe response headers.

guard() runs before every request (see app.py). The rules below use Flask endpoint names
("blueprint.function"); the permission keys are the same ones the admin panel uses to show
or hide its buttons, so the server now enforces what the panel already implies. A rule lists
the keys that are accepted (any one of them is enough). Endpoints without a rule only need
a valid sign-in.

Set ENFORCE_LOGIN=false in the environment to switch the guard off (emergency switch, for
example while an old app version without sign-in tokens is still in use).
"""
import os
from flask import request, g, current_app
from itsdangerous import BadSignature, SignatureExpired
from database import db
from utils import error_response, read_token, has_permission, _DEFAULT_SECRET

# No sign-in needed: the login itself, health checks, and images that <img> tags load.
PUBLIC = {
    'auth.login',
    'health_check',
    'db_health',
    'uploaded_product_photo',
    'products.get_product_photo_image',
    'products.get_vendor_logo',
}

RULES = {
    'auth.register': ('user.create',),
    'roles.update_role_permissions': ('role.edit',),
    'cart.add_to_cart': ('cart.create',),
    'cart.remove_from_cart': ('cart.delete',),
    'orders.create_order': ('purchase_order.create',),
    'order_drafts.list_drafts': ('purchase_order.create',),
    'order_drafts.get_draft': ('purchase_order.create',),
    'order_drafts.create_draft': ('purchase_order.create',),
    'order_drafts.update_draft': ('purchase_order.create',),
    'order_drafts.delete_draft': ('purchase_order.create',),
    'orders.edit_order': ('purchase_order.create', 'purchase_order.edit', 'purchase_order.approve'),
    'orders.mark_order_delivered': ('purchase_order.edit',),
    'orders.update_order_status': ('purchase_order.edit',),
    'orders.update_order_expected_delivery_date': ('purchase_order.edit',),
    'orders.update_order_payment_status': ('purchase_order.edit',),
    'products.create_product': ('product.create',),
    'products.update_product': ('product.edit', 'product.activate'),
    'products.create_variant': ('variant.create',),
    'products.create_variant_quick': ('variant.create', 'purchase_order.create'),
    'products.assign_sizes': ('variant.create', 'variant.edit', 'purchase_order.create'),
    'products.upload_vendor_logo': ('vendor.edit',),
    'products.create_gst_rate': ('gst.create',),
    'products.update_gst_rate': ('gst.edit',),
    'products.update_gst_rate_status': ('gst.edit',),
}
# Master data: colour, pattern, gender, category, size, vendor all follow the same create / edit / activate pattern.
for _fn, _perm in (('category', 'category'), ('color', 'color'), ('pattern', 'pattern'),
                   ('gender', 'gender'), ('size', 'size'), ('vendor', 'vendor')):
    RULES[f'products.create_{_fn}'] = (f'{_perm}.create',)
    RULES[f'products.update_{_fn}'] = (f'{_perm}.edit',)
    RULES[f'products.update_{_fn}_status'] = (f'{_perm}.activate',)


def _enforced():
    return os.getenv('ENFORCE_LOGIN', 'true').strip().lower() not in ('0', 'false', 'no', 'off')


def guard():
    """before_request: returns an error response to stop the request, or None to let it through."""
    if request.method == 'OPTIONS' or not request.path.startswith('/api/'):
        return None  # CORS preflight, and files outside the API
    endpoint = request.endpoint
    if endpoint is None or endpoint in PUBLIC or not _enforced():
        return None
    if current_app.config['SECRET_KEY'] == _DEFAULT_SECRET:
        # The default key is public (it is in the source code), so tokens could be forged.
        return error_response("Server is not configured: set a private SECRET_KEY.", 503)

    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return error_response("Please sign in to continue.", 401)
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

    needed = RULES.get(endpoint)
    if needed and not any(has_permission(user, key) for key in needed):
        return error_response("You do not have permission to do this.", 403)
    g.current_user = user
    return None


def add_headers(response):
    """after_request: headers that stop browsers guessing types, framing the API or caching answers."""
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'no-referrer')
    if request.path.startswith('/api/') and request.endpoint not in PUBLIC:
        response.headers['Cache-Control'] = 'no-store'
    return response


# ---------------------------------------------------------------------------
# Sign-in attempt limits (table login_attempt, migration 007). If the table is
# missing the checks quietly allow everything, so the order of deployment does not matter.
# ---------------------------------------------------------------------------
WINDOW_MINUTES = 15
MAX_FAILS_PER_IP = 5      # wrong passwords for one username from one address
MAX_FAILS_PER_USER = 20   # wrong passwords for one username from anywhere


def client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    return (forwarded.split(',')[0].strip() or request.remote_addr or '')[:64]


def login_locked(username):
    rows = db.execute_query(
        """SELECT COUNT(*) FILTER (WHERE ip = %s) AS by_ip, COUNT(*) AS by_user
           FROM login_attempt
           WHERE LOWER(username) = LOWER(%s) AND attempted_at > NOW() - INTERVAL '15 minutes'""",
        (client_ip(), username[:100]))
    if not rows:
        return False
    return rows[0]['by_ip'] >= MAX_FAILS_PER_IP or rows[0]['by_user'] >= MAX_FAILS_PER_USER


def record_failed_login(username):
    db.execute_insert("INSERT INTO login_attempt (username, ip) VALUES (%s, %s) RETURNING attempt_id",
                      (username[:100], client_ip()))
    db.execute_update("DELETE FROM login_attempt WHERE attempted_at < NOW() - INTERVAL '1 day'")


def clear_failed_logins(username):
    db.execute_update("DELETE FROM login_attempt WHERE LOWER(username) = LOWER(%s) AND ip = %s",
                      (username[:100], client_ip()))
