"""Purchase order drafts: an unfinished order form saved from the admin panel so its owner can
continue later. A draft is not a purchase order. Every query is limited to the signed-in user,
so nobody (not even an administrator) can read or change someone else's draft."""
import json
from flask import Blueprint, request, g
from database import db
from utils import success_response, error_response

order_drafts_bp = Blueprint('order_drafts', __name__, url_prefix='/api')

MAX_DRAFTS = 20          # per user
MAX_BYTES = 200 * 1024   # size of one saved form
KEEP_DAYS = 30           # drafts not touched for this long are deleted


def _uid():
    return g.current_user['user_id']


def _summary(payload):
    """How many products and pieces the saved form holds (for the 'Your drafts' list)."""
    products = pieces = 0
    for line in payload.get('lines') or []:
        if not isinstance(line, dict) or not line.get('productId'):
            continue
        products += 1
        for v in line.get('variants') or []:
            for s in (v.get('sizes') or []) if isinstance(v, dict) else []:
                try:
                    pieces += int(float(s.get('qty') or 0))
                except (TypeError, ValueError, AttributeError):
                    pass
    return products, pieces


def _read_payload():
    """(payload, vendor_id, None) or (None, None, error_response)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('form'), dict):
        return None, None, error_response("Nothing to save.", 400)
    form = data['form']
    if len(json.dumps(form, default=str)) > MAX_BYTES:
        return None, None, error_response("This order is too large to save as a draft.", 400)
    try:
        vendor_id = int(form.get('vendor_id')) if form.get('vendor_id') else None
    except (TypeError, ValueError):
        return None, None, error_response("Choose a valid vendor.", 400)
    return form, vendor_id, None


def _row(draft_id):
    rows = db.execute_query(
        "SELECT draft_id, vendor_id, payload, updated_date FROM order_draft WHERE draft_id = %s AND user_id = %s",
        (draft_id, _uid()))
    return rows[0] if rows else None


@order_drafts_bp.route('/order-drafts', methods=['GET'])
def list_drafts():
    db.execute_update("DELETE FROM order_draft WHERE updated_date < NOW() - make_interval(days => %s)", (KEEP_DAYS,))
    rows = db.execute_query(
        """SELECT d.draft_id, d.vendor_id, v.vendor_name, d.payload, d.created_date, d.updated_date
           FROM order_draft d LEFT JOIN vendor v ON v.vendor_id = d.vendor_id
           WHERE d.user_id = %s ORDER BY d.updated_date DESC""", (_uid(),))
    if rows is None:
        return error_response("Failed to fetch drafts", 500)
    out = []
    for r in rows:
        products, pieces = _summary(r['payload'])
        out.append({'id': r['draft_id'], 'vendor_id': r['vendor_id'], 'vendor_name': r['vendor_name'],
                    'products': products, 'quantity': pieces,
                    'updated_at': r['updated_date'].isoformat() if r['updated_date'] else None})
    return success_response(out, "Drafts fetched successfully")


@order_drafts_bp.route('/order-drafts/<int:draft_id>', methods=['GET'])
def get_draft(draft_id):
    row = _row(draft_id)
    if not row:
        return error_response("Draft not found", 404)
    return success_response({'id': row['draft_id'], 'form': row['payload'],
                             'updated_at': row['updated_date'].isoformat() if row['updated_date'] else None},
                            "Draft fetched successfully")


@order_drafts_bp.route('/order-drafts', methods=['POST'])
def create_draft():
    form, vendor_id, err = _read_payload()
    if err:
        return err
    count = db.execute_query("SELECT COUNT(*) AS n FROM order_draft WHERE user_id = %s", (_uid(),))
    if count and count[0]['n'] >= MAX_DRAFTS:
        return error_response(f"You already have {MAX_DRAFTS} drafts. Delete one first.", 400)
    draft_id = db.execute_insert(
        "INSERT INTO order_draft (user_id, vendor_id, payload) VALUES (%s, %s, %s::jsonb) RETURNING draft_id",
        (_uid(), vendor_id, json.dumps(form, default=str)))
    if not draft_id:
        return error_response("Failed to save the draft", 500)
    return success_response({'id': draft_id}, "Draft saved", 201)


@order_drafts_bp.route('/order-drafts/<int:draft_id>', methods=['PUT'])
def update_draft(draft_id):
    form, vendor_id, err = _read_payload()
    if err:
        return err
    changed = db.execute_update(
        "UPDATE order_draft SET vendor_id = %s, payload = %s::jsonb, updated_date = NOW() WHERE draft_id = %s AND user_id = %s",
        (vendor_id, json.dumps(form, default=str), draft_id, _uid()))
    if not changed:
        return error_response("Draft not found", 404)
    return success_response({'id': draft_id}, "Draft saved")


@order_drafts_bp.route('/order-drafts/<int:draft_id>', methods=['DELETE'])
def delete_draft(draft_id):
    if not db.execute_update("DELETE FROM order_draft WHERE draft_id = %s AND user_id = %s", (draft_id, _uid())):
        return error_response("Draft not found", 404)
    return success_response({'id': draft_id}, "Draft deleted")
