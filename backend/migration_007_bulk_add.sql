-- migration_007_bulk_add.sql — the ground for bulk add, the send window and
-- bulk edit (spec of 1405-07-11, §6.1), plus the data fixes C1/C4/C6/C9.
-- Additive: every existing cheque becomes stage 'sent', so the single form,
-- the board and the reports carry on unchanged until the new screens land.
--
-- Run it as the owner of the tables (chekino_user — the role in
-- DATABASE_URL), so the new tables belong to the app:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration_007_bulk_add.sql
-- Needs PostgreSQL 13+ (gen_random_uuid, sha256 are built in).
-- Safe to re-run: every step is guarded (IF EXISTS / IF NOT EXISTS).
BEGIN;
-- Wait at most 5s for a lock rather than queue behind a long transaction and
-- hold the whole site up while waiting.
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE owner_name TEXT;
BEGIN
  SELECT tableowner INTO owner_name FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checks';
  IF owner_name IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'run this as %, the owner of checks (not %): the new tables must belong to the app', owner_name, current_user;
  END IF;
END $$;

-- 1. Stage: where a cheque is in the hand-off (status stays the Sayad outcome).
ALTER TABLE checks ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE checks DROP CONSTRAINT IF EXISTS ck_checks_stage;
ALTER TABLE checks ADD CONSTRAINT ck_checks_stage CHECK (stage IN ('waiting', 'ready', 'sent'));
ALTER TABLE checks DROP CONSTRAINT IF EXISTS ck_checks_status;
ALTER TABLE checks ADD CONSTRAINT ck_checks_status CHECK (status IN ('pending', 'done', 'problem'));

-- 2. Owner, beneficiary and send date are unknown until later.
ALTER TABLE checks ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE checks ALTER COLUMN beneficiary_id DROP NOT NULL;
ALTER TABLE checks ALTER COLUMN send_date DROP NOT NULL;
ALTER TABLE checks ALTER COLUMN send_date DROP DEFAULT;
ALTER TABLE checks DROP CONSTRAINT IF EXISTS ck_checks_stage_fields;
ALTER TABLE checks ADD CONSTRAINT ck_checks_stage_fields CHECK (
  CASE stage
    WHEN 'sent'    THEN owner_id IS NOT NULL AND beneficiary_id IS NOT NULL AND send_date IS NOT NULL
    WHEN 'ready'   THEN owner_id IS NOT NULL AND beneficiary_id IS NOT NULL
    WHEN 'waiting' THEN owner_id IS NULL OR beneficiary_id IS NULL
  END
);
ALTER TABLE checks DROP CONSTRAINT IF EXISTS ck_checks_status_only_when_sent;
ALTER TABLE checks ADD CONSTRAINT ck_checks_status_only_when_sent CHECK (stage = 'sent' OR status = 'pending');

-- 3. A 6-digit serial repeats across banks; the 16-digit sayad id does not. (C6)
ALTER TABLE checks DROP CONSTRAINT IF EXISTS uq_checks_company_serial;
CREATE INDEX IF NOT EXISTS idx_checks_company_serial ON checks (company_id, serial);

-- 4. Deleting a person must never delete cheques. (C9)
-- (the column was renamed from person_id, so its constraint kept the old name)
ALTER TABLE checks DROP CONSTRAINT IF EXISTS checks_person_id_fkey;
ALTER TABLE checks DROP CONSTRAINT IF EXISTS checks_beneficiary_id_fkey;
ALTER TABLE checks ADD CONSTRAINT checks_beneficiary_id_fkey
  FOREIGN KEY (beneficiary_id) REFERENCES people(id) ON DELETE RESTRICT;

-- 5. Concurrency, idempotent commits, the «کپی شد» mark.
ALTER TABLE checks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE checks ADD COLUMN IF NOT EXISTS client_ref UUID;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS copied_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_checks_company_client_ref
  ON checks (company_id, client_ref) WHERE client_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_company_stage ON checks (company_id, stage);

-- 6. Bulk-add drafts, autosaved on the server.
CREATE TABLE IF NOT EXISTS check_batches (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'manual')),
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'committed', 'discarded')),
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_check_batches_company_state ON check_batches (company_id, state);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES check_batches(id) ON DELETE SET NULL;

-- 7. Images leave the cheque row. (C4, C1)
CREATE TABLE IF NOT EXISTS check_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  check_id INTEGER REFERENCES checks(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES check_batches(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'cheque' CHECK (kind IN ('cheque', 'receipt')),
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf')),
  bytes BYTEA NOT NULL,
  thumb BYTEA,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_check_images_check ON check_images (check_id);
CREATE INDEX IF NOT EXISTS idx_check_images_company_batch ON check_images (company_id, batch_id);

-- Backfill. receipt_image stays one release so a rollback loses nothing.
INSERT INTO check_images (id, company_id, check_id, kind, mime, bytes, byte_size, sha256)
SELECT gen_random_uuid(), c.company_id, c.id, 'cheque',
       CASE lower(substring(c.receipt_image FROM '^data:([^;]+);base64,'))
         WHEN 'image/jpg' THEN 'image/jpeg'
         ELSE lower(substring(c.receipt_image FROM '^data:([^;]+);base64,'))
       END,
       decode(substring(c.receipt_image FROM ';base64,(.*)$'), 'base64'),
       0, ''
FROM checks c
WHERE c.receipt_image IS NOT NULL AND c.receipt_image <> ''
  AND NOT EXISTS (SELECT 1 FROM check_images i WHERE i.check_id = c.id);
UPDATE check_images
   SET byte_size = octet_length(bytes), sha256 = encode(sha256(bytes), 'hex')
 WHERE byte_size = 0;

-- 8. Bulk operations, so «برگردون» can put things back.
CREATE TABLE IF NOT EXISTS bulk_ops (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bulk_update', 'mark_sent', 'batch_commit')),
  request JSONB NOT NULL,
  before JSONB NOT NULL,          -- [{id, version, <changed fields>}] as they were
  after_versions JSONB NOT NULL,  -- {id: version} right after the operation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_company ON bulk_ops (company_id, created_at DESC);

COMMIT;
