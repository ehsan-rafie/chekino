-- One person per national id, per company.
--
-- A beneficiary paid by several parties is one person, so a second row with
-- the same national id is always a duplicate. routes/people.js checks first and
-- answers 409 with the person on file; this index is the guarantee underneath,
-- for two requests racing each other. People without a national id (owners,
-- parties) are left out: a namesake with no id is not provably a duplicate.

CREATE UNIQUE INDEX IF NOT EXISTS uq_people_company_nid
  ON people (company_id, national_id)
  WHERE national_id IS NOT NULL AND national_id <> '';
