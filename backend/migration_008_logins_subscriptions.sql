-- migration_008_logins_subscriptions.sql — approved by the owner 2026-10-11.
--   1. login_failures: wrong passwords counted per username, in the database
--      (spec 9.10): shared by every process and kept across restarts, so an
--      account guessed at slows down on its own, whatever address it comes from.
--   2. companies.subscription_ends_at (H8): when a company's subscription
--      ends; null = no end. The dashboard warns before it; nothing is cut off.
--
-- Run it as the owner of the tables (chekino_user — the role in DATABASE_URL):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration_008_logins_subscriptions.sql
-- Additive and safe to re-run. rollback_008.sql undoes it.
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

-- 1. Wrong passwords per username (company or admin: 'company:<name>',
--    'admin:<name>'), known or not — the lock says nothing about whether
--    the account exists. A row goes on the next good sign-in.
CREATE TABLE IF NOT EXISTS login_failures (
  login_key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0 CHECK (fails >= 0),
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_login_failures_last ON login_failures (last_at);

-- 2. The end of a company's subscription.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at DATE;

COMMIT;
