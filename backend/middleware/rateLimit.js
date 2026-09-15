const rateLimit = require('express-rate-limit');

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
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تلاش‌های ناموفق ورود بیش از حد مجاز. چند دقیقه دیگر دوباره امتحان کنید.' },
});

// Applied to the whole API — a much looser ceiling than the login limiter,
// sized so a normal busy dashboard session (which re-fetches lists after
// every create/edit/delete) never comes close, while still capping
// scripted abuse or a runaway client per IP.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. چند دقیقه دیگر دوباره امتحان کنید.' },
});

module.exports = { loginLimiter, generalLimiter };
