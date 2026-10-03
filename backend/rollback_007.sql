-- rollback_007.sql — undoes migration_007_bulk_add.sql, but only while it
-- can do so without losing anything: no cheque in waiting/ready yet, and
-- every photo still sitting, unchanged, in checks.receipt_image (one per
-- cheque). Once migration 008 drops receipt_image this file no longer
-- applies. Run it, like the migration, as the owner of the tables:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rollback_007.sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checks') IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'run this as the owner of checks, not %', current_user;
  END IF;
  IF EXISTS (SELECT 1 FROM checks WHERE stage <> 'sent') THEN
    RAISE EXCEPTION 'cheques in waiting/ready exist — rolling back would lose them';
  END IF;
  -- every photo must still sit, unchanged, in receipt_image (one per cheque, position 0)
  IF EXISTS (SELECT 1 FROM check_images WHERE check_id IS NULL OR position <> 0)
     OR EXISTS (SELECT 1 FROM check_images i JOIN checks c ON c.id = i.check_id
                WHERE c.receipt_image IS NULL OR c.receipt_image = ''
                   OR encode(sha256(decode(substring(c.receipt_image FROM ';base64,(.*)$'), 'base64')), 'hex') <> i.sha256) THEN
    RAISE EXCEPTION 'some photos exist only in check_images — rolling back would lose them';
  END IF;
END $$;
DROP TABLE IF EXISTS bulk_ops;
ALTER TABLE checks DROP COLUMN IF EXISTS batch_id, DROP COLUMN IF EXISTS copied_at,
                   DROP COLUMN IF EXISTS client_ref, DROP COLUMN IF EXISTS updated_at,
                   DROP COLUMN IF EXISTS version;
DROP TABLE IF EXISTS check_images;
DROP TABLE IF EXISTS check_batches;
ALTER TABLE checks DROP CONSTRAINT IF EXISTS ck_checks_status_only_when_sent,
                   DROP CONSTRAINT IF EXISTS ck_checks_stage_fields,
                   DROP CONSTRAINT IF EXISTS ck_checks_status,
                   DROP CONSTRAINT IF EXISTS ck_checks_stage;
ALTER TABLE checks DROP COLUMN IF EXISTS stage;
ALTER TABLE checks ALTER COLUMN owner_id SET NOT NULL,
                   ALTER COLUMN beneficiary_id SET NOT NULL,
                   ALTER COLUMN send_date SET NOT NULL,
                   ALTER COLUMN send_date SET DEFAULT CURRENT_DATE;
-- Deliberately NOT restored: UNIQUE (company_id, serial) (C6) and the cascading FK (C9).
COMMIT;
