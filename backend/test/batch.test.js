// node --test "test/*.test.js"   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const { draftShapeError, rowForCommit, headerProblems } = require('../lib/batch');
const { normalizeName, peopleResolver, PeopleLimitError } = require('../lib/people');

const REF = '6f1c2a9e-0b1d-4c2e-9f3a-1234567890ab';
const REF2 = '7f1c2a9e-0b1d-4c2e-9f3a-1234567890ab';

test('a draft: empty, half-typed and full ones are all fine to autosave', () => {
  assert.strictEqual(draftShapeError({}), null);
  assert.strictEqual(draftShapeError({ header: {}, rows: [] }), null);
  assert.strictEqual(draftShapeError({ header: { party: { name: 'رضا' } }, rows: [{ ref: REF, serial: '41' }] }), null);
  assert.strictEqual(draftShapeError({
    header: { party: { id: 12, name: 'رضا محمدی' }, spend_date: '2026-09-26', beneficiary: { id: null, name: 'علی', national_id: '0830166130' } },
    rows: [{ ref: REF, position: 1, image_id: null, serial: '412587', sayad_id: '1234567890123456', amount: '1800000000', due_date: '2026-11-11', owner: { id: null, name: 'حسن' } }],
  }), null);
});

test('a draft that isn\'t one: refused, with a reason', () => {
  for (const bad of [null, [], 'x', { rows: 'x' }, { rows: [{ serial: '1' }] }, { rows: [{ ref: 'not-a-uuid' }] },
    { rows: [{ ref: REF }, { ref: REF }] }, { header: { party: 'x' } }, { rows: [{ ref: REF, owner: 'x' }] },
    { rows: [{ ref: REF, amount: {} }] }, { rows: [{ ref: REF, serial: 'x'.repeat(31) }] }]) {
    assert.ok(typeof draftShapeError(bad) === 'string', JSON.stringify(bad));
  }
  const many = { rows: Array.from({ length: 301 }, (_, i) => ({ ref: `6f1c2a9e-0b1d-4c2e-9f3a-${String(i).padStart(12, '0')}` })) };
  assert.match(draftShapeError(many), /۳۰۰|300/);
});

test('a complete row: its digits read in any script, amount and due date checked', () => {
  const r = rowForCommit({ ref: REF, serial: '۴۱۲۵۸۷', sayad_id: '1234 5678 9012 3456', amount: '۱٬۸۰۰٬۰۰۰٬۰۰۰', due_date: '2026-11-11' });
  assert.deepStrictEqual(r, { row: { serial: '412587', sayad_id: '1234567890123456', amount: '1800000000', due_date: '2026-11-11' } });
});

test('an incomplete row says what it lacks, in column order', () => {
  assert.deepStrictEqual(rowForCommit({ serial: '41258', sayad_id: '', amount: '0', due_date: '2026-02-30' }).missing,
    ['سریال', 'شناسه صیادی', 'مبلغ', 'سررسید']);
  assert.deepStrictEqual(rowForCommit({ serial: '412587', sayad_id: '1234567890123456', amount: '99999999999999', due_date: '2026-11-11' }).missing, ['مبلغ']);
});

test('the header needs a party and a spend date', () => {
  assert.deepStrictEqual(headerProblems({}), ['طرف حساب', 'تاریخ خرج']);
  assert.deepStrictEqual(headerProblems({ party: { name: '  ' }, spend_date: '2026-09-26' }), ['طرف حساب']);
  assert.deepStrictEqual(headerProblems({ party: { id: 3 }, spend_date: '2026-09-26' }), []);
});

test('names compare the way the form compares them', () => {
  assert.strictEqual(normalizeName('علي  كريمي'), 'علی کریمی');
  assert.strictEqual(normalizeName('علی‌رضا '), 'علی رضا');
});

