from flask import Blueprint, jsonify
from database import db
from datetime import datetime
from models import PurchaseOrder

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')


@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """
    Returns summary stats + recent PENDING purchase orders (not yet
    delivered) for the dashboard screen, each with a computed delivery
    timer (on time / delayed and by how many days).

    KPI definitions (all computed live on every request - nothing is
    cached or stored, so they update automatically the moment an order's
    status changes):
    - total_spend: this month's total across ALL orders (hero card, unchanged)
    - vendors_count: vendors with at least one PENDING order
    - products_count: distinct products on at least one PENDING order
    - orders_count: total PENDING orders (not scoped to this month)
    - order_amount: total value of PENDING (not yet delivered) orders -
      an order's amount drops out of this sum the moment it's marked
      delivered, regardless of payment_status. (Renamed from
      pending_amount / "Due Payment" - it now tracks delivery, not payment.)

    ASSUMPTIONS (please verify against your actual schema in pgAdmin):
    - vendor table has: vendor_id, vendor_name, status
    - product table has: product_id, status
    - purchase_order table has: po_id, vendor_id, order_date, status,
      expected_delivery_date, delivered_date, payment_status, created_date
    - po_size_detail table has: po_id, amount
    """
    try:
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # --- Total amount spent this month ---
        total_spend_query = """
        SELECT COALESCE(SUM(psd.amount), 0) as total_spend
        FROM po_size_detail psd
        JOIN purchase_order po ON psd.po_id = po.po_id
        WHERE po.order_date >= %s
        """
        total_spend_result = db.execute_query(total_spend_query, (month_start,))
        total_spend = float(total_spend_result[0]['total_spend']) if total_spend_result else 0

        # --- Vendors count: vendors with at least one PENDING (not yet
        # delivered) order - not just any vendor marked active. Once every
        # order for a vendor is delivered, that vendor drops off this count
        # automatically (nothing to decrement by hand - it's computed
        # fresh from current data every time this route runs). ---
        vendor_count_query = """
        SELECT COUNT(DISTINCT vendor_id) as count
        FROM purchase_order
        WHERE status != 'delivered'
        """
        vendor_result = db.execute_query(vendor_count_query)
        vendors_count = vendor_result[0]['count'] if vendor_result else 0

        # --- Products count: distinct products that appear on at least
        # one pending order - not the master product catalogue count. ---
        product_count_query = """
        SELECT COUNT(DISTINCT ppd.product_id) as count
        FROM po_product_detail ppd
        JOIN purchase_order po ON ppd.po_id = po.po_id
        WHERE po.status != 'delivered'
        """
        product_result = db.execute_query(product_count_query)
        products_count = product_result[0]['count'] if product_result else 0

        # --- Orders count: pending (not yet delivered) orders, full
        # backlog - not scoped to this month. ---
        orders_count_query = "SELECT COUNT(*) as count FROM purchase_order WHERE status != 'delivered'"
        orders_result = db.execute_query(orders_count_query)
        orders_count = orders_result[0]['count'] if orders_result else 0
        # --- Order amount: total value of orders still PENDING (not
        # delivered) - matches the same "not yet delivered" definition
        # used for the Vendors/Products/Orders KPIs above, so all 4 KPI
        # cards move together consistently. An order's amount drops out
        # of this sum the instant it's marked delivered - independent of
        # payment_status now, not tied to it like the old "Due Payment"
        # version was. ---
        order_amount_query = """
        SELECT COALESCE(SUM(psd.amount), 0) as order_amount
        FROM po_size_detail psd
        JOIN purchase_order po ON psd.po_id = po.po_id
        WHERE po.status != 'delivered'
        """
        order_amount_result = db.execute_query(order_amount_query)
        order_amount = float(order_amount_result[0]['order_amount']) if order_amount_result else 0

        # --- Recent PENDING orders (last 50, newest first) ---
        # Delivered orders don't belong on this "what still needs my
        # attention" section - they're one tap away on the full Orders
        # screen, which does show every status.
        recent_orders_query = f"""
        SELECT po.po_id, po.order_date, po.status, po.expected_delivery_date,
               po.delivered_date, v.vendor_name, v.logo_url,
               COALESCE(SUM(psd.amount), 0) as order_total,
               {PurchaseOrder.COVER_IMAGE_SQL}
        FROM purchase_order po
        JOIN vendor v ON po.vendor_id = v.vendor_id
        LEFT JOIN po_size_detail psd ON psd.po_id = po.po_id
        WHERE po.status != 'delivered'
        GROUP BY po.po_id, po.order_date, po.status, po.expected_delivery_date,
                 po.delivered_date, v.vendor_name, v.logo_url
        ORDER BY po.created_date DESC
        LIMIT 50
        """
        recent_orders_raw = db.execute_query(recent_orders_query) or []

        recent_orders = []
        for o in recent_orders_raw:
            delivery = PurchaseOrder.compute_delivery_state(
                o['status'], o['expected_delivery_date'], o['delivered_date']
            )
            recent_orders.append({
                'id': o['po_id'],
                'po': f"PO-{o['po_id']}",
                'brand': o['vendor_name'],
                'logo': o['logo_url'] or '/assets/vendor.png',
                'logoBg': '#fff',
                # Cover photo of the order's first product - what the order cards show
                'image': o['product_image'],
                'date': o['order_date'].strftime('%d %b %Y') if o['order_date'] else '',
                'expected_delivery_date': o['expected_delivery_date'].strftime('%d %b %Y') if o['expected_delivery_date'] else None,
                'price': f"₹{int(o['order_total']):,}",
                'status': o['status'],
                'delivery': delivery,
            })

        return jsonify({
            'success': True,
            'data': {
                'total_spend': total_spend,
                'vendors_count': vendors_count,
                'products_count': products_count,
                'orders_count': orders_count,
                'order_amount': order_amount,
                'recent_orders': recent_orders
            }
        }), 200

    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'success': False, 'message': 'Failed to load dashboard'}), 500