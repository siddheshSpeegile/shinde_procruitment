from database import db
from datetime import datetime, date


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

    @staticmethod
    def get_all():
        query = "SELECT * FROM vendor ORDER BY vendor_name ASC"
        return db.execute_query(query)

    @staticmethod
    def get_by_id(vendor_id):
        query = "SELECT * FROM vendor WHERE vendor_id = %s"
        result = db.execute_query(query, (vendor_id,))
        return result[0] if result else None

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
    def find_or_create(name):
        name = name.strip()
        existing = db.execute_query(
            "SELECT color_id FROM color WHERE LOWER(color_name) = LOWER(%s)", (name,)
        )
        if existing:
            return existing[0]['color_id']
        result = db.execute_insert(
            "INSERT INTO color (color_name, status, created_date) VALUES (%s, 'active', NOW()) RETURNING color_id",
            (name,)
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
    def create_from_names(product_id, category_name, color_name, pattern_name='Standard', remarks='', gender_name=None):
        """Find-or-create each lookup value by name, then create the variant.
        Used by the Add Variant screen, which takes free-text input instead
        of IDs. Gender is optional - the Add Variant screen no longer asks
        for it, but the parameter is kept (and now last, defaulting to
        None) for any other caller that still wants to set it."""
        category_id = Category.find_or_create(category_name)
        gender_id = Gender.find_or_create(gender_name) if gender_name else None
        color_id = Color.find_or_create(color_name)
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
        Falls back to a product+size match (ignoring variant) for orders
        placed before po_size_detail tracked variant_id. Returns None if
        there's no history either way."""
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
            JOIN po_product_detail ppd ON ppd.po_id = po.po_id
            WHERE ppd.product_id = %s AND psd.size_id = %s
            ORDER BY po.created_date DESC
            LIMIT 1
            """
            result = db.execute_query(fallback_query, (product_id, size_id))
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
    def create_order(vendor_id, order_date, products_data, remarks='', expected_delivery_date=None):
        """
        Create a complete purchase order with all details
        products_data: [
            {
                'product_id': 1,
                'variants': [
                    {
                        'variant_id': 1,
                        'sizes': [
                            {'size_id': 5, 'cost': 800, 'mrp': 1500, 'qty': 10, 'gst': 5}
                        ]
                    }
                ]
            }
        ]
        """
        try:
            # Create PO
            po_query = """
            INSERT INTO purchase_order (vendor_id, order_date, remarks, status, expected_delivery_date, created_date)
            VALUES (%s, %s, %s, 'confirmed', %s, NOW())
            RETURNING po_id
            """
            po_id = db.execute_insert(po_query, (vendor_id, order_date, remarks, expected_delivery_date))

            if not po_id:
                return None

            # Prepare transaction queries
            queries = []

            for product in products_data:
                product_id = product['product_id']

                # Create PO_Product_Detail
                po_prod_query = "INSERT INTO po_product_detail (po_id, product_id, created_date) VALUES (%s, %s, NOW())"
                queries.append((po_prod_query, (po_id, product_id)))

                for variant in product['variants']:
                    variant_id = variant['variant_id']

                    # Create PO_Variant_Detail
                    po_var_query = "INSERT INTO po_variant_detail (po_id, variant_id, created_date) VALUES (%s, %s, NOW())"
                    queries.append((po_var_query, (po_id, variant_id)))

                    for size in variant['sizes']:
                        # Create PO_Size_Detail
                        # NOTE: 'amount' is a PostgreSQL generated column
                        # (cost * qty, computed automatically) - it must NOT
                        # be included in the INSERT, or Postgres rejects it.
                        cost = size.get('cost', 0)
                        mrp = size.get('mrp', 0)
                        qty = size.get('qty', 0)
                        gst = size.get('gst', 0)

                        po_size_query = """
                        INSERT INTO po_size_detail
                        (po_id, size_id, variant_id, cost, mrp, qty, gst, created_date)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """
                        queries.append((po_size_query, (po_id, size['size_id'], variant_id, cost, mrp, qty, gst)))

            # Execute all queries as transaction
            success = db.execute_transaction(queries)

            if success:
                # Clear cart
                Cart.clear_for_vendor(vendor_id)
                return po_id
            else:
                return None

        except Exception as e:
            print(f"Error creating order: {e}")
            return None

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
        query = """
        SELECT po.po_id, po.order_date, po.status, po.expected_delivery_date,
               po.delivered_date, po.payment_status, v.vendor_name, v.logo_url,
               COALESCE(SUM(psd.amount), 0) as order_total
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

        return po