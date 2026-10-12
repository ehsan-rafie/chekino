const pool = require('../db');

// Wrong passwords per username, in the database (migration_008, spec 9.10):
// shared by every process and kept across restarts, so an account being
// guessed at slows down whatever addresses the guesses come from. Five in a
// row lock that username for a minute; each one after doubles it, up to a
// quarter of an hour. A good sign-in clears it; a day with no tries forgets
// it. Unknown usernames are counted the same way — a lock says nothing
// about whether the account exists. The per-address limiter stays as well.
//
// Without its table (before the migration runs) it does nothing: signing in
// must never fail because of it.
const FREE = 5;
const MAX_MINUTES = 15;

const keyOf = (kind, username) => `${kind}:${String(username || '').trim().toLowerCase()}`;

// minutes left on a lock, or 0
async function lockedFor(key) {
  try {
    const r = (await pool.query(
      'SELECT locked_until FROM login_failures WHERE login_key = $1 AND locked_until > now()',
      [key]
    )).rows[0];
    return r ? Math.max(1, Math.ceil((new Date(r.locked_until).getTime() - Date.now()) / 60000)) : 0;
  } catch (err) {
    return 0;
  }
}

async function failed(key) {
  try {
    const fails = (await pool.query(
      `INSERT INTO login_failures (login_key, fails, last_at) VALUES ($1, 1, now())
       ON CONFLICT (login_key) DO UPDATE SET
         fails = CASE WHEN login_failures.last_at < now() - interval '1 day' THEN 1 ELSE login_failures.fails + 1 END,
         last_at = now()
       RETURNING fails`,
      [key]
    )).rows[0].fails;
    if (fails >= FREE) {
      const minutes = Math.min(2 ** (fails - FREE), MAX_MINUTES);
      await pool.query("UPDATE login_failures SET locked_until = now() + make_interval(mins => $2) WHERE login_key = $1", [key, minutes]);
    }
    // now and then, the ones nobody has tried for two days
    if (Math.random() < 0.05) await pool.query("DELETE FROM login_failures WHERE last_at < now() - interval '2 days'");
  } catch (err) {
    // (no table yet: nothing to count)
  }
}

async function succeeded(key) {
  try { await pool.query('DELETE FROM login_failures WHERE login_key = $1', [key]); } catch (err) { /* no table yet */ }
}

const FA = '۰۱۲۳۴۵۶۷۸۹';
const lockedMessage = (minutes) =>
  `چند رمز اشتباه پشت سر هم برای این نام کاربری زده شد؛ ${String(minutes).replace(/\d/g, (d) => FA[d])} دقیقه‌ی دیگر دوباره امتحان کن`;

module.exports = { keyOf, lockedFor, failed, succeeded, lockedMessage, FREE, MAX_MINUTES };
