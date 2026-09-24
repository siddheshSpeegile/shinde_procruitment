-- Store vendor logos directly on the vendor row in Postgres.
-- Safe to run more than once. Run against your DB before starting the
-- updated backend, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/002_vendor_logo.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

ALTER TABLE vendor ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS logo_mime_type VARCHAR(50);

-- On upload, logo_url (existing column) is set to
-- /api/vendors/<id>/logo?v=<timestamp>, which serves logo_data.
-- Vendors without an uploaded logo keep their existing logo_url (or none),
-- and the app shows their initial instead.
