const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// A token is good while it verifies (HS256, ours, not expired) — and while
// its company is still active and its password the one it was signed in
// with (spec H8, 9.10): turning a company off, or setting its password
// again, ends every session it has, not just new ones. A token carries a
// fingerprint of the password hash it was signed with (`pv`); tokens from
// before it was added carry none and are let through until they expire.
// The company is read at most every 30 seconds (per company, per process);
// the admin's changes forget it at once.
const TTL = 30 * 1000;
const known = new Map();   // company id → { at, status, pv }

const fingerprint = (passwordHash) => crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16);

async function companyNow(id) {
  const c = known.get(id);
  if (c && Date.now() - c.at < TTL) return c;
  const row = (await pool.query('SELECT status, password_hash FROM companies WHERE id = $1', [id])).rows[0];
  const v = row ? { at: Date.now(), status: row.status, pv: fingerprint(row.password_hash) } : { at: Date.now(), status: 'missing', pv: null };
  known.set(id, v);
  return v;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'توکن احراز هویت ارسال نشده است' });
  }

  const token = authHeader.slice('Bearer '.length);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی شده است' });
  }
  try {
    const c = await companyNow(payload.company_id);
    if (c.status !== 'active') return res.status(401).json({ error: 'حساب این شرکت غیرفعال است', code: 'company_inactive' });
    if (payload.pv && payload.pv !== c.pv) return res.status(401).json({ error: 'رمز این حساب عوض شده؛ دوباره وارد شو', code: 'password_changed' });
  } catch (err) {
    console.error('auth company check:', err.message);
    return res.status(500).json({ error: 'خطای سرور' });
  }
  req.companyId = payload.company_id;
  next();
}

// the admin turned a company off or set its password: its sessions end now
authenticate.forget = (companyId) => known.delete(Number(companyId));
authenticate.fingerprint = fingerprint;

module.exports = authenticate;
