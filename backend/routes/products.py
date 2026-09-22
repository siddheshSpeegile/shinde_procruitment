import os
import uuid
from flask import Blueprint, request
from werkzeug.utils import secure_filename
from models import Product, ProductPhoto, Variant, Size, VariantSize, Vendor, Category, Gender, Pattern, Color, GstMaster
from utils import success_response, error_response, validate_json

ALLOWED_PHOTO_EXTENSIONS = {'png', 'jpg', 'jpeg'}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'products')

products_bp = Blueprint('products', __name__, url_prefix='/api')



# ---------- Color ----------
 
@products_bp.route('/colors', methods=['GET'])
def get_colors():
    colors = Color.get_all()
    if colors is None:
        return error_response("Failed to fetch colors", 500)
    return success_response(colors, "Colors fetched successfully")
 
@products_bp.route('/colors', methods=['POST'])
@validate_json('color_name')
def create_color():
    data = request.get_json()
    color_id = Color.create(data.get('color_name'), hex_code=data.get('hex_code', ''), updated_by=data.get('updated_by'))
    if color_id:
        return success_response({'color_id': color_id}, "Color created successfully", 201)
    return error_response("Failed to create color - name may already exist", 500)
 
@products_bp.route('/colors/<int:color_id>', methods=['PUT'])
def update_color(color_id):
    data = request.get_json()
    allowed = ['color_name', 'hex_code']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = Color.update(color_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'color_id': color_id}, "Color updated successfully")
    return error_response("Failed to update color - check the color_id exists", 404)
 
@products_bp.route('/colors/<int:color_id>/status', methods=['PATCH'])
@validate_json('status')
def update_color_status(color_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = Color.update_status(color_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'color_id': color_id, 'status': status}, "Color status updated")
    return error_response("Failed to update color status - check the color_id exists", 404)



# ---------- Pattern ----------
 
@products_bp.route('/patterns', methods=['GET'])
def get_patterns():
    patterns = Pattern.get_all()
    if patterns is None:
        return error_response("Failed to fetch patterns", 500)
    return success_response(patterns, "Patterns fetched successfully")
 
@products_bp.route('/patterns', methods=['POST'])
@validate_json('pattern_name')
def create_pattern():
    data = request.get_json()
    pattern_id = Pattern.create(data.get('pattern_name'), updated_by=data.get('updated_by'))
    if pattern_id:
        return success_response({'pattern_id': pattern_id}, "Pattern created successfully", 201)
    return error_response("Failed to create pattern - name may already exist", 500)
 
@products_bp.route('/patterns/<int:pattern_id>', methods=['PUT'])
def update_pattern(pattern_id):
    data = request.get_json()
    allowed = ['pattern_name']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = Pattern.update(pattern_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'pattern_id': pattern_id}, "Pattern updated successfully")
    return error_response("Failed to update pattern - check the pattern_id exists", 404)
 
@products_bp.route('/patterns/<int:pattern_id>/status', methods=['PATCH'])
@validate_json('status')
def update_pattern_status(pattern_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = Pattern.update_status(pattern_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'pattern_id': pattern_id, 'status': status}, "Pattern status updated")
    return error_response("Failed to update pattern status - check the pattern_id exists", 404)


# ---------- Gender ----------
 
@products_bp.route('/genders', methods=['GET'])
def get_genders():
    genders = Gender.get_all()
    if genders is None:
        return error_response("Failed to fetch genders", 500)
    return success_response(genders, "Genders fetched successfully")
 
@products_bp.route('/genders', methods=['POST'])
@validate_json('gender_name')
def create_gender():
    data = request.get_json()
    gender_id = Gender.create(data.get('gender_name'), updated_by=data.get('updated_by'))
    if gender_id:
        return success_response({'gender_id': gender_id}, "Gender created successfully", 201)
    return error_response("Failed to create gender - name may already exist", 500)
 
