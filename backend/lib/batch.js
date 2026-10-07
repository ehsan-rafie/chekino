// A bulk add's draft (spec 6.3): its shape, checked on every autosave, and
// whether a row is complete enough to become a cheque, checked on commit.
//
// draft = {
//   header: { party: { id?, name }, spend_date: 'YYYY-MM-DD',
//             beneficiary: { id?, name, national_id } | null },
//   rows: [{ ref: uuid, position, image_id?, serial, sayad_id, amount,
//            due_date: 'YYYY-MM-DD', owner: { id?, name } | null }]
// }
// An autosave may hold half-typed rows; only their shape and size are held
// to anything. A commit takes the complete rows only.

const MAX_ROWS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_MAX = 1e13;   // NUMERIC(15,2): anything this big is a typo (H7)

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const shortStr = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max);
const person = (p) => p === undefined || p === null || (isObj(p) && shortStr(p.name, 200) && shortStr(p.national_id, 30)
  && (p.id === undefined || p.id === null || Number.isInteger(Number(p.id))));

// What's wrong with a draft's shape, or null
function draftShapeError(draft) {
  if (!isObj(draft)) return 'پیش‌نویس نامعتبر است';
  const h = draft.header === undefined ? {} : draft.header;
  if (!isObj(h)) return 'سرِ پیش‌نویس نامعتبر است';
  if (!person(h.party) || !person(h.beneficiary)) return 'طرف حساب یا ذینفعِ پیش‌نویس نامعتبر است';
  if (!shortStr(h.spend_date, 10)) return 'تاریخ خرجِ پیش‌نویس نامعتبر است';
  const rows = draft.rows === undefined ? [] : draft.rows;
  if (!Array.isArray(rows)) return 'ردیف‌های پیش‌نویس نامعتبر است';
  if (rows.length > MAX_ROWS) return `یک دسته حداکثر ${MAX_ROWS} ردیف دارد`;
  const refs = new Set();
  for (const r of rows) {
    if (!isObj(r) || typeof r.ref !== 'string' || !UUID.test(r.ref)) return 'ردیفی بدون شناسه‌ی معتبر است';
    if (refs.has(r.ref)) return 'شناسه‌ی ردیف تکراری است';
    refs.add(r.ref);
    if (!shortStr(r.serial, 30) || !shortStr(r.sayad_id, 40) || !shortStr(r.due_date, 10) || !shortStr(r.image_id, 40)) return 'ردیفی نامعتبر است';
    if (!(r.amount === undefined || r.amount === null || ['string', 'number'].includes(typeof r.amount))) return 'ردیفی نامعتبر است';
    if (!person(r.owner)) return 'صاحب چکِ ردیفی نامعتبر است';
  }
  return null;
}

const validDate = (s) => {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const digitsOf = (v) => String(v == null ? '' : v)
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/\D/g, '');

// A row as it would be written, or the fields it still lacks (Persian
// labels, the order of the row's columns)
function rowForCommit(r) {
  const serial = digitsOf(r.serial);
  const sayad = digitsOf(r.sayad_id);
  const amount = digitsOf(r.amount);
  const missing = [];
  if (!/^\d{6}$/.test(serial)) missing.push('سریال');
  if (!/^\d{16}$/.test(sayad)) missing.push('شناسه صیادی');
  if (!amount || Number(amount) <= 0 || Number(amount) >= AMOUNT_MAX) missing.push('مبلغ');
  if (!validDate(r.due_date)) missing.push('سررسید');
  if (missing.length) return { missing };
  return { row: { serial, sayad_id: sayad, amount, due_date: r.due_date } };
}

// The header a commit needs: a party and a spend date
function headerProblems(h) {
  const missing = [];
  if (!h || !h.party || !(h.party.id || String(h.party.name || '').trim())) missing.push('طرف حساب');
  if (!h || !validDate(h.spend_date)) missing.push('تاریخ خرج');
  return missing;
}

module.exports = { MAX_ROWS, UUID, draftShapeError, rowForCommit, headerProblems, validDate };
