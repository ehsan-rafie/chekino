// The live parts of the input groups (css/shared.css, "INPUT GROUP"):
//   [data-focus="id"]      a suffix arrow that puts the cursor in the field
//                          and opens its full list of names (ac-browse)
//   [data-copy-from="id"]  a suffix button that copies the field's value
//   .ig-pre / .ig-suf       pressing an icon or suffix text focuses the field
//
// Presentation only: none of these change a field's value.
(function () {
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
