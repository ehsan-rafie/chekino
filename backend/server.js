require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const checksRoutes = require('./routes/checks');
const imagesRoutes = require('./routes/images');
const adminRoutes = require('./routes/admin');
const { generalLimiter } = require('./middleware/rateLimit');

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

app.use(express.json({ limit: '15mb' }));
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chekino server is running', timestamp: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/checks', checksRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/admin', adminRoutes);

// Bind to loopback only: Nginx reverse-proxies to 127.0.0.1:3000 on the same
// host, so the API never needs a public interface. ufw already blocks 3000
// from outside; binding here means the DB-backed API stays unreachable even
// if the firewall is ever changed or fails.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Chekino server listening on ${HOST}:${PORT}`);
});
