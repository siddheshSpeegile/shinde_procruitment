-- Store product photos directly in Postgres instead of on the server's disk.
-- Safe to run more than once. Run against your DB before starting the
-- updated backend, e.g.:
--   psql -h localhost -p 5433 -U postgres -d shinde_procurement -f backend/migrations/001_product_photo_image_data.sql

ALTER TABLE product_photo ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE product_photo ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50);

-- Existing rows keep image_data NULL and their old /uploads/... photo_url,
-- which the backend still serves from disk.
