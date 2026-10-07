// node --test "test/*.test.js"   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parse } = require('../lib/serials');

test('the browser and the server use the very same file', (t) => {
  // (on the live server the browser's copy sits with the site, not beside the backend)
  const browserPath = path.join(__dirname, '../../js/serials.js');
  if (!fs.existsSync(browserPath)) return t.skip('no js/serials.js beside the backend here');
  const server = fs.readFileSync(path.join(__dirname, '../lib/serials.js'));
  const browser = fs.readFileSync(browserPath);
  assert.ok(server.equals(browser), 'backend/lib/serials.js and js/serials.js differ — copy one over the other');
});

// The table of spec 6.4 (all made up), row by row
const brief = (t) => t.kind === 'invalid' ? `invalid:${t.input}` : `${t.kind}:${t.value}${t.uncertain ? '?' : ''}${t.label ? '#' + t.label : ''}`;
const TABLE = [
  ['412587', ['serial:412587']],
  ['۴۱۲۵۸۷', ['serial:412587']],
  ['٤١٢٥٨٧', ['serial:412587']],
  ['9017/412587', ['serial:412587']],
  ['1857/309441/26', ['serial:309441']],
  ['0151/055012', ['serial:055012']],
  ['30028/550128', ['serial:550128']],
  ['1234 5678 9012 3456', ['sayad:1234567890123456']],
  ['1234567890123456', ['sayad:1234567890123456']],
  ['9017412587', ['serial:412587?']],
  ['41258', ['invalid:41258']],
  ['412587، 309441؛550128', ['serial:412587', 'serial:309441', 'serial:550128']],
  ['9017 412587 309441', ['invalid:9017', 'serial:412587', 'serial:309441']],
  ['412587\tحسن کریمی', ['serial:412587#حسن کریمی']],
  ['412587\t309441\t550128', ['serial:412587#309441\t550128']],
  ['9017412587\n412587', ['serial:412587']],
  ['41‎2587', ['serial:412587']],
];
for (const [input, want] of TABLE) {
  test(`6.4: ${JSON.stringify(input)}`, () => {
    assert.deepStrictEqual(parse(input).map(brief), want);
  });
}

test('the T6 paste: four lines, mixed digits, one with its series', () => {
  assert.deepStrictEqual(parse('412587\n۳۰۹۴۴۱\n٥٥٠١٢٨\n9017/055012').map(brief),
    ['serial:412587', 'serial:309441', 'serial:550128', 'serial:055012']);
});

test('repeats are dropped, the first kept; blank lines and stray spaces are nothing', () => {
  assert.deepStrictEqual(parse('412587\n\n  412587  \n 309441\n412587').map(brief), ['serial:412587', 'serial:309441']);
});

test('an exact serial replaces an uncertain one that came first, in its place', () => {
  assert.deepStrictEqual(parse('9017412587\n309441\n412587').map(brief), ['serial:412587', 'serial:309441']);
});

test('a sayad id in fours with dashes, and one inside a longer token', () => {
  assert.deepStrictEqual(parse('1234-5678-9012-3456').map(brief), ['sayad:1234567890123456']);
  assert.deepStrictEqual(parse('شناسه:1234567890123456').map(brief), ['sayad:1234567890123456']);
});

test('two six-digit groups in one token is not a guess: invalid', () => {
  assert.deepStrictEqual(parse('412587/309441').map(brief), ['invalid:412587/309441']);
});

test('nothing in, nothing out', () => {
  assert.deepStrictEqual(parse(''), []);
  assert.deepStrictEqual(parse(null), []);
  assert.deepStrictEqual(parse(' \n\t\n'), []);
});
