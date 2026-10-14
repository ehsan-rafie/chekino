// The people a bulk add or a bulk edit names — found, or added — the
// server's side of what the cheque form does in the browser (ensurePerson in
// js/dashboard.js), inside the caller's transaction so a failed save leaves
// no stray person behind (H14).
//
//   const people = await peopleResolver(db, companyId);
//   const r = await people.resolve({ name: 'حسن کریمی' }, 'owner');   → { id } or { error }
//
// A reference is { id } (must belong to the company), or { name, national_id }.
// People are kept by role (the owner's call, 2026-10-14; migration 010): an
// owner, a party and a beneficiary are three records even under one name,
// so a name is only looked for among the people of the role it is named in
// (and those not filed under any role yet, who take it):
//   - a national id is checked by its check digit (lib/nid.js) and finds the
//     person who has it (a beneficiary's; one per company, so held in another
//     role it is refused);
//   - otherwise the name finds the person who has it, the way the form does:
//     ی/ک variants, half-spaces and spacing don't make a different person
//     (given a national id, only someone without one is matched by name, and
//     gets it);
//   - an { id } of someone in another role is taken as their name, in this one;
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

const ROLES = ['owner', 'party', 'benef'];

async function peopleResolver(db, companyId, opts = {}) {
  const rows = (await db.query(
    'SELECT id, full_name, national_id, role FROM people WHERE company_id = $1 ORDER BY id',
    [companyId]
  )).rows;
  let count = rows.length;
  const added = [];
  const byId = new Map(rows.map((p) => [p.id, p]));

  // this role's, or not filed under any yet
  const fits = (p, role) => !ROLES.includes(role) || !p.role || p.role === role;
  // one not filed yet takes the role it is first named in
  async function claim(p, role) {
    if (!p.role && ROLES.includes(role)) {
      await db.query('UPDATE people SET role = $1 WHERE id = $2 AND company_id = $3', [role, p.id, companyId]);
      p.role = role;
    }
    return { id: p.id };
  }

  async function resolve(ref, role) {
    if (!ref) return { id: null };
    if (ref.id !== undefined && ref.id !== null && ref.id !== '') {
      const p = byId.get(Number(ref.id));
      if (!p) return { error: { code: 'unknown_person', error: 'این شخص در فهرست اشخاص این شرکت نیست' } };
      return fits(p, role) ? claim(p, role) : resolve({ name: p.full_name }, role);
    }
    const name = normalizeName(ref.name);
    const digits = nid.digits(ref.national_id);
    if (digits) {
      const v = nid.check(digits);
      if (!v.ok) return { error: { code: 'invalid_nid', error: v.error } };
      const holder = rows.find((p) => p.national_id === digits);
      if (holder) {
        if (fits(holder, role)) return claim(holder, role);
        return { error: { code: 'nid_other_role', error: `این کد ملی برای «${holder.full_name}» در نقش دیگری ثبت شده` } };
      }
    }
    if (!name) return digits ? { error: { code: 'name_required', error: 'نام لازم است' } } : { id: null };
    // this role's first, then one not filed yet
    const same = rows.filter((p) => fits(p, role) && normalizeName(p.full_name) === name)
      .sort((a, b) => (a.role === role ? 0 : 1) - (b.role === role ? 0 : 1));
    const existing = digits ? same.find((p) => !p.national_id) : same[0];
    if (existing) {
      if (digits) {
        await db.query('UPDATE people SET national_id = $1 WHERE id = $2 AND company_id = $3', [digits, existing.id, companyId]);
        existing.national_id = digits;
      }
      return claim(existing, role);
    }
    if (opts.maxPeople !== null && opts.maxPeople !== undefined && count >= Number(opts.maxPeople)) {
      throw new PeopleLimitError(opts.maxPeople);
    }
    const created = (await db.query(
      'INSERT INTO people (company_id, full_name, national_id, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, national_id, role',
      [companyId, String(ref.name).trim().replace(/\s+/g, ' '), digits || null, ROLES.includes(role) ? role : null]
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
