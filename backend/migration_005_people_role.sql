-- People management: give each person a category.
--
-- A role is really a property of the *cheque* (who was picked into which
-- field), not of the person, and the management panel showed that honestly by
-- listing every person under all three tabs. In practice that made the panel
-- unusable: the same names repeated three times with no way to tell a صاحب چک
-- from a ذینفع.
--
-- The app now reads a person's categories off the cheques that reference them,
-- which stays correct when someone genuinely plays two roles. This column is
-- only the fallback for a person who has no cheque yet -- the ones added by
-- hand from the panel -- so the tab they were filed under is remembered until
-- a cheque gives them a real role.

ALTER TABLE people ADD COLUMN IF NOT EXISTS role TEXT;

-- Backfill from real usage so existing records land in the right tab on the
-- first load. Owner wins over party wins over beneficiary only for the stored
-- fallback; the UI still derives every role a person actually plays.
UPDATE people p SET role = 'owner'
  WHERE p.role IS NULL AND EXISTS (SELECT 1 FROM checks c WHERE c.owner_id = p.id);
UPDATE people p SET role = 'party'
  WHERE p.role IS NULL AND EXISTS (SELECT 1 FROM checks c WHERE c.party_id = p.id);
UPDATE people p SET role = 'benef'
  WHERE p.role IS NULL AND EXISTS (SELECT 1 FROM checks c WHERE c.beneficiary_id = p.id);

-- Anything still NULL is a person no cheque has ever used and that predates
-- this column, so their category is genuinely unknown. They are left NULL on
-- purpose: the panel shows an uncategorised person in every tab rather than
-- inventing a category and hiding them from the other two.
