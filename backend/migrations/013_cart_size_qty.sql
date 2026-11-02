-- Quantity per size in the cart.
--
-- The Assign Sizes screen now asks for a quantity for each picked size. Sizes
-- saved with "Assign & Save In Cart" keep that quantity here, and it is carried
-- into the purchase order when the cart is ordered. Existing cart rows get 1
-- (what the order screen used to start every size at).
-- Safe to run more than once. Run BEFORE deploying the backend that uses it.
--   psql ... -f backend/migrations/013_cart_size_qty.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

ALTER TABLE cart_size ADD COLUMN IF NOT EXISTS qty INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_size_qty_positive') THEN
        ALTER TABLE cart_size ADD CONSTRAINT cart_size_qty_positive CHECK (qty > 0);
    END IF;
END $$;
