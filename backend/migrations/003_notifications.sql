-- In-app notifications shown in the mobile app and the admin panel.
-- Safe to run more than once. Run against your DB before starting the
-- updated backend, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/003_notifications.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

-- One row per event (order created, delivered, status/payment/date changed, delayed).
-- Everyone sees every notification; "read" is tracked per user in notification_read.
CREATE TABLE IF NOT EXISTS notification (
    notification_id SERIAL PRIMARY KEY,
    type            VARCHAR(30)  NOT NULL,
    title           VARCHAR(150) NOT NULL,
    message         TEXT,
    po_id           INTEGER REFERENCES purchase_order(po_id) ON DELETE CASCADE,
    created_by      INTEGER REFERENCES "User"(user_id) ON DELETE SET NULL,
    -- Used so the same "delayed" alert is only created once per order and expected date.
    dedupe_key      VARCHAR(100) UNIQUE,
    created_date    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_created ON notification (created_date DESC);

CREATE TABLE IF NOT EXISTS notification_read (
    user_id         INTEGER NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    notification_id INTEGER NOT NULL REFERENCES notification(notification_id) ON DELETE CASCADE,
    read_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
);

-- Admin panel: let Procurement Manager and Buyer open the Notifications screen.
-- (Administrator already has every permission.)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM role r
CROSS JOIN permission p
WHERE r.role_name IN ('Procurement Manager', 'Buyer')
  AND p.permission_key = 'notification.view'
ON CONFLICT DO NOTHING;
