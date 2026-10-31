-- Include GST in each purchase-order line's amount.
--
-- po_size_detail.amount is a column Postgres calculates itself. It was
-- cost * qty only, so GST entered on the Product Details screen was saved
-- (gst column) but left out of every total read from amount: Orders list,
-- Dashboard "Order Amount", order cards, admin panel. It now matches what the
-- Product Details screen shows: cost * qty + GST%.
--
-- Postgres 15 can't change a generated column's formula in place, so the
-- column is dropped and added again. No data is lost: amount is always
-- recalculated from cost, qty and gst, for existing orders too.
-- Safe to run more than once.
--   psql ... -f backend/migrations/012_po_amount_with_gst.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

BEGIN;

ALTER TABLE po_size_detail DROP COLUMN IF EXISTS amount;

ALTER TABLE po_size_detail
    ADD COLUMN amount NUMERIC
    GENERATED ALWAYS AS (ROUND(cost * qty * (1 + COALESCE(gst, 0) / 100), 2)) STORED;

COMMIT;
