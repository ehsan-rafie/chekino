// Live cheque preview + step progress for the add/view/edit cheque modal.
//
// Read-only on purpose: it never writes to a form field or touches the
// modal's own state, it only mirrors what dashboard.js already put in the
// DOM. That keeps it safe to load after dashboard.js without either file
// knowing about the other.
//
// Several values change without an input event (the calendar's setDate,
// setAmountValue in view mode, the channel chips), so on top of listening
// for input it also re-reads on a short interval — but only while the
// modal is open, and only if something actually changed.
(function () {
  const $ = (id) => document.getElementById(id);
  const overlay = $('modalOverlay');
  const body = $('modalBody');
  if (!overlay || !body) return;

  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => String(s).replace(/[0-9]/g, (d) => FA[d]);
  const toEn = (s) => String(s || '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const digits = (s) => toEn(s).replace(/\D/g, '');
  const val = (id) => ($(id) ? $(id).value.trim() : '');
  const text = (id) => ($(id) ? $(id).textContent.trim() : '');

  const setText = (id, value, placeholder) => {
    const el = $(id);
    if (!el) return;
    const v = value || placeholder;
    if (el.textContent !== v) el.textContent = v;
    el.classList.toggle('is-empty', !value);
  };

  function channelNames() {
    const chips = $('channelChips');
    if (!chips) return [];
    return [...chips.children].map((c) => c.textContent.trim()).filter(Boolean);
  }

  // Required fields per step. A field counts as done when it holds a
  // plausible value and isn't currently flagged with .error.
  function isOk(fieldId, test) {
    const f = $(fieldId);
    return !!(test() && !(f && f.classList.contains('error')));
  }
  const dateOk = (id) => digits(val(id)).length === 8;
  const CHECKS = [
    [1, 'serialField', () => digits(val('serialInput')).length === 6],
    [1, 'sayadField', () => digits(val('sayadInput')).length === 16],
    [1, 'amountField', () => Number(digits(val('amountInput'))) > 0],
    [1, 'dueDateField', () => dateOk('dueDateInput')],
    [2, 'ownerField', () => val('ownerInput').length > 0],
    [2, 'partyField', () => val('partyInput').length > 0],
    [2, 'benefField', () => val('benefInput').length > 0],
    [2, 'nidField', () => [10, 11].includes(digits(val('nidInput')).length)],
    [3, 'sendDateField', () => dateOk('sendDateInput')],
    [3, 'channelField', () => channelNames().length > 0],
  ];

  function stampFor() {
    const b = $('veStatusBanner');
    if (!b || !b.classList.contains('show')) return null;
    if (b.classList.contains('st-done')) return { cls: 'done', label: 'ثبت شد' };
    if (b.classList.contains('st-problem')) return { cls: 'problem', label: 'ثبت نشد' };
    if (b.classList.contains('st-pending')) return { cls: 'pending', label: 'منتظر ثبت' };
    return null;
  }

  let last = '';
  function render() {
    const serial = digits(val('serialInput'));
    const sayad = digits(val('sayadInput'));
    const amount = digits(val('amountInput'));
    const snapshot = [
      serial, sayad, amount, val('dueDateInput'), val('ownerInput'), val('partyInput'),
      val('benefInput'), val('nidInput'), val('sendDateInput'), text('amountWords'),
      channelNames().join(','), ($('veStatusBanner') || {}).className,
      CHECKS.map(([, f]) => ($(f) && $(f).classList.contains('error') ? 1 : 0)).join(''),
    ].join('|');
    if (snapshot === last) return;
    last = snapshot;

    // Cheque drawing
    setText('cqcSerial', serial && toFa(serial.padEnd(6, '–')), '––––––');
    const sayadEl = $('cqcSayad');
    if (sayadEl) {
      const padded = sayad.padEnd(16, '•');
      sayadEl.innerHTML = [0, 4, 8, 12]
        .map((i) => `<span>${toFa(padded.slice(i, i + 4))}</span>`)
        .join('');
      sayadEl.classList.toggle('is-empty', !sayad);
    }
    const due = val('dueDateInput');
    setText('cqcDue', due && toFa(due), '––/––/––––');
    setText('cqcAmount', amount && toFa(Number(amount).toLocaleString('en-US')), '۰');
    setText('cqcWords', amount ? text('amountWords') : '', 'مبلغ به حروف');
    setText('cqcBenef', val('benefInput'), 'نام ذینفع');
    const nid = digits(val('nidInput'));
    setText('cqcNid', nid && ('کد ملی ' + toFa(nid)), '');
    setText('cqcOwner', val('ownerInput'), 'صاحب حساب');

    const stamp = stampFor();
    const stampEl = $('cqcStamp');
    const cheque = $('cqCheque');
    if (stampEl && cheque) {
      stampEl.textContent = stamp ? stamp.label : '';
      cheque.dataset.status = stamp ? stamp.cls : '';
    }

    // Side facts
    setText('cqfParty', val('partyInput'), '—');
    const send = val('sendDateInput');
    setText('cqfSend', send && toFa(send), '—');
    setText('cqfChannels', channelNames().join('، '), '—');

    // Progress + step badges
    const done = CHECKS.filter(([, f, t]) => isOk(f, t));
    const pct = Math.round((done.length / CHECKS.length) * 100);
    setText('cqProgressText', `${toFa(done.length)} از ${toFa(CHECKS.length)}`, '');
    const fill = $('cqProgressFill');
    if (fill) fill.style.inlineSize = pct + '%';
    const bar = fill && fill.parentElement;
    if (bar) bar.classList.toggle('is-full', pct === 100);
    [1, 2, 3].forEach((n) => {
      const step = $('cqStep' + n);
      if (!step) return;
      const need = CHECKS.filter(([s]) => s === n);
      const ok = need.every(([, f, t]) => isOk(f, t));
      const bad = need.some(([, f]) => $(f) && $(f).classList.contains('error'));
      step.classList.toggle('is-done', ok);
      step.classList.toggle('has-error', bad);
    });
  }

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  };
  body.addEventListener('input', schedule);
  body.addEventListener('change', schedule);
  document.addEventListener('click', schedule, true);

  let timer = 0;
  const watchOpen = () => {
    const open = overlay.classList.contains('show');
    if (open && !timer) {
      last = '';
      render();
      timer = setInterval(render, 300);
    } else if (!open && timer) {
      clearInterval(timer);
      timer = 0;
    }
  };
  new MutationObserver(watchOpen).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  watchOpen();
})();
