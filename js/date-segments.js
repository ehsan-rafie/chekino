// Date fields drawn as HeroUI's DateField: the day, month and year are
// three segments, each showing its placeholder word («روز» «ماه» «سال»)
// until it holds digits, and while the field has focus the segment the
// next digit will land in is highlighted.
//
// Presentation only, like cheque-form.js. Typing, the active segment,
// validation, paste and the calendar all stay in createDateField
// (dashboard.js), which keeps working on the real <input> underneath and
// keeps its caret at the active segment; this layer reads that input's
// value ("YYYY/MM/DD", '_' for an empty digit) and caret, and redraws
// three spans over it. Pressing a segment asks the field to make it the
// active one (a 'dseg-select' event on the input).
//
// Every field createDateField makes is marked (data-date-field): those made
// before this file loaded are picked up here, and later ones (the rows of
// a bulk add) call ChekinoDateSegments.attach(input) themselves.
(function () {
  // In reading order for an RTL line: day on the right, year on the left —
  // the same order (0 day, 1 month, 2 year) createDateField numbers them;
  // from / to is where each sits in the "YYYY/MM/DD" string.
  const SEGS = [
    { key: 'day',   ph: 'روز', from: 8, to: 10 },
    { key: 'month', ph: 'ماه', from: 5, to: 7 },
    { key: 'year',  ph: 'سال', from: 0, to: 4 },
  ];
  const fields = [];

  // Which segment the caret is in (the one the next digit fills)
  function segAtCaret(pos) {
    if (pos <= 3) return 'year';
    if (pos <= 6) return 'month';
    return 'day';
  }

  function draw(f) {
    const value = f.input.value;
    const focused = document.activeElement === f.input;
    const active = focused ? segAtCaret(f.input.selectionStart ?? value.length) : '';
    const sig = `${value}|${active}`;
    if (sig === f.last) return;
    f.last = sig;
    SEGS.forEach((seg) => {
      const digits = value ? value.slice(seg.from, seg.to).replace(/_/g, '') : '';
      const part = f.parts[seg.key];
      part.textContent = digits || seg.ph;
      part.dataset.text = part.textContent;   // an invisible bold copy reserves its width (CSS)
      part.classList.toggle('is-ph', !digits);
      part.classList.toggle('is-active', seg.key === active);
    });
  }

  function attach(input) {
    if (!input || input._dseg) return;
    const wrap = input.closest('.date-input-wrap');
    if (!wrap) return;
    wrap.classList.add('has-dseg');
    const layer = document.createElement('div');
    layer.className = 'dseg';
    layer.setAttribute('aria-hidden', 'true');
    const parts = {};
    SEGS.forEach((seg, i) => {
      if (i) {
        const sep = document.createElement('span');
        sep.className = 'dseg-sep';
        sep.textContent = '/';
        layer.appendChild(sep);
      }
      const part = document.createElement('span');
      part.className = 'dseg-part';
      part.dataset.seg = seg.key;
      layer.appendChild(part);
      parts[seg.key] = part;

      // Pressing a segment: focus the field (its own focus handler still
      // runs), then make this segment the active one.
      part.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (document.activeElement !== input) input.focus();
        input.dispatchEvent(new CustomEvent('dseg-select', { detail: i }));
        draw(f);
      });
    });
    wrap.insertBefore(layer, input);
    const f = { input, parts, last: '' };
    input._dseg = f;
    fields.push(f);
    // Redrawn right after anything that can move the value or the caret,
    // and at once whenever createDateField renders (a calendar pick, a
    // restored draft, the form being reset on open)
    const later = () => setTimeout(() => draw(f), 0);
    ['focus', 'blur', 'keydown', 'keyup', 'mouseup', 'paste', 'input'].forEach((ev) => input.addEventListener(ev, later));
    input.addEventListener('dseg-render', () => draw(f));
    draw(f);
  }

  // A field whose row was removed is let go; one put back in the page is
  // taken up again by its own events above
  function sync() {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      if (!f.input.isConnected) { fields.splice(i, 1); continue; }
      draw(f);
    }
  }

  document.querySelectorAll('input[data-date-field]').forEach(attach);
  // The selection moving (the caret within a field) and a press anywhere
  // can change which segment shows as active; the light interval is the
  // safety net for anything else that sets a value from code.
  document.addEventListener('selectionchange', sync);
  document.addEventListener('click', () => setTimeout(sync, 0), true);
  setInterval(sync, 150);
  window.ChekinoDateSegments = { attach };
})();
