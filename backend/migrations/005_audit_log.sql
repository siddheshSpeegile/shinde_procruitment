-- Server-side audit log: every successful change (create / edit / delete / sign in)
-- made from the mobile app or the admin panel. Reading data is not logged.
-- Safe to run more than once. Run against your DB before using the updated Audit Logs screen, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/005_audit_log.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id     BIGSERIAL PRIMARY KEY,
    created_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    user_id      INTEGER REFERENCES "User"(user_id) ON DELETE SET NULL,
    username     VARCHAR(100),          -- kept as text so the log stays readable if a user is removed
    role_name    VARCHAR(50),
    source       VARCHAR(20)  NOT NULL, -- 'mobile', 'panel' or 'unknown'
    method       VARCHAR(10)  NOT NULL,
    path         VARCHAR(255) NOT NULL,
    action       VARCHAR(200),          -- readable text, e.g. 'Changed status of PO-5'
    status_code  INTEGER,
    message      TEXT,
    details      JSONB                  -- what was sent (passwords are never stored)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_source  ON audit_log (source, created_date DESC);
