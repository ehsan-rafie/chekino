// View face of the cheque modal (2026-10-12): the cheque at a glance —
// amount, due date, serial, sayad id, photo — and its way so far, step by
// step: who it came from, who it went to, whose name it is registered to,
// when it was sent to its owner (css/cheque-form.css, «View»). The last
// step, Sayad's answer, is dashboard.js's (fillVeStatus).
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
  const view = $('cqView');
  if (!overlay || !body || !view) return;

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
  // A status set while the window is open: its mark settles in (not when a
  // window opens: it is there already)
  let statusSeen = false;
  // (the mark, not its step: dashboard.js rewrites the step's classes on
  // every refresh, the server's answer included)
  const mark = $('veStIcon');
  function landStatus() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    mark.classList.remove('is-landing');
    void mark.offsetWidth;   // a second change in a row starts it over
    mark.classList.add('is-landing');
  }
  mark.addEventListener('animationend', () => mark.classList.remove('is-landing'));

  const MESSAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12Z"/></svg>';
  // The chosen ways it went to its owner: each messenger's logo and name
  function channelsInto(el) {
    const g = $('channelGroup');
    const tags = g ? [...g.querySelectorAll('.ch-tag[aria-pressed="true"]')] : [];
    const key = tags.map((x) => x.textContent.trim()).join('|');
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.textContent = '';
    for (const tag of tags) {
      const name = (tag.querySelector('.ch-name') || {}).textContent || '';
      if (!name.trim()) continue;
      const s = document.createElement('span');
      s.className = 'cv-ch';
      // the messengers' own logos (from the page); one written in, a plain message
      const logo = tag.querySelector('.ch-logo');
      s.innerHTML = logo ? logo.innerHTML : MESSAGE_ICON;
      s.appendChild(document.createTextNode(name.trim()));
      el.appendChild(s);
    }
  }

  // ---- copying the sayad id and the national id ------------------------------
  function copyButton(btn, read, what) {
    btn.addEventListener('click', () => {
      const text = read();
      if (!text) return;
      const done = () => {
        btn.classList.add('is-done');
        setTimeout(() => btn.classList.remove('is-done'), 1400);
        if (typeof showToast === 'function') showToast(`${what} کپی شد`);
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
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(legacy);
      else legacy();
    });
  }
  const copyBtn = $('cqcCopySayad');
  const copyNid = $('cqcCopyNid');
  copyButton(copyBtn, () => digits(val('sayadInput')), 'شناسه صیادی');
  copyButton(copyNid, () => digits(val('nidInput')), 'کد ملی');

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
    const channels = channelNames().join('، ');   // (in the snapshot: a change redraws)
    const notes = val('notesInput');
    const status = statusOf();
    const snapshot = [
      serial, sayad, amount, due && due.raw, owner, party, benef, nid,
      send && send.raw, spend && spend.raw, channels, notes, status,
      new Date().toDateString(),   // «۳ روز دیگر» moves on at midnight
    ].join('|');
    if (snapshot === last) return;
    last = snapshot;

    // At a glance: the amount (and in words), the due date and how far off
    // it is, the serial, the sayad id
    setFill('cqcAmount', amount && toFa(group(amount)), '—');
    $('cqcAmount').title = amount ? `${numberWords(amount)} ریال` : '';   // in words, on hover
    setFill('cqcDue', due && faDate(due), '—');
    const dist = dueDistance(due, status);
    const distEl = $('cqcDueRel');
    distEl.hidden = !dist;
    if (dist) {
      distEl.textContent = dist.text;
      distEl.className = 'cv-rel' + (dist.cls ? ' ' + dist.cls : '');
    }
    setFill('cqcSerial', serial && toFa(serial), '—');
    setFill('cqcSayad', sayad && toFa(sayad.replace(/(\d{4})(?=\d)/g, '$1 ')), '—');
    copyBtn.hidden = !sayad;

    // Its way: from whom, to whom, whose name, sent when and how
    setFill('cqcOwner', owner, '—');
    setFill('cqcParty', party, '—');
    setFill('cqcSpend', spend && faDate(spend), '');
    setFill('cqcBenef', benef, '—');
    $('cqcNidLabel').textContent = nid.length === 11 ? 'شناسه ملی' : 'کد ملی';
    setFill('cqcNid', nid && toFa(nid), '');
    copyNid.hidden = !nid;
    $('cqcNid').parentElement.hidden = !nid;
    setFill('cqcSend', send && faDate(send), '');
    const ch = $('cqcChannels');
    if (send) channelsInto(ch);
    else { ch.dataset.key = ''; ch.textContent = 'هنوز فرستاده نشده'; }
    ch.classList.toggle('is-empty', !send);
    setFill('cqcNotes', notes, '');
    $('cqcNotesRow').hidden = !notes;

    // A status set while the window is open: its mark settles in
    if (statusSeen && was && status && was !== status) landStatus();
    was = status;
    statusSeen = true;
  }
  let was = '';

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
      last = '';
      statusSeen = false;
      was = '';
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
