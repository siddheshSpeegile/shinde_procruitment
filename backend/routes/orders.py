from flask import Blueprint, request, g
from datetime import datetime
from models import PurchaseOrder, Notification
from utils import success_response, error_response, validate_json, require_permission, current_user_optional, has_permission
from audit_log import request_source

orders_bp = Blueprint('orders', __name__, url_prefix='/api')


def _actor(data):
    """Optional updated_by sent by the client (the admin panel sends it).
    Returns (user_id, username) only if that user exists, else (None, None) -
    so a wrong id can never make an order update fail."""
    raw = (data or {}).get('updated_by')
    name = Notification.actor_name(raw)
    return (int(raw), name) if name else (None, None)


def _notify(type_, po_id, title, message, actor_id=None):
    """Creating a notification must never break the order action itself."""
    try:
        Notification.create(type_, title, message, po_id=po_id, created_by=actor_id)
    except Exception as e:
        print(f"Notification error: {e}")


def _by(name):
    return f" by {name}" if name else ""


def _notify_user(type_, po_id, title, message, recipient_id, actor_id=None):
    """A notification only one user sees (for example the person who created the order)."""
    if not recipient_id:
        return
    try:
        Notification.create(type_, title, message, po_id=po_id, created_by=actor_id,
                            audience='user', recipient_user_id=recipient_id)
    except Exception as e:
        print(f"Notification error: {e}")


def _notify_approvers(type_, po_id, title, message, actor_id=None):
    """A notification for everyone who can approve purchase orders."""
    try:
        Notification.create(type_, title, message, po_id=po_id, created_by=actor_id, audience='approvers')
    except Exception as e:
        print(f"Notification error: {e}")


def _blocked(old):
    """Orders that are waiting for approval or rejected can only be changed through approve / reject / edit."""
    if old and old['status'] in ('pending_approval', 'rejected'):
        return error_response("This order is waiting for approval or was rejected, so it cannot be changed this way.", 409)
    return None


def _money(info):
    return f"Rs {float(info['total']):,.0f}" if info else ''


@orders_bp.route('/pricing/last-batch', methods=['POST'])
@validate_json('items')
def get_last_pricing_batch():
    """For each {variant_id, size_id, product_id?} in items, returns the
    most recently used cost/mrp/gst for that combination (or nulls if
    there's no history) - lets the Product Details screen prefill its
    editable pricing cells instead of leaving them blank/zero."""
    data = request.get_json()
    items = data.get('items') or []

    results = []
    for item in items:
        variant_id = item.get('variant_id')
        size_id = item.get('size_id')
        product_id = item.get('product_id')
        pricing = PurchaseOrder.get_last_pricing(variant_id, size_id, product_id)
        results.append({
            'variant_id': variant_id,
            'size_id': size_id,
            'cost': float(pricing['cost']) if pricing else None,
            'mrp': float(pricing['mrp']) if pricing else None,
            'gst': float(pricing['gst']) if pricing and pricing['gst'] is not None else None,
        })

    return success_response(results, "Pricing history fetched")


def _build_order_display(o):
    """Shared shape for an order row returned to the frontend - used by
    both the vendor-scoped and global orders listings so they never drift
    apart. Delivery state (on time / delayed / delivered) is computed
    fresh here on every request, never stored."""
    delivery = PurchaseOrder.compute_delivery_state(
        o['status'], o.get('expected_delivery_date'), o.get('delivered_date')
    )
    return {
        'id': o['po_id'],
        'po': f"PO-{o['po_id']}",
        'brand': o['vendor_name'],
        'logo': o['logo_url'] or '/assets/vendor.png',
        # Cover photo of the order's first product - what the order cards show
        'image': o.get('product_image'),
        'date': o['order_date'].strftime('%d %b %Y') if o['order_date'] else '',
        'expected_delivery_date': o['expected_delivery_date'].strftime('%d %b %Y') if o.get('expected_delivery_date') else None,
        'price': f"₹{int(o['order_total']):,}",
        'status': o['status'],
        'payment_status': o.get('payment_status', 'unpaid'),
        'delivery': delivery,
    }

@orders_bp.route('/orders', methods=['GET'])
def get_orders():
    """Get all orders for a vendor"""
    vendor_id = request.args.get('vendorId')
    
    if not vendor_id:
        return error_response("vendorId parameter required", 400)
    
    orders = PurchaseOrder.get_all_for_vendor(vendor_id)
    
    if orders is None:
        return error_response("Failed to fetch orders", 500)
    
    return success_response(orders, "Orders fetched successfully")

