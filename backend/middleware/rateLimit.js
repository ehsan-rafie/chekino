const rateLimit = require('express-rate-limit');

const WINDOW = 15 * 60 * 1000;

// Applied to login endpoints only — slows down credential-guessing without
// affecting normal authenticated traffic elsewhere in the API.
//
// Two things here are load-bearing:
//
// · skipSuccessfulRequests. Only failures count. Brute force is a stream of
//   wrong passwords, so counting the right ones too buys no security and
//   costs real users their account: signing in, signing out and back in on
//   another device was enough to spend the budget and lock someone out of a
//   password they were typing correctly.
//
// · The ceiling is per-IP, and an Iranian office — or any NAT — puts a whole
//   company behind one address. At the old limit a handful of staff mistyping
//   once each could shut the door on all of them. Twenty wrong passwords in
//   a quarter of an hour is still unmistakably an attack, and leaves an
//   honest user who fumbles the keyboard a wide margin.
const loginLimiter = rateLimit({
  windowMs: WINDOW,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تلاش‌های ناموفق ورود بیش از حد مجاز. چند دقیقه دیگر دوباره امتحان کنید.' },
});

// Applied to the whole API, before anyone is known — per address. Loose,
// because a whole office (and every company behind the same carrier NAT)
// shares one address: at 600 a few busy colleagues could shut each other
// out (N2). What one account may do is capped by companyLimiter below,
// which can tell the companies apart.
const ipLimiter = rateLimit({
  windowMs: WINDOW,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. چند دقیقه دیگر دوباره امتحان کنید.' },
});

// Applied after authenticate, per company, whatever address its requests
// come from: a runaway client or a leaked token stays within one account's
// share. Sized well above a busy day's dashboard (two lists per change,
// one request per photo opened).
const companyLimiter = rateLimit({
  windowMs: WINDOW,
  limit: 1500,
  keyGenerator: (req) => 'company:' + req.companyId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'درخواست‌های این حساب بیش از حد مجاز است. چند دقیقه دیگر دوباره امتحان کنید.' },
});

module.exports = { loginLimiter, ipLimiter, companyLimiter };
