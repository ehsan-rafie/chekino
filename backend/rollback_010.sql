-- Undoes migration_010_people_by_role.sql: the cheques that name a copy name
-- its original again, and the copies go (a copy renamed since loses the new
-- name). The roles the originals were filed under stay as they are now.

BEGIN;

UPDATE checks c SET owner_id = s.original_id FROM people_role_split s WHERE c.owner_id = s.copy_id;
UPDATE checks c SET party_id = s.original_id FROM people_role_split s WHERE c.party_id = s.copy_id;
UPDATE checks c SET beneficiary_id = s.original_id FROM people_role_split s WHERE c.beneficiary_id = s.copy_id;
DELETE FROM people p USING people_role_split s WHERE p.id = s.copy_id;
DROP TABLE people_role_split;

COMMIT;
