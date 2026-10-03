// Iranian national ids, checked by their check digit. One file for the
// browser (js/nid.js, a classic script: window.ChekinoNid) and the server
// (backend/lib/nid.js, the same bytes: require) — backend/test/nid.test.js
// fails if the two copies ever differ, so the form and the API can't drift.
//
//   ChekinoNid.check('0830166130') → { ok: true,  kind: 'national', digits }
//   ChekinoNid.check('0830166131') → { ok: false, kind: 'national', digits, error: 'کد ملی معتبر نیست' }
//
// Digits may be Persian, Arabic or Latin; anything else is ignored.
(function (root) {
  const toLatin = (s) => String(s == null ? '' : s)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '');

  // کد ملی — 10 digits, for a person: the 10th is a check on the first 9,
  // weighted 10 down to 2; ten of the same digit is never issued
  function isValidNationalCode(code) {
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(code[i]) * (10 - i);
    const r = sum % 11;
    const check = Number(code[9]);
    return r < 2 ? check === r : check === 11 - r;
  }

  // شناسه ملی — 11 digits, for a company or an organisation: the 11th is a
  // check on the first 10, each raised by (10th digit + 2) and weighted
  // 29, 27, 23, 19, 17 in turn; digits 4–9 are never all zero
  function isValidLegalId(code) {
    if (!/^\d{11}$/.test(code) || Number(code.slice(3, 9)) === 0) return false;
    const raise = Number(code[9]) + 2;
    const weights = [29, 27, 23, 19, 17];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (raise + Number(code[i])) * weights[i % 5];
    let r = sum % 11;
    if (r === 10) r = 0;
    return r === Number(code[10]);
  }

  function check(value) {
    const digits = toLatin(value);
    if (digits.length === 10) {
      return isValidNationalCode(digits)
        ? { ok: true, kind: 'national', digits }
        : { ok: false, kind: 'national', digits, error: 'کد ملی معتبر نیست' };
    }
    if (digits.length === 11) {
      return isValidLegalId(digits)
        ? { ok: true, kind: 'legal', digits }
        : { ok: false, kind: 'legal', digits, error: 'شناسه ملی معتبر نیست' };
    }
    return { ok: false, kind: null, digits, error: '۱۰ یا ۱۱ رقم باشد' };
  }

  const api = { check, isValidNationalCode, isValidLegalId, digits: toLatin };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChekinoNid = api;
})(typeof window !== 'undefined' ? window : globalThis);