@products_bp.route('/genders/<int:gender_id>', methods=['PUT'])
def update_gender(gender_id):
    data = request.get_json()
    allowed = ['gender_name']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = Gender.update(gender_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'gender_id': gender_id}, "Gender updated successfully")
    return error_response("Failed to update gender - check the gender_id exists", 404)
 
@products_bp.route('/genders/<int:gender_id>/status', methods=['PATCH'])
@validate_json('status')
def update_gender_status(gender_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = Gender.update_status(gender_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'gender_id': gender_id, 'status': status}, "Gender status updated")
    return error_response("Failed to update gender status - check the gender_id exists", 404)


# ---------- Category ----------
 
@products_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.get_all()
    if categories is None:
        return error_response("Failed to fetch categories", 500)
    return success_response(categories, "Categories fetched successfully")
 
@products_bp.route('/categories', methods=['POST'])
@validate_json('category_name')
def create_category():
    data = request.get_json()
    category_id = Category.create(data.get('category_name'), updated_by=data.get('updated_by'))
    if category_id:
        return success_response({'category_id': category_id}, "Category created successfully", 201)
    return error_response("Failed to create category - name may already exist", 500)
 
@products_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    data = request.get_json()
    allowed = ['category_name']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = Category.update(category_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'category_id': category_id}, "Category updated successfully")
    return error_response("Failed to update category - check the category_id exists", 404)
 
@products_bp.route('/categories/<int:category_id>/status', methods=['PATCH'])
@validate_json('status')
def update_category_status(category_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = Category.update_status(category_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'category_id': category_id, 'status': status}, "Category status updated")
    return error_response("Failed to update category status - check the category_id exists", 404)




# VENDORS

@products_bp.route('/vendors', methods=['GET'])
def get_vendors():
    """Get all vendors"""
    vendors = Vendor.get_all()

    if vendors is None:
        return error_response("Failed to fetch vendors", 500)

    return success_response(vendors, "Vendors fetched successfully")

@products_bp.route('/vendors', methods=['POST'])
@validate_json('vendor_name')
def create_vendor():
    """Add a new vendor"""
    data = request.get_json()
 
    vendor_id = Vendor.create(
        vendor_name=data.get('vendor_name'),
        vendor_short_name=data.get('vendor_short_name', ''),
        vendor_code=data.get('vendor_code', ''),
        address=data.get('address', ''),
        contact_person=data.get('contact_person', ''),
        mobile_number=data.get('mobile_number', ''),
        email=data.get('email', ''),
        gst_number=data.get('gst_number', ''),
        pan_number=data.get('pan_number', ''),
        remarks=data.get('remarks', ''),
        logo_url=data.get('logo_url', ''),
        updated_by=data.get('updated_by')
    )
 
    if vendor_id:
        return success_response({'vendor_id': vendor_id}, "Vendor created successfully", 201)
    else:
        return error_response("Failed to create vendor - check vendor_code isn't already in use", 500)
 
 
@products_bp.route('/vendors/<int:vendor_id>', methods=['PUT'])
@validate_json('vendor_name')
def update_vendor(vendor_id):
    """Edit an existing vendor - partial update, only sent fields change"""
    data = request.get_json()

    # Only pass through fields that were actually included in the request -
    # do NOT default missing ones to '', or they'll silently overwrite
    # existing data (this was the bug).
    allowed_fields = ['vendor_name', 'vendor_short_name', 'vendor_code', 'address',
                       'contact_person', 'mobile_number', 'email', 'gst_number',
                       'pan_number', 'remarks', 'logo_url']
    fields_to_update = {k: v for k, v in data.items() if k in allowed_fields}

    rows = Vendor.update(vendor_id, updated_by=data.get('updated_by'), **fields_to_update)

    if rows:
        return success_response({'vendor_id': vendor_id}, "Vendor updated successfully")
    else:
        return error_response("Failed to update vendor - check the vendor_id exists", 404) 
 
