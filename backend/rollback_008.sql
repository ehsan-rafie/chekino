-- rollback_008.sql — undoes migration_008 (the login failures table and the
-- subscription end date). The dates set in the admin panel are lost.
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rollback_008.sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS login_failures;
ALTER TABLE companies DROP COLUMN IF EXISTS subscription_ends_at;
COMMIT;
