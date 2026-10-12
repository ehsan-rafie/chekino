-- rollback_009.sql — undoes migration_009 (the admin's activity log; its rows go).
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rollback_009.sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS admin_log;
COMMIT;
