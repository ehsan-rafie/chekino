// View face of the cheque modal: the drawn Sayad cheque plus the facts it
// doesn't carry, and the fold of the form's optional details.
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

  // ---- fields whose error state the view reacts to ---------------------------
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

  function statusStamp() {
    const b = $('veStatusBanner');
    if (!b || !b.classList.contains('show')) return null;
    if (b.classList.contains('st-done')) return { cls: 'done', label: 'ثبت شد' };
    if (b.classList.contains('st-problem')) return { cls: 'problem', label: 'ثبت نشد' };
    if (b.classList.contains('st-pending')) return { cls: 'pending', label: 'منتظر ثبت' };
    return null;
  }

  // ---- attachments (dashboard.js keeps them in the global `attachedFiles`) --
  function files() {
    try { return Array.isArray(attachedFiles) ? attachedFiles : []; } catch (e) { return []; }
  }
  let thumbsKey = '';
  function renderThumbs() {
    const box = $('cqfFiles');
    const row = $('cqfFilesRow');
    if (!box || !row) return;
    const list = files();
    const key = list.map((f) => f.name + ':' + (f.dataUrl || '').length).join('|');
    row.hidden = !list.length;
    if (key === thumbsKey) return;
    thumbsKey = key;
    box.innerHTML = '';
    list.forEach((f) => {
      const isImage = (f.type || '').startsWith('image/');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cq-thumb';
      b.title = f.name || '';
      if (isImage) {
        const img = document.createElement('img');
        img.src = f.dataUrl;
        img.alt = f.name || 'عکس چک';
        b.appendChild(img);
        b.addEventListener('click', () => {
          if (typeof openLightbox === 'function') openLightbox(f.dataUrl, f.name);
        });
      } else {
        b.textContent = f.name || 'فایل';
        b.classList.add('is-doc');
      }
      box.appendChild(b);
    });
  }

  // ---- copy the sayad id (view mode) -------------------------------------------
  const copyBtn = $('cqfCopySayad');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = digits(val('sayadInput'));
      if (!text) return;
      const done = () => {
        copyBtn.textContent = 'کپی شد';
        setTimeout(() => { copyBtn.textContent = 'کپی'; }, 1400);
        if (typeof showToast === 'function') showToast('شناسه صیادی کپی شد');
      };
      const legacy = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(legacy);
      } else {
        legacy();
      }
    });
  }

  // ---- render ---------------------------------------------------------------
  let last = '';
  function render() {
    const locked = body.classList.contains('ve-locked');
    const serial = digits(val('serialInput'));
    const sayad = digits(val('sayadInput'));
    const amount = digits(val('amountInput')).replace(/^0+/, '');
    const due = jalaliParts(val('dueDateInput'));
    const owner = val('ownerInput');
    const benef = val('benefInput');
    const nid = digits(val('nidInput'));
    const snapshot = [
      locked, serial, sayad, amount, due && due.raw, owner, val('partyInput'), benef, nid,
      val('sendDateInput'), val('spendDateInput'), val('notesInput'), files().length,
      channelNames().join(','), ($('veStatusBanner') || {}).className,
      CHECKS.map(([, f]) => (isErr(f) ? 1 : 0)).join(''),
      isErr('spendDateField') || isErr('fileField'),
    ].join('|');
    if (snapshot === last) return;
    last = snapshot;

    // The cheque is the view — readable by assistive tech only when shown.
    cheque.setAttribute('aria-hidden', locked ? 'false' : 'true');

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
    if (locked) updateSignature(owner);

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

    // Stamp for the status
    const stamp = statusStamp();
    const stampEl = $('cqcStamp');
    if (stampEl) stampEl.textContent = stamp ? stamp.label : '';
    cheque.dataset.status = stamp ? stamp.cls : '';

    // Key values repeated in readable type (shown only on narrow screens)
    setFill('cqfAmount', amount && `${toFa(group(amount))} ریال`, '—');
    setFill('cqfDue', due && toFa(`${due.y}/${String(due.m).padStart(2, '0')}/${String(due.d).padStart(2, '0')}`), '—');
    setFill('cqfBenef', benef && (nid ? `${benef} (${toFa(nid)})` : benef), '—');
    setFill('cqfOwner', owner, '—');
    setFill('cqfSerial', serial && toFa(serial), '—');
    setFill('cqfParty', val('partyInput'), '—');
    const send = jalaliParts(val('sendDateInput'));
    setFill('cqfSend', send && toFa(val('sendDateInput')), '—');
    setFill('cqfChannels', channelNames().join('، '), '—');
    const spend = jalaliParts(val('spendDateInput'));
    setFill('cqfSpend', spend && toFa(val('spendDateInput')), '—');
    setFill('cqfSayad', sayad && toFa(sayad.replace(/(\d{4})(?=\d)/g, '$1 ')), '—');
    const notes = val('notesInput');
    setFill('cqfNotes', notes, '');
    const notesRow = $('cqfNotesRow');
    if (notesRow) notesRow.hidden = !notes;
    renderThumbs();

  }

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
      thumbsKey = '';
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
