const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'توکن احراز هویت ادمین ارسال نشده است' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی ادمین لازم است' });
    }
    req.isAdmin = true;
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'توکن ادمین نامعتبر یا منقضی شده است' });
  }
}

module.exports = requireAdmin;
