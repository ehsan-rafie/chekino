// View face of the cheque modal: the drawn Sayad cheque, carrying
// everything Chekino knows about the cheque (css/cheque.css has the map).
//
// Read-only on purpose: it never writes to a form field or touches the
// modal's own state, it only mirrors what dashboard.js already put in the
// form. That keeps it safe to load after dashboard.js without either file
// depending on the other's internals; it calls three of its helpers when
// they're there — daysUntilDue for how far off the due date is,
// openLightbox for the photo, showToast after a copy.
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
  const pad = (n) => String(n).padStart(2, '0');
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
  const dateWords = (p) => `${ordinalWords(p.d)} ${MONTHS[p.m - 1]}‌ماه ${numberWords(String(p.y))}`;
  const faDate = (p) => toFa(`${p.y}/${pad(p.m)}/${pad(p.d)}`);

  // How far off the due date is; amber when close and red when past, but
  // only while the cheque still waits to be registered (as on the cards)
  function dueDistance(due, status) {
    if (!due || typeof daysUntilDue !== 'function') return null;
    const d = daysUntilDue(`${due.y}/${pad(due.m)}/${pad(due.d)}`);
    if (d === null) return null;
    const text = d === 0 ? 'امروز' : d === 1 ? 'فردا' : d === -1 ? 'دیروز'
      : d > 0 ? `${toFa(d)} روز دیگر` : `${toFa(-d)} روز گذشته`;
    const soon = typeof DUE_SOON_DAYS === 'number' ? DUE_SOON_DAYS : 3;
    const cls = status !== 'pending' ? '' : d < 0 ? 'is-over' : d <= soon ? 'is-soon' : '';
    return { text, cls };
  }

  // ---- security print (js/print.js) ---------------------------------------
  function drawPrint() {
    const Print = window.ChekinoPrint;
    if (!Print) return;
    Print.guilloche($('cqcGuilloche'));
    Print.star($('cqcStar'));
  }

  // ---- small DOM helpers ---------------------------------------------------
  // setFill writes a value into its place on the cheque and plays the "ink"
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
  // The chosen tags by name: the messengers, then the user's own entries
  function channelNames() {
    const g = $('channelGroup');
    return g ? [...g.querySelectorAll('.ch-tag[aria-pressed="true"] .ch-name')].map((c) => c.textContent.trim()).filter(Boolean) : [];
  }
  // The status, as dashboard.js set it on the status block above the cheque
  function statusOf() {
    const b = $('veStatusBanner');
    if (!b || !b.classList.contains('show')) return '';
    if (b.classList.contains('st-done')) return 'done';
    if (b.classList.contains('st-problem')) return 'problem';
    if (b.classList.contains('st-pending')) return 'pending';
    return '';
  }
  const STAMP = { done: 'ثبت شد', problem: 'ثبت نشد', pending: 'منتظر ثبت' };

  // ---- the photo, where the leaf has its QR ------------------------------
  // (dashboard.js keeps the attachments in the global `attachedFiles`)
  function files() {
    try { return Array.isArray(attachedFiles) ? attachedFiles : []; } catch (e) { return []; }
  }
  const isImage = (f) => (f.type || '').startsWith('image/');
  const photoBtn = $('cqcPhoto');
  let photoKey = null;
  function renderPhoto() {
    const list = files();
    const key = list.map((f) => f.name + ':' + (f.dataUrl || '').length).join('|');
    if (key === photoKey) return;
    photoKey = key;
    const i = list.findIndex(isImage);
    const at = i >= 0 ? i : 0;
    const first = list[at];
    photoBtn.hidden = !first;
    if (!first) return;
    const box = $('cqcPhotoImg');
    box.textContent = '';
    // a server photo is on its way until its object URL arrives
    box.classList.toggle('is-loading', isImage(first) && !first.dataUrl);
    if (isImage(first) && first.dataUrl) {
      const img = document.createElement('img');
      img.src = first.dataUrl;
      img.alt = '';
      box.appendChild(img);
    } else if (!isImage(first)) {
      box.textContent = 'PDF';
    }
    photoBtn.classList.toggle('is-doc', !isImage(first) && !first.id);
    photoBtn.dataset.index = String(at);
    const n = list.length;
    $('cqcPhotoLabel').textContent = n > 1 ? `${toFa(n)} عکس` : 'عکس چک';
    photoBtn.setAttribute('aria-label', n > 1 ? `دیدن عکس‌های چک، ${toFa(n)} عکس` : 'دیدن عکس چک');
  }
  photoBtn.addEventListener('click', () => {
    const i = Number(photoBtn.dataset.index);
    const f = files()[i];
    if (!f) return;
    if (!isImage(f)) {
      if (f.id && typeof openAttachment === 'function') openAttachment(f);   // a PDF: a new tab
      return;
    }
    if (!f.dataUrl || typeof openLightbox !== 'function') return;   // still on its way
    openLightbox(f.dataUrl, f.name, i);
  });

  // ---- copy the sayad id ----------------------------------------------------
  const copyBtn = $('cqcCopySayad');
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

  // ---- render ---------------------------------------------------------------
  let last = '';
  function render() {
    // Only the view shows the cheque; the form's own fields are its source
    if (!body.classList.contains('ve-locked')) { last = ''; return; }
    const serial = digits(val('serialInput'));
    const sayad = digits(val('sayadInput'));
    const amount = digits(val('amountInput')).replace(/^0+/, '');
    const due = jalaliParts(val('dueDateInput'));
    const owner = val('ownerInput');
    const party = val('partyInput');
    const benef = val('benefInput');
    const nid = digits(val('nidInput'));
    const send = jalaliParts(val('sendDateInput'));
    const spend = jalaliParts(val('spendDateInput'));
    const channels = channelNames().join('، ');
    const notes = val('notesInput');
    const status = statusOf();
    renderPhoto();
    const snapshot = [
      serial, sayad, amount, due && due.raw, owner, party, benef, nid,
      send && send.raw, spend && spend.raw, channels, notes, status,
      new Date().toDateString(),   // «۳ روز دیگر» moves on at midnight
    ].join('|');
    if (snapshot === last) return;
    last = snapshot;

    // Top: the due date boxed, in words, and how far off it is
    const dueEl = $('cqcDue');
    const boxes = (due ? [toFa(due.y), toFa(pad(due.m)), toFa(pad(due.d))] : ['––––', '––', '––'])
      .map((p) => `<i>${p}</i>`).join('');
    if (dueEl.innerHTML !== boxes) dueEl.innerHTML = boxes;
    setFill('cqcDueWords', due && dateWords(due), '—');
    const dist = dueDistance(due, status);
    const distEl = $('cqcDueRel');
    distEl.hidden = !dist;
    if (dist) {
      distEl.textContent = dist.text;
      distEl.className = 'cqc-due-rel' + (dist.cls ? ' ' + dist.cls : '');
    }

    // The numbers, and the band that repeats the serial like a leaf's series
    setFill('cqcSerial', serial && toFa(serial), '—');
    setFill('cqcSayad', sayad && toFa(sayad.replace(/(\d{4})(?=\d)/g, '$1 ')), '—');
    copyBtn.hidden = !sayad;
    $('cqcBand').textContent = (serial ? serial + '-' : '') + 'CHEKINO';

    // The payment sentence
    setFill('cqcWords', amount && numberWords(amount), '—');
    setFill('cqcBenef', benef, '—');
    $('cqcNidLabel').textContent = nid.length === 11 ? 'به شناسه ملی' : 'به کد ملی';
    setFill('cqcNid', nid && toFa(nid), '—');
    setFill('cqcAmount', amount && toFa(group(amount)), '');

    // The stamp
    $('cqcStamp').textContent = STAMP[status] || '';
    cheque.dataset.status = status;

    // The people, and when the cheque went where
    setFill('cqcOwner', owner, '—');
    setFill('cqcSend', send && faDate(send), '—');
    setFill('cqcChannels', channels, '—');
    setFill('cqcParty', party, '—');
    setFill('cqcSpend', spend && faDate(spend), '—');
    setFill('cqcNotes', notes, '');
    $('cqcNotesRow').hidden = !notes;
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
      drawPrint();
      last = '';
      photoKey = null;
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
