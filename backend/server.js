require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const checksRoutes = require('./routes/checks');
const imagesRoutes = require('./routes/images');
const batchesRoutes = require('./routes/batches');
const bulkOpsRoutes = require('./routes/bulk-ops');
const adminRoutes = require('./routes/admin');
const { ipLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Nginx — needed so express-rate-limit sees the real client IP
// (X-Forwarded-For) instead of always seeing 127.0.0.1.
app.set('trust proxy', 1);

// Nginx owns every header it and Helmet both know how to set, so each is
// emitted once with one agreed value across the static pages and this API
// (the /api location inherits the server-level add_header directives).
// Helmet's versions are turned off to avoid a second, conflicting copy on
// the same response — CSP included: leaving Helmet's default CSP on put a
// second Content-Security-Policy on API responses (browsers then enforce
// the intersection, and scanners flag the duplicate). Helmet still adds the
// headers Nginx doesn't (COOP, CORP, Origin-Agent-Cluster,
// X-Permitted-Cross-Domain-Policies, X-DNS-Prefetch-Control, …).
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  hsts: false,
  noSniff: false,
  referrerPolicy: false,
  xssFilter: false,
}));

const ALLOWED_ORIGINS = [
  'https://mychekino.ir',
  'https://www.mychekino.ir',
  'https://admin.mychekino.ir',
  'https://preview.mychekino.ir',
];
app.use(cors({
  origin(origin, callback) {
    // no Origin header (curl, server-to-server, same-origin) — allow
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
}));

// Per address first, so a flood is turned away before its body is read
app.use(ipLimiter);

// Bodies: 100 KB everywhere, except the cheque routes, which take up to
// 15 MB while the cheque form still sends its photos inside the JSON (as
// data URLs) — that comes down once photos travel to /api/images on their
// own — and a bulk add's draft, up to 1 MB. Those are left to their own
// routers, which read them only after the sign-in is checked: nobody
// unknown gets the server to hold 15 MB.
const smallBody = express.json({ limit: '100kb' });
const OWN_PARSER = ['/api/checks', '/api/batches'];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (OWN_PARSER.some((r) => p === r || p.startsWith(r + '/'))) return next();
  smallBody(req, res, next);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chekino server is running', timestamp: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/checks', checksRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/bulk-ops', bulkOpsRoutes);
app.use('/api/admin', adminRoutes);

// Whatever no route answered, and whatever failed, answers in JSON — never
// Express's HTML page, and never a stack or a request body
app.use('/api', (req, res) => res.status(404).json({ error: 'مسیر پیدا نشد' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: req.path.startsWith('/api/checks') ? 'حجم عکس‌ها بیش از حد مجاز است (حداکثر ۱۵ مگابایت)' : 'حجم درخواست بیش از حد مجاز است' });
  }
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'دسترسی از این نشانی مجاز نیست' });
  // the body couldn't be read: not JSON, an unknown charset, cut off midway
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'درخواست نامعتبر است' });
  console.error('unhandled error:', err.message);
  res.status(500).json({ error: 'خطای سرور' });
});

// Bind to loopback only: Nginx reverse-proxies to 127.0.0.1:3000 on the same
// host, so the API never needs a public interface. ufw already blocks 3000
// from outside; binding here means the DB-backed API stays unreachable even
// if the firewall is ever changed or fails.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Chekino server listening on ${HOST}:${PORT}`);
});
