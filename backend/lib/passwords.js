// What a password must be (spec 9.10): long enough, and not one of the ones
// tried first. Checked wherever one is set — a company's (by the admin) and
// the admin's own; an existing password still signs in.
const MIN = 10;
// the first guesses of every list, and what an office types
const COMMON = new Set([
  '1234567890', '0123456789', '12345678910', '123456789a', 'qwertyuiop', 'asdfghjkl;', 'password12', 'password123',
  'passw0rd12', 'iloveyou12', '1q2w3e4r5t', 'q1w2e3r4t5', 'zaq12wsxcde', 'abcdefghij', 'aaaaaaaaaa', '1111111111',
  'chekino123', 'chekino1234', 'admin12345', 'administrator', 'qwerty1234', 'qwerty12345', 'mypassword', 'welcome123',
]);

function passwordProblem(pw) {
  const p = String(pw == null ? '' : pw);
  if (p.length < MIN) return `رمز باید دست‌کم ${MIN.toLocaleString('fa-IR')} نویسه باشد`;
  if (p.length > 200) return 'رمز بیش از اندازه بلند است';
  if (/^(.)\1+$/.test(p)) return 'رمز نباید یک نویسه‌ی تکراری باشد';
  if (COMMON.has(p.toLowerCase())) return 'این رمز از رایج‌ترین رمزهاست؛ رمز دیگری بگذار';
  // a run of the keyboard or of digits («2345678901», «abcdefghijk»)
  const codes = [...p.toLowerCase()].map((c) => c.charCodeAt(0));
  const steps = codes.slice(1).map((c, i) => c - codes[i]);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return 'رمز نباید یک رشته‌ی پشت‌سرهم باشد';
  return null;
}

module.exports = { passwordProblem, MIN };