// A stand-in database: people of one company, and what gets written
function fakeDb(people) {
  const writes = [];
  let next = 1000;
  return {
    writes,
    async query(sql, args) {
      if (/^SELECT id, full_name, national_id FROM people/.test(sql)) return { rows: people.map((p) => ({ ...p })) };
      if (/^UPDATE people SET national_id/.test(sql)) { writes.push(['nid', args[1], args[0]]); return { rows: [] }; }
      if (/^INSERT INTO people/.test(sql)) {
        const p = { id: next++, full_name: args[1], national_id: args[2] };
        writes.push(['add', p.full_name, args[3]]);
        return { rows: [p] };
      }
      throw new Error('unexpected ' + sql);
    },
  };
}

test('people: by id, by name in any spelling, or added — and added only once', async () => {
  const db = fakeDb([{ id: 1, full_name: 'علی رضایی', national_id: null }, { id: 2, full_name: 'حسن کریمی', national_id: '0830166130' }]);
  const people = await peopleResolver(db, 7);
  assert.deepStrictEqual(await people.resolve({ id: 2 }, 'owner'), { id: 2 });
  assert.strictEqual((await people.resolve({ id: 99 }, 'owner')).error.code, 'unknown_person');
  assert.deepStrictEqual(await people.resolve({ name: 'علي رضايي' }, 'owner'), { id: 1 });
  const a = await people.resolve({ name: 'لنت' }, 'owner');
  const b = await people.resolve({ name: ' لنت ' }, 'owner');
  assert.ok(a.created && b.id === a.id && !b.created, 'the same new name twice is one person');
  assert.deepStrictEqual(db.writes, [['add', 'لنت', 'owner']]);
  assert.deepStrictEqual(await people.resolve(null, 'owner'), { id: null });
  assert.deepStrictEqual(await people.resolve({ name: '  ' }, 'owner'), { id: null });
});

test('people: a national id finds its holder, is checked, and is given to a namesake who had none', async () => {
  const db = fakeDb([{ id: 1, full_name: 'علی رضایی', national_id: null }, { id: 2, full_name: 'حسن کریمی', national_id: '0830166130' }]);
  const people = await peopleResolver(db, 7);
  assert.deepStrictEqual(await people.resolve({ name: 'هر نامی', national_id: '۰۸۳۰۱۶۶۱۳۰' }, 'benef'), { id: 2 });
  assert.strictEqual((await people.resolve({ name: 'علی', national_id: '0830166131' }, 'benef')).error.code, 'invalid_nid');
  assert.deepStrictEqual(await people.resolve({ name: 'علی رضایی', national_id: '5260181591' }, 'benef'), { id: 1 });
  assert.deepStrictEqual(db.writes, [['nid', 1, '5260181591']]);
  assert.strictEqual((await people.resolve({ national_id: '1860913903' }, 'benef')).error.code, 'name_required');
});

test('people: someone added by a row that was then rolled back is not found again', async () => {
  const db = fakeDb([]);
  const people = await peopleResolver(db, 7, { maxPeople: 1 });
  const m = people.mark();
  const first = await people.resolve({ name: 'حسن' }, 'owner');
  people.forget(m);   // that row's savepoint rolled back: the person never was
  const second = await people.resolve({ name: 'حسن' }, 'owner');
  assert.ok(second.created && second.id !== first.id, 'added again, under a new id');
  assert.deepStrictEqual(people.added, [second.id]);
});

test('people: the plan\'s limit stops the one too many', async () => {
  const db = fakeDb([{ id: 1, full_name: 'الف', national_id: null }]);
  const people = await peopleResolver(db, 7, { maxPeople: 2 });
  assert.ok((await people.resolve({ name: 'ب' }, 'owner')).created);
  await assert.rejects(() => people.resolve({ name: 'پ' }, 'owner'), PeopleLimitError);
  assert.deepStrictEqual(await people.resolve({ name: 'الف' }, 'owner'), { id: 1 }, 'someone on file is still found');
});
