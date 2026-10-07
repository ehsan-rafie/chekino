// The send window (spec F6, 5.4): cheques ready to go to their owners, by
// owner. For each owner, «کپی متن» copies the message asking them to
// register the cheques in Sayad, and each cheque's «کپی عکس» puts its photo
// on the clipboard to paste into their chat («کپی شد ✓», kept on the server).
// At the end, the channel and «ارسال کردم»: the cheques go onto the board,
// sent today. Closed without it, the window asks what was sent.
//
// A cheque whose owner is still unknown sits at the top («بدون صاحب چک»)
// with a field to name them; named, it joins its owner's section (ready on
// the server).
//
// Opened from the board's «آماده‌ی ارسال» chip (every ready cheque), or by
// a bulk add saved with a beneficiary (those cheques), or from a ready
// cheque's own window («ارسال برای صاحب چک»).
(function () {
  const overlay = document.getElementById('sendOverlay');
  if (!overlay) return;
  const $ = (id) => document.getElementById(id);
  const fa = (n) => toFa(String(n));
  const enabled = () => !!(window.ChekinoBulk && window.ChekinoBulk.enabled());
  const nidOf = (v) => toEnDigits(v || '').replace(/[^0-9]/g, '');
  const isImage = (f) => f && /^image\//.test(f.type || '');
  const money = (raw) => toFa(groupDigits(String(raw || '0')));

  // sw = { ids:Set, copied:Set, textCopied:Set(section keys), choosing, chosen:Set(section keys) }
  let sw = null;
  const bodyEl = $('sendBody');
  const LAST_CHANNEL_KEY = () => `chekino_last_channel_${PAGE_COMPANY}`;

  // ---------------------------------------------------------------
  // The cheques, grouped: owner (and beneficiary, when they differ)
  // ---------------------------------------------------------------
  const recOf = (id) => loadCheques().find((c) => c.id === id);
  function groups() {
    const recs = [...sw.ids].map(recOf).filter(Boolean).filter((c) => c.stage === 'ready' || (c.stage === 'waiting' && c.benefId && !c.ownerId));
    const noOwner = recs.filter((c) => !c.ownerId);
    const ready = recs.filter((c) => c.ownerId && c.stage === 'ready');
    const benefs = new Set(ready.concat(noOwner).map((c) => c.benefId));
    const mixed = benefs.size > 1;
    const map = new Map();
    for (const c of ready) {
      const key = mixed ? `${c.ownerId}:${c.benefId}` : String(c.ownerId);
      if (!map.has(key)) map.set(key, { key, owner: c.owner, benef: { name: c.benef, nid: c.nid }, recs: [] });
      map.get(key).recs.push(c);
    }
    const coll = new Intl.Collator('fa');
    const sections = [...map.values()].sort((a, b) => coll.compare(a.owner || '', b.owner || '') || coll.compare(a.benef.name || '', b.benef.name || ''));
    for (const s of sections) s.recs.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || (a.serial || '').localeCompare(b.serial || ''));
    const one = !mixed && (ready[0] || noOwner[0]);
    return { sections, noOwner, mixed, benef: one ? { name: one.benef, nid: one.nid } : null, all: ready };
  }
  const isCopied = (c) => sw.copied.has(c.id) || !!c.copiedAt;

  // ---------------------------------------------------------------
  // Drawing it
  // ---------------------------------------------------------------
  const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
  let acs = [];   // the owner fields of «بدون صاحب چک»

  function render() {
    acs.forEach((a) => { a.ac.close(); a.list.remove(); });
    acs = [];
    const g = groups();
    // the beneficiary, once, at the top — each part copies on its own
    const head = $('sendBenef');
    head.innerHTML = '';
    if (g.benef && g.benef.name) {
      head.appendChild(copyChip('ذینفع', g.benef.name, g.benef.name));
      const d = nidOf(g.benef.nid);
      if (d) head.appendChild(copyChip(d.length === 11 ? 'شناسه ملی' : 'کد ملی', d, d, true));
    }
    bodyEl.innerHTML = '';
    if (sw.choosing) {
      const ask = document.createElement('p');
      ask.className = 'send-choose-note';
      ask.textContent = 'برای کدام صاحب چک‌ها فرستادی؟ تیک بزن و «ثبت ارسالِ این‌ها» را بزن.';
      bodyEl.appendChild(ask);
    }
    if (g.noOwner.length && !sw.choosing) bodyEl.appendChild(noOwnerSection(g.noOwner));
    for (const s of g.sections) bodyEl.appendChild(sectionEl(s, g.mixed));
    if (!g.sections.length && !g.noOwner.length) {
      const empty = document.createElement('p');
      empty.className = 'send-empty';
      empty.textContent = 'چکی برای ارسال نمانده';
      bodyEl.appendChild(empty);
    }
    // «۵ از ۸ کپی شد»
    const total = g.all.length;
    const done = g.all.filter(isCopied).length;
    $('sendProgressText').textContent = total ? `${fa(done)} از ${fa(total)} کپی شد` : '';
    $('sendProgress').style.setProperty('--done', total ? String(done / total) : '0');
    $('sendProgress').hidden = !total;
    $('sendDone').textContent = sw.choosing ? 'ثبت ارسالِ این‌ها' : 'ارسال کردم';
    $('sendLater').textContent = sw.choosing ? 'برگرد' : 'بستن';
  }

  function copyChip(label, shown, text, ltr) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'send-copy-chip';
    b.title = `کپی ${label}`;
    const l = document.createElement('span'); l.className = 'send-chip-label'; l.textContent = label;
    const v = document.createElement('span'); v.className = 'send-chip-value'; v.textContent = shown; if (ltr) v.dir = 'ltr';
    b.append(l, v);
    b.insertAdjacentHTML('beforeend', COPY_SVG);
    b.addEventListener('click', () => copyText(text).then((okk) => showToast(okk ? `${label} کپی شد` : 'کپی نشد')));
    return b;
  }

  function sectionEl(s, mixed) {
    const el = document.createElement('section');
    el.className = 'send-sec';
    el.dataset.key = s.key;
    const sum = s.recs.reduce((t, c) => t + Number(c.amount || 0), 0);
    const head = document.createElement('div');
    head.className = 'send-sec-head';
    if (sw.choosing) {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'send-sec-pick';
      box.checked = sw.chosen.has(s.key);
      box.setAttribute('aria-label', `فرستاده شد برای ${s.owner}`);
      box.addEventListener('change', () => { if (box.checked) sw.chosen.add(s.key); else sw.chosen.delete(s.key); });
      head.appendChild(box);
    }
    const title = document.createElement('div');
    title.className = 'send-sec-title';
    const name = document.createElement('b'); name.textContent = s.owner || '—';
    const meta = document.createElement('span'); meta.className = 'send-sec-meta';
    meta.textContent = `${fa(s.recs.length)} چک، ${money(sum)} ریال`;
    title.append(name, meta);
    if (mixed) {
      const bn = document.createElement('span'); bn.className = 'send-sec-benef';
      bn.textContent = `ذینفع: ${s.benef.name}${nidOf(s.benef.nid) ? '، ' + nidOf(s.benef.nid) : ''}`;
      title.appendChild(bn);
    }
    head.appendChild(title);
    if (!sw.choosing) {
      const txt = document.createElement('button');
      txt.type = 'button';
      txt.className = 'send-btn' + (sw.textCopied.has(s.key) ? ' is-done' : '');
      txt.innerHTML = (sw.textCopied.has(s.key) ? CHECK_SVG : COPY_SVG) + '<span>کپی متن</span>';
      txt.addEventListener('click', () => copySectionText(s, txt));
      head.appendChild(txt);
      if (shareInstead()) {
        const sh = document.createElement('button');
        sh.type = 'button';
        sh.className = 'send-btn';
        sh.innerHTML = SHARE_SVG + '<span>اشتراک</span>';
        sh.addEventListener('click', () => shareSection(s));
        head.appendChild(sh);
      }
    }
    el.appendChild(head);
    const cards = document.createElement('div');
    cards.className = 'send-cards';
    for (const c of s.recs) cards.appendChild(cardEl(c));
    el.appendChild(cards);
    return el;
  }

  function cardEl(c, ownerField) {
    const el = document.createElement('div');
    el.className = 'send-card' + (isCopied(c) && !ownerField ? ' is-copied' : '');
    const f = (c.files || [])[0];
    const thumb = document.createElement('div');
    thumb.className = 'send-thumb';
    if (isImage(f)) {
      const img = document.createElement('img');
      img.alt = `عکس چک ${toFa(c.serial)}`;
      thumb.appendChild(img);
      loadImage(f.id).then(({ url }) => { img.src = url; }).catch(() => { thumb.classList.add('is-missing'); });
    } else if (f) {
      thumb.classList.add('is-none');
      thumb.textContent = 'PDF';
    }
    // no photo at all (a cheque added by hand): no empty box, just its line
    if (f) el.appendChild(thumb); else el.classList.add('no-thumb');
    const info = document.createElement('div');
    info.className = 'send-info';
    const serial = document.createElement('b'); serial.textContent = toFa(c.serial);
    const amt = document.createElement('span'); amt.textContent = `${money(c.amount)} ریال`;
    const due = document.createElement('span'); due.className = 'send-due'; due.textContent = `سررسید ${faDate(c.dueDate)}`;
    info.append(serial, amt, due);
    el.appendChild(info);
    if (ownerField) { el.appendChild(ownerField); return el; }
    if (sw.choosing) return el;
    if (isImage(f)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'send-btn send-copy-img' + (isCopied(c) ? ' is-done' : '');
      b.innerHTML = isCopied(c) ? CHECK_SVG + '<span>کپی شد</span>' : COPY_SVG + '<span>کپی عکس</span>';
      b.addEventListener('click', () => copyImage(c, b));
      el.appendChild(b);
    } else if (f) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'send-btn';
      b.textContent = 'باز کردن PDF';
      b.addEventListener('click', () => openAttachment(f));
      el.appendChild(b);
    } else if (isCopied(c)) {
      const m = document.createElement('span');
      m.className = 'send-done-mark';
      m.innerHTML = CHECK_SVG + '<span>در متن آمد</span>';
      el.appendChild(m);
    }
    return el;
  }

  // «بدون صاحب چک»: a field each; named, the cheque moves to its section
  function noOwnerSection(list) {
    const el = document.createElement('section');
    el.className = 'send-sec send-sec-noowner';
    const head = document.createElement('div');
    head.className = 'send-sec-head';
    const t = document.createElement('div');
    t.className = 'send-sec-title';
    const b = document.createElement('b'); b.textContent = `⚠ بدون صاحب چک (${fa(list.length)})`;
    const m = document.createElement('span'); m.className = 'send-sec-meta'; m.textContent = 'صاحب چک را بنویس تا به بخش خودش برود';
    t.append(b, m);
    head.appendChild(t);
    el.appendChild(head);
    const cards = document.createElement('div');
    cards.className = 'send-cards';
    for (const c of list) {
      const field = document.createElement('div');
      field.className = 'form-field ac-field send-owner';
      field.innerHTML = '<div class="ig"><input type="text" class="ac-input" autocomplete="off" aria-label="صاحب چک"></div>';
      const input = field.querySelector('input');
      const listEl = document.createElement('div');
      listEl.className = 'ac-list';
      document.body.appendChild(listEl);
      let busy = false;
      const assign = async () => {
        const name = input.value.trim();
        if (!name || busy) return;
        busy = true;
        input.disabled = true;
        try {
          const ownerId = await ensurePerson(name, null, 'owner');
          if (!ownerId) throw new Error('صاحب چک ساخته نشد');
          await apiJson(`/checks/${c.id}`, { method: 'PATCH', body: JSON.stringify({ version: c.version, owner_id: ownerId }) });
          await loadChecksFromApi();
          renderTable();
          if (sw) render();
        } catch (e) {
          if (e.sessionEnded) return;
          input.disabled = false;
          busy = false;
          if (e.status === 409) { await loadChecksFromApi(); if (sw) render(); }
          showFoot(requestErrorText(e, 'صاحب چک ذخیره نشد'));
        }
      };
      const ac = createAutocomplete({
        input, list: listEl, field,
        search: (q) => allOwners().filter((x) => normalizeName(x).includes(normalizeName(q))),
        primary: (x) => x,
        allowNew: true, newLabel: newPersonLabel,
        hasExact: (q) => allOwners().some((x) => normalizeName(x) === normalizeName(q)),
        pick: (x) => { input.value = x; },
        onBlur: () => { foldOntoKnownPerson(input); assign(); },
        onEnter: assign,
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !listEl.classList.contains('show')) { e.preventDefault(); assign(); } });
      acs.push({ ac, list: listEl });
      cards.appendChild(cardEl(c, field));
    }
    el.appendChild(cards);
    return el;
  }

  // ---------------------------------------------------------------
  // Copying
  // ---------------------------------------------------------------
  const canCopyImage = () => !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext);
  const coarse = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const shareInstead = () => coarse() && !canCopyImage() && !!navigator.share;

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    overlay.appendChild(ta);
    ta.select();
    let done = false;
    try { done = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return done;
  }

  // The message for one owner: the beneficiary, then each cheque. The
  // national id in Latin digits, so it pastes right into a bank's app; the
  // rest in Persian.
  function messageFor(s) {
    const d = nidOf(s.benef.nid);
    const idLine = d ? ` با ${d.length === 11 ? 'شناسه ملی' : 'کد ملی'} ${d}` : '';
    const lines = s.recs.map((c) => `• سریال ${toFa(c.serial)} — ${toFa(groupDigits(String(c.amount || '0'))).replace(/,/g, '٬')} ریال — سررسید ${faDate(c.dueDate)}`);
    return `سلام، وقت بخیر\nلطفاً چک‌های زیر را در سامانه صیاد به نام «${s.benef.name}»${idLine} ثبت کنید:\n${lines.join('\n')}\nممنون`;
  }
  async function copySectionText(s, btn) {
    if (!(await copyText(messageFor(s)))) { showToast('کپی نشد'); return; }
    sw.textCopied.add(s.key);
    showToast(`متن ${s.owner} کپی شد`);
    // a cheque without a photo goes in the message alone: copying it is what «copied» means for it
    const bare = s.recs.filter((c) => !isImage((c.files || [])[0]) && !isCopied(c)).map((c) => c.id);
    if (bare.length) markCopied(bare);
    btn.classList.add('is-done');
    btn.innerHTML = CHECK_SVG + '<span>کپی متن</span>';
    render();
  }

  // A photo as PNG (the only image type browsers put on the clipboard),
  // made once per window and kept: started when the window opens, so the
  // copy itself is immediate
  const pngs = new Map();
  function pngFor(id) {
    if (!pngs.has(id)) {
      const p = loadImage(id).then(({ blob }) => createImageBitmap(blob)).then((bmp) => {
        const cv = document.createElement('canvas');
        cv.width = bmp.width; cv.height = bmp.height;
        cv.getContext('2d').drawImage(bmp, 0, 0);
        return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
      });
      p.catch(() => pngs.delete(id));
      pngs.set(id, p);
    }
    return pngs.get(id);
  }
  function copyImage(c, btn) {
    const f = c.files[0];
    if (!canCopyImage()) {
      // this browser can't put a photo on the clipboard: it is downloaded instead
      loadImage(f.id).then(({ url }) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `cheque-${c.serial}.${(f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
        document.body.appendChild(a); a.click(); a.remove();
        showToast('این مرورگر کپی عکس را پشتیبانی نمی‌کند؛ دانلود شد');
        markCopied([c.id]);
      }).catch(() => showToast('عکس بار نشد — اتصال را بررسی کنید'));
      return;
    }
    // The write starts inside the click, with the PNG still on its way:
    // Safari only takes it that way
    btn.disabled = true;
    navigator.clipboard.write([new ClipboardItem({ 'image/png': pngFor(f.id) })])
      .then(() => { showToast(`عکس چک ${toFa(c.serial)} کپی شد`); markCopied([c.id]); })
      .catch(() => { btn.disabled = false; showToast('عکس کپی نشد؛ دوباره بزن'); });
  }
  async function markCopied(ids) {
    ids.forEach((id) => sw && sw.copied.add(id));
    if (sw) render();
    try { await apiJson('/checks/mark-copied', { method: 'POST', body: JSON.stringify({ ids }) }); } catch (e) {}
  }
  async function shareSection(s) {
    try {
      const files = [];
      for (const c of s.recs) {
        const f = (c.files || [])[0];
        if (!isImage(f)) continue;
        const { blob } = await loadImage(f.id);
        files.push(new File([blob], `cheque-${c.serial}.jpg`, { type: blob.type || 'image/jpeg' }));
      }
      const data = { text: messageFor(s) };
      if (files.length && navigator.canShare && navigator.canShare({ files })) data.files = files;
      await navigator.share(data);
      sw.textCopied.add(s.key);
      markCopied(s.recs.map((c) => c.id));
    } catch (e) { /* closed without sharing */ }
  }

  // ---------------------------------------------------------------
  // The channel, and «ارسال کردم»
  // ---------------------------------------------------------------
  const chGroup = $('sendChannels'), chOther = $('sendChannelOther');
  let channel = '';
  function drawChannels() {
    chGroup.innerHTML = CHANNELS.map((c) => `
      <button type="button" class="ch-tag" data-id="${c.id}" aria-pressed="false">
        <span class="ch-logo" aria-hidden="true">${c.icon}</span><span class="ch-name">${c.name}</span>
      </button>`).join('') + '<button type="button" class="ch-tag ch-add" data-id="" aria-pressed="false">سایر</button>';
    chGroup.querySelectorAll('.ch-tag').forEach((t) => t.addEventListener('click', () => {
      if (t.dataset.id) setChannel(t.dataset.id);
      else { chOther.hidden = false; chOther.focus(); setChannel(chOther.value.trim()); }
    }));
  }
  function setChannel(v) {
    channel = v || '';
    const known = CHANNELS.some((c) => c.id === channel);
    chGroup.querySelectorAll('.ch-tag').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.id ? t.dataset.id === channel : (!known && !chOther.hidden))));
    if (known) chOther.hidden = true;
    $('sendChannelField').classList.remove('error');
  }
  chOther.addEventListener('input', () => setChannel(chOther.value.trim()));

  const footMsg = $('sendFootMsg');
  const showFoot = (t) => { footMsg.textContent = t || ''; };
  const tehranToday = () => {
    const [jy, jm, jd] = todayJalali();
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    return `${gy}-${pad2(gm)}-${pad2(gd)}`;
  };

  async function markSent(ids) {
    if (!channel) {
      showFoot('کانالی را که با آن فرستادی انتخاب کن');
      $('sendChannelField').classList.add('error');
      return false;
    }
    const btn = $('sendDone');
    btn.disabled = true;
    try {
      const r = await apiJson('/checks/mark-sent', { method: 'POST', body: JSON.stringify({ ids, channel, sent_on: tehranToday() }) });
      try { localStorage.setItem(LAST_CHANNEL_KEY(), channel); } catch (e) {}
      await loadChecksFromApi();
      renderTable();
      const n = r.updated.length;
      if (r.op_id) {
        const opId = r.op_id;
        showToast(`${fa(n)} چک ارسال‌شده ثبت شد`, { action: { label: 'برگردون', run: () => undoSend(opId, r.updated.map((c) => c.id)) } });
      } else if (!n) showToast('این چک‌ها قبلاً ارسال شده بودند');
      if (sw) {
        r.updated.forEach((c) => sw.ids.delete(c.id));
        if (!groups().sections.length && !groups().noOwner.length) close();
        else { sw.choosing = false; render(); }
      }
      return true;
    } catch (e) {
      if (!e.sessionEnded) showFoot(requestErrorText(e, 'ثبت نشد'));
      return false;
    } finally {
      btn.disabled = false;
    }
  }
  async function undoSend(opId, ids) {
    try {
      await apiJson(`/bulk-ops/${opId}/undo`, { method: 'POST' });
      await loadChecksFromApi();
      renderTable();
      showToast('برگردانده شد؛ دوباره آماده‌ی ارسال‌اند');
      // back among what is still here, or a window of their own
      if (sw) { ids.forEach((id) => sw.ids.add(id)); render(); } else open(ids);
    } catch (e) {
      if (e.sessionEnded) return;
      const code = e.data && e.data.code;
      showToast(code === 'changed' ? 'بعضی از این چک‌ها بعد از ارسال تغییر کرده‌اند؛ برگرداندن ممکن نیست' : requestErrorText(e, 'برگردانده نشد'));
    }
  }

  // «ارسال کردم»: every ready cheque here — unless some owner has a photo
  // not yet copied, when it asks first
  async function done() {
    showFoot('');
    // the channel first: nothing to ask about until it's known
    if (!channel) {
      showFoot('کانالی را که با آن فرستادی انتخاب کن');
      $('sendChannelField').classList.add('error');
      return;
    }
    const g = groups();
    if (sw.choosing) {
      const ids = g.sections.filter((s) => sw.chosen.has(s.key)).flatMap((s) => s.recs.map((c) => c.id));
      if (!ids.length) { showFoot('صاحب چکی تیک نخورده'); return; }
      await markSent(ids);
      return;
    }
    if (!g.all.length) { showFoot('چک آماده‌ای برای ارسال نیست'); return; }
    const behind = g.sections.filter((s) => s.recs.some((c) => !isCopied(c)));
    let ids = g.all.map((c) => c.id);
    if (behind.length) {
      const names = behind.map((s) => s.owner).join('، ');
      const answer = await askChoice({
        title: `${fa(behind.length)} صاحب چک هنوز کپی نشده‌اند: ${names}`,
        choices: [
          { value: 'all', label: 'همه ارسال شدند', tone: 'primary' },
          { value: 'copied', label: 'فقط کپی‌شده‌ها', tone: 'neutral' },
          { value: 'back', label: 'برگرد', tone: 'neutral' },
        ],
        cancel: 'back',
      });
      if (answer === 'back') return;
      if (answer === 'copied') ids = g.all.filter(isCopied).map((c) => c.id);
      if (!ids.length) { showFoot('هنوز چیزی کپی نشده'); return; }
    }
    await markSent(ids);
  }
  $('sendDone').addEventListener('click', done);

  // Leaving without «ارسال کردم»: what was sent, if anything was started
  async function requestClose() {
    if (!sw) return;
    if (sw.choosing) { sw.choosing = false; render(); return; }
    const g = groups();
    const started = g.all.some(isCopied) || sw.textCopied.size > 0;
    if (!started || !g.all.length) { close(); return; }
    const answer = await askChoice({
      title: 'همه رو برای صاحب چک‌ها فرستادی؟',
      choices: [
        { value: 'all', label: 'آره، همه', tone: 'primary' },
        { value: 'some', label: 'بعضی‌ها رو', tone: 'neutral' },
        { value: 'later', label: 'نه، بعداً', tone: 'neutral' },
      ],
      cancel: 'later',
    });
    if (!sw) return;
    if (answer === 'all') { if (await markSent(g.all.map((c) => c.id))) close(); return; }
    if (answer === 'some') {
      sw.choosing = true;
      sw.chosen = new Set(g.sections.filter((s) => s.recs.every(isCopied)).map((s) => s.key));
      render();
      return;
    }
    close();
  }
  $('sendLater').addEventListener('click', requestClose);
  $('sendClose').addEventListener('click', requestClose);

  // ---------------------------------------------------------------
  // Opening and closing
  // ---------------------------------------------------------------
  function open(ids) {
    if (!enabled()) return;
    sw = { ids: new Set(ids), copied: new Set(), textCopied: new Set(), choosing: false, chosen: new Set() };
    drawChannels();
    chOther.hidden = true;
    chOther.value = '';
    let last = '';
    try { last = localStorage.getItem(LAST_CHANNEL_KEY()) || ''; } catch (e) {}
    if (last && !CHANNELS.some((c) => c.id === last)) { chOther.value = last; chOther.hidden = false; }
    setChannel(last);
    showFoot('');
    render();
    pushBackGuard();
    overlay.classList.add('show');
    document.body.classList.add('bulk-open');
    // every photo ready to copy before it's asked for
    [...sw.ids].map(recOf).filter(Boolean).forEach((c) => { const f = (c.files || [])[0]; if (isImage(f)) pngFor(f.id).catch(() => {}); });
    setTimeout(() => { const first = overlay.querySelector('.send-owner input, .send-sec .send-btn'); if (first) first.focus(); }, 60);
  }
  function close() {
    acs.forEach((a) => { a.ac.close(); a.list.remove(); });
    acs = [];
    sw = null;
    pngs.clear();
    overlay.classList.remove('show');
    if (!(window.ChekinoBulk && window.ChekinoBulk.isOpen())) document.body.classList.remove('bulk-open');
    refreshChips();
  }

  // ---------------------------------------------------------------
  // Over the board: «آماده‌ی ارسال ۵» opens this window; «منتظر ذینفع ۳»
  // opens bulk edit on the cheques still missing their beneficiary or owner.
  // A search that matches cheques off the board says so beside them
  // («نمایش»: the cheque, or a list of them, each opening in its window).
  // ---------------------------------------------------------------
  const chips = $('stageChips');
  const pop = $('popStage');
  const offBoard = (c) => c.stage === 'waiting' || c.stage === 'ready';
  const STAGE_NAME = { waiting: 'منتظر ذینفع', ready: 'آماده‌ی ارسال' };
  function chipButton(cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    chips.appendChild(b);
    return b;
  }
  let readyChip = null, waitingChip = null, hint = null, hintIds = [];
  if (chips) {
    readyChip = chipButton('stage-chip');
    readyChip.addEventListener('click', () => open(loadCheques().filter((c) => c.stage === 'ready').map((c) => c.id)));
    waitingChip = chipButton('stage-chip');
    waitingChip.setAttribute('aria-haspopup', 'dialog');
    waitingChip.setAttribute('aria-expanded', 'false');
    // bulk edit, on the waiting ones (js/bulk-edit.js); without it, the list
    waitingChip.addEventListener('click', (e) => {
      e.stopPropagation();   // the page's «clicked elsewhere» would close it again
      if (window.ChekinoEdit) { window.ChekinoEdit.open({ stages: ['waiting'] }); return; }
      const ids = loadCheques().filter((c) => c.stage === 'waiting').map((c) => c.id);
      showList(ids, 'منتظر ذینفع', 'روی هر چک بزن تا ذینفع یا صاحب چکش را بنویسی', waitingChip);
    });
    hint = document.createElement('div');
    hint.className = 'stage-hint';
    hint.innerHTML = '<span class="stage-hint-text"></span><button type="button" class="stage-hint-btn" aria-haspopup="dialog" aria-expanded="false">نمایش</button>';
    chips.appendChild(hint);
    hint.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      if (hintIds.length === 1) { openModalForView(hintIds[0]); return; }
      showList(hintIds, 'نتیجه‌ی جستجو، بیرون از بُرد', 'این چک‌ها هنوز برای صاحب چک فرستاده نشده‌اند', e.currentTarget);
    });
  }
  // The board's search, on the cheques off the board (searchMatcher in dashboard.js)
  function searchMatches() {
    const match = typeof searchMatcher === 'function' && typeof searchInput !== 'undefined' ? searchMatcher(searchInput.value) : null;
    return match ? loadCheques().filter((c) => offBoard(c) && match(c)) : [];
  }
  function refreshChips() {
    if (!chips) return;
    if (!enabled()) { chips.hidden = true; return; }
    const all = loadCheques();
    const ready = all.filter((c) => c.stage === 'ready').length;
    const waiting = all.filter((c) => c.stage === 'waiting').length;
    readyChip.innerHTML = `<span>آماده‌ی ارسال</span><b>${fa(ready)}</b>`;
    readyChip.hidden = !ready;
    waitingChip.innerHTML = `<span>منتظر ذینفع</span><b>${fa(waiting)}</b>`;
    waitingChip.hidden = !waiting;
    const found = searchMatches();
    hintIds = found.map((c) => c.id);
    if (found.length === 1) {
      hint.firstChild.textContent = `چک ${toFa(found[0].serial)} در «${STAGE_NAME[found[0].stage]}» است`;
    } else if (found.length) {
      const where = [...new Set(found.map((c) => c.stage))].map((s) => `«${STAGE_NAME[s]}»`).join(' و ');
      hint.firstChild.textContent = `${fa(found.length)} چک با این جستجو در ${where} است`;
    }
    hint.hidden = !found.length;
    chips.hidden = !ready && !waiting && !found.length;
    if (pop && pop.classList.contains('show') && pop._btn && (pop._btn.hidden || pop._btn.closest('[hidden]'))) closePopover();
  }

  // The list: one line a cheque — serial, amount, due date; the party and
  // what's missing under it. Grouped by nothing: sorted by party, then due.
  function showList(ids, title, note, btn) {
    if (!pop) return;
    const recs = ids.map(recOf).filter(Boolean);
    const coll = new Intl.Collator('fa');
    recs.sort((a, b) => coll.compare(a.party || '', b.party || '') || (a.dueDate || '').localeCompare(b.dueDate || '') || (a.serial || '').localeCompare(b.serial || ''));
    $('popStageTitle').textContent = `${title} (${fa(recs.length)})`;
    $('popStageHint').textContent = note;
    const list = $('popStageList');
    list.innerHTML = '';
    for (const c of recs) {
      const missing = [!c.benefId && 'بدون ذینفع', !c.ownerId && 'بدون صاحب چک'].filter(Boolean);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-item';
      b.innerHTML = '<span class="stage-item-top"><b></b><span class="stage-item-amt"></span><span class="stage-item-due"></span></span>'
        + '<span class="stage-item-sub"><span class="stage-item-party"></span><span class="stage-item-tag"></span></span>';
      b.querySelector('b').textContent = toFa(c.serial);
      b.querySelector('.stage-item-amt').textContent = `${money(c.amount)} ریال`;
      b.querySelector('.stage-item-due').textContent = c.dueDate ? `سررسید ${faDate(c.dueDate)}` : '';
      b.querySelector('.stage-item-party').textContent = c.party || '';
      b.querySelector('.stage-item-tag').textContent = c.stage === 'ready' ? 'آماده‌ی ارسال' : missing.join('، ');
      b.addEventListener('click', () => { closePopover(); openModalForView(c.id); });
      list.appendChild(b);
    }
    pop._btn = btn;
    if (togglePopover(pop, btn)) {
      list.scrollTop = 0;
      const first = list.querySelector('.stage-item');
      if (first) first.focus({ preventScroll: true });
    }
  }
  if (pop) {
    pop.addEventListener('click', (e) => e.stopPropagation());
    // ↑ / ↓ between the lines
    pop.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...pop.querySelectorAll('.stage-item')];
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      next.focus();
    });
  }

  // Escape on an open name list closes the list only — caught before the
  // field's own handler closes it and the page's Escape closes the window
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const listOpen = acs.find((a) => a.list.classList.contains('show'));
    if (listOpen) { e.stopPropagation(); listOpen.ac.close(); }
  }, true);

  window.ChekinoSend = {
    isOpen: () => overlay.classList.contains('show'),
    escape() {
      const listOpen = acs.find((a) => a.list.classList.contains('show'));
      if (listOpen) { listOpen.ac.close(); return; }
      if (window.confirmIsOpen && confirmIsOpen()) return;
      requestClose();
    },
    open, refreshChips,
  };
  if (window.ChekinoPalette) {
    window.ChekinoPalette.register({
      title: 'ارسال به صاحب چک‌ها', hint: 'چک‌های آماده‌ی ارسال', group: 'چک‌ها', order: 1.6,
      keywords: 'send ready owners ارسال آماده صاحب چک',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
      when: () => enabled() && loadCheques().some((c) => c.stage === 'ready'),
      run: () => open(loadCheques().filter((c) => c.stage === 'ready').map((c) => c.id)),
    });
  }
  refreshChips();
})();
