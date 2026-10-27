-- Purchase order approval workflow (admin panel).
-- Orders created in the panel by someone who cannot approve wait as 'pending_approval'
-- until an approver (Administrator, or any role given purchase_order.approve) places or rejects them.
-- Safe to run more than once. Run against your DB BEFORE using the updated backend, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/006_po_approval.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

-- 1. Two new order statuses
ALTER TABLE purchase_order DROP CONSTRAINT IF EXISTS purchase_order_status_check;
ALTER TABLE purchase_order ADD CONSTRAINT purchase_order_status_check
    CHECK (status IN ('draft', 'confirmed', 'delivered', 'pending_approval', 'rejected'));

-- 2. Who created the order, and who approved / rejected it (with feedback)
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS created_by    INTEGER REFERENCES "User"(user_id) ON DELETE SET NULL;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS reviewed_by   INTEGER REFERENCES "User"(user_id) ON DELETE SET NULL;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS reviewed_date TIMESTAMPTZ;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS review_note   TEXT;

-- 3. Notifications can go to one user, or to everyone who can approve
--    (existing notifications stay visible to everyone)
ALTER TABLE notification ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'all';
ALTER TABLE notification ADD COLUMN IF NOT EXISTS recipient_user_id INTEGER REFERENCES "User"(user_id) ON DELETE CASCADE;

-- 4. The permission that decides who can approve. Administrator always has it;
--    tick it for other roles on the Roles & Permissions screen if you want.
INSERT INTO permission (module, action, permission_key, description)
VALUES ('purchase_order', 'approve', 'purchase_order.approve', 'Approve, edit or reject purchase orders')
ON CONFLICT (permission_key) DO NOTHING;
