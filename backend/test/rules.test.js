// node --test test/*.test.js   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const rules = require('../lib/rules');

test('the browser and the server use the very same file', (t) => {
  // (on the live server the browser's copy sits with the site, not beside the backend)
  const browserPath = path.join(__dirname, '../../js/rules.js');
  if (!fs.existsSync(browserPath)) return t.skip('no js/rules.js beside the backend here');
  const server = fs.readFileSync(path.join(__dirname, '../lib/rules.js'));
  assert.ok(server.equals(fs.readFileSync(browserPath)), 'backend/lib/rules.js and js/rules.js differ — copy one over the other');
});

test('serial: six digits, in any script', () => {
  for (const ok of ['123456', '۱۲۳۴۵۶', '١٢٣٤٥٦', ' 123456 ']) assert.strictEqual(rules.serial(ok), '', ok);
  assert.strictEqual(rules.serial(''), 'لازم است');
  assert.strictEqual(rules.serial(null), 'لازم است');
  for (const bad of ['12345', '1234567', '12-456', '12345a']) assert.strictEqual(rules.serial(bad), 'باید ۶ رقم باشد', bad);
});

test('sayad id: sixteen digits, spaces for the eye only', () => {
  for (const ok of ['1234567890123456', '1234 5678 9012 3456', '۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶']) assert.strictEqual(rules.sayad(ok), '', ok);
  assert.strictEqual(rules.sayad(''), 'لازم است');
  for (const bad of ['123456789012345', '12345678901234567', '1234-5678-9012-3456']) assert.strictEqual(rules.sayad(bad), 'باید ۱۶ رقم باشد', bad);
});

test('amount: more than nothing, less than a typo (H7)', () => {
  for (const ok of ['7000000', 7000000, '7000000.00', '۵٬۰۰۰٬۰۰۰', '9999999999999']) assert.strictEqual(rules.amount(ok), '', String(ok));
  assert.strictEqual(rules.amount(''), 'لازم است');
  assert.strictEqual(rules.amount('0'), 'بیشتر از صفر باشد');
  assert.strictEqual(rules.amount('-5'), 'فقط رقم');
  assert.strictEqual(rules.amount('10000000000000'), 'مبلغ غیرعادی است؛ صفر اضافه نیست؟');
});

test('channels: at least one way it went', () => {
  assert.strictEqual(rules.channels(['whatsapp']), '');
  assert.strictEqual(rules.channels(['whatsapp', 'پیامک']), '');
  for (const bad of [[], ['  '], undefined, null, 'whatsapp']) assert.strictEqual(rules.channels(bad), 'یکی را انتخاب کنید', JSON.stringify(bad));
  assert.strictEqual(rules.channels(['x'.repeat(31)]), 'روش ارسال نامعتبر است');
});
