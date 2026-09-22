# from flask import Blueprint, request
# from models import Cart, Product
# from utils import success_response, error_response, validate_json

# cart_bp = Blueprint('cart', __name__, url_prefix='/api')

# @cart_bp.route('/cart', methods=['GET'])
# def get_cart():
#     """Get cart for a vendor"""
#     vendor_id = request.args.get('vendorId')
    
#     if not vendor_id:
#         return error_response("vendorId parameter required", 400)
    
#     cart_items = Cart.get_for_vendor(vendor_id)
    
#     if cart_items is None:
#         return error_response("Failed to fetch cart", 500)
    
#     return success_response(cart_items, "Cart fetched successfully")

# @cart_bp.route('/cart', methods=['POST'])
# @validate_json('vendor_id', 'product_id')
# def add_to_cart():
#     """Add product to cart"""
#     data = request.get_json()
#     vendor_id = data.get('vendor_id')
#     product_id = data.get('product_id')
    
#     # Verify product exists
#     product = Product.get_by_id(product_id)
#     if not product:
#         return error_response("Product not found", 404)
    
#     cart_id = Cart.add(vendor_id, product_id)
    
#     if cart_id:
#         return success_response({'cart_id': cart_id}, "Product added to cart", 201)
#     else:
#         return error_response("Failed to add to cart", 500)

# @cart_bp.route('/cart', methods=['DELETE'])
# @validate_json('vendor_id', 'product_id')
# def remove_from_cart():
#     """Remove product from cart"""
#     data = request.get_json()
#     vendor_id = data.get('vendor_id')
#     product_id = data.get('product_id')
    
#     result = Cart.remove(vendor_id, product_id)
    
#     if result > 0:
#         return success_response(None, "Product removed from cart")
#     else:
#         return error_response("Product not in cart", 404)


from flask import Blueprint, request
from models import Cart
from utils import success_response, error_response, validate_json

cart_bp = Blueprint('cart', __name__, url_prefix='/api')


@cart_bp.route('/cart', methods=['GET'])
def get_cart():
    """Get cart items for a vendor, each with a summary of selected sizes"""
    vendor_id = request.args.get('vendorId')

    if not vendor_id:
        return error_response("vendorId parameter required", 400)

    items = Cart.get_for_vendor(vendor_id)

    if items is None:
        return error_response("Failed to fetch cart", 500)

    return success_response(items, "Cart fetched successfully")


@cart_bp.route('/cart/details', methods=['GET'])
def get_cart_details():
    """Full row-level cart contents (product + variant + size), used to
    hand the cart off to the existing Create Purchase Order / Product
    Details screens when 'Create Order' is pressed."""
    vendor_id = request.args.get('vendorId')

    if not vendor_id:
        return error_response("vendorId parameter required", 400)

    rows = Cart.get_full_cart_for_order(vendor_id)

    return success_response(rows, "Cart details fetched successfully")


@cart_bp.route('/cart', methods=['POST'])
@validate_json('vendor_id', 'product_id', 'variant_id', 'size_ids')
def add_to_cart():
    """Add a product+variant+sizes to a vendor's cart.
    Re-adding an already-cart'd product just adds the new sizes to the
    existing cart row - already-picked sizes are skipped, never duplicated."""
    data = request.get_json()
    vendor_id = data.get('vendor_id')
    product_id = data.get('product_id')
    variant_id = data.get('variant_id')
    size_ids = data.get('size_ids')

    if not isinstance(size_ids, list) or len(size_ids) == 0:
        return error_response("size_ids must be a non-empty list", 400)

    cart_id = Cart.add_with_sizes(vendor_id, product_id, variant_id, size_ids)

    if cart_id:
        return success_response({'cart_id': cart_id}, "Added to cart", 201)
    else:
        return error_response("Failed to add to cart", 500)


@cart_bp.route('/cart/selected-sizes', methods=['GET'])
def get_selected_sizes():
    """Which size IDs are already in this vendor's cart for a given variant -
    used by the Assign Sizes screen to hide sizes already picked."""
    vendor_id = request.args.get('vendorId')
    variant_id = request.args.get('variantId')

    if not vendor_id or not variant_id:
        return error_response("vendorId and variantId parameters required", 400)

    size_ids = Cart.get_selected_sizes(vendor_id, variant_id)

    return success_response({'size_ids': size_ids}, "Selected sizes fetched successfully")


@cart_bp.route('/cart', methods=['DELETE'])
@validate_json('vendor_id', 'product_id')
def remove_from_cart():
    """Remove a product (and all its size selections, via cascade) from a
    vendor's cart. This immediately frees up those variant+size combos to
    be picked again."""
    data = request.get_json()
    vendor_id = data.get('vendor_id')
    product_id = data.get('product_id')

    rows_affected = Cart.remove(vendor_id, product_id)

    return success_response({'removed': rows_affected}, "Removed from cart")