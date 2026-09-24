from flask import Blueprint, request
from datetime import datetime
from models import PurchaseOrder
from utils import success_response, error_response, validate_json

orders_bp = Blueprint('orders', __name__, url_prefix='/api')


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
    
    po_id = PurchaseOrder.create_order(vendor_id, order_date, products, remarks, expected_delivery_date)
    
    if po_id:
        return success_response({'po_id': po_id}, "Purchase order created successfully", 201)
    else:
        return error_response("Failed to create purchase order", 500)


@orders_bp.route('/orders/<int:po_id>/mark-delivered', methods=['PATCH'])
def mark_order_delivered(po_id):
    """Convenience shortcut for the app's "Mark as Delivered" button -
    equivalent to PATCH /orders/<po_id>/status with {"status": "delivered"}.
    Safe to call more than once - a repeat call is a genuine no-op and
    still returns success, it just won't reset delivered_date."""
    rows = PurchaseOrder.mark_delivered(po_id)

    if rows:
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

    rows = PurchaseOrder.update_status(po_id, status)

    if rows:
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

    rows = PurchaseOrder.update_expected_delivery_date(po_id, parsed_date)

    if rows:
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

    rows = PurchaseOrder.update_payment_status(po_id, payment_status)

    if rows:
        return success_response(
            {'po_id': po_id, 'payment_status': payment_status}, "Payment status updated"
        )
    else:
        return error_response("Order not found", 404)