@products_bp.route('/vendors/<int:vendor_id>/status', methods=['PATCH'])
@validate_json('status')
def update_vendor_status(vendor_id):
    """Activate/deactivate a vendor"""
    data = request.get_json()
    status = data.get('status')
 
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
 
    rows = Vendor.update_status(vendor_id, status, updated_by=data.get('updated_by'))
 
    if rows:
        return success_response({'vendor_id': vendor_id, 'status': status}, "Vendor status updated")
    else:
        return error_response("Failed to update vendor status - check the vendor_id exists", 404)
 

# PRODUCTS

@products_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products for a vendor"""
    vendor_id = request.args.get('vendorId')
    
    if not vendor_id:
        return error_response("vendorId parameter required", 400)
    
    products = Product.get_all_by_vendor(vendor_id)
    
    if products is None:
        return error_response("Failed to fetch products", 500)
    
    return success_response(products, "Products fetched successfully")

@products_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product"""
    product = Product.get_by_id(product_id)
    
    if not product:
        return error_response("Product not found", 404)
    
    return success_response(product, "Product fetched successfully")

@products_bp.route('/products', methods=['POST'])
@validate_json('vendor_id', 'v_prod_id', 'product_name', 'photo_url', 'price')
def create_product():
    """Create a new product. status defaults to 'active'.

    Accepts photo_urls: a list of 1-4 uploaded photo URLs (from repeated
    calls to /products/upload-photo). The first one becomes photo_url on
    the product itself (the 'cover' photo every existing screen already
    shows), and the full list is saved to product_photo. photo_url alone
    (no photo_urls) is still accepted for backward compatibility."""
    data = request.get_json()
    vendor_id = data.get('vendor_id')
    v_prod_id = data.get('v_prod_id')
    product_name = data.get('product_name')
    photo_urls = data.get('photo_urls') or []
    photo_url = data.get('photo_url') or (photo_urls[0] if photo_urls else None)
    customer_product_id = data.get('customer_product_id', '')
    remarks = data.get('remarks', '')
    price = data.get('price', 0)
    status = data.get('status', 'active')

    product_id = Product.create(vendor_id, v_prod_id, product_name, photo_url, customer_product_id, remarks, price, status)

    if product_id:
        if photo_urls:
            ProductPhoto.add_many(product_id, photo_urls)
        return success_response({'product_id': product_id}, "Product created successfully", 201)
    else:
        return error_response("Failed to create product", 500)


@products_bp.route('/products/<int:product_id>/photos', methods=['GET'])
def get_product_photos(product_id):
    """The full ordered set of a product's photos (1-4), for anywhere
    that wants to show more than just the cover photo."""
    photos = ProductPhoto.get_for_product(product_id)

    if photos is None:
        return error_response("Failed to fetch product photos", 500)

    return success_response(photos, "Product photos fetched successfully")


@products_bp.route('/products/<int:product_id>', methods=['PUT'])
@validate_json('v_prod_id', 'product_name', 'photo_url', 'price')
def update_product(product_id):
    """Update an existing product's fields."""
    data = request.get_json()
    v_prod_id = data.get('v_prod_id')
    product_name = data.get('product_name')
    photo_url = data.get('photo_url')
    customer_product_id = data.get('customer_product_id', '')
    remarks = data.get('remarks', '')
    price = data.get('price', 0)
    status = data.get('status', 'active')

    rows = Product.update(product_id, v_prod_id, product_name, photo_url, customer_product_id, remarks, price, status)

    if rows:
        return success_response({'product_id': product_id}, "Product updated successfully")
    else:
        return error_response("Failed to update product", 500)

