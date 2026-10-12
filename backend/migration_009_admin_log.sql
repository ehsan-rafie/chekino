-- migration_009_admin_log.sql — approved by the owner 2026-10-12.
-- What the admin did, and when (spec 9.6 / 9.10): companies made, edited,
-- turned off or on, their passwords set, their subscriptions renewed or
-- removed, plans changed, the admin's own account, sign-ins (and failed
-- ones). One row an action; the company's name kept beside its id, so the
-- log still reads after a company is deleted (no foreign key on purpose).
--
-- Run it as the owner of the tables (chekino_user — the role in DATABASE_URL):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration_009_admin_log.sql
-- Additive and safe to re-run. rollback_009.sql undoes it.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE owner_name TEXT;
BEGIN
  SELECT tableowner INTO owner_name FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies';
  IF owner_name IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'run this as %, the owner of companies (not %): the new table must belong to the app', owner_name, current_user;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  company_id INTEGER,
  company_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_log_at ON admin_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_company ON admin_log (company_id);

COMMIT;
