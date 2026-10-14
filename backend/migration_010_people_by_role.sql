-- People kept by role (the owner's call, 2026-10-14).
--
-- Migration 005 read a person's roles off their cheques and let one record
-- play several: the same name typed as a cheque's party and as its
-- beneficiary was one person. But a party and a beneficiary are two people to
-- the user even under one name — renaming «حمیدرضا جهانی» the party renamed
-- the beneficiary with it. From now on an owner, a party and a beneficiary
-- are separate records (lib/people.js looks a name up only within its role),
-- and the records already playing two or three roles are split here:
--
--   - each keeps the role that matters most to it — beneficiary (it carries
--     the national id), then party, then owner — and is filed under it;
--   - every other role it plays gets a copy of it (its name and mobile; no
--     national id, which stays with the beneficiary), and the cheques naming
--     it in that role name the copy instead;
--   - a person used in one role only is filed under that role.
--
-- people_role_split keeps what was copied from what, for rollback_010.sql.
-- The cheques' versions are left as they are: what they say is unchanged,
-- only which record says it.

BEGIN;

CREATE TABLE IF NOT EXISTS people_role_split (
  copy_id INTEGER PRIMARY KEY,
  original_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TEMP TABLE uses ON COMMIT DROP AS
  SELECT DISTINCT owner_id AS pid, 'owner' AS role FROM checks WHERE owner_id IS NOT NULL
  UNION SELECT DISTINCT party_id, 'party' FROM checks WHERE party_id IS NOT NULL
  UNION SELECT DISTINCT beneficiary_id, 'benef' FROM checks WHERE beneficiary_id IS NOT NULL;

CREATE TEMP TABLE keeps ON COMMIT DROP AS
  SELECT pid, (array_agg(role ORDER BY CASE role WHEN 'benef' THEN 1 WHEN 'party' THEN 2 ELSE 3 END))[1] AS role
  FROM uses GROUP BY pid;

-- each used record filed under the role it keeps
UPDATE people p SET role = k.role FROM keeps k WHERE p.id = k.pid AND p.role IS DISTINCT FROM k.role;

-- a copy for every other role, and the cheques of that role moved to it
DO $$
DECLARE
  r RECORD;
  copy INTEGER;
BEGIN
  FOR r IN
    SELECT u.pid, u.role FROM uses u JOIN keeps k ON k.pid = u.pid
    WHERE u.role <> k.role ORDER BY u.pid, u.role
  LOOP
    INSERT INTO people (company_id, full_name, phone, role, created_at)
      SELECT company_id, full_name, phone, r.role, created_at FROM people WHERE id = r.pid
      RETURNING id INTO copy;
    INSERT INTO people_role_split (copy_id, original_id, role) VALUES (copy, r.pid, r.role);
    IF r.role = 'owner' THEN
      UPDATE checks SET owner_id = copy WHERE owner_id = r.pid;
    ELSIF r.role = 'party' THEN
      UPDATE checks SET party_id = copy WHERE party_id = r.pid;
    ELSE
      UPDATE checks SET beneficiary_id = copy WHERE beneficiary_id = r.pid;
    END IF;
  END LOOP;
END $$;

COMMIT;
