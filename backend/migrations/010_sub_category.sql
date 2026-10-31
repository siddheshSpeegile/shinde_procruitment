-- Sub-categories (each belongs to one category, managed on the Categories screen) and Category /
-- Sub-category on the product. The first run also copies the category / sub-category pairs of the sales data
-- (shinde_shoes.mv_sales_detail_enriched) into these tables, so they do not have to be typed again; if that
-- schema is not there the import is skipped. Also words the permission descriptions as "supplier".
-- Safe to run more than once. Run against your DB, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/010_sub_category.sql

SET search_path TO shinde_procruitment, public;

CREATE TABLE IF NOT EXISTS sub_category (
    sub_category_id   SERIAL PRIMARY KEY,
    category_id       INTEGER      NOT NULL REFERENCES category(category_id),
    sub_category_name VARCHAR(150) NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_date      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_date      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_by        INTEGER      REFERENCES "User"(user_id)
);

-- A name can be reused under another category, but not twice under the same one.
CREATE UNIQUE INDEX IF NOT EXISTS sub_category_name_key ON sub_category (category_id, LOWER(sub_category_name));

-- Nullable: products added from the mobile app have neither.
ALTER TABLE product ADD COLUMN IF NOT EXISTS category_id     INTEGER REFERENCES category(category_id);
ALTER TABLE product ADD COLUMN IF NOT EXISTS sub_category_id INTEGER REFERENCES sub_category(sub_category_id);

-- One-time copy from the sales data. Existing categories are matched by name (ignoring case) and kept as they are.
DO $import$
DECLARE
    r   RECORD;
    cid INTEGER;
BEGIN
    FOR r IN EXECUTE $q$
        SELECT DISTINCT TRIM("CategoryName") AS cat, TRIM("SubCategoryName") AS sub
        FROM shinde_shoes.mv_sales_detail_enriched
        WHERE TRIM(COALESCE("CategoryName", '')) <> '' AND "CategoryName" NOT LIKE 'UNKNOWN%'
          AND TRIM(COALESCE("SubCategoryName", '')) <> '' AND "SubCategoryName" NOT LIKE 'UNKNOWN%'
    $q$ LOOP
        SELECT category_id INTO cid FROM category WHERE LOWER(category_name) = LOWER(r.cat) LIMIT 1;
        IF cid IS NULL THEN
            INSERT INTO category (category_name, status, created_date, updated_date) VALUES (r.cat, 'active', NOW(), NOW()) RETURNING category_id INTO cid;
        END IF;
        INSERT INTO sub_category (category_id, sub_category_name) VALUES (cid, r.sub) ON CONFLICT DO NOTHING;
    END LOOP;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
    RAISE NOTICE 'Sales data (shinde_shoes.mv_sales_detail_enriched) not found: no sub-categories imported.';
END
$import$;

-- "Vendor" is now "Supplier" on screen.
UPDATE permission SET description = REPLACE(REPLACE(description, 'vendors', 'suppliers'), 'vendor', 'supplier')
 WHERE module = 'vendor' AND description ILIKE '%vendor%';