@orders_bp.route('/orders/all', methods=['GET'])
def get_all_orders():
    """Get every purchase order across all vendors (dashboard 'View All' /
    bottom-nav Orders), or just one vendor's orders if vendorId is passed
    (Vendor Workspace's own Orders entry).

    Optional query params:
      deliveryStatus = all | pending | delayed | delivered
        (matches PurchaseOrder.compute_delivery_state's 'state' - computed
        fresh from expected_delivery_date vs today, not a stored value)
      dateFrom = YYYY-MM-DD, dateTo = YYYY-MM-DD
        (only orders whose expected_delivery_date falls in this range,
        inclusive - either can be given alone for an open-ended range.
        Answers "how many orders are due between day X and day Y")

    Both filters apply together (AND, not either/or): dateFrom/dateTo
    narrows the SQL query first, then deliveryStatus filters that result
    further - so e.g. dateFrom=2026-09-20&dateTo=2026-09-25&deliveryStatus=delayed
    means "delayed orders due in that window", not "delayed OR in that window".
    """
    vendor_id = request.args.get('vendorId')
    delivery_status = request.args.get('deliveryStatus', 'all')
    date_from_param = request.args.get('dateFrom')
    date_to_param = request.args.get('dateTo')

    def parse_date(param_name, value):
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError(f"{param_name} must be in YYYY-MM-DD format")

    try:
        date_from = parse_date('dateFrom', date_from_param) if date_from_param else None
        date_to = parse_date('dateTo', date_to_param) if date_to_param else None
    except ValueError as e:
        return error_response(str(e), 400)

    orders_raw = PurchaseOrder.get_all(vendor_id, date_from, date_to)

    if orders_raw is None:
        return error_response("Failed to fetch orders", 500)

    orders = [_build_order_display(o) for o in orders_raw]

    if delivery_status != 'all':
        orders = [o for o in orders if o['delivery']['state'] == delivery_status]

    return success_response(orders, "All orders fetched successfully")

@orders_bp.route('/orders/<int:po_id>', methods=['GET'])
def get_order(po_id):
    """Get a specific order with all details"""
    po = PurchaseOrder.get_po_details(po_id)
    
    if not po:
        return error_response("Order not found", 404)
    
    return success_response(po, "Order fetched successfully")

@orders_bp.route('/purchase-order', methods=['POST'])
@validate_json('vendor_id', 'order_date', 'products', 'expected_delivery_date')
def create_order():
    """Create a new purchase order"""
    data = request.get_json()
    vendor_id = data.get('vendor_id')
    order_date = data.get('order_date')
    products = data.get('products')  # List of products with variants and sizes
    remarks = data.get('remarks', '')
    expected_delivery_date = data.get('expected_delivery_date')
    
    # Validate products structure
    if not isinstance(products, list) or len(products) == 0:
        return error_response("products must be a non-empty list", 400)
    
    # Orders from the mobile app are placed straight away. Orders from the admin panel (or any request we cannot
    # identify) wait for approval, unless the person creating it is allowed to approve.
    actor_user = current_user_optional()
    if request_source() == 'mobile' or (actor_user and has_permission(actor_user, 'purchase_order.approve')):
        status = 'confirmed'
    else:
        status = 'pending_approval'
    legacy_id, legacy_name = _actor(data)
    creator_id = actor_user['user_id'] if actor_user else legacy_id
    creator = actor_user['username'] if actor_user else legacy_name

    po_id = PurchaseOrder.create_order(vendor_id, order_date, products, remarks, expected_delivery_date, status, creator_id)

    if po_id:
        info = Notification.order_summary(po_id)
        due = info['expected_delivery_date'].strftime('%d %b %Y') if info and info['expected_delivery_date'] else 'date not set'
        if status == 'confirmed':
            if info:
                _notify('order_created', po_id, f"New order PO-{po_id}",
                        f"{info['vendor_name']} - {_money(info)} - expected {due}{_by(creator)}", creator_id)
            return success_response({'po_id': po_id, 'status': status}, "Purchase order created successfully", 201)
        if info:
            _notify_approvers('order_submitted', po_id, f"PO-{po_id} needs approval",
                              f"{info['vendor_name']} - {_money(info)} - expected {due}. Submitted{_by(creator)}. Open it to approve, edit or reject.", creator_id)
        return success_response({'po_id': po_id, 'status': status}, "Purchase order submitted for approval", 201)
    else:
        return error_response("Failed to create purchase order", 500)


@orders_bp.route('/orders/<int:po_id>/mark-delivered', methods=['PATCH'])
def mark_order_delivered(po_id):
    """Convenience shortcut for the app's "Mark as Delivered" button -
    equivalent to PATCH /orders/<po_id>/status with {"status": "delivered"}.
    Safe to call more than once - a repeat call is a genuine no-op and
    still returns success, it just won't reset delivered_date."""
    actor_id, actor = _actor(request.get_json(silent=True))
    old = PurchaseOrder.get_by_id(po_id)
    blocked = _blocked(old)
    if blocked:
        return blocked
    rows = PurchaseOrder.mark_delivered(po_id, actor_id)

    if rows:
        if old and old['status'] != 'delivered':
            info = Notification.order_summary(po_id)
            _notify('order_delivered', po_id, f"PO-{po_id} delivered",
                    f"{info['vendor_name'] if info else 'Vendor'} order marked as delivered{_by(actor)}.", actor_id)
        return success_response({'po_id': po_id}, "Order marked as delivered")
    else:
        return error_response("Order not found", 404)