@products_bp.route('/products/upload-photo', methods=['POST'])
def upload_product_photo():
    """Upload a product photo file, returns the URL to use as photo_url"""
    if 'photo' not in request.files:
        return error_response("No photo file provided", 400)

    file = request.files['photo']
    if file.filename == '':
        return error_response("No photo selected", 400)

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_PHOTO_EXTENSIONS:
        return error_response("Only JPG and PNG files are allowed", 400)

    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = secure_filename(f"{uuid.uuid4().hex}.{ext}")
        file.save(os.path.join(UPLOAD_DIR, filename))
        photo_url = f"/uploads/products/{filename}"
        return success_response({'photo_url': photo_url}, "Photo uploaded successfully")
    except Exception as e:
        print(f"Photo upload error: {e}")
        return error_response("Failed to upload photo", 500)

# VARIANTS

@products_bp.route('/variants', methods=['GET'])
def get_variants():
    """Get all variants for a product"""
    product_id = request.args.get('productId')
    
    if not product_id:
        return error_response("productId parameter required", 400)
    
    variants = Variant.get_all_by_product(product_id)
    
    if variants is None:
        return error_response("Failed to fetch variants", 500)
    
    return success_response(variants, "Variants fetched successfully")

@products_bp.route('/variants/<int:variant_id>', methods=['GET'])
def get_variant(variant_id):
    """Get a specific variant"""
    variant = Variant.get_by_id(variant_id)
    
    if not variant:
        return error_response("Variant not found", 404)
    
    return success_response(variant, "Variant fetched successfully")

@products_bp.route('/variants', methods=['POST'])
@validate_json('product_id', 'category_id', 'gender_id', 'pattern_id', 'color_id')
def create_variant():
    """Create a new variant"""
    data = request.get_json()
    product_id = data.get('product_id')
    category_id = data.get('category_id')
    gender_id = data.get('gender_id')
    pattern_id = data.get('pattern_id')
    color_id = data.get('color_id')
    
    variant_id = Variant.create(product_id, category_id, gender_id, pattern_id, color_id)
    
    if variant_id:
        return success_response({'variant_id': variant_id}, "Variant created successfully", 201)
    else:
        return error_response("Failed to create variant", 500)

@products_bp.route('/variants/quick', methods=['POST'])
@validate_json('product_id', 'category', 'color')
def create_variant_quick():
    """Create a variant from free-text field names (Add Variant screen).
    Category/Color/Pattern are looked up by name, created if new. Gender
    is no longer collected on this screen - variants are created with
    gender_id = NULL."""
    data = request.get_json()
    product_id = data.get('product_id')
    category = data.get('category')
    color = data.get('color')
    pattern = data.get('pattern') or 'Standard'
    remarks = data.get('remarks') or ''

    variant_id = Variant.create_from_names(product_id, category, color, pattern, remarks)

    if variant_id:
        return success_response({'variant_id': variant_id}, "Variant created successfully", 201)
    else:
        return error_response("Failed to create variant", 500)

# SIZES

@products_bp.route('/sizes', methods=['GET'])
def get_all_sizes():
    """Get all available sizes"""
    sizes = Size.get_all()
    
    if sizes is None:
        return error_response("Failed to fetch sizes", 500)
    
    return success_response(sizes, "Sizes fetched successfully")

@products_bp.route('/available-sizes', methods=['GET'])
def get_available_sizes():
    """Get sizes not yet assigned to a variant"""
    variant_id = request.args.get('variantId')
    
    if not variant_id:
        return error_response("variantId parameter required", 400)
    
    sizes = Size.get_available_for_variant(variant_id)
    
    if sizes is None:
        return error_response("Failed to fetch available sizes", 500)
    
    return success_response(sizes, "Available sizes fetched successfully")

@products_bp.route('/variant-sizes', methods=['GET'])
def get_variant_sizes():
    """Get all sizes with assigned/unassigned flag for a variant (Size Catalog screen)"""
    variant_id = request.args.get('variantId')

    if not variant_id:
        return error_response("variantId parameter required", 400)

    sizes = Size.get_all_with_assignment(variant_id)

    if sizes is None:
        return error_response("Failed to fetch variant sizes", 500)

    return success_response(sizes, "Variant sizes fetched successfully")

