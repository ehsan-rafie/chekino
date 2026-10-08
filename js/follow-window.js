// The follow-up window (spec 10): cheques sent for registration that have
// waited three days or more since they were sent — or since they were last
// followed up — by owner, the longest wait first. For each owner, «کپی متن»
// copies a reminder to paste into their chat, and «پیگیری شد» writes it to
// those cheques' history (POST /checks/follow-up), so their days count from
// today and they leave the list. «نمایش در بُرد» narrows the board to them.
//
// Opened from the board's «پیگیری» chip and from the command palette.
(function () {
  const overlay = document.getElementById('followOverlay');
  if (!overlay) return;
  const $ = (id) => document.getElementById(id);
  const fa = (n) => toFa(String(n));
  const money = (raw) => toFa(groupDigits(String(raw || '0'))).replace(/,/g, '٬');
  const nidOf = (v) => toEnDigits(v || '').replace(/[^0-9]/g, '');
  const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const bodyEl = $('followBody');

  // fw = { ids: the cheques it opened on, done: owner keys followed up, copied: owner keys }
  let fw = null;

  function sections() {
    const recs = fw.ids.map((id) => loadCheques().find((c) => c.id === id)).filter(Boolean);
    const map = new Map();
    for (const c of recs) {
      const key = String(c.ownerId || 'none');
      if (!map.has(key)) map.set(key, { key, owner: c.owner || 'بدون صاحب چک', recs: [] });
      map.get(key).recs.push(c);
    }
    const list = [...map.values()];
    for (const s of list) {
      s.recs.sort((a, b) => chequeWaitDays(b) - chequeWaitDays(a) || (a.dueDate || '').localeCompare(b.dueDate || ''));
      s.wait = chequeWaitDays(s.recs[0]);
    }
    const coll = new Intl.Collator('fa');
    return list.sort((a, b) => b.wait - a.wait || coll.compare(a.owner, b.owner));
  }

  // The reminder, in the send window's voice: the beneficiary once when
  // every cheque has the same one, on each line otherwise
  function messageFor(s) {
    const benefs = new Set(s.recs.map((c) => `${c.benef}|${nidOf(c.nid)}`));
    const idText = (c) => { const d = nidOf(c.nid); return d ? ` با ${d.length === 11 ? 'شناسه ملی' : 'کد ملی'} ${toFa(d)}` : ''; };
    const one = benefs.size === 1 ? s.recs[0] : null;
    const lines = s.recs.map((c) => `• سریال ${toFa(c.serial)} — ${money(c.amount)} ریال — سررسید ${faDate(c.dueDate)}${one ? '' : ` — به نام «${c.benef}»${idText(c)}`}`);
    const head = one
      ? `یادآوری: چک‌های زیر هنوز در سامانه صیاد به نام «${one.benef}»${idText(one)} ثبت نشده‌اند:`
      : 'یادآوری: چک‌های زیر هنوز در سامانه صیاد ثبت نشده‌اند:';
    return `سلام، وقت بخیر\n${head}\n${lines.join('\n')}\nلطفاً ثبت کنید و رسیدش را بفرستید. ممنون`;
  }

  function render() {
    const list = sections();
    const left = list.filter((s) => !fw.done.has(s.key));
    $('followCount').textContent = list.length
      ? `${fa(left.reduce((n, s) => n + s.recs.length, 0))} چک، ${fa(left.length)} صاحب چک مانده`
      : '';
    bodyEl.innerHTML = '';
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'send-empty';
      p.textContent = 'کسی برای پیگیری نمانده';
      bodyEl.appendChild(p);
      return;
    }
    for (const s of list) bodyEl.appendChild(sectionEl(s));
  }

  function sectionEl(s) {
    const done = fw.done.has(s.key);
    const el = document.createElement('section');
    el.className = 'send-sec follow-sec' + (done ? ' is-followed' : '');
    const head = document.createElement('div');
    head.className = 'send-sec-head';
    const title = document.createElement('div');
    title.className = 'send-sec-title';
    const name = document.createElement('b'); name.textContent = s.owner;
    const meta = document.createElement('span'); meta.className = 'send-sec-meta';
    meta.textContent = done ? 'پیگیری شد' : `${fa(s.recs.length)} چک، قدیمی‌ترین ${fa(s.wait)} روز`;
    title.append(name, meta);
    head.appendChild(title);
    if (!done) {
      const txt = document.createElement('button');
      txt.type = 'button';
      txt.className = 'send-btn' + (fw.copied.has(s.key) ? ' is-done' : '');
      txt.innerHTML = (fw.copied.has(s.key) ? CHECK_SVG : COPY_SVG) + '<span>کپی متن</span>';
      txt.addEventListener('click', () => copyText(messageFor(s))
        .then(() => { fw.copied.add(s.key); showToast(`یادآوری ${s.owner} کپی شد`); render(); focusSection(s.key, '.follow-done'); })
        .catch(() => showToast('کپی نشد؛ دوباره بزن')));
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'send-btn follow-done';
      mark.innerHTML = CHECK_SVG + '<span>پیگیری شد</span>';
      mark.addEventListener('click', () => markFollowed(s, mark));
      head.append(txt, mark);
    }
    el.dataset.key = s.key;
    el.appendChild(head);
    if (!done) {
      const cards = document.createElement('div');
      cards.className = 'send-cards';
      for (const c of s.recs) {
        const card = document.createElement('div');
        card.className = 'send-card no-thumb';
        const info = document.createElement('div');
        info.className = 'send-info';
        const serial = document.createElement('b'); serial.textContent = toFa(c.serial);
        const amt = document.createElement('span'); amt.textContent = `${money(c.amount)} ریال`;
        const due = document.createElement('span'); due.className = 'send-due'; due.textContent = `سررسید ${faDate(c.dueDate)}`;
        const wait = document.createElement('span'); wait.className = 'follow-wait'; wait.textContent = waitText(c);
        info.append(serial, amt, due, wait);
        card.appendChild(info);
        cards.appendChild(card);
      }
      el.appendChild(cards);
    }
    return el;
  }
  function waitText(c) {
    const f = lastFollowUp(c);
    const d = chequeWaitDays(c);
    return f ? `${fa(d)} روز از پیگیری` : `${fa(d)} روز از ارسال`;
  }
  function focusSection(key, sel) {
    const b = bodyEl.querySelector(`.follow-sec[data-key="${key}"] ${sel}`);
    if (b) b.focus({ preventScroll: true });
  }

  async function markFollowed(s, btn) {
    btn.disabled = true;
    try {
      const r = await apiJson('/checks/follow-up', { method: 'POST', body: JSON.stringify({ ids: s.recs.map((c) => c.id) }) });
      (r.updated || []).forEach(putCheque);
      fw.done.add(s.key);
      renderTable();
      render();
      showToast(`پیگیری ${s.owner} ثبت شد`);
      const next = bodyEl.querySelector('.follow-sec:not(.is-followed) .send-btn');
      (next || $('followClose')).focus({ preventScroll: true });
    } catch (e) {
      btn.disabled = false;
      showToast(requestErrorText(e, 'ثبت نشد'));
    }
  }

  function open() {
    fw = { ids: sentCheques().filter(needsFollowUp).map((c) => c.id), done: new Set(), copied: new Set() };
    render();
    pushBackGuard();
    overlay.classList.add('show');
    document.body.classList.add('bulk-open');
    setTimeout(() => { const first = overlay.querySelector('.follow-sec .send-btn') || $('followClose'); first.focus(); }, 60);
  }
  function close() {
    fw = null;
    overlay.classList.remove('show');
    if (!(window.ChekinoBulk && window.ChekinoBulk.isOpen()) && !(window.ChekinoSend && window.ChekinoSend.isOpen())) document.body.classList.remove('bulk-open');
  }
  $('followClose').addEventListener('click', close);
  $('followLater').addEventListener('click', close);
  $('followBoard').addEventListener('click', () => { close(); setBoardFocus('followup'); });

  window.ChekinoFollow = {
    isOpen: () => overlay.classList.contains('show'),
    open, close,
    escape: close,
  };
  if (window.ChekinoPalette) {
    window.ChekinoPalette.register([{
      title: 'پیگیری چک‌های منتظر ثبت', group: 'چک‌ها', order: 3,
      keywords: 'follow up reminder یادآوری پیگیری صاحب چک',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
      run: open,
    }]);
  }
})();
