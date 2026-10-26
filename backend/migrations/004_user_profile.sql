-- Full name and mobile number for staff accounts (used by the admin panel's Users screen).
-- Safe to run more than once. Run against your DB before using the new Users screen, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/004_user_profile.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS full_name     VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);
