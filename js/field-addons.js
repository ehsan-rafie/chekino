// The live parts of the input groups (css/shared.css, "INPUT GROUP"):
//   [data-count-for="id"]  a running digit count, "۳ / ۶", green when full
//   [data-focus="id"]      a suffix arrow that puts the cursor in the field
//                          and opens its full list of names (ac-browse)
//   [data-copy-from="id"]  a suffix button that copies the field's value
//   .ig-pre / .ig-suf       pressing an icon or suffix text focuses the field
//
// Presentation only: none of these change a field's value. The counts are
// refreshed on input and on a light interval, since forms are also filled
// from code (opening a cheque to edit, restoring a draft).
(function () {
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => String(s).replace(/[0-9]/g, (d) => FA[d]);
  const toEn = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d));

  const counters = Array.from(document.querySelectorAll('[data-count-for]')).map((el) => {
    const input = document.getElementById(el.dataset.countFor);
    return input ? { el, input, max: Number(input.maxLength) || 0, last: null } : null;
  }).filter(Boolean);

  function countAll() {
    counters.forEach((c) => {
      const n = toEn(c.input.value).replace(/[^0-9]/g, '').length;
      if (n === c.last) return;
      c.last = n;
      c.el.textContent = n ? `${toFa(n)} / ${toFa(c.max)}` : '';
      c.el.classList.toggle('is-full', c.max > 0 && n >= c.max);
    });
  }
  if (counters.length) {
    counters.forEach((c) => c.input.addEventListener('input', countAll));
    setInterval(countAll, 250);
    countAll();
  }

  // Pressing an icon or a suffix's text (not one of its buttons) puts the
  // caret in the field, as pressing the field itself would. The add-ons
  // catch the pointer so the cursor stays an arrow over them.
  document.addEventListener('mousedown', (e) => {
    const addon = e.target.closest && e.target.closest('.ig-pre, .ig-suf, .amount-unit, .search-icon, .search-kbd');
    if (!addon || e.target.closest('button')) return;
    const box = addon.closest('.ig, .amount-box, .search-box');
    const input = box && box.querySelector('input, textarea');
    if (!input || input.disabled || input.readOnly) return;
    e.preventDefault();
    input.focus();
  });

  // The arrow never takes focus from its field, so the field's own blur
  // handling (closing its list, checking its value) doesn't run on the way.
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('[data-focus]')) e.preventDefault();
  });

  document.addEventListener('click', (e) => {
    const focusBtn = e.target.closest && e.target.closest('[data-focus]');
    if (focusBtn) {
      const input = document.getElementById(focusBtn.dataset.focus);
      if (input && !input.disabled) {
        input.focus();
        // A field with a list (the cheque form's names) opens it in full
        input.dispatchEvent(new CustomEvent('ac-browse'));
      }
      return;
    }
    const copyBtn = e.target.closest && e.target.closest('[data-copy-from]');
    if (copyBtn) {
      const input = document.getElementById(copyBtn.dataset.copyFrom);
      if (!input || !input.value) return;
      const done = () => {
        copyBtn.classList.add('is-done');
        setTimeout(() => copyBtn.classList.remove('is-done'), 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(done, () => { input.select(); document.execCommand('copy'); done(); });
      } else {
        input.select();
        document.execCommand('copy');
        done();
      }
    }
  });
})();
