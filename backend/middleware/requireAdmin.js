const jwt = require('jsonwebtoken');
const session = require('../lib/session');

function requireAdmin(req, res, next) {
  // a signed Bearer token, or the admin's cookie (lib/session.js) — which
  // only a request that says X-Admin may lean on
  const found = session.tokenOf(req, 'admin', (t) => jwt.verify(t, process.env.ADMIN_JWT_SECRET, { algorithms: ['HS256'] }));
  if (!found) {
    const sent = (req.headers.authorization || '').startsWith('Bearer ') || session.cookieOf(req, 'admin');
    return res.status(401).json({ error: sent ? 'توکن ادمین نامعتبر یا منقضی شده است' : 'توکن احراز هویت ادمین ارسال نشده است' });
  }
  if (found.viaCookie && !req.headers['x-admin']) {
    return res.status(401).json({ error: 'درخواست ادمین بدون سرآیند پذیرفته نمی‌شود', code: 'no_admin_header' });
  }
  const payload = found.payload;
  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی ادمین لازم است' });
  }
  req.isAdmin = true;
  req.admin = payload;
  next();
}

module.exports = requireAdmin;