# The only values the DB's purchase_order_status_check CHECK constraint
# actually allows - keep this in sync if that constraint ever changes.
ALLOWED_ORDER_STATUSES = {'draft', 'confirmed', 'delivered'}


@orders_bp.route('/orders/<int:po_id>/status', methods=['PATCH'])
@validate_json('status')
def update_order_status(po_id):
    """Generic status update - not wired into the mobile app's UI yet,
    for calling from Postman now and from the admin panel once that
    exists. Body: {"status": "draft" | "confirmed" | "delivered"}.

    Setting status to 'delivered' stamps delivered_date to now; setting
    it to anything else clears delivered_date, since the order is no
    longer considered delivered (see PurchaseOrder.update_status)."""
    data = request.get_json()
    status = data.get('status')

    if status not in ALLOWED_ORDER_STATUSES:
        return error_response(
            f"status must be one of: {', '.join(sorted(ALLOWED_ORDER_STATUSES))}",
            400,
        )

    actor_id, actor = _actor(data)
    old = PurchaseOrder.get_by_id(po_id)
    blocked = _blocked(old)
    if blocked:
        return blocked
    rows = PurchaseOrder.update_status(po_id, status, actor_id)

    if rows:
        if old and old['status'] != status:
            info = Notification.order_summary(po_id)
            vendor = info['vendor_name'] if info else 'Vendor'
            if status == 'delivered':
                _notify('order_delivered', po_id, f"PO-{po_id} delivered", f"{vendor} order marked as delivered{_by(actor)}.", actor_id)
            else:
                _notify('order_status', po_id, f"PO-{po_id} status: {status.title()}",
                        f"{vendor} order changed from {old['status']} to {status}{_by(actor)}.", actor_id)
        return success_response({'po_id': po_id, 'status': status}, "Order status updated")
    else:
        return error_response("Order not found", 404)


@orders_bp.route('/orders/<int:po_id>/expected-delivery-date', methods=['PATCH'])
@validate_json('expected_delivery_date')
def update_order_expected_delivery_date(po_id):
    """Overrides an order's expected delivery date. There is no separate
    'delayed' status to set - delayed is always computed by comparing this
    date to today. To make an order show up as delayed (e.g. to test the
    Delayed filter), PATCH this with a past date on a non-delivered order:

        PATCH /api/orders/12/expected-delivery-date
        { "expected_delivery_date": "2026-09-10" }   (any date before today)

    Body: {"expected_delivery_date": "YYYY-MM-DD"}"""
    data = request.get_json()
    date_str = data.get('expected_delivery_date')

    try:
        parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return error_response("expected_delivery_date must be in YYYY-MM-DD format", 400)

    actor_id, actor = _actor(data)
    old = PurchaseOrder.get_by_id(po_id)
    blocked = _blocked(old)
    if blocked:
        return blocked
    rows = PurchaseOrder.update_expected_delivery_date(po_id, parsed_date, actor_id)

    if rows:
        if old and old.get('expected_delivery_date') != parsed_date:
            info = Notification.order_summary(po_id)
            _notify('order_date', po_id, f"PO-{po_id} expected date changed",
                    f"{info['vendor_name'] if info else 'Vendor'}: now due {parsed_date.strftime('%d %b %Y')}{_by(actor)}.", actor_id)
        return success_response(
            {'po_id': po_id, 'expected_delivery_date': date_str},
            "Expected delivery date updated",
        )
    else:
        return error_response("Order not found", 404)


ALLOWED_PAYMENT_STATUSES = {'paid', 'unpaid'}


@orders_bp.route('/orders/<int:po_id>/payment-status', methods=['PATCH'])
@validate_json('payment_status')
def update_order_payment_status(po_id):
    """Marks whether the vendor has been paid for this order. Entirely
    independent of delivery status (PATCH /status) - an order can be
    delivered and still unpaid, or paid before it's delivered.

    Body: {"payment_status": "paid" | "unpaid"}
    Drives the dashboard's Amount KPI, which sums only unpaid orders."""
    data = request.get_json()
    payment_status = data.get('payment_status')

    if payment_status not in ALLOWED_PAYMENT_STATUSES:
        return error_response(
            f"payment_status must be one of: {', '.join(sorted(ALLOWED_PAYMENT_STATUSES))}",
            400,
        )

    actor_id, actor = _actor(data)
    old = PurchaseOrder.get_by_id(po_id)
    blocked = _blocked(old)
    if blocked:
        return blocked
    rows = PurchaseOrder.update_payment_status(po_id, payment_status, actor_id)

    if rows:
        if old and old.get('payment_status') != payment_status:
            info = Notification.order_summary(po_id)
            _notify('order_payment', po_id, f"PO-{po_id} marked {payment_status}",
                    f"{info['vendor_name'] if info else 'Vendor'} order payment status is now {payment_status}{_by(actor)}.", actor_id)
        return success_response(
            {'po_id': po_id, 'payment_status': payment_status}, "Payment status updated"
        )
    else:
        return error_response("Order not found", 404)

