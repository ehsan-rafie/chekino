// Live Sayad cheque + step progress for the add/view/edit cheque modal.
//
// Read-only on purpose: it never writes to a form field or touches the
// modal's own state, it only mirrors what dashboard.js already put in the
// DOM. That keeps it safe to load after dashboard.js without either file
// knowing about the other.
//
// Several values change without an input event (the calendar's setDate,
// setAmountValue in view mode, the channel chips), so on top of listening
// for input it also re-reads on a short interval — but only while the
// modal is open, and only redraws when something actually changed.
(function () {
  const $ = (id) => document.getElementById(id);
  const overlay = $('modalOverlay');
  const body = $('modalBody');
  const cheque = $('cqCheque');
  if (!overlay || !body || !cheque) return;

  // ---- digits ------------------------------------------------------------
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => String(s).replace(/[0-9]/g, (d) => FA[d]);
  const toEn = (s) => String(s || '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const digits = (s) => toEn(s).replace(/\D/g, '');
  const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const val = (id) => ($(id) ? $(id).value.trim() : '');

  // ---- Persian number words, the way a cheque is filled in ---------------
  const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];

  function threeWords(n) {
    const parts = [];
    const h = Math.floor(n / 100), rest = n % 100;
    if (h) parts.push(HUNDREDS[h]);
    if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
    else {
      const t = Math.floor(rest / 10), o = rest % 10;
      if (t) parts.push(TENS[t]);
      if (o) parts.push(ONES[o]);
    }
    return parts.join(' و ');
  }
  function numberWords(str) {
    const s = String(str).replace(/^0+/, '');
    if (!s) return '';
    if (s.length > 15) return '';
    const groups = [];
    for (let i = s.length; i > 0; i -= 3) groups.unshift(Number(s.slice(Math.max(0, i - 3), i)));
    const out = [];
    groups.forEach((g, i) => {
      if (!g) return;
      const scale = SCALES[groups.length - 1 - i];
      out.push(scale ? `${threeWords(g)} ${scale}` : threeWords(g));
    });
    return out.join(' و ');
  }
  function ordinalWords(n) {
    const w = numberWords(String(n));
    if (!w) return '';
    if (w === 'یک') return 'یکم';
    if (/سه$/.test(w)) return w.replace(/سه$/, 'سوم');
    if (/سی$/.test(w)) return w + '‌ام';
    return w + 'م';
  }
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function jalaliParts(v) {
    const d = digits(v);
    if (d.length !== 8) return null;
    const y = Number(d.slice(0, 4)), m = Number(d.slice(4, 6)), day = Number(d.slice(6, 8));
    if (m < 1 || m > 12 || day < 1 || day > 31) return null;
    return { y, m, d: day, raw: d };
  }
  function dateWords(p) {
    return `${ordinalWords(p.d)} ${MONTHS[p.m - 1]}‌ماه ${numberWords(String(p.y))}`;
  }

  // Guilloche and signature strokes come from js/print.js, shared with the
  // login page's cheque.
  const Print = window.ChekinoPrint;
  function drawGuilloche() {
    if (Print) Print.guilloche($('cqcGuilloche'));
  }

  let signedFor = null;
  let signPending = null;
  let signTimer = 0;
  function updateSignature(owner) {
    // Nothing new, or this exact name is already waiting to be signed —
    // the 300ms re-read must not keep pushing the pen back.
    if (owner === signedFor || owner === signPending) return;
    clearTimeout(signTimer);
    signPending = owner;
    // Wait until typing settles, so the pen doesn't restart per keystroke.
    signTimer = setTimeout(() => {
      signPending = null;
      signedFor = owner;
      const p = $('cqcSignPath');
      if (!p) return;
      if (!owner) { p.setAttribute('d', ''); return; }
      if (!Print) return;
      p.setAttribute('d', Print.signaturePath(owner));
      Print.drawIn(p);
    }, owner && signedFor !== null ? 450 : 0);
  }

  // ---- small DOM helpers ---------------------------------------------------
  // setFill writes a value into a blank on the cheque and plays the "ink"
  // entrance only when the text actually changes.
  function setFill(id, value, placeholder) {
    const el = $(id);
    if (!el) return;
    const v = value || placeholder || '';
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.toggle('is-empty', !value);
    if (value) {
      el.classList.remove('ink-in');
      void el.offsetWidth;
      el.classList.add('ink-in');
    }
  }
  function channelNames() {
    const chips = $('channelChips');
    return chips ? [...chips.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
  }

  // ---- required fields per step -------------------------------------------
  const isErr = (id) => { const f = $(id); return !!(f && f.classList.contains('error')); };
  const CHECKS = [
    [1, 'serialField', () => digits(val('serialInput')).length === 6],
    [1, 'sayadField', () => digits(val('sayadInput')).length === 16],
    [1, 'amountField', () => Number(digits(val('amountInput'))) > 0],
    [1, 'dueDateField', () => !!jalaliParts(val('dueDateInput'))],
    [2, 'ownerField', () => val('ownerInput').length > 0],
    [2, 'partyField', () => val('partyInput').length > 0],
    [2, 'benefField', () => val('benefInput').length > 0],
    [2, 'nidField', () => [10, 11].includes(digits(val('nidInput')).length)],
    [3, 'sendDateField', () => !!jalaliParts(val('sendDateInput'))],
    [3, 'channelField', () => channelNames().length > 0],
  ];
  const isOk = ([, f, test]) => test() && !isErr(f);

  function statusStamp() {
    const b = $('veStatusBanner');
    if (!b || !b.classList.contains('show')) return null;
    if (b.classList.contains('st-done')) return { cls: 'done', label: 'ثبت شد' };
    if (b.classList.contains('st-problem')) return { cls: 'problem', label: 'ثبت نشد' };
    if (b.classList.contains('st-pending')) return { cls: 'pending', label: 'منتظر ثبت' };
    return null;
  }

  // ---- render ---------------------------------------------------------------
  let last = '';
  function render() {
    const serial = digits(val('serialInput'));
    const sayad = digits(val('sayadInput'));
    const amount = digits(val('amountInput')).replace(/^0+/, '');
    const due = jalaliParts(val('dueDateInput'));
    const owner = val('ownerInput');
    const benef = val('benefInput');
    const nid = digits(val('nidInput'));
    const snapshot = [
      serial, sayad, amount, due && due.raw, owner, val('partyInput'), benef, nid,
      val('sendDateInput'), channelNames().join(','), ($('veStatusBanner') || {}).className,
      CHECKS.map(([, f]) => (isErr(f) ? 1 : 0)).join(''),
    ].join('|');
    if (snapshot === last) return;
    last = snapshot;

    // Head: sayad id in four printed groups, serial beside it
    const sayadEl = $('cqcSayad');
    if (sayadEl) {
      const padded = sayad.padEnd(16, '•');
      sayadEl.innerHTML = [0, 4, 8, 12].map((i) => `<span>${toFa(padded.slice(i, i + 4))}</span>`).join('');
      sayadEl.classList.toggle('is-empty', !sayad);
    }
    setFill('cqcSerial', serial && toFa(serial), '——————');

    // Date: boxed digits plus the date in words, as a cheque is written
    const dueEl = $('cqcDue');
    if (dueEl) {
      const parts = due
        ? [toFa(String(due.y)), toFa(String(due.m).padStart(2, '0')), toFa(String(due.d).padStart(2, '0'))]
        : ['––––', '––', '––'];
      const html = parts.map((p) => `<i>${p}</i>`).join('');
      if (dueEl.innerHTML !== html) dueEl.innerHTML = html;
      dueEl.classList.toggle('is-empty', !due);
    }
    setFill('cqcDueWords', due && dateWords(due), '');

    // Body sentence
    setFill('cqcWords', amount && numberWords(amount), '');
    setFill('cqcBenef', benef, '');
    setFill('cqcNid', nid && toFa(nid), '');
    setFill('cqcOwner', owner, '');
    setFill('cqcAmount', amount && `${toFa(group(amount))}`, '—');
    const amountBox = cheque.querySelector('.cqc-amount-box');
    if (amountBox) amountBox.classList.toggle('is-filled', !!amount);
    updateSignature(owner);

    // Stub
    setFill('cqcStubSerial', serial && toFa(serial), '—');
    setFill('cqcStubDue', due && toFa(`${due.y}/${String(due.m).padStart(2, '0')}/${String(due.d).padStart(2, '0')}`), '—');
    setFill('cqcStubAmount', amount && toFa(group(amount)), '—');
    setFill('cqcStubBenef', benef, '—');

    // MICR line: serial, sayad id, amount — Latin digits, as it's printed
    const micr = $('cqcMicr');
    if (micr) {
      const text = `⑆${(serial || '000000').padEnd(6, '0')}⑆  ${(sayad || '').padEnd(16, '0')}⑈  ${(amount || '0').padStart(12, '0')}⑇`;
      if (micr.textContent !== text) micr.textContent = text;
    }

    // Stamp (view mode only)
    const stamp = statusStamp();
    const stampEl = $('cqcStamp');
    if (stampEl) stampEl.textContent = stamp ? stamp.label : '';
    cheque.dataset.status = stamp ? stamp.cls : '';

    // Side facts
    setFill('cqfParty', val('partyInput'), '—');
    const send = jalaliParts(val('sendDateInput'));
    setFill('cqfSend', send && toFa(val('sendDateInput')), '—');
    setFill('cqfChannels', channelNames().join('، '), '—');

    // Progress + step badges
    const done = CHECKS.filter(isOk).length;
    const pct = Math.round((done / CHECKS.length) * 100);
    setFill('cqProgressText', `${toFa(done)} از ${toFa(CHECKS.length)}`, '');
    const fill = $('cqProgressFill');
    if (fill) fill.style.inlineSize = pct + '%';
    const bar = fill && fill.parentElement;
    if (bar) bar.classList.toggle('is-full', pct === 100);
    [1, 2, 3].forEach((n) => {
      const step = $('cqStep' + n);
      if (!step) return;
      const need = CHECKS.filter(([s]) => s === n);
      step.classList.toggle('is-done', need.every(isOk));
      step.classList.toggle('has-error', need.some(([, f]) => isErr(f)));
    });
  }

  // ---- "where does this go on the cheque?" ----------------------------------
  // Focusing a field lights up the blank it fills on the cheque.
  const FOCUS_MAP = {
    serialInput: ['.cqc-serial', '#cqcStubSerial'],
    sayadInput: ['.cqc-sayad'],
    amountInput: ['.cqc-amount-box', '#cqcWords'],
    dueDateInput: ['.cqc-datebox', '#cqcDueWords'],
    ownerInput: ['.cqc-owner', '.cqc-sign'],
    benefInput: ['#cqcBenef', '#cqcStubBenef'],
    nidInput: ['#cqcNid'],
  };
  body.addEventListener('focusin', (e) => {
    cheque.querySelectorAll('.is-focus').forEach((el) => el.classList.remove('is-focus'));
    const sel = FOCUS_MAP[e.target.id];
    if (sel) sel.forEach((s) => cheque.querySelectorAll(s).forEach((el) => el.classList.add('is-focus')));
  });
  body.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!body.contains(document.activeElement) || !FOCUS_MAP[document.activeElement.id]) {
        cheque.querySelectorAll('.is-focus').forEach((el) => el.classList.remove('is-focus'));
      }
    }, 0);
  });

  // ---- wiring ---------------------------------------------------------------
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
      drawGuilloche();
      last = '';
      signedFor = null;
      signPending = null;
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
