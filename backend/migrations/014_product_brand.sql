-- Brand on products.
--
-- The Add Product screen now has a Brand dropdown. Brands come from the master
-- table shinde_shoes."DimBrand" (BrandKey, BrandName) - the same source the
-- Category/Colour suggestions use. A product stores the chosen brand's key and
-- its name: the name is kept on the product so orders still show it even if
-- the master table is reloaded. Existing products have no brand (NULL).
-- Safe to run more than once. Run BEFORE deploying the backend that uses it.
--   psql ... -f backend/migrations/014_product_brand.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

ALTER TABLE product ADD COLUMN IF NOT EXISTS brand_key INTEGER;
ALTER TABLE product ADD COLUMN IF NOT EXISTS brand_name VARCHAR(150);