def _clean_products(products):
    return isinstance(products, list) and len(products) > 0


@orders_bp.route('/orders/<int:po_id>/approve', methods=['POST'])
@require_permission('purchase_order.approve')
def approve_order(po_id):
    """Place an order that is waiting for approval."""
    reviewer = g.current_user
    old = PurchaseOrder.get_by_id(po_id)
    if not old:
        return error_response("Order not found", 404)
    if old['status'] != 'pending_approval':
        return error_response("Only an order that is waiting for approval can be approved.", 409)
    if not PurchaseOrder.review(po_id, 'confirmed', reviewer['user_id']):
        return error_response("This order was already reviewed.", 409)
    info = Notification.order_summary(po_id)
    _notify_user('order_approved', po_id, f"PO-{po_id} approved",
                 f"{reviewer['username']} approved and placed your {info['vendor_name'] if info else ''} order.",
                 old.get('created_by'), reviewer['user_id'])
    return success_response({'po_id': po_id, 'status': 'confirmed'}, "Order approved and placed")


@orders_bp.route('/orders/<int:po_id>/reject', methods=['POST'])
@require_permission('purchase_order.approve')
def reject_order(po_id):
    """Reject an order that is waiting for approval. Feedback is required and is shown to the person who created it."""
    reviewer = g.current_user
    note = ((request.get_json(silent=True) or {}).get('note') or '').strip()
    if not note:
        return error_response("Please write the feedback for the person who created this order.", 400)
    if len(note) > 1000:
        return error_response("Feedback is too long (maximum 1000 characters).", 400)
    old = PurchaseOrder.get_by_id(po_id)
    if not old:
        return error_response("Order not found", 404)
    if old['status'] != 'pending_approval':
        return error_response("Only an order that is waiting for approval can be rejected.", 409)
    if not PurchaseOrder.review(po_id, 'rejected', reviewer['user_id'], note):
        return error_response("This order was already reviewed.", 409)
    _notify_user('order_rejected', po_id, f"PO-{po_id} was rejected",
                 f"Feedback from {reviewer['username']}: {note}", old.get('created_by'), reviewer['user_id'])
    return success_response({'po_id': po_id, 'status': 'rejected'}, "Order rejected")


@orders_bp.route('/orders/<int:po_id>', methods=['PUT'])
@validate_json('order_date', 'products', 'expected_delivery_date')
def edit_order(po_id):
    """Change an order's dates, remarks and lines.
    - An approver can edit an order that is waiting for approval (it stays waiting).
    - The person who created an order can edit it after it was rejected; saving sends it back for approval."""
    user = current_user_optional()
    if not user:
        return error_response("Please sign in again.", 401)
    old = PurchaseOrder.get_by_id(po_id)
    if not old:
        return error_response("Order not found", 404)
    approver_edit = old['status'] == 'pending_approval' and has_permission(user, 'purchase_order.approve')
    resubmit = old['status'] == 'rejected' and old.get('created_by') == user['user_id']
    if not (approver_edit or resubmit):
        return error_response("You cannot edit this order.", 403)

    data = request.get_json()
    if not _clean_products(data.get('products')):
        return error_response("products must be a non-empty list", 400)
    ok = PurchaseOrder.replace_order(po_id, data['order_date'], data['expected_delivery_date'], data.get('remarks', ''),
                                     data['products'], 'pending_approval', user['user_id'])
    if not ok:
        return error_response("Failed to update the order", 500)

    info = Notification.order_summary(po_id)
    vendor = info['vendor_name'] if info else ''
    if resubmit:
        _notify_approvers('order_resubmitted', po_id, f"PO-{po_id} was resubmitted",
                          f"{vendor} - {_money(info)}. Resubmitted by {user['username']} after changes. Open it to review.", user['user_id'])
        return success_response({'po_id': po_id, 'status': 'pending_approval'}, "Order resubmitted for approval")
    _notify_user('order_edited', po_id, f"PO-{po_id} was edited",
                 f"{user['username']} made changes to your {vendor} order before approving it.", old.get('created_by'), user['user_id'])
    return success_response({'po_id': po_id, 'status': 'pending_approval'}, "Order updated")
