// The people a bulk add or a bulk edit names — found, or added — the
// server's side of what the cheque form does in the browser (ensurePerson in
// js/dashboard.js), inside the caller's transaction so a failed save leaves
// no stray person behind (H14).
//
//   const people = await peopleResolver(db, companyId);
//   const r = await people.resolve({ name: 'حسن کریمی' }, 'owner');   → { id } or { error }
//
// A reference is { id } (must belong to the company), or { name, national_id }:
//   - a national id is checked by its check digit (lib/nid.js) and finds the
//     person who has it;
//   - otherwise the name finds the person who has it, the way the form does:
//     ی/ک variants, half-spaces and spacing don't make a different person
//     (given a national id, only someone without one is matched by name, and
//     gets it);
//   - nobody found: the person is added, with the role they were named in.
// The plan's people limit is checked before each one added (opts.maxPeople).
const nid = require('./nid');

function normalizeName(str) {
  return String(str == null ? '' : str)
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

class PeopleLimitError extends Error {
  constructor(max) {
    super(`سقف تعداد اشخاص طبق پلن شما (${max} نفر) پر شده است`);
    this.code = 'plan_people_limit';
    this.max = max;
  }
}

async function peopleResolver(db, companyId, opts = {}) {
  const rows = (await db.query(
    'SELECT id, full_name, national_id FROM people WHERE company_id = $1 ORDER BY id',
    [companyId]
  )).rows;
  let count = rows.length;
  const added = [];
  const byId = new Map(rows.map((p) => [p.id, p]));

  async function resolve(ref, role) {
    if (!ref) return { id: null };
    if (ref.id !== undefined && ref.id !== null && ref.id !== '') {
      const p = byId.get(Number(ref.id));
      return p ? { id: p.id } : { error: { code: 'unknown_person', error: 'این شخص در فهرست اشخاص این شرکت نیست' } };
    }
    const name = normalizeName(ref.name);
    const digits = nid.digits(ref.national_id);
    if (digits) {
      const v = nid.check(digits);
      if (!v.ok) return { error: { code: 'invalid_nid', error: v.error } };
      const holder = rows.find((p) => p.national_id === digits);
      if (holder) return { id: holder.id };
    }
    if (!name) return digits ? { error: { code: 'name_required', error: 'نام لازم است' } } : { id: null };
    const same = rows.filter((p) => normalizeName(p.full_name) === name);
    const existing = digits ? same.find((p) => !p.national_id) : same[0];
    if (existing) {
      if (digits) {
        await db.query('UPDATE people SET national_id = $1 WHERE id = $2 AND company_id = $3', [digits, existing.id, companyId]);
        existing.national_id = digits;
      }
      return { id: existing.id };
    }
    if (opts.maxPeople !== null && opts.maxPeople !== undefined && count >= Number(opts.maxPeople)) {
      throw new PeopleLimitError(opts.maxPeople);
    }
    const created = (await db.query(
      'INSERT INTO people (company_id, full_name, national_id, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, national_id',
      [companyId, String(ref.name).trim().replace(/\s+/g, ' '), digits || null, ['owner', 'party', 'benef'].includes(role) ? role : null]
    )).rows[0];
    rows.push(created);
    byId.set(created.id, created);
    count++;
    added.push(created.id);
    return { id: created.id, created: true };
  }

  // A row that fails rolls its savepoint back, the people it added with it:
  // they must not be found again, by the rows after it, under ids that no
  // longer exist. mark() before the savepoint, forget(mark) after rolling back.
  const mark = () => added.length;
  function forget(m) {
    const gone = new Set(added.splice(m));
    if (!gone.size) return;
    for (let i = rows.length - 1; i >= 0; i--) if (gone.has(rows[i].id)) rows.splice(i, 1);
    for (const id of gone) byId.delete(id);
    count -= gone.size;
  }

  return { resolve, added, mark, forget };
}

module.exports = { normalizeName, peopleResolver, PeopleLimitError };
