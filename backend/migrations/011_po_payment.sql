-- Payment details recorded when a purchase order is marked as paid.
-- Safe to run more than once. Run against your DB, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/011_po_payment.sql

SET search_path TO shinde_procruitment, public;

ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_date      DATE;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_mode      VARCHAR(30);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_amount    NUMERIC(14, 2);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_remarks   TEXT;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS paid_by           INTEGER REFERENCES "User"(user_id);
