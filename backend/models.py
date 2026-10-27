import time
import psycopg2
from database import db
from datetime import datetime, date
from colour_hex import guess_hex


class Role:
    """Role model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM role ORDER BY role_id ASC"
        return db.execute_query(query)

    @staticmethod
    def get_by_id(role_id):
        query = "SELECT * FROM role WHERE role_id = %s"
        result = db.execute_query(query, (role_id,))
        return result[0] if result else None

    @staticmethod
    def get_permissions(role_id):
        """Every permission currently granted to this role."""
        query = """
        SELECT p.permission_id, p.module, p.action, p.permission_key, p.description
        FROM role_permission rp
        JOIN permission p ON p.permission_id = rp.permission_id
        WHERE rp.role_id = %s
        ORDER BY p.module, p.action
        """
        return db.execute_query(query, (role_id,))

    @staticmethod
    def set_permissions(role_id, permission_ids):
        """Replace this role's ENTIRE permission set with permission_ids -
        not additive. Not wired to a route yet (Step 4 does read-only
        first) - included now so it's ready when that step comes."""
        try:
            db.execute_update("DELETE FROM role_permission WHERE role_id = %s", (role_id,))
            if not permission_ids:
                return True
            queries = []
            for pid in permission_ids:
                queries.append((
                    "INSERT INTO role_permission (role_id, permission_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (role_id, pid)
                ))
            return db.execute_transaction(queries)
        except Exception as e:
            print(f"Error setting role permissions: {e}")
            return False


