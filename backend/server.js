require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const checksRoutes = require('./routes/checks');
const adminRoutes = require('./routes/admin');
const { generalLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Nginx — needed so express-rate-limit sees the real client IP
// (X-Forwarded-For) instead of always seeing 127.0.0.1.
app.set('trust proxy', 1);

// This app only ever serves JSON to the two chekino frontends — no HTML,
// no inline scripts to allow — so helmet's defaults apply cleanly with no
// CSP exceptions needed. frameguard and hsts are left to Nginx, which
// already sets X-Frame-Options and Strict-Transport-Security across both
// the static pages and this API — keeping each header in one place avoids
// duplicate/conflicting values on the same response.
// frameguard/hsts/noSniff/referrerPolicy/xssFilter are all left to Nginx,
// which already sets these same headers across both the static pages and
// this API — Helmet's defaults for these conflicted with Nginx's chosen
// values (e.g. Referrer-Policy: no-referrer vs strict-origin-when-cross-origin),
// producing duplicate headers with different values on the same response.
app.use(helmet({
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
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Chekino server listening on port ${PORT}`);
});
