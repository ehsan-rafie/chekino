// node --test test/   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const nid = require('../lib/nid');

test('the browser and the server use the very same file', () => {
  const server = fs.readFileSync(path.join(__dirname, '../lib/nid.js'));
  const browser = fs.readFileSync(path.join(__dirname, '../../js/nid.js'));
  assert.ok(server.equals(browser), 'backend/lib/nid.js and js/nid.js differ — copy one over the other');
});

test('national codes from the spec (§ پیوست ب)', () => {
  for (const ok of ['0830166130', '5260181591', '1860913903']) assert.strictEqual(nid.isValidNationalCode(ok), true, ok);
  for (const bad of ['0830166131', '1111111111', '1234567890', '0000000000']) assert.strictEqual(nid.isValidNationalCode(bad), false, bad);
});

test('legal ids from the spec', () => {
  for (const ok of ['99603082463', '28194821993']) assert.strictEqual(nid.isValidLegalId(ok), true, ok);
  for (const bad of ['99603082464', '12300000001']) assert.strictEqual(nid.isValidLegalId(bad), false, bad);
});

// Build valid codes from random prefixes, then change one digit: a check
// digit worth the name catches every single-digit typo in the last place.
function nationalWithCheck(prefix9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(prefix9[i]) * (10 - i);
  const r = sum % 11;
  return prefix9 + String(r < 2 ? r : 11 - r);
}
function legalWithCheck(prefix10) {
  const raise = Number(prefix10[9]) + 2;
  const w = [29, 27, 23, 19, 17];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (raise + Number(prefix10[i])) * w[i % 5];
  let r = sum % 11;
  if (r === 10) r = 0;
  return prefix10 + String(r);
}
const rndDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

test('500 generated national codes pass; any other last digit fails', () => {
  let made = 0;
  while (made < 500) {
    const code = nationalWithCheck(rndDigits(9));   // the check digit is always one digit: r or 11 − r (2 ≤ r ≤ 10)
    if (/^(\d)\1{9}$/.test(code)) continue;         // never issued
    assert.strictEqual(nid.isValidNationalCode(code), true, code);
    for (let d = 0; d < 10; d++) {
      if (String(d) === code[9]) continue;
      assert.strictEqual(nid.isValidNationalCode(code.slice(0, 9) + d), false, code.slice(0, 9) + d);
    }
    made++;
  }
});

test('500 generated legal ids pass; any other last digit fails', () => {
  let made = 0;
  while (made < 500) {
    const prefix = rndDigits(10);
    if (Number(prefix.slice(3, 9)) === 0) continue;
    const code = legalWithCheck(prefix);
    assert.strictEqual(nid.isValidLegalId(code), true, code);
    for (let d = 0; d < 10; d++) {
      if (String(d) === code[10]) continue;
      assert.strictEqual(nid.isValidLegalId(code.slice(0, 10) + d), false, code.slice(0, 10) + d);
    }
    made++;
  }
});

test('check(): kind, digits in any script, the message', () => {
  assert.deepStrictEqual(nid.check('۰۸۳۰۱۶۶۱۳۰'), { ok: true, kind: 'national', digits: '0830166130' });
  assert.deepStrictEqual(nid.check('٠٨٣٠١٦٦١٣٠'), { ok: true, kind: 'national', digits: '0830166130' });
  assert.deepStrictEqual(nid.check('083-016613-0'), { ok: true, kind: 'national', digits: '0830166130' });
  assert.deepStrictEqual(nid.check('99603082463'), { ok: true, kind: 'legal', digits: '99603082463' });
  assert.strictEqual(nid.check('0830166131').error, 'کد ملی معتبر نیست');
  assert.strictEqual(nid.check('99603082464').error, 'شناسه ملی معتبر نیست');
  assert.strictEqual(nid.check('12345').error, '۱۰ یا ۱۱ رقم باشد');
  assert.strictEqual(nid.check('').ok, false);
  assert.strictEqual(nid.check(null).ok, false);
});