class Permission:
    """Permission model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM permission ORDER BY module, action"
        return db.execute_query(query)


class GstMaster:
    """GST Master model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM gst_master ORDER BY gst_rate ASC"
        return db.execute_query(query)

    @staticmethod
    def create(gst_rate, description='', updated_by=None):
        query = """
        INSERT INTO gst_master (gst_rate, description, status, updated_by, created_date, updated_date)
        VALUES (%s, %s, 'active', %s, NOW(), NOW())
        RETURNING gst_id
        """
        return db.execute_insert(query, (gst_rate, description, updated_by))

    @staticmethod
    def update(gst_id, updated_by=None, **fields):
        """Partial update - only touches fields actually passed."""
        allowed = ['gst_rate', 'description']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE gst_master SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE gst_id = %s"
        values.extend([updated_by, gst_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(gst_id, status, updated_by=None):
        query = "UPDATE gst_master SET status = %s, updated_by = %s, updated_date = NOW() WHERE gst_id = %s"
        return db.execute_update(query, (status, updated_by, gst_id))

    @staticmethod
    def get_usage(gst_id):
        """How many order lines currently use this GST rate - matches the
        source document's 'View usage' requirement. Looks up the rate value
        first since po_size_detail.gst stores the raw number, not gst_id
        (there's no FK link yet - see Phase 1 Decision Required #5)."""
        rate_row = db.execute_query("SELECT gst_rate FROM gst_master WHERE gst_id = %s", (gst_id,))
        if not rate_row:
            return None
        gst_rate = rate_row[0]['gst_rate']
        count_row = db.execute_query(
            "SELECT COUNT(*) as usage_count FROM po_size_detail WHERE gst = %s", (gst_rate,)
        )
        return count_row[0]['usage_count'] if count_row else 0








class User:
    """User model"""

    @staticmethod
    def get_by_username(username):
        query = 'SELECT * FROM "User" WHERE username = %s'
        result = db.execute_query(query, (username,))
        return result[0] if result else None

    @staticmethod
    def get_by_id(user_id):
        try:
            result = db.execute_query('SELECT * FROM "User" WHERE user_id = %s', (int(user_id),))
        except (TypeError, ValueError):
            return None
        return result[0] if result else None

    @staticmethod
    def create(username, password_hash, email, role='user'):
        query = '''
        INSERT INTO "User" (username, password_hash, email, role, status, created_date)
        VALUES (%s, %s, %s, %s, %s, NOW())
        RETURNING user_id
        '''
        user_id = db.execute_insert(query, (username, password_hash, email, role, 'active'))
        return user_id

# class Vendor:
#     """Vendor model"""

#     @staticmethod
#     def get_all():
#         query = "SELECT * FROM vendor ORDER BY vendor_name ASC"
#         return db.execute_query(query)

#     @staticmethod
#     def get_by_id(vendor_id):
#         query = "SELECT * FROM vendor WHERE vendor_id = %s"
#         result = db.execute_query(query, (vendor_id,))
#         return result[0] if result else None

class Vendor:
    """Vendor model"""

    # Columns returned to the app. Deliberately NOT "SELECT *": the vendor
    # row also holds the logo image itself (logo_data BYTEA), which must
    # never go into a JSON response - it can't be serialized, and would
    # bloat every vendor list request. The image is served on its own by
    # GET /api/vendors/<id>/logo (see get_logo below).
    _PUBLIC_COLUMNS = """
        vendor_id, vendor_name, vendor_short_name, vendor_code, address,
        contact_person, mobile_number, email, gst_number, pan_number,
        remarks, logo_url, status, updated_by, created_date, updated_date
    """

    @staticmethod
    def get_all():
        query = f"SELECT {Vendor._PUBLIC_COLUMNS} FROM vendor ORDER BY vendor_name ASC"
        return db.execute_query(query)

    @staticmethod
    def get_by_id(vendor_id):
        query = f"SELECT {Vendor._PUBLIC_COLUMNS} FROM vendor WHERE vendor_id = %s"
        result = db.execute_query(query, (vendor_id,))
        return result[0] if result else None

    @staticmethod
    def update_logo(vendor_id, image_data, mime_type):
        """Store a new logo image on the vendor row (logo_data BYTEA) and
        point logo_url at the route that serves it. The URL gets a
        ?v=<ms timestamp> that changes on every upload, so apps never keep
        showing a cached old logo. Returns the new logo_url, or None if the
        vendor doesn't exist."""
        logo_url = f"/api/vendors/{vendor_id}/logo?v={int(time.time() * 1000)}"
        query = """
        UPDATE vendor
        SET logo_url = %s, logo_data = %s, logo_mime_type = %s, updated_date = NOW()
        WHERE vendor_id = %s
        """
        rows = db.execute_update(query, (logo_url, psycopg2.Binary(image_data), mime_type, vendor_id))
        return logo_url if rows else None

    @staticmethod
    def get_logo(vendor_id):
        """Raw logo bytes + mime type, or None if the vendor has no
        uploaded logo."""
        query = """
        SELECT logo_data, logo_mime_type
        FROM vendor
        WHERE vendor_id = %s AND logo_data IS NOT NULL
        """
        result = db.execute_query(query, (vendor_id,))
        if not result:
            return None
        # psycopg2 returns BYTEA as a memoryview - convert to plain bytes
        return {'data': bytes(result[0]['logo_data']), 'mime_type': result[0]['logo_mime_type']}

    @staticmethod
    def create(vendor_name, vendor_short_name='', vendor_code='', address='',
               contact_person='', mobile_number='', email='', gst_number='',
               pan_number='', remarks='', logo_url='', updated_by=None):
        query = """
        INSERT INTO vendor
            (vendor_name, vendor_short_name, vendor_code, address, contact_person,
             mobile_number, email, gst_number, pan_number, remarks, logo_url,
             status, updated_by, created_date, updated_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, NOW(), NOW())
        RETURNING vendor_id
        """
        return db.execute_insert(query, (
            vendor_name, vendor_short_name, vendor_code, address, contact_person,
            mobile_number, email, gst_number, pan_number, remarks, logo_url, updated_by
        ))

    # Only these columns are ever allowed to be updated via update() - a
    # fixed allowlist, since column names below get interpolated into the
    # SQL string directly (values themselves still go through %s params).
    _UPDATABLE_FIELDS = [
        'vendor_name', 'vendor_short_name', 'vendor_code', 'address',
        'contact_person', 'mobile_number', 'email', 'gst_number',
        'pan_number', 'remarks', 'logo_url'
    ]

    @staticmethod
    def update(vendor_id, updated_by=None, **fields):
        """Partial update - only touches columns actually passed in `fields`.
        Anything not included is left exactly as it was in the database.
        This fixes a real bug: the old full-replace version silently wiped
        every field the caller didn't happen to send back to ''."""
        fields_to_set = {k: v for k, v in fields.items() if k in Vendor._UPDATABLE_FIELDS}

        if not fields_to_set:
            return 0  # nothing valid to update

        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())

        query = f"""
        UPDATE vendor
        SET {set_clause}, updated_by = %s, updated_date = NOW()
        WHERE vendor_id = %s
        """
        values.extend([updated_by, vendor_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(vendor_id, status, updated_by=None):
        """Activate/deactivate - separate from update() so a status toggle
        never needs to touch any other field."""
        query = """
        UPDATE vendor
        SET status = %s, updated_by = %s, updated_date = NOW()
        WHERE vendor_id = %s
        """
        return db.execute_update(query, (status, updated_by, vendor_id))



class ProductPhoto:
    """A product's full photo set (1-4 photos). product.photo_url stays
    as the 'cover' photo for backward compatibility with every screen
    that already shows a single thumbnail - this table holds the complete
    ordered set for anywhere that wants to show them all."""

    @staticmethod
    def add_many(product_id, photo_urls):
        """Insert this product's photos in the given order (0, 1, 2, ...).
        Called once, right after the product itself is created."""
        if not photo_urls:
            return
        queries = [
            (
                "INSERT INTO product_photo (product_id, photo_url, sort_order) VALUES (%s, %s, %s)",
                (product_id, url, i),
            )
            for i, url in enumerate(photo_urls)
        ]
        db.execute_transaction(queries)

    @staticmethod
    def get_image(product_photo_id):
        """Raw image bytes + mime type for one photo stored in the DB
        (image_data BYTEA). Returns None if the photo doesn't exist or is
        an older disk-based photo with no bytes stored."""
        query = """
        SELECT image_data, mime_type
        FROM product_photo
        WHERE product_photo_id = %s AND image_data IS NOT NULL
        """
        result = db.execute_query(query, (product_photo_id,))
        if not result:
            return None
        # psycopg2 returns BYTEA as a memoryview - convert to plain bytes
        return {'data': bytes(result[0]['image_data']), 'mime_type': result[0]['mime_type']}

    @staticmethod
    def get_for_product(product_id):
        query = """
        SELECT product_photo_id, photo_url, sort_order
        FROM product_photo
        WHERE product_id = %s
        ORDER BY sort_order ASC
        """
        return db.execute_query(query, (product_id,))

    @staticmethod
    def replace_for_product(product_id, photo_urls):
        """Used when editing a product's photos - clears the old set and
        inserts the new one, so photos removed by the user don't linger."""
        db.execute_update("DELETE FROM product_photo WHERE product_id = %s", (product_id,))
        ProductPhoto.add_many(product_id, photo_urls)


class Suggestions:
    """Distinct existing values for certain free-text fields, powering
    autocomplete suggestions on screens where there's no dedicated
    lookup table (unlike Category/Color). Each field name maps to one
    fixed, hand-written query - never built dynamically from the
    request, so there's no SQL injection surface here regardless of
    what a caller passes as the field name."""

    _QUERIES = {
        'product_remarks': "SELECT DISTINCT remarks FROM product WHERE remarks IS NOT NULL AND remarks != '' ORDER BY remarks",
        'customer_product_id': "SELECT DISTINCT customer_product_id FROM product WHERE customer_product_id IS NOT NULL AND customer_product_id != '' ORDER BY customer_product_id",
        'order_remarks': "SELECT DISTINCT remarks FROM purchase_order WHERE remarks IS NOT NULL AND remarks != '' ORDER BY remarks",
        # Add Variant's Category/Color suggestions come from the shinde_shoes
        # master (Dim) tables, not this app's own category/color tables.
        # Schema-qualified and quoted: those table/column names are
        # mixed-case. UNKNOWN_* are placeholder rows, not real values.
        'category': """
            SELECT DISTINCT TRIM("CategoryName") FROM shinde_shoes."DimCategory"
            WHERE TRIM(COALESCE("CategoryName", '')) != '' AND "CategoryName" NOT LIKE 'UNKNOWN%%'
            ORDER BY 1
        """,
        'colour': """
            SELECT DISTINCT TRIM("ColourName") FROM shinde_shoes."DimColour"
            WHERE TRIM(COALESCE("ColourName", '')) != '' AND "ColourName" NOT LIKE 'UNKNOWN%%'
            ORDER BY 1
        """,
    }

    @staticmethod
    def get(field):
        """Returns a plain list of strings, or None if `field` isn't one
        of the known whitelisted keys above."""
        query = Suggestions._QUERIES.get(field)
        if not query:
            return None
        rows = db.execute_query(query)
        if rows is None:
            return None
        return [list(r.values())[0] for r in rows]


class Product:
    """Product model"""

    @staticmethod
    def get_all_by_vendor(vendor_id):
        query = """
        SELECT p.*, COUNT(v.variant_id) as variant_count
        FROM product p
        LEFT JOIN variant v ON p.product_id = v.product_id
        WHERE p.vendor_id = %s AND p.status = 'active'
        GROUP BY p.product_id
        ORDER BY p.created_date DESC
        """
        return db.execute_query(query, (vendor_id,))

    @staticmethod
    def get_by_id(product_id):
        query = "SELECT * FROM product WHERE product_id = %s AND status = 'active'"
        result = db.execute_query(query, (product_id,))
        return result[0] if result else None

    @staticmethod
    def create(vendor_id, v_prod_id, product_name, photo_url, customer_product_id='', remarks='', price=0, status='active'):
        query = """
        INSERT INTO product
            (vendor_id, v_prod_id, product_name, customer_product_id, photo_url, remarks, price, status, created_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING product_id
        """
        product_id = db.execute_insert(
            query, (vendor_id, v_prod_id, product_name, customer_product_id, photo_url, remarks, price, status)
        )
        return product_id

    @staticmethod
    def exists_for_vendor(vendor_id, v_prod_id):
        """True if this vendor already has a product with this Vendor
        Product ID - compared ignoring case and surrounding spaces, so
        "SH-101" and " sh-101" count as the same. Inactive products count
        too: they still hold that ID in the DB."""
        query = """
        SELECT 1 FROM product
        WHERE vendor_id = %s AND LOWER(TRIM(v_prod_id)) = LOWER(TRIM(%s))
        LIMIT 1
        """
        return bool(db.execute_query(query, (vendor_id, v_prod_id)))

    @staticmethod
    def create_with_photos(vendor_id, v_prod_id, product_name, photos, customer_product_id='', remarks='', price=0, status='active'):
        """Create a product and store its photos (as BYTEA) in ONE
        transaction - either the product and all its photos are saved, or
        nothing is. photos: list of {'data': bytes, 'mime_type': str} in
        display order; the first one becomes the cover photo.

        Each photo's photo_url is set to the route that serves its bytes
        (/api/product-photos/<id>), and product.photo_url to the first of
        those - so every screen that already shows photo_url keeps working
        unchanged. Returns {'product_id', 'photo_urls'} or None on failure."""
        cursor = None
        try:
            cursor = db.connection.cursor()
            cursor.execute(
                """
                INSERT INTO product
                    (vendor_id, v_prod_id, product_name, customer_product_id, photo_url, remarks, price, status, created_date)
                VALUES (%s, %s, %s, %s, '', %s, %s, %s, NOW())
                RETURNING product_id
                """,
                (vendor_id, v_prod_id, product_name, customer_product_id, remarks, price, status),
            )
            product_id = cursor.fetchone()['product_id']

            photo_urls = []
            for i, photo in enumerate(photos):
                # photo_url needs the new row's id, so insert first, then fill it in
                cursor.execute(
                    """
                    INSERT INTO product_photo (product_id, photo_url, sort_order, image_data, mime_type)
                    VALUES (%s, '', %s, %s, %s)
                    RETURNING product_photo_id
                    """,
                    (product_id, i, psycopg2.Binary(photo['data']), photo['mime_type']),
                )
                photo_id = cursor.fetchone()['product_photo_id']
                photo_url = f"/api/product-photos/{photo_id}"
                cursor.execute(
                    "UPDATE product_photo SET photo_url = %s WHERE product_photo_id = %s",
                    (photo_url, photo_id),
                )
                photo_urls.append(photo_url)

            cursor.execute(
                "UPDATE product SET photo_url = %s WHERE product_id = %s",
                (photo_urls[0] if photo_urls else None, product_id),
            )
            db.connection.commit()
            return {'product_id': product_id, 'photo_urls': photo_urls}
        except psycopg2.Error as e:
            db.connection.rollback()
            print(f"Create product with photos error: {e}")
            return None
        finally:
            if cursor:
                cursor.close()

    @staticmethod
    def update(product_id, v_prod_id, product_name, photo_url, customer_product_id='', remarks='', price=0, status='active'):
        """Update an existing product's fields."""
        query = """
        UPDATE product
        SET v_prod_id = %s, product_name = %s, photo_url = %s,
            customer_product_id = %s, remarks = %s, price = %s, status = %s
        WHERE product_id = %s
        """
        rows = db.execute_update(query, (v_prod_id, product_name, photo_url, customer_product_id, remarks, price, status, product_id))
        return rows

# class Category:
#     """Category lookup model"""

#     @staticmethod
#     def find_or_create(name):
#         name = name.strip()
#         existing = db.execute_query(
#             "SELECT category_id FROM category WHERE LOWER(category_name) = LOWER(%s)", (name,)
#         )
#         if existing:
#             return existing[0]['category_id']
#         result = db.execute_insert(
#             "INSERT INTO category (category_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING category_id",
#             (name,)
#         )
#         return result


class Category:
    """Category lookup model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM category ORDER BY category_name ASC"
        return db.execute_query(query)

    @staticmethod
    def find_or_create(name):
        name = name.strip()
        existing = db.execute_query(
            "SELECT category_id FROM category WHERE LOWER(category_name) = LOWER(%s)", (name,)
        )
        if existing:
            return existing[0]['category_id']
        result = db.execute_insert(
            "INSERT INTO category (category_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING category_id",
            (name,)
        )
        return result

    @staticmethod
    def create(category_name, updated_by=None):
        query = """
        INSERT INTO category (category_name, status, updated_by, created_date, updated_date)
        VALUES (%s, 'active', %s, NOW(), NOW())
        RETURNING category_id
        """
        return db.execute_insert(query, (category_name, updated_by))

    @staticmethod
    def update(category_id, updated_by=None, **fields):
        """Partial update - only touches columns actually passed."""
        allowed = ['category_name']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE category SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE category_id = %s"
        values.extend([updated_by, category_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(category_id, status, updated_by=None):
        query = "UPDATE category SET status = %s, updated_by = %s, updated_date = NOW() WHERE category_id = %s"
        return db.execute_update(query, (status, updated_by, category_id))


class Gender:
    """Gender lookup model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM gender ORDER BY gender_name ASC"
        return db.execute_query(query)

    @staticmethod
    def find_or_create(name):
        name = name.strip()
        existing = db.execute_query(
            "SELECT gender_id FROM gender WHERE LOWER(gender_name) = LOWER(%s)", (name,)
        )
        if existing:
            return existing[0]['gender_id']
        result = db.execute_insert(
            "INSERT INTO gender (gender_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING gender_id",
            (name,)
        )
        return result

    @staticmethod
    def create(gender_name, updated_by=None):
        query = """
        INSERT INTO gender (gender_name, status, updated_by, created_date, updated_date)
        VALUES (%s, 'active', %s, NOW(), NOW())
        RETURNING gender_id
        """
        return db.execute_insert(query, (gender_name, updated_by))

    @staticmethod
    def update(gender_id, updated_by=None, **fields):
        allowed = ['gender_name']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE gender SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE gender_id = %s"
        values.extend([updated_by, gender_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(gender_id, status, updated_by=None):
        query = "UPDATE gender SET status = %s, updated_by = %s, updated_date = NOW() WHERE gender_id = %s"
        return db.execute_update(query, (status, updated_by, gender_id))


class Pattern:
    """Pattern lookup model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM pattern ORDER BY pattern_name ASC"
        return db.execute_query(query)

    @staticmethod
    def find_or_create(name):
        name = name.strip()
        existing = db.execute_query(
            "SELECT pattern_id FROM pattern WHERE LOWER(pattern_name) = LOWER(%s)", (name,)
        )
        if existing:
            return existing[0]['pattern_id']
        result = db.execute_insert(
            "INSERT INTO pattern (pattern_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING pattern_id",
            (name,)
        )
        return result

    @staticmethod
    def create(pattern_name, updated_by=None):
        query = """
        INSERT INTO pattern (pattern_name, status, updated_by, created_date, updated_date)
        VALUES (%s, 'active', %s, NOW(), NOW())
        RETURNING pattern_id
        """
        return db.execute_insert(query, (pattern_name, updated_by))

    @staticmethod
    def update(pattern_id, updated_by=None, **fields):
        allowed = ['pattern_name']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE pattern SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE pattern_id = %s"
        values.extend([updated_by, pattern_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(pattern_id, status, updated_by=None):
        query = "UPDATE pattern SET status = %s, updated_by = %s, updated_date = NOW() WHERE pattern_id = %s"
        return db.execute_update(query, (status, updated_by, pattern_id))


class Color:
    """Color lookup model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM color ORDER BY color_name ASC"
        return db.execute_query(query)

    @staticmethod
    def resolve_hex(name):
        """The swatch colour for a colour name, as (hex_code, source):
        source 'saved' = already stored on this colour in the color table,
        'auto' = guessed from the name (colour_hex.guess_hex), or
        (None, None) = unknown - the app should ask the user to pick one."""
        name = (name or '').strip()
        existing = db.execute_query(
            "SELECT hex_code FROM color WHERE LOWER(color_name) = LOWER(%s) AND hex_code IS NOT NULL LIMIT 1",
            (name,),
        )
        if existing:
            return existing[0]['hex_code'], 'saved'
        guessed = guess_hex(name)
        return (guessed, 'auto') if guessed else (None, None)

    @staticmethod
    def find_or_create(name, hex_code=None):
        """Find a colour by name (ignoring case), or create it. Makes sure it
        ends up with a hex_code whenever possible: an existing colour that has
        none gets the user-picked hex_code, or else one guessed from its
        name. A colour that already has a hex_code keeps it."""
        name = name.strip()
        existing = db.execute_query(
            "SELECT color_id, hex_code FROM color WHERE LOWER(color_name) = LOWER(%s)", (name,)
        )
        if existing:
            color_id = existing[0]['color_id']
            if not existing[0]['hex_code']:
                new_hex = hex_code or guess_hex(name)
                if new_hex:
                    db.execute_update(
                        "UPDATE color SET hex_code = %s, updated_date = NOW() WHERE color_id = %s",
                        (new_hex, color_id),
                    )
            return color_id
        result = db.execute_insert(
            "INSERT INTO color (color_name, hex_code, status, created_date) VALUES (%s, %s, 'active', NOW()) RETURNING color_id",
            (name, hex_code or guess_hex(name))
        )
        return result

    @staticmethod
    def create(color_name, hex_code='', updated_by=None):
        query = """
        INSERT INTO color (color_name, hex_code, status, updated_by, created_date, updated_date)
        VALUES (%s, %s, 'active', %s, NOW(), NOW())
        RETURNING color_id
        """
        return db.execute_insert(query, (color_name, hex_code, updated_by))

    @staticmethod
    def update(color_id, updated_by=None, **fields):
        allowed = ['color_name', 'hex_code']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE color SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE color_id = %s"
        values.extend([updated_by, color_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(color_id, status, updated_by=None):
        query = "UPDATE color SET status = %s, updated_by = %s, updated_date = NOW() WHERE color_id = %s"
        return db.execute_update(query, (status, updated_by, color_id))


# class Gender:
#     """Gender lookup model"""

#     @staticmethod
#     def find_or_create(name):
#         name = name.strip()
#         existing = db.execute_query(
#             "SELECT gender_id FROM gender WHERE LOWER(gender_name) = LOWER(%s)", (name,)
#         )
#         if existing:
#             return existing[0]['gender_id']
#         result = db.execute_insert(
#             "INSERT INTO gender (gender_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING gender_id",
#             (name,)
#         )
#         return result

# class Pattern:
#     """Pattern lookup model"""

#     @staticmethod
#     def find_or_create(name):
#         name = name.strip()
#         existing = db.execute_query(
#             "SELECT pattern_id FROM pattern WHERE LOWER(pattern_name) = LOWER(%s)", (name,)
#         )
#         if existing:
#             return existing[0]['pattern_id']
#         result = db.execute_insert(
#             "INSERT INTO pattern (pattern_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING pattern_id",
#             (name,)
#         )
#         return result

# class Color:
#     """Color lookup model"""

#     @staticmethod
#     def find_or_create(name):
#         name = name.strip()
#         existing = db.execute_query(
#             "SELECT color_id FROM color WHERE LOWER(color_name) = LOWER(%s)", (name,)
#         )
#         if existing:
#             return existing[0]['color_id']
#         result = db.execute_insert(
#             "INSERT INTO color (color_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING color_id",
#             (name,)
#         )
#         return result

class Variant:
    """Variant model"""

    @staticmethod
    def get_all_by_product(product_id):
        query = """
        SELECT v.*, c.category_name, g.gender_name, p.pattern_name,
               col.color_name, col.hex_code,
               COUNT(vs.variant_size_id) as size_count
        FROM variant v
        LEFT JOIN category c ON v.category_id = c.category_id
        LEFT JOIN gender g ON v.gender_id = g.gender_id
        LEFT JOIN pattern p ON v.pattern_id = p.pattern_id
        LEFT JOIN color col ON v.color_id = col.color_id
        LEFT JOIN variant_size vs ON v.variant_id = vs.variant_id
        WHERE v.product_id = %s AND v.status = 'active'
        GROUP BY v.variant_id, c.category_name, g.gender_name, p.pattern_name,
                 col.color_name, col.hex_code
        ORDER BY v.created_date DESC
        """
        return db.execute_query(query, (product_id,))

    @staticmethod
    def get_by_id(variant_id):
        query = "SELECT * FROM variant WHERE variant_id = %s AND status = 'active'"
        result = db.execute_query(query, (variant_id,))
        return result[0] if result else None

    @staticmethod
    def create(product_id, category_id, gender_id, pattern_id, color_id):
        query = """
        INSERT INTO variant (product_id, category_id, gender_id, pattern_id, color_id, status, created_date)
        VALUES (%s, %s, %s, %s, %s, 'active', NOW())
        RETURNING variant_id
        """
        variant_id = db.execute_insert(query, (product_id, category_id, gender_id, pattern_id, color_id))
        return variant_id

    @staticmethod
    def create_from_names(product_id, category_name, color_name, pattern_name='Standard', remarks='', gender_name=None, color_hex=None):
        """Find-or-create each lookup value by name, then create the variant.
        Used by the Add Variant screen, which takes free-text input instead
        of IDs. Gender is optional - the Add Variant screen no longer asks
        for it, but the parameter is kept (and now last, defaulting to
        None) for any other caller that still wants to set it."""
        category_id = Category.find_or_create(category_name)
        gender_id = Gender.find_or_create(gender_name) if gender_name else None
        color_id = Color.find_or_create(color_name, color_hex)
        pattern_id = Pattern.find_or_create(pattern_name)

        if not all([category_id, color_id, pattern_id]):
            return None

        query = """
        INSERT INTO variant (product_id, category_id, gender_id, pattern_id, color_id, remarks, status, created_date)
        VALUES (%s, %s, %s, %s, %s, %s, 'active', NOW())
        RETURNING variant_id
        """
        return db.execute_insert(query, (product_id, category_id, gender_id, pattern_id, color_id, remarks))

# class Size:
#     """Size model"""

#     @staticmethod
#     def get_all():
#         query = "SELECT * FROM size WHERE status = 'active' ORDER BY size_value"
#         return db.execute_query(query)

#     @staticmethod
#     def get_available_for_variant(variant_id):
#         query = """
#         SELECT s.* FROM size s
#         WHERE s.status = 'active'
#         AND s.size_id NOT IN (SELECT size_id FROM variant_size WHERE variant_id = %s)
#         ORDER BY s.size_value
#         """
#         return db.execute_query(query, (variant_id,))

#     @staticmethod
#     def get_all_with_assignment(variant_id):
#         """Sizes 1-12, each flagged with whether it's assigned to this variant.
#         size_value is stored as text, so we only cast/sort numerically the
#         rows that are actually plain numbers - this also fixes the old
#         alphabetical sort bug (10, 11, 12... 5, 6, 7 instead of 1, 2, 3...)."""
#         query = """
#         SELECT s.size_id, s.size_value,
#                EXISTS (
#                    SELECT 1 FROM variant_size vs
#                    WHERE vs.variant_id = %s AND vs.size_id = s.size_id
#                ) AS assigned
#         FROM size s
#         WHERE s.status = 'active'
#           AND s.size_value ~ '^[0-9]+$'
#           AND s.size_value::int BETWEEN 1 AND 12
#         ORDER BY s.size_value::int
#         """
#         return db.execute_query(query, (variant_id,))

class Size:
    """Size model"""

    @staticmethod
    def get_all():
        query = "SELECT * FROM size WHERE status = 'active' ORDER BY size_value"
        return db.execute_query(query)

    @staticmethod
    def get_available_for_variant(variant_id):
        query = """
        SELECT s.* FROM size s
        WHERE s.status = 'active'
        AND s.size_id NOT IN (SELECT size_id FROM variant_size WHERE variant_id = %s)
        ORDER BY s.size_value
        """
        return db.execute_query(query, (variant_id,))

    @staticmethod
    def get_all_with_assignment(variant_id):
        """Sizes 1-12, each flagged with whether it's assigned to this variant.
        size_value is stored as text, so we only cast/sort numerically the
        rows that are actually plain numbers - this also fixes the old
        alphabetical sort bug (10, 11, 12... 5, 6, 7 instead of 1, 2, 3...)."""
        query = """
        SELECT s.size_id, s.size_value,
               EXISTS (
                   SELECT 1 FROM variant_size vs
                   WHERE vs.variant_id = %s AND vs.size_id = s.size_id
               ) AS assigned
        FROM size s
        WHERE s.status = 'active'
          AND s.size_value ~ '^[0-9]+$'
          AND s.size_value::int BETWEEN 1 AND 12
        ORDER BY s.size_value::int
        """
        return db.execute_query(query, (variant_id,))

    @staticmethod
    def create(size_value, updated_by=None):
        query = """
        INSERT INTO size (size_value, status, updated_by, created_date, updated_date)
        VALUES (%s, 'active', %s, NOW(), NOW())
        RETURNING size_id
        """
        return db.execute_insert(query, (size_value, updated_by))

    @staticmethod
    def update(size_id, updated_by=None, **fields):
        allowed = ['size_value']
        fields_to_set = {k: v for k, v in fields.items() if k in allowed}
        if not fields_to_set:
            return 0
        set_clause = ", ".join(f"{col} = %s" for col in fields_to_set)
        values = list(fields_to_set.values())
        query = f"UPDATE size SET {set_clause}, updated_by = %s, updated_date = NOW() WHERE size_id = %s"
        values.extend([updated_by, size_id])
        return db.execute_update(query, tuple(values))

    @staticmethod
    def update_status(size_id, status, updated_by=None):
        query = "UPDATE size SET status = %s, updated_by = %s, updated_date = NOW() WHERE size_id = %s"
        return db.execute_update(query, (status, updated_by, size_id))

class VariantSize:
    """Variant_Size model"""

    @staticmethod
    def assign_sizes(variant_id, size_ids):
        """Set the exact list of sizes assigned to a variant.
        Adds newly selected sizes and removes any that were deselected,
        instead of blindly inserting (which caused duplicate-key errors
        whenever an already-assigned size was saved again)."""
        try:
            if size_ids:
                placeholders = ','.join(['%s'] * len(size_ids))
                delete_query = f"""
                DELETE FROM variant_size
                WHERE variant_id = %s AND size_id NOT IN ({placeholders})
                """
                db.execute_update(delete_query, (variant_id, *size_ids))
            else:
                db.execute_update("DELETE FROM variant_size WHERE variant_id = %s", (variant_id,))

            queries = []
            for size_id in size_ids:
                query = """
                INSERT INTO variant_size (variant_id, size_id, status, created_date)
                VALUES (%s, %s, 'active', NOW())
                ON CONFLICT (variant_id, size_id) DO NOTHING
                """
                queries.append((query, (variant_id, size_id)))

            if queries:
                return db.execute_transaction(queries)
            return True
        except Exception as e:
            print(f"Error syncing sizes: {e}")
            return False

class Cart:
    """Cart model"""

    @staticmethod
    def get_for_vendor(vendor_id):
        query = """
        SELECT c.*, p.v_prod_id, p.product_name, p.photo_url,
               COUNT(DISTINCT v.variant_id) as variant_count,
               ARRAY_AGG(DISTINCT s.size_value) FILTER (WHERE s.size_value IS NOT NULL) as selected_sizes
        FROM cart c
        JOIN product p ON c.product_id = p.product_id
        LEFT JOIN variant v ON v.product_id = p.product_id
        LEFT JOIN cart_size cs ON cs.cart_id = c.cart_id
        LEFT JOIN size s ON s.size_id = cs.size_id
        WHERE c.vendor_id = %s
        GROUP BY c.cart_id, p.v_prod_id, p.product_name, p.photo_url
        ORDER BY c.created_date DESC
        """
        return db.execute_query(query, (vendor_id,))

    @staticmethod
    def add(vendor_id, product_id):
        # ON CONFLICT DO NOTHING: adding a product that's already in this
        # vendor's cart is a no-op, not an error (matches the table's
        # UNIQUE(vendor_id, product_id) constraint).
        query = """
        INSERT INTO cart (vendor_id, product_id, created_date)
        VALUES (%s, %s, NOW())
        ON CONFLICT (vendor_id, product_id) DO NOTHING
        RETURNING cart_id
        """
        result = db.execute_insert(query, (vendor_id, product_id))
        if result:
            return result
        # Already existed - fetch its id so the caller still gets one back.
        existing = db.execute_query(
            "SELECT cart_id FROM cart WHERE vendor_id = %s AND product_id = %s",
            (vendor_id, product_id)
        )
        return existing[0]['cart_id'] if existing else None

    @staticmethod
    def add_with_sizes(vendor_id, product_id, variant_id, size_ids):
        """Add a product to the vendor's cart along with the specific
        variant+size combinations picked. If the product is already in the
        cart, reuses that same cart row and just adds the new sizes -
        sizes already present are silently skipped (no duplicates)."""
        cart_id = Cart.add(vendor_id, product_id)
        if not cart_id or not size_ids:
            return cart_id

        queries = []
        for size_id in size_ids:
            query = """
            INSERT INTO cart_size (cart_id, variant_id, size_id, created_date)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (cart_id, variant_id, size_id) DO NOTHING
            """
            queries.append((query, (cart_id, variant_id, size_id)))
        db.execute_transaction(queries)
        return cart_id

    @staticmethod
    def get_selected_sizes(vendor_id, variant_id):
        """Size IDs already picked for this variant, across this vendor's
        current (uncompleted) cart - used to hide already-picked sizes when
        the person reopens size selection for the same variant."""
        query = """
        SELECT cs.size_id
        FROM cart_size cs
        JOIN cart c ON c.cart_id = cs.cart_id
        WHERE c.vendor_id = %s AND cs.variant_id = %s
        """
        result = db.execute_query(query, (vendor_id, variant_id))
        return [r['size_id'] for r in result] if result else []

    @staticmethod
    def get_full_cart_for_order(vendor_id):
        """Everything needed to hand a vendor's cart to the EXISTING
        Create Purchase Order / Product Details screens - one row per
        product+variant+size, with all the display fields those screens
        already expect (code, name, image, category/pattern/color, price)."""
        query = """
        SELECT p.product_id, p.v_prod_id, p.product_name, p.photo_url, p.price,
               v.variant_id, cat.category_name, pat.pattern_name, col.color_name, col.hex_code,
               s.size_id, s.size_value
        FROM cart c
        JOIN cart_size cs ON cs.cart_id = c.cart_id
        JOIN product p ON p.product_id = c.product_id
        JOIN variant v ON v.variant_id = cs.variant_id
        LEFT JOIN category cat ON cat.category_id = v.category_id
        LEFT JOIN pattern pat ON pat.pattern_id = v.pattern_id
        LEFT JOIN color col ON col.color_id = v.color_id
        JOIN size s ON s.size_id = cs.size_id
        WHERE c.vendor_id = %s
        ORDER BY p.product_id, v.variant_id, s.size_value
        """
        return db.execute_query(query, (vendor_id,)) or []

    @staticmethod
    def remove(vendor_id, product_id):
        query = "DELETE FROM cart WHERE vendor_id = %s AND product_id = %s"
        return db.execute_update(query, (vendor_id, product_id))

    @staticmethod
    def clear_for_vendor(vendor_id):
        query = "DELETE FROM cart WHERE vendor_id = %s"
        return db.execute_update(query, (vendor_id,))

class PurchaseOrder:
    """Purchase Order model"""

    @staticmethod
    def compute_delivery_state(status, expected_delivery_date, delivered_date=None):
        """Where this order stands right now, computed fresh on every read
        (never stored) by comparing expected_delivery_date to today.

        Returns:
            state: 'delivered' | 'delayed' | 'pending'
            days: whole days delayed (state='delayed'), days left (state='pending',
                  0 if due today), or None (state='delivered', or no delivery
                  date was ever set on the order)
            message: ready-to-display text for the UI
        """
        if status == 'pending_approval':
            return {'state': 'awaiting_approval', 'days': None, 'message': 'Waiting for approval'}
        if status == 'rejected':
            return {'state': 'rejected', 'days': None, 'message': 'Rejected'}

        if status == 'delivered':
            if delivered_date:
                return {
                    'state': 'delivered',
                    'days': None,
                    'message': f"Delivered on {delivered_date.strftime('%d %b %Y')}",
                }
            return {'state': 'delivered', 'days': None, 'message': 'Delivered'}

        if not expected_delivery_date:
            return {'state': 'pending', 'days': None, 'message': 'Delivery date not set'}

        days_diff = (expected_delivery_date - date.today()).days

        if days_diff < 0:
            d = abs(days_diff)
            return {
                'state': 'delayed',
                'days': d,
                'message': f"Delayed by {d} day{'s' if d != 1 else ''}",
            }
        if days_diff == 0:
            return {'state': 'pending', 'days': 0, 'message': 'Due today'}
        return {
            'state': 'pending',
            'days': days_diff,
            'message': f"{days_diff} day{'s' if days_diff != 1 else ''} left",
        }

    @staticmethod
    def update_status(po_id, status, updated_by=None):
        """General-purpose status update - status must be one of the
        values the DB's CHECK constraint allows: 'draft', 'confirmed',
        'delivered' (validated by the caller before this is reached).

        delivered_date is kept in sync automatically in one query:
        - moving TO 'delivered' from something else stamps it to NOW()
        - moving AWAY from 'delivered' clears it back to NULL (the order
          is no longer considered delivered, so a stale delivered_date
          would be misleading)
        - setting 'delivered' again while already delivered leaves the
          original delivered_date untouched (doesn't reset the clock on
          a duplicate call)

        Returns the number of rows updated (0 if po_id doesn't exist).
        """
        query = """
        UPDATE purchase_order
        SET status = %s,
            delivered_date = CASE
                WHEN %s = 'delivered' AND status != 'delivered' THEN NOW()
                WHEN %s != 'delivered' THEN NULL
                ELSE delivered_date
            END,
            updated_by = %s,
            updated_date = NOW()
        WHERE po_id = %s
        """
        return db.execute_update(query, (status, status, status, updated_by, po_id))

    @staticmethod
    def get_last_pricing(variant_id, size_id, product_id=None):
        """Most recently used cost/mrp/gst for this exact variant+size
        combination, so the Product Details screen can prefill known
        pricing instead of asking the user to retype it every order.
        Falls back to the same product+size on another of its variants,
        or - for orders placed before po_size_detail tracked variant_id -
        a legacy row from an order containing ONLY this product (with
        several products on one order, a variant-less row can't be tied
        to a product, and guessing returned other products' costs).
        Returns None if there's no history either way."""
        query = """
        SELECT psd.cost, psd.mrp, psd.gst
        FROM po_size_detail psd
        JOIN purchase_order po ON psd.po_id = po.po_id
        WHERE psd.variant_id = %s AND psd.size_id = %s
        ORDER BY po.created_date DESC
        LIMIT 1
        """
        result = db.execute_query(query, (variant_id, size_id))
        if result:
            return result[0]

        if product_id:
            fallback_query = """
            SELECT psd.cost, psd.mrp, psd.gst
            FROM po_size_detail psd
            JOIN purchase_order po ON psd.po_id = po.po_id
            LEFT JOIN variant v ON v.variant_id = psd.variant_id
            WHERE psd.size_id = %s
              AND (
                v.product_id = %s
                OR (
                  psd.variant_id IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM po_product_detail ppd
                    WHERE ppd.po_id = po.po_id AND ppd.product_id != %s
                  )
                  AND EXISTS (
                    SELECT 1 FROM po_product_detail ppd
                    WHERE ppd.po_id = po.po_id AND ppd.product_id = %s
                  )
                )
              )
            ORDER BY po.created_date DESC
            LIMIT 1
            """
            result = db.execute_query(fallback_query, (size_id, product_id, product_id, product_id))
            if result:
                return result[0]

        return None

    @staticmethod
    def mark_delivered(po_id, updated_by=None):
        """Convenience wrapper kept for the app's existing "Mark as
        Delivered" button - equivalent to update_status(po_id, 'delivered')."""
        return PurchaseOrder.update_status(po_id, 'delivered', updated_by)

    @staticmethod
    def update_expected_delivery_date(po_id, expected_delivery_date, updated_by=None):
        """Corrects/overrides when an order is due. There is no 'delayed'
        status to set directly - delayed is always computed by comparing
        this date to today (see compute_delivery_state), so pushing this
        into the past on a non-delivered order is exactly how you get one
        to show up as delayed, e.g. for testing the Delayed filter."""
        query = """
        UPDATE purchase_order
        SET expected_delivery_date = %s, updated_by = %s, updated_date = NOW()
        WHERE po_id = %s
        """
        return db.execute_update(query, (expected_delivery_date, updated_by, po_id))

    @staticmethod
    def update_payment_status(po_id, payment_status, updated_by=None):
        """Whether the vendor has been paid for this order - entirely
        independent of delivery status. An order can be delivered and
        still unpaid, or paid before delivery."""
        query = """
        UPDATE purchase_order
        SET payment_status = %s, updated_by = %s, updated_date = NOW()
        WHERE po_id = %s
        """
        return db.execute_update(query, (payment_status, updated_by, po_id))

    @staticmethod
    def _detail_queries(po_id, products_data):
        """The product / variant / size rows of an order, as (query, params) pairs for one transaction."""
        queries = []
        for product in products_data:
            queries.append(("INSERT INTO po_product_detail (po_id, product_id, created_date) VALUES (%s, %s, NOW())",
                            (po_id, product['product_id'])))
            for variant in product['variants']:
                variant_id = variant['variant_id']
                queries.append(("INSERT INTO po_variant_detail (po_id, variant_id, created_date) VALUES (%s, %s, NOW())",
                                (po_id, variant_id)))
                for size in variant['sizes']:
                    # NOTE: 'amount' is a PostgreSQL generated column (cost * qty) - it must NOT be inserted.
                    queries.append((
                        """
                        INSERT INTO po_size_detail
                        (po_id, size_id, variant_id, cost, mrp, qty, gst, created_date)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (po_id, size['size_id'], variant_id, size.get('cost', 0), size.get('mrp', 0),
                         size.get('qty', 0), size.get('gst', 0))))
        return queries

    @staticmethod
    def create_order(vendor_id, order_date, products_data, remarks='', expected_delivery_date=None,
                     status='confirmed', created_by=None):
        """
        Create a complete purchase order with all details.
        status: 'confirmed' (placed) or 'pending_approval' (waits for an approver).
        products_data: [{'product_id': 1, 'variants': [{'variant_id': 1,
                         'sizes': [{'size_id': 5, 'cost': 800, 'mrp': 1500, 'qty': 10, 'gst': 5}]}]}]
        """
        try:
            po_id = db.execute_insert(
                """
                INSERT INTO purchase_order (vendor_id, order_date, remarks, status, expected_delivery_date, created_by, created_date)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING po_id
                """,
                (vendor_id, order_date, remarks, status, expected_delivery_date, created_by))
            if not po_id:
                return None
            if db.execute_transaction(PurchaseOrder._detail_queries(po_id, products_data)):
                Cart.clear_for_vendor(vendor_id)
                return po_id
            return None
        except Exception as e:
            print(f"Error creating order: {e}")
            return None

    @staticmethod
    def replace_order(po_id, order_date, expected_delivery_date, remarks, products_data, new_status, updated_by):
        """Replace an order's dates, remarks and ALL its lines in one transaction (used for edits and resubmits).
        Moving to 'pending_approval' also clears any earlier rejection feedback."""
        queries = [(
            """
            UPDATE purchase_order
            SET order_date = %s, expected_delivery_date = %s, remarks = %s, status = %s,
                updated_by = %s, updated_date = NOW(),
                reviewed_by   = CASE WHEN %s = 'pending_approval' THEN NULL ELSE reviewed_by END,
                reviewed_date = CASE WHEN %s = 'pending_approval' THEN NULL ELSE reviewed_date END,
                review_note   = CASE WHEN %s = 'pending_approval' THEN NULL ELSE review_note END
            WHERE po_id = %s
            """,
            (order_date, expected_delivery_date, remarks, new_status, updated_by,
             new_status, new_status, new_status, po_id)),
            ("DELETE FROM po_size_detail WHERE po_id = %s", (po_id,)),
            ("DELETE FROM po_variant_detail WHERE po_id = %s", (po_id,)),
            ("DELETE FROM po_product_detail WHERE po_id = %s", (po_id,))]
        queries += PurchaseOrder._detail_queries(po_id, products_data)
        return db.execute_transaction(queries)

    @staticmethod
    def review(po_id, new_status, reviewer_id, note=None):
        """Approve ('confirmed') or reject ('rejected') an order that is waiting. Returns rows changed (0 if it was not waiting)."""
        return db.execute_update(
            """
            UPDATE purchase_order
            SET status = %s, reviewed_by = %s, reviewed_date = NOW(), review_note = %s,
                updated_by = %s, updated_date = NOW()
            WHERE po_id = %s AND status = 'pending_approval'
            """,
            (new_status, reviewer_id, note, reviewer_id, po_id))

    @staticmethod
    def get_all_for_vendor(vendor_id):
        query = """
        SELECT po.*, v.vendor_name, COUNT(DISTINCT ppd.product_id) as product_count
        FROM purchase_order po
        JOIN vendor v ON po.vendor_id = v.vendor_id
        LEFT JOIN po_product_detail ppd ON po.po_id = ppd.po_id
        WHERE po.vendor_id = %s
        GROUP BY po.po_id
        ORDER BY po.created_date DESC
        """
        return db.execute_query(query, (vendor_id,))

    # Correlated subquery for an order's cover image: the cover photo of the
    # first product added to the order (lowest po_product_id) that has one.
    # Must be used in a query where the purchase_order table is aliased "po".
    COVER_IMAGE_SQL = """(
            SELECT p.photo_url
            FROM po_product_detail ppd
            JOIN product p ON p.product_id = ppd.product_id
            WHERE ppd.po_id = po.po_id
              AND p.photo_url IS NOT NULL AND p.photo_url != ''
            ORDER BY ppd.po_product_id
            LIMIT 1
        ) AS product_image"""

    @staticmethod
    def get_all(vendor_id=None, date_from=None, date_to=None):
        """All purchase orders, or only one vendor's if vendor_id is given.
        date_from/date_to (date objects), if given, filter to orders whose
        expected_delivery_date falls in that range (inclusive on both
        ends) - used by the Orders screen's delivery-date filter to
        answer "how many orders are due between day X and day Y". Either
        bound can be given alone (open-ended on the other side).
        Reused by both the global Orders screen (bottom nav) and the
        vendor-scoped Orders view inside a Vendor Workspace, so there's
        only one query to maintain."""
        query = f"""
        SELECT po.po_id, po.order_date, po.status, po.expected_delivery_date,
               po.delivered_date, po.payment_status, v.vendor_name, v.logo_url,
               COALESCE(SUM(psd.amount), 0) as order_total,
               {PurchaseOrder.COVER_IMAGE_SQL}
        FROM purchase_order po
        JOIN vendor v ON po.vendor_id = v.vendor_id
        LEFT JOIN po_size_detail psd ON psd.po_id = po.po_id
        """
        conditions = []
        params = []
        if vendor_id:
            conditions.append("po.vendor_id = %s")
            params.append(vendor_id)
        if date_from:
            conditions.append("po.expected_delivery_date >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("po.expected_delivery_date <= %s")
            params.append(date_to)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += """
        GROUP BY po.po_id, po.order_date, po.status, po.expected_delivery_date,
                 po.delivered_date, po.payment_status, v.vendor_name, v.logo_url
        ORDER BY po.created_date DESC
        """
        return db.execute_query(query, tuple(params) if params else None)

    @staticmethod
    def get_by_id(po_id):
        query = "SELECT * FROM purchase_order WHERE po_id = %s"
        result = db.execute_query(query, (po_id,))
        return result[0] if result else None

    @staticmethod
    def get_po_details(po_id):
        """Get complete PO with all details"""
        po = PurchaseOrder.get_by_id(po_id)
        if not po:
            return None

        # Get products
        prod_query = """
        SELECT DISTINCT p.*, ppd.po_product_id
        FROM po_product_detail ppd
        JOIN product p ON ppd.product_id = p.product_id
        WHERE ppd.po_id = %s
        """
        po['products'] = db.execute_query(prod_query, (po_id,))

        # Get size details
        size_query = """
        SELECT psd.*, s.size_value
        FROM po_size_detail psd
        JOIN size s ON psd.size_id = s.size_id
        WHERE psd.po_id = %s
        ORDER BY s.size_value
        """
        po['sizes'] = db.execute_query(size_query, (po_id,))

        ids = [i for i in (po.get('created_by'), po.get('reviewed_by')) if i]
        names = {}
        if ids:
            for r in db.execute_query('SELECT user_id, username FROM "User" WHERE user_id = ANY(%s)', (ids,)) or []:
                names[r['user_id']] = r['username']
        po['created_by_name'] = names.get(po.get('created_by'))
        po['reviewed_by_name'] = names.get(po.get('reviewed_by'))

        return po

class Notification:
    """In-app notifications (mobile app + admin panel). One row per event; which user has read what lives
    in notification_read. audience: 'all' (everyone), 'user' (only recipient_user_id) or 'approvers'
    (everyone who can approve purchase orders). Creating a notification must never break the action that
    caused it, so create() swallows its own errors."""

    HIDDEN = ('pending_approval', 'rejected')  # orders that do not count as placed yet

    @staticmethod
    def create(type_, title, message=None, po_id=None, created_by=None, dedupe_key=None,
               audience='all', recipient_user_id=None):
        try:
            return db.execute_insert(
                """
                INSERT INTO notification (type, title, message, po_id, created_by, dedupe_key, audience, recipient_user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (dedupe_key) DO NOTHING
                RETURNING notification_id
                """,
                (type_, title, message, po_id, created_by, dedupe_key, audience, recipient_user_id),
            )
        except Exception as e:
            print(f"Notification create error: {e}")
            return None

    @staticmethod
    def actor_name(user_id):
        """Username for an optional updated_by id sent by the client, or None."""
        if not user_id:
            return None
        try:
            rows = db.execute_query('SELECT username FROM "User" WHERE user_id = %s', (int(user_id),))
            return rows[0]['username'] if rows else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def order_summary(po_id):
        """Vendor name, order total and expected date for message text."""
        rows = db.execute_query(
            """
            SELECT v.vendor_name, po.expected_delivery_date,
                   COALESCE((SELECT SUM(amount) FROM po_size_detail WHERE po_id = po.po_id), 0) AS total
            FROM purchase_order po JOIN vendor v ON v.vendor_id = po.vendor_id
            WHERE po.po_id = %s
            """,
            (po_id,),
        )
        return rows[0] if rows else None

    @staticmethod
    def sync_delayed():
        """Adds one 'delayed' alert per placed, undelivered order whose expected date has passed (once per order
        and expected date). Orders waiting for approval or rejected are ignored. Called whenever notifications
        are read, so no scheduler is needed."""
        rows = db.execute_query(
            """
            SELECT po.po_id, po.expected_delivery_date, v.vendor_name
            FROM purchase_order po
            JOIN vendor v ON v.vendor_id = po.vendor_id
            WHERE po.status NOT IN ('delivered', 'pending_approval', 'rejected')
              AND po.expected_delivery_date IS NOT NULL
              AND po.expected_delivery_date < CURRENT_DATE
              AND NOT EXISTS (
                  SELECT 1 FROM notification n
                  WHERE n.dedupe_key = 'delayed:' || po.po_id::text || ':' || po.expected_delivery_date::text
              )
            """
        )
        for r in rows or []:
            due = r['expected_delivery_date']
            Notification.create(
                'order_delayed',
                f"PO-{r['po_id']} is delayed",
                f"{r['vendor_name']} order PO-{r['po_id']} was due on {due.strftime('%d %b %Y')} and is not delivered yet.",
                po_id=r['po_id'],
                dedupe_key=f"delayed:{r['po_id']}:{due.isoformat()}",
            )

    # A notification is visible if it is for everyone, for this user, or for approvers (and this user is one).
    # Targeted ones are only shown when the user was verified by a login token (verified=True).
    VISIBLE = """(n.audience = 'all'
                  OR (%(verified)s AND n.audience = 'user' AND n.recipient_user_id = %(uid)s)
                  OR (%(verified)s AND n.audience = 'approvers' AND %(approver)s))"""

    @staticmethod
    def list_for_user(user_id, limit=50, unread_only=False, verified=False, approver=False):
        query = f"""
        SELECT n.notification_id, n.type, n.title, n.message, n.po_id, n.created_date,
               (nr.user_id IS NOT NULL) AS is_read
        FROM notification n
        LEFT JOIN notification_read nr
               ON nr.notification_id = n.notification_id AND nr.user_id = %(uid)s
        WHERE {Notification.VISIBLE}
        """
        if unread_only:
            query += " AND nr.user_id IS NULL"
        query += " ORDER BY n.created_date DESC, n.notification_id DESC LIMIT %(limit)s"
        return db.execute_query(query, {'uid': user_id, 'verified': verified, 'approver': approver, 'limit': limit})

    @staticmethod
    def unread_count(user_id, verified=False, approver=False):
        rows = db.execute_query(
            f"""
            SELECT COUNT(*) AS count FROM notification n
            WHERE {Notification.VISIBLE}
              AND NOT EXISTS (
                SELECT 1 FROM notification_read nr
                WHERE nr.notification_id = n.notification_id AND nr.user_id = %(uid)s
            )
            """,
            {'uid': user_id, 'verified': verified, 'approver': approver},
        )
        return int(rows[0]['count']) if rows else 0

    @staticmethod
    def mark_read(user_id, ids=None):
        """Marks the given notification ids (or every notification when ids is None) as read for this user."""
        if ids is None:
            return db.execute_update(
                """
                INSERT INTO notification_read (user_id, notification_id)
                SELECT %s, notification_id FROM notification
                ON CONFLICT DO NOTHING
                """,
                (user_id,),
            )
        return db.execute_update(
            """
            INSERT INTO notification_read (user_id, notification_id)
            SELECT %s, n.notification_id FROM notification n WHERE n.notification_id = ANY(%s)
            ON CONFLICT DO NOTHING
            """,
            (user_id, ids),
        )


class UserAccount:
    """Staff accounts for the admin panel's Users screen (never returns password hashes)."""

    COLUMNS = """u.user_id, u.username, u.email, u.status, u.role, u.role_id, r.role_name,
                 u.full_name, u.mobile_number, u.created_date, u.updated_date"""
    FROM = 'FROM "User" u LEFT JOIN role r ON r.role_id = u.role_id'

    @staticmethod
    def list_all():
        return db.execute_query(f"SELECT {UserAccount.COLUMNS} {UserAccount.FROM} ORDER BY u.user_id")

    @staticmethod
    def get(user_id):
        rows = db.execute_query(f"SELECT {UserAccount.COLUMNS} {UserAccount.FROM} WHERE u.user_id = %s", (user_id,))
        return rows[0] if rows else None

    @staticmethod
    def username_taken(username, exclude_id=None):
        rows = db.execute_query(
            'SELECT 1 FROM "User" WHERE lower(username) = lower(%s) AND user_id <> COALESCE(%s, -1)', (username, exclude_id))
        return bool(rows)

    @staticmethod
    def email_taken(email, exclude_id=None):
        rows = db.execute_query(
            'SELECT 1 FROM "User" WHERE lower(email) = lower(%s) AND user_id <> COALESCE(%s, -1)', (email, exclude_id))
        return bool(rows)

    @staticmethod
    def create(username, password_hash, email, role_text, role_id, full_name, mobile, created_by):
        return db.execute_insert(
            """
            INSERT INTO "User" (username, password_hash, email, role, role_id, status, full_name, mobile_number, updated_by, created_date)
            VALUES (%s, %s, %s, %s, %s, 'active', %s, %s, %s, NOW())
            RETURNING user_id
            """,
            (username, password_hash, email, role_text, role_id, full_name, mobile, created_by))

    @staticmethod
    def update(user_id, email, role_text, role_id, full_name, mobile, updated_by):
        return db.execute_update(
            """
            UPDATE "User" SET email = %s, role = %s, role_id = %s, full_name = %s, mobile_number = %s,
                   updated_by = %s, updated_date = NOW()
            WHERE user_id = %s
            """,
            (email, role_text, role_id, full_name, mobile, updated_by, user_id))

    @staticmethod
    def set_status(user_id, status, updated_by):
        return db.execute_update(
            'UPDATE "User" SET status = %s, updated_by = %s, updated_date = NOW() WHERE user_id = %s',
            (status, updated_by, user_id))

    @staticmethod
    def set_password(user_id, password_hash, updated_by):
        return db.execute_update(
            'UPDATE "User" SET password_hash = %s, updated_by = %s, updated_date = NOW() WHERE user_id = %s',
            (password_hash, updated_by, user_id))

    @staticmethod
    def count_active_admins(exclude_id=None):
        rows = db.execute_query(
            """
            SELECT COUNT(*) AS count FROM "User" u LEFT JOIN role r ON r.role_id = u.role_id
            WHERE u.status = 'active'
              AND (u.role = 'admin' OR lower(COALESCE(r.role_name, '')) LIKE 'admin%%')
              AND u.user_id <> COALESCE(%s, -1)
            """, (exclude_id,))
        return int(rows[0]['count']) if rows else 0