@products_bp.route('/assign-sizes', methods=['POST'])
@validate_json('variant_id', 'size_ids')
def assign_sizes():
    """Assign multiple sizes to a variant"""
    data = request.get_json()
    variant_id = data.get('variant_id')
    size_ids = data.get('size_ids')  # Should be a list
    
    if not isinstance(size_ids, list) or len(size_ids) == 0:
        return error_response("size_ids must be a non-empty list", 400)
    
    success = VariantSize.assign_sizes(variant_id, size_ids)
    
    if success:
        return success_response(None, "Sizes assigned successfully", 201)
    else:
        return error_response("Failed to assign sizes", 500)


@products_bp.route('/sizes', methods=['POST'])
@validate_json('size_value')
def create_size():
    data = request.get_json()
    size_id = Size.create(data.get('size_value'), updated_by=data.get('updated_by'))
    if size_id:
        return success_response({'size_id': size_id}, "Size created successfully", 201)
    return error_response("Failed to create size - value may already exist", 500)
 
@products_bp.route('/sizes/<int:size_id>', methods=['PUT'])
def update_size(size_id):
    data = request.get_json()
    allowed = ['size_value']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = Size.update(size_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'size_id': size_id}, "Size updated successfully")
    return error_response("Failed to update size - check the size_id exists", 404)
 
@products_bp.route('/sizes/<int:size_id>/status', methods=['PATCH'])
@validate_json('status')
def update_size_status(size_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = Size.update_status(size_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'size_id': size_id, 'status': status}, "Size status updated")
    return error_response("Failed to update size status - check the size_id exists", 404)


# Add these to routes/products.py.
# Make sure GstMaster is imported: from models import ..., GstMaster

@products_bp.route('/gst-rates', methods=['GET'])
def get_gst_rates():
    rates = GstMaster.get_all()
    if rates is None:
        return error_response("Failed to fetch GST rates", 500)
    return success_response(rates, "GST rates fetched successfully")

@products_bp.route('/gst-rates', methods=['POST'])
@validate_json('gst_rate')
def create_gst_rate():
    data = request.get_json()
    gst_id = GstMaster.create(data.get('gst_rate'), description=data.get('description', ''), updated_by=data.get('updated_by'))
    if gst_id:
        return success_response({'gst_id': gst_id}, "GST rate created successfully", 201)
    return error_response("Failed to create GST rate - it may already exist", 500)

@products_bp.route('/gst-rates/<int:gst_id>', methods=['PUT'])
def update_gst_rate(gst_id):
    data = request.get_json()
    allowed = ['gst_rate', 'description']
    fields = {k: v for k, v in data.items() if k in allowed}
    rows = GstMaster.update(gst_id, updated_by=data.get('updated_by'), **fields)
    if rows:
        return success_response({'gst_id': gst_id}, "GST rate updated successfully")
    return error_response("Failed to update GST rate - check the gst_id exists", 404)

@products_bp.route('/gst-rates/<int:gst_id>/status', methods=['PATCH'])
@validate_json('status')
def update_gst_rate_status(gst_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ('active', 'inactive'):
        return error_response("status must be 'active' or 'inactive'", 400)
    rows = GstMaster.update_status(gst_id, status, updated_by=data.get('updated_by'))
    if rows:
        return success_response({'gst_id': gst_id, 'status': status}, "GST rate status updated")
    return error_response("Failed to update GST rate status - check the gst_id exists", 404)

@products_bp.route('/gst-rates/<int:gst_id>/usage', methods=['GET'])
def get_gst_rate_usage(gst_id):
    usage_count = GstMaster.get_usage(gst_id)
    if usage_count is None:
        return error_response("GST rate not found", 404)
    return success_response({'gst_id': gst_id, 'usage_count': usage_count}, "Usage fetched successfully")