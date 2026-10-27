-- Sign-in attempt log used to slow down password guessing (5 wrong passwords from one address,
-- or 20 from anywhere, for the same username lock sign-in for 15 minutes).
-- Safe to run more than once. Run against your DB, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/007_security.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

CREATE TABLE IF NOT EXISTS login_attempt (
    attempt_id   BIGSERIAL PRIMARY KEY,
    username     VARCHAR(100) NOT NULL,
    ip           VARCHAR(64)  NOT NULL DEFAULT '',
    attempted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempt_user ON login_attempt (LOWER(username), attempted_at DESC);
