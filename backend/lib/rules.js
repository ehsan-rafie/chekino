// What a cheque's own fields must be (H13). One file for the browser
// (js/rules.js, a classic script: window.ChekinoRules) and the server
// (backend/lib/rules.js, the same bytes: require) — backend/test/rules.test.js
// fails if the two copies ever differ — so the form, a bulk commit and the
// API hold a cheque to the same rule.
//
// Each check takes the value as typed or sent (Persian, Arabic or Latin
// digits; a sayad id's spaces, an amount's separators) and answers '' when
// it is fine, or what is wrong, in Persian, short enough for a field's note:
//
//   ChekinoRules.serial('۱۲۳۴۵۶') → ''
//   ChekinoRules.serial('12345')  → 'باید ۶ رقم باشد'
//   ChekinoRules.amount('0')      → 'بیشتر از صفر باشد'
//   ChekinoRules.channels([])     → 'یکی را انتخاب کنید'   (a cheque sent to its owner)
(function (root) {
  const toLatin = (s) => String(s == null ? '' : s)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

  // NUMERIC(15,2) can't hold more; anything this big is a typo (H7)
  const AMOUNT_MAX = 1e13;

  // six digits, nothing else
  function serial(v) {
    const s = toLatin(v).trim();
    if (!s) return 'لازم است';
    return /^\d{6}$/.test(s) ? '' : 'باید ۶ رقم باشد';
  }

  // sixteen digits; the spaces between its groups of four are for the eye
  function sayad(v) {
    const s = toLatin(v).replace(/\s+/g, '');
    if (!s) return 'لازم است';
    return /^\d{16}$/.test(s) ? '' : 'باید ۱۶ رقم باشد';
  }

  // rials: more than nothing, less than a typo
  function amount(v) {
    const s = toLatin(v).replace(/[\s,٬]/g, '');
    if (!s) return 'لازم است';
    if (!/^\d+(\.\d+)?$/.test(s)) return 'فقط رقم';
    const n = Number(s);
    if (!(n > 0)) return 'بیشتر از صفر باشد';
    if (n >= AMOUNT_MAX) return 'مبلغ غیرعادی است؛ صفر اضافه نیست؟';
    return '';
  }

  // how a cheque went to its owner: at least one way, each a short word
  function channels(v) {
    if (!Array.isArray(v) || !v.some((c) => typeof c === 'string' && c.trim())) return 'یکی را انتخاب کنید';
    return v.every((c) => typeof c === 'string' && c.trim().length <= 30) ? '' : 'روش ارسال نامعتبر است';
  }

  // each value as it is kept: Latin digits, no spaces or separators
  const clean = {
    serial: (v) => toLatin(v).trim(),
    sayad: (v) => toLatin(v).replace(/\s+/g, ''),
    amount: (v) => toLatin(v).replace(/[\s,٬]/g, ''),
  };

  const api = { serial, sayad, amount, channels, clean, AMOUNT_MAX, digits: (v) => toLatin(v).replace(/\D/g, '') };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChekinoRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
