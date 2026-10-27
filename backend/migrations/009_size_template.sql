-- New size template: UK / EUR, each with Toddler and Adult.
--   UK  Toddler: 0K to 13K, then 1 to 5      UK  Adult: 1 to 18
--   EUR Toddler: 18 to 30                    EUR Adult: 31 to 46
-- The sizes that already exist (1 to 10 and 13) become UK Adult, keeping their ids, so existing
-- variants, carts and orders keep working. Safe to run more than once. Run against your DB, e.g.:
--   psql -h localhost -p 5433 -U postgres -d client_analytics_db -f backend/migrations/009_size_template.sql
-- (SET search_path TO shinde_procruitment; first if your tables aren't in public)

ALTER TABLE shinde_procruitment.size ADD COLUMN IF NOT EXISTS size_system VARCHAR(10);
ALTER TABLE shinde_procruitment.size ADD COLUMN IF NOT EXISTS size_group  VARCHAR(10);
ALTER TABLE shinde_procruitment.size ADD COLUMN IF NOT EXISTS sort_order  INTEGER NOT NULL DEFAULT 0;

-- Existing numeric sizes were UK Adult sizes.
UPDATE shinde_procruitment.size
   SET size_system = 'UK', size_group = 'Adult', sort_order = 200 + size_value::int
 WHERE size_system IS NULL AND size_value ~ '^[0-9]+$';

-- Anything else that is left (should not exist) is parked under UK Adult so the columns can be required.
UPDATE shinde_procruitment.size SET size_system = 'UK', size_group = 'Adult', sort_order = 299 WHERE size_system IS NULL;

ALTER TABLE shinde_procruitment.size ALTER COLUMN size_system SET NOT NULL;
ALTER TABLE shinde_procruitment.size ALTER COLUMN size_group  SET NOT NULL;

-- A number can now exist in more than one list (for example 5 in UK Toddler and in UK Adult).
ALTER TABLE shinde_procruitment.size DROP CONSTRAINT IF EXISTS size_size_value_key;
CREATE UNIQUE INDEX IF NOT EXISTS size_template_key ON shinde_procruitment.size (size_system, size_group, size_value);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'size_system_check') THEN
        ALTER TABLE shinde_procruitment.size ADD CONSTRAINT size_system_check CHECK (size_system IN ('UK', 'EUR'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'size_group_check') THEN
        ALTER TABLE shinde_procruitment.size ADD CONSTRAINT size_group_check CHECK (size_group IN ('Toddler', 'Adult'));            
    END IF;
END $$;

-- The template. sort_order keeps every list in its natural order: 100s UK Toddler, 200s UK Adult,
-- 300s EUR Toddler, 400s EUR Adult.
INSERT INTO shinde_procruitment.size (size_value, status, created_date, updated_date, size_system, size_group, sort_order)
SELECT g || 'K', 'active', NOW(), NOW(), 'UK', 'Toddler', 100 + g FROM generate_series(0, 13) g
ON CONFLICT (size_system, size_group, size_value) DO NOTHING;

INSERT INTO shinde_procruitment.size (size_value, status, created_date, updated_date, size_system, size_group, sort_order)
SELECT g::text, 'active', NOW(), NOW(), 'UK', 'Toddler', 120 + g FROM generate_series(1, 5) g
ON CONFLICT (size_system, size_group, size_value) DO NOTHING;

INSERT INTO shinde_procruitment.size (size_value, status, created_date, updated_date, size_system, size_group, sort_order)
SELECT g::text, 'active', NOW(), NOW(), 'UK', 'Adult', 200 + g FROM generate_series(1, 18) g
ON CONFLICT (size_system, size_group, size_value) DO NOTHING;

INSERT INTO shinde_procruitment.size (size_value, status, created_date, updated_date, size_system, size_group, sort_order)
SELECT g::text, 'active', NOW(), NOW(), 'EUR', 'Toddler', 300 + g FROM generate_series(18, 30) g
ON CONFLICT (size_system, size_group, size_value) DO NOTHING;

INSERT INTO shinde_procruitment.size (size_value, status, created_date, updated_date, size_system, size_group, sort_order)
SELECT g::text, 'active', NOW(), NOW(), 'EUR', 'Adult', 400 + g FROM generate_series(31, 46) g
ON CONFLICT (size_system, size_group, size_value) DO NOTHING;

-- "13" was switched off earlier; it is part of UK Adult 1 to 18.
UPDATE shinde_procruitment.size SET status = 'active', updated_date = NOW()
 WHERE size_system = 'UK' AND size_group = 'Adult' AND size_value = '13' AND status <> 'active';
