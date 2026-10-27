-- Unfinished purchase orders saved from the admin panel ("Save as draft"). A draft belongs to the
-- user who saved it, is not a purchase order, and never shows in order lists or the Dashboard.
-- Safe to run more than once. Run against your DB, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/008_order_draft.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

CREATE TABLE IF NOT EXISTS order_draft (
    draft_id     SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    vendor_id    INTEGER,
    payload      JSONB       NOT NULL,          -- the form as the panel shows it
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_draft_user ON order_draft (user_id, updated_date DESC);
