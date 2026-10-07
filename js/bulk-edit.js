// Bulk edit (spec F5, 5.3): many cheques at once — the way a party's list of
// serials gets its beneficiary, or a stack of cheques its owners.
//
//   1. Which cheques: a box for serials or sayad ids, as the party sent them
//      (js/serials.js reads any separators and digits), and filters — stage,
//      party, «بدون صاحب چک»، «بدون ذینفع». A summary says what the list
//      found: «۳۵ پیدا شد، ۱ چندتایی، ۱ پیدا نشد», each part opening its
//      detail (the ones not found can be copied back to the party).
//   2. The table: the cheques found, ticked to be changed.
//   3. What changes: party, beneficiary, owner (one for all, or row by row
//      in the table), spend date, Sayad status. Owner, beneficiary and spend
//      date can be cleared.
// «پیش‌نمایش تغییرات» sums it up with what to watch for, «اعمال» sends it
// (POST /checks/bulk-update, all or nothing), and «برگردون» puts it back —
// here, from the toast, or later from «آخرین تغییرات». When a beneficiary
// was given, the send window opens with those cheques.
//
// Every cheque is already on the page (loadCheques(): every stage), so
// finding them needs no round trip.
(function () {
  const overlay = document.getElementById('editOverlay');
  if (!overlay) return;
  const $ = (id) => document.getElementById(id);
  const fa = (n) => toFa(String(n));
  const digits = (v) => toEnDigits(v || '').replace(/[^0-9]/g, '');
  const money = (raw) => toFa(groupDigits(String(raw || '0')));
  const coll = new Intl.Collator('fa');
  const same = (a, b) => normalizeName(a || '') === normalizeName(b || '');
  const STAGE_NAME = { waiting: 'منتظر ذینفع', ready: 'آماده‌ی ارسال', sent: 'ارسال‌شده' };
  const PAGE = 200;

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

  // ed = { stages:Set, party, noOwner, noBenef, sel:Set(ids), seen:Set(ids auto-ticked once), confirmed:Set(uncertain inputs),
  //        shown, open:'' (summary part open), anchor, rowOwners:Map(id → name), results:[], tokens:[] }
  let ed = null;
  const recOf = (id) => loadCheques().find((c) => c.id === id);

  // ---------------------------------------------------------------
  // 1. Which cheques
  // ---------------------------------------------------------------
  const serialsInput = $('editSerials');
  const summaryEl = $('editSummary'), detailEl = $('editDetail');
  const partyFilter = $('editPartyFilter');
  const partyFilterList = document.createElement('div');
  partyFilterList.className = 'ac-list';
  document.body.appendChild(partyFilterList);
  createAutocomplete({
    input: partyFilter, list: partyFilterList, field: $('editPartyFilterField'),
    search: (q) => allParties().filter((x) => normalizeName(x).includes(normalizeName(q))),
    primary: (x) => x,
    hideWhenEmpty: true,
    pick: (x) => { partyFilter.value = x; },
    // (the list says «changed» on every blur too: redrawing the table then
    // would swallow the click that took the focus away)
    onChange: () => { const v = partyFilter.value.trim(); if (ed && v !== ed.party) { ed.party = v; refresh(); } },
  });
  let typeTimer = 0;
  serialsInput.addEventListener('input', () => {
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => { if (ed) refresh(); }, 150);
    // the box grows with what is pasted, up to a few lines
    serialsInput.style.height = '';
    serialsInput.style.height = Math.min(serialsInput.scrollHeight, 132) + 'px';
  });
  overlay.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => {
    if (!ed) return;
    const s = b.dataset.stage;
    if (ed.stages.has(s)) ed.stages.delete(s); else ed.stages.add(s);
    refresh();
  }));
  $('editNoOwner').addEventListener('click', () => { if (ed) { ed.noOwner = !ed.noOwner; refresh(); } });
  $('editNoBenef').addEventListener('click', () => { if (ed) { ed.noBenef = !ed.noBenef; refresh(); } });

  // The serials typed, against every cheque on the page
  function lookup() {
    const text = serialsInput.value;
    if (!text.trim()) return null;
    const all = loadCheques();
    const tokens = ChekinoSerials.parse(text).map((t) => {
      if (t.kind === 'invalid') return { ...t, result: 'invalid', matches: [] };
      if (t.uncertain && !ed.confirmed.has(t.input)) return { ...t, result: 'uncertain', matches: [] };
      const matches = all.filter((c) => (t.kind === 'sayad' ? c.sayad === t.value : c.serial === t.value));
      const result = !matches.length ? 'not_found' : matches.length > 1 ? 'ambiguous' : 'found';
      return { ...t, result, matches };
    });
    return tokens;
  }

  // What the table shows: the cheques found (or, with no list, all of
  // them), through the filters
  function compute() {
    const tokens = lookup();
    ed.tokens = tokens || [];
    let list;
    const flags = new Map();   // id → 'ambiguous' | 'other_party'
    if (tokens) {
      const seen = new Set();
      list = [];
      for (const t of tokens) {
        for (const c of t.matches) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          list.push(c);
          if (t.result === 'ambiguous') flags.set(c.id, 'ambiguous');
        }
      }
      // with a party chosen, a cheque of another party is shown, flagged,
      // not dropped: the party may have sent someone else's serial
      if (ed.party) for (const c of list) if (!same(c.party, ed.party)) flags.set(c.id, 'other_party');
    } else {
      list = loadCheques().slice();
      if (ed.party) list = list.filter((c) => same(c.party, ed.party));
      const order = { waiting: 0, ready: 1, sent: 2 };
      list.sort((a, b) => (order[a.stage] - order[b.stage]) || coll.compare(a.party || '', b.party || '')
        || (a.dueDate || '').localeCompare(b.dueDate || '') || (a.serial || '').localeCompare(b.serial || ''));
    }
    if (ed.stages.size) list = list.filter((c) => ed.stages.has(c.stage));
    if (ed.noOwner) list = list.filter((c) => !c.ownerId);
    if (ed.noBenef) list = list.filter((c) => !c.benefId);
    ed.results = list;
    ed.flags = flags;
    // what the list found is ticked (once: an untick stays), what it no
    // longer shows is not
    const ids = new Set(list.map((c) => c.id));
    for (const id of [...ed.sel]) if (!ids.has(id)) ed.sel.delete(id);
    if (tokens) {
      for (const c of list) {
        if (ed.seen.has(c.id)) continue;
        ed.seen.add(c.id);
        if (!flags.has(c.id)) ed.sel.add(c.id);
      }
    }
  }

  function showSummary() {
    const t = ed.tokens;
    detailEl.hidden = true;
    if (!t.length) { summaryEl.hidden = true; summaryEl.innerHTML = ''; return; }
    const count = (r) => t.filter((x) => x.result === r).length;
    const other = ed.results.filter((c) => ed.flags.get(c.id) === 'other_party').length;
    const parts = [
      ['found', count('found'), 'پیدا شد'],
      ['ambiguous', count('ambiguous'), 'چندتایی'],
      ['not_found', count('not_found'), 'پیدا نشد'],
      ['uncertain', count('uncertain'), 'نامطمئن'],
      ['other_party', other, 'مال طرف حساب دیگر'],
      ['invalid', count('invalid'), 'نادیده گرفته شد'],
    ].filter(([, n]) => n);
    summaryEl.hidden = false;
    summaryEl.innerHTML = '';
    for (const [key, n, label] of parts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'edit-sum-part' + (key === 'found' ? '' : ' is-' + key) + (ed.open === key ? ' open' : '');
      b.setAttribute('aria-expanded', String(ed.open === key));
      b.textContent = `${fa(n)} ${label}`;
      if (key === 'found') { b.disabled = true; b.classList.add('is-plain'); }
      else b.addEventListener('click', () => { ed.open = ed.open === key ? '' : key; showSummary(); });
      summaryEl.appendChild(b);
    }
    if (ed.open && parts.some(([k]) => k === ed.open)) showDetail(ed.open);
  }
  function showDetail(key) {
    const t = ed.tokens;
    detailEl.hidden = false;
    detailEl.innerHTML = '';
    const line = (text) => { const d = document.createElement('div'); d.className = 'edit-detail-line'; d.textContent = text; detailEl.appendChild(d); return d; };
    if (key === 'not_found') {
      const list = t.filter((x) => x.result === 'not_found');
      line(list.map((x) => toFa(x.value)).join('، '));
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bulk-btn edit-detail-btn'; b.textContent = 'کپی سریال‌های پیدانشده';
      b.addEventListener('click', () => copyText(list.map((x) => x.value).join('\n')).then((ok) => showToast(ok ? 'سریال‌های پیدانشده کپی شد' : 'کپی نشد')));
      detailEl.appendChild(b);
    } else if (key === 'ambiguous') {
      for (const x of t.filter((y) => y.result === 'ambiguous')) line(`سریال ${toFa(x.value)}: ${fa(x.matches.length)} چک با همین سریال (${x.matches.map((c) => c.party).join('، ')}) — در جدول، درستش را تیک بزن`);
    } else if (key === 'uncertain') {
      for (const x of t.filter((y) => y.result === 'uncertain')) {
        const d = line(`${toFa(x.input)} ← سریال ${toFa(x.value)}؟`);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'bulk-btn edit-detail-btn'; b.textContent = 'تأیید';
        b.addEventListener('click', () => { ed.confirmed.add(x.input); refresh(); });
        d.appendChild(b);
      }
    } else if (key === 'other_party') {
      for (const c of ed.results.filter((r) => ed.flags.get(r.id) === 'other_party')) line(`سریال ${toFa(c.serial)}: ${c.party}`);
    } else if (key === 'invalid') {
      line(t.filter((x) => x.result === 'invalid').map((x) => toFa(x.input)).join('، '));
    }
  }

  function showFilters() {
    overlay.querySelectorAll('[data-stage]').forEach((b) => b.setAttribute('aria-pressed', String(ed.stages.has(b.dataset.stage))));
    $('editNoOwner').setAttribute('aria-pressed', String(ed.noOwner));
    $('editNoBenef').setAttribute('aria-pressed', String(ed.noBenef));
  }

  // ---------------------------------------------------------------
  // 2. The table
  // ---------------------------------------------------------------
  const rowsEl = $('editRows');
  const allBox = $('editAll');
  let rowAcs = [];   // the owner fields of «ردیف به ردیف»
  function stageText(c) {
    if (c.stage !== 'sent') return STAGE_NAME[c.stage];
    return statusById(c.status).name;
  }
  function destroyRowAcs() {
    for (const a of rowAcs) { a.ac.close(); a.list.remove(); }
    rowAcs = [];
  }
  function renderRows() {
    destroyRowAcs();
    rowsEl.innerHTML = '';
    const list = ed.results.slice(0, ed.shown);
    const byRow = rowByRow();
    for (const c of list) {
      const el = document.createElement('div');
      el.className = 'edit-row';
      el.dataset.id = c.id;
      el.tabIndex = -1;
      el.setAttribute('role', 'row');
      const flag = ed.flags.get(c.id);
      el.innerHTML = `
        <label class="e-check" role="gridcell"><input type="checkbox" tabindex="-1" aria-label="انتخاب چک"></label>
        <span class="e-serial" role="gridcell"><b></b><span class="e-sub"></span></span>
        <span class="e-amount" role="gridcell"></span>
        <span class="e-due" role="gridcell"></span>
        <span class="e-party" role="gridcell"></span>
        <span class="e-spend" role="gridcell"></span>
        <span class="e-owner" role="gridcell"></span>
        <span class="e-benef" role="gridcell"></span>
        <span class="e-stage" role="gridcell"></span>`;
      const q = (s) => el.querySelector(s);
      q('b').textContent = toFa(c.serial);
      // under the serial: the end of its sayad id (two cheques of one serial
      // differ there), and why it isn't ticked by itself
      const tail = c.sayad ? 'صیادی …' + toFa(c.sayad.slice(-4)) : '';
      q('.e-sub').textContent = [tail, flag === 'ambiguous' ? 'چندتایی' : flag === 'other_party' ? 'طرف حساب دیگر' : ''].filter(Boolean).join('، ');
      q('.e-serial').title = c.sayad ? 'شناسه صیادی ' + toFa(c.sayad) : '';
      q('.e-amount').textContent = `${money(c.amount)} ریال`;
      q('.e-due').textContent = faDate(c.dueDate);
      q('.e-party').textContent = c.party || '—';
      q('.e-spend').textContent = c.spendDate ? faDate(c.spendDate) : '—';
      q('.e-benef').textContent = c.benef || '—';
      q('.e-stage').textContent = stageText(c);
      const box = q('.e-check input');
      box.checked = ed.sel.has(c.id);
      el.classList.toggle('is-sel', box.checked);
      box.addEventListener('change', () => { toggle(c.id, box.checked); ed.anchor = c.id; });
      el.addEventListener('click', (e) => {
        if (e.target.closest('.e-check, .e-owner input')) return;
        if (e.shiftKey && ed.anchor) { range(ed.anchor, c.id); return; }
        toggle(c.id, !ed.sel.has(c.id));
        ed.anchor = c.id;
      });
      const ownerCell = q('.e-owner');
      if (byRow && ed.sel.has(c.id)) ownerCell.appendChild(rowOwnerField(c));
      else ownerCell.textContent = c.owner || '—';
      rowsEl.appendChild(el);
    }
    const more = $('editMore');
    more.hidden = ed.results.length <= ed.shown;
    more.textContent = `نمایش ${fa(Math.min(PAGE, ed.results.length - ed.shown))} چک دیگر`;
    $('editEmpty').hidden = !!ed.results.length;
    $('editEmpty').textContent = serialsInput.value.trim() ? 'با این فهرست و فیلترها چکی پیدا نشد' : 'با این فیلترها چکی نیست';
    showCount();
  }
  $('editMore').addEventListener('click', () => { ed.shown += PAGE; renderRows(); });

  // «ردیف به ردیف»: the owner typed beside each ticked cheque, its serial in
  // bold to find it in the accounting; Enter goes to the next one
  function rowOwnerField(c) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field ac-field e-owner-field';
    wrap.innerHTML = '<div class="ig"><input type="text" class="ac-input" autocomplete="off"></div>';
    const input = wrap.querySelector('input');
    input.setAttribute('aria-label', `صاحب چک ${toFa(c.serial)}`);
    input.placeholder = c.owner || 'صاحب چک';
    input.value = ed.rowOwners.get(c.id) || '';
    const list = document.createElement('div');
    list.className = 'ac-list';
    document.body.appendChild(list);
    const next = () => {
      const inputs = [...rowsEl.querySelectorAll('.e-owner-field input')];
      const n = inputs[inputs.indexOf(input) + 1];
      if (n) n.focus(); else $('editPreview').focus();
    };
    // Enter with no list open goes on too (the list's own Enter only acts
    // while it shows; this one is added first, so it never runs after it)
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || list.classList.contains('show')) return;
      e.preventDefault();
      next();
    });
    const ac = createAutocomplete({
      input, list, field: wrap,
      search: (qq) => allOwners().filter((x) => normalizeName(x).includes(normalizeName(qq))),
      primary: (x) => x,
      allowNew: true, newLabel: newPersonLabel,
      hasExact: (qq) => allOwners().some((x) => normalizeName(x) === normalizeName(qq)),
      pick: (x) => { input.value = x; },
      onBlur: () => { foldOntoKnownPerson(input); ed.rowOwners.set(c.id, input.value.trim()); },
      onChange: () => { const v = input.value.trim(); if (v) ed.rowOwners.set(c.id, v); else ed.rowOwners.delete(c.id); },
      onEnter: next,
    });
    // a click in the field is not a click on the row
    input.addEventListener('click', (e) => e.stopPropagation());
    rowAcs.push({ ac, list });
    return wrap;
  }

  function toggle(id, on) {
    if (on) ed.sel.add(id); else ed.sel.delete(id);
    const el = rowsEl.querySelector(`.edit-row[data-id="${id}"]`);
    if (el) {
      el.querySelector('.e-check input').checked = on;
      el.classList.toggle('is-sel', on);
      // «ردیف به ردیف» has a field only on the ticked rows
      if (rowByRow()) renderRows();
    }
    showCount();
    showChange();
  }
  function range(fromId, toId) {
    const ids = ed.results.slice(0, ed.shown).map((c) => c.id);
    const a = ids.indexOf(fromId), b = ids.indexOf(toId);
    if (a < 0 || b < 0) return;
    for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) ed.sel.add(id);
    renderRows();
    showChange();
  }
  allBox.addEventListener('change', () => {
    if (!ed) return;
    if (allBox.checked) ed.results.forEach((c) => ed.sel.add(c.id));
    else ed.sel.clear();
    renderRows();
    showChange();
  });
  function showCount() {
    const n = ed.sel.size;
    $('editCount').textContent = n ? `${fa(n)} چک انتخاب شد` : 'چکی انتخاب نشده';
    $('editAllLabel').textContent = `انتخاب همه${ed.results.length ? ` (${fa(ed.results.length)})` : ''}`;
    allBox.checked = !!ed.results.length && ed.results.every((c) => ed.sel.has(c.id));
    allBox.indeterminate = !allBox.checked && n > 0;
  }

  // ↑/↓ between rows, Space ticks, Shift+Space ticks a run, Ctrl+A all
  rowsEl.addEventListener('keydown', (e) => {
    const row = e.target.closest && e.target.closest('.edit-row');
    if (!row || e.target.tagName === 'INPUT') return;
    const rows = [...rowsEl.querySelectorAll('.edit-row')];
    const i = rows.indexOf(row);
    const id = Number(row.dataset.id);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = rows[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) focusRow(next);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (e.shiftKey && ed.anchor) range(ed.anchor, id);
      else { toggle(id, !ed.sel.has(id)); ed.anchor = id; }
      const again = rowsEl.querySelector(`.edit-row[data-id="${id}"]`);
      if (again) focusRow(again);
    } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
      e.preventDefault();
      ed.results.forEach((c) => ed.sel.add(c.id));
      renderRows();
      showChange();
      const again = rowsEl.querySelector(`.edit-row[data-id="${id}"]`);
      if (again) focusRow(again);
    }
  });
  function focusRow(el) {
    rowsEl.querySelectorAll('.edit-row').forEach((r) => { r.tabIndex = -1; });
    el.tabIndex = 0;
    el.focus();
  }
  // Tab into the table lands on a row
  rowsEl.addEventListener('focusin', (e) => {
    if (e.target === rowsEl) { const first = rowsEl.querySelector('.edit-row'); if (first) focusRow(first); }
  });

  // ---------------------------------------------------------------
  // 3. What changes
  // ---------------------------------------------------------------
  const FIELDS = ['party', 'benef', 'owner', 'spend', 'status'];
  const pick = {};   // field → its checkbox
  FIELDS.forEach((f) => {
    pick[f] = overlay.querySelector(`[data-pick="${f}"] input`);
    pick[f].addEventListener('change', () => { if (ed) showChange(true); });
  });
  // the modes of a field: «تعیین» / «خالی کن», and the owner's three
  const mode = { benef: 'set', owner: 'one', spend: 'set', status: '' };
  overlay.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const [f, m] = b.dataset.mode.split(':');
    const wasRow = rowByRow();
    mode[f] = m;
    showChange(true);
    if (wasRow !== rowByRow()) renderRows();
  }));
  const rowByRow = () => !!ed && pick.owner.checked && mode.owner === 'rows';

  const partyInput = $('editParty');
  const partyList = document.createElement('div');
  partyList.className = 'ac-list';
  document.body.appendChild(partyList);
  createAutocomplete({
    input: partyInput, list: partyList, field: $('editPartyField'),
    search: (q) => allParties().filter((x) => normalizeName(x).includes(normalizeName(q))),
    primary: (x) => x,
    allowNew: true, newLabel: (q) => (findPersonByName(q) ? 'طرف حساب موجود' : 'طرف حساب جدید'),
    hasExact: (q) => allParties().some((x) => normalizeName(x) === normalizeName(q)),
    pick: (x) => { partyInput.value = x; },
    onBlur: () => { foldOntoKnownPerson(partyInput); },
    onChange: () => { $('editPartyField').classList.remove('error'); },
  });

  const benefInput = $('editBenef'), nidInput = $('editNid');
  const benefList = document.createElement('div');
  benefList.className = 'ac-list';
  document.body.appendChild(benefList);
  // the beneficiaries the selected cheques' parties have had, first
  const benefChoices = () => {
    const parties = new Set([...ed.sel].map(recOf).filter(Boolean).map((c) => c.party));
    const seen = new Map();
    for (const p of parties) for (const b of beneficiariesForParty(p)) if (!seen.has(b.name)) seen.set(b.name, b);
    return [...seen.values()];
  };
  let nidFilledIn = false;
  nidInput.addEventListener('focus', () => { if (nidFilledIn && nidInput.value) nidInput.select(); });
  // Enter: name → national id → preview, with or without a list open
  benefInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || benefList.classList.contains('show')) return;
    e.preventDefault();
    nidInput.focus();
  });
  nidInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('editPreview').click(); } });
  const fillNid = (n) => { nidInput.value = toFa(digits(n)); nidFilledIn = true; $('editNidField').classList.remove('error'); };
  createAutocomplete({
    input: benefInput, list: benefList, field: $('editBenefField'),
    search: (q) => {
      const own = benefChoices();
      const others = peopleInRole('benef').map((p) => ({ name: p.full_name, nid: p.national_id || '' })).filter((p) => !own.some((o) => o.name === p.name));
      return [...own, ...others].filter((p) => normalizeName(p.name).includes(normalizeName(q)));
    },
    primary: (p) => p.name, secondary: (p) => (p.nid ? toFa(p.nid) : ''),
    allowNew: true, newLabel: newPersonLabel,
    hasExact: (q) => peopleInRole('benef').some((p) => same(p.full_name, q)),
    pick: (p) => { benefInput.value = p.name; if (p.nid) fillNid(p.nid); },
    onBlur: () => {
      const person = foldOntoKnownPerson(benefInput);
      if (person && person.national_id && !digits(nidInput.value)) fillNid(person.national_id);
    },
    onChange: () => { $('editBenefField').classList.remove('error'); },
    onEnter: () => nidInput.focus(),
  });
  nidInput.addEventListener('input', () => {
    nidFilledIn = false;
    nidInput.value = toFa(digits(nidInput.value).slice(0, 11));
    $('editNidField').classList.remove('error');
  });
  nidInput.addEventListener('blur', () => {
    if (!digits(nidInput.value)) return;
    checkNid();
    const holder = findPersonByNid(nidInput.value);
    if (holder && !benefInput.value.trim()) benefInput.value = holder.full_name;
  });
  function checkNid() {
    const d = digits(nidInput.value);
    const msg = $('editNidMsg'), field = $('editNidField');
    if (!d) { field.classList.add('error'); msg.textContent = 'لازم است'; return false; }
    if (d.length !== 10 && d.length !== 11) { field.classList.add('error'); msg.textContent = '۱۰ یا ۱۱ رقم باشد'; return false; }
    const v = window.ChekinoNid.check(d);
    if (!v.ok) { field.classList.add('error'); msg.textContent = v.error; return false; }
    field.classList.remove('error');
    return true;
  }

  const ownerInput = $('editOwner');
  const ownerList = document.createElement('div');
  ownerList.className = 'ac-list';
  document.body.appendChild(ownerList);
  createAutocomplete({
    input: ownerInput, list: ownerList, field: $('editOwnerField'),
    search: (q) => allOwners().filter((x) => normalizeName(x).includes(normalizeName(q))),
    primary: (x) => x,
    allowNew: true, newLabel: newPersonLabel,
    hasExact: (q) => allOwners().some((x) => normalizeName(x) === normalizeName(q)),
    pick: (x) => { ownerInput.value = x; },
    onBlur: () => { foldOntoKnownPerson(ownerInput); },
    onChange: () => { $('editOwnerField').classList.remove('error'); },
  });

  const spendDate = createDateField({
    input: $('editSpend'), field: $('editSpendField'), msg: $('editSpendMsg'), calBtn: $('editSpendCal'), required: true, prefillToday: true,
  });

  const reasonInput = $('editReason');

  // Draws the change area: each picked field opens; the status is offered
  // only when some of the chosen cheques are sent (only they have one)
  function showChange(focusNew) {
    if (!ed) return;
    const sel = [...ed.sel].map(recOf).filter(Boolean);
    const anySent = sel.some((c) => c.stage === 'sent');
    overlay.querySelector('[data-pick="status"]').hidden = !anySent && !pick.status.checked;
    let opened = null;
    for (const f of FIELDS) {
      const box = $(`editF-${f}`);
      const was = !box.hidden;
      box.hidden = !pick[f].checked;
      if (!was && !box.hidden) opened = f;
    }
    overlay.querySelectorAll('[data-mode]').forEach((b) => {
      const [f, m] = b.dataset.mode.split(':');
      b.setAttribute('aria-pressed', String(mode[f] === m));
    });
    $('editBenefInputs').hidden = mode.benef !== 'set';
    $('editOwnerField').hidden = mode.owner !== 'one';
    $('editOwnerRowsNote').hidden = mode.owner !== 'rows';
    $('editSpendField').hidden = mode.spend !== 'set';
    $('editReasonField').hidden = mode.status !== 'problem';
    if (focusNew && opened) {
      const first = { party: partyInput, benef: mode.benef === 'set' ? benefInput : null, owner: mode.owner === 'one' ? ownerInput : null, spend: mode.spend === 'set' ? spendDate.input : null }[opened];
      if (first) setTimeout(() => first.focus(), 30);
    }
    $('editPreview').disabled = !ed.sel.size;
  }

  // ---------------------------------------------------------------
  // Preview, and «اعمال»
  // ---------------------------------------------------------------
  const footMsg = $('editFootMsg');
  // The request, from the change area — or a problem to fix first
  function buildRequest() {
    const ids = [...ed.sel];
    if (!ids.length) return { problem: 'چکی انتخاب نشده' };
    if (!FIELDS.some((f) => pick[f].checked)) return { problem: 'چه چیزی عوض شود؟ دست‌کم یکی را انتخاب کن' };
    const set = {}, clear = [];
    let rows = [];
    let focus = null;
    const need = (field, msgEl, input) => { field.classList.add('error'); msgEl.textContent = 'لازم است'; if (!focus) focus = input; };
    if (pick.party.checked) {
      if (!partyInput.value.trim()) need($('editPartyField'), $('editPartyMsg'), partyInput);
      else set.party = { name: partyInput.value.trim() };
    }
    if (pick.benef.checked) {
      if (mode.benef === 'clear') clear.push('beneficiary_id');
      else {
        if (!benefInput.value.trim()) need($('editBenefField'), $('editBenefMsg'), benefInput);
        if (!checkNid() && !focus) focus = nidInput;
        set.beneficiary = { name: benefInput.value.trim(), national_id: digits(nidInput.value) };
      }
    }
    if (pick.owner.checked) {
      if (mode.owner === 'clear') clear.push('owner_id');
      else if (mode.owner === 'one') {
        if (!ownerInput.value.trim()) need($('editOwnerField'), $('editOwnerMsg'), ownerInput);
        else set.owner = { name: ownerInput.value.trim() };
      } else {
        rows = ids.filter((id) => (ed.rowOwners.get(id) || '').trim()).map((id) => ({ id, owner: { name: ed.rowOwners.get(id).trim() } }));
        if (!rows.length) return { problem: 'صاحب چکِ دست‌کم یکی از ردیف‌ها را بنویس', focus: rowsEl.querySelector('.e-owner-field input') };
      }
    }
    if (pick.spend.checked) {
      if (mode.spend === 'clear') clear.push('spend_date');
      else if (!spendDate.validate()) { if (!focus) focus = spendDate.input; }
      else set.spend_date = jalaliStrToIso(`${spendDate.yearStr()}/${spendDate.monthStr()}/${spendDate.dayStr()}`);
    }
    if (pick.status.checked) {
      if (!mode.status) return { problem: 'وضعیت را انتخاب کن' };
      set.status = mode.status;
      if (mode.status === 'problem') set.status_reason = reasonInput.value.trim();
    }
    if (focus) return { problem: 'چند فیلد را باید درست کرد', focus };
    return { req: { ids, set, clear, rows } };
  }

  const sheet = $('editSheet');
  let preview = null;   // { req, warn }
  function openPreview() {
    footMsg.textContent = '';
    const built = buildRequest();
    if (built.problem) {
      footMsg.textContent = built.problem;
      if (built.focus) built.focus.focus();
      return;
    }
    const { req } = built;
    const sel = req.ids.map(recOf).filter(Boolean);
    const touchesBenef = !!req.set.beneficiary || req.clear.includes('beneficiary_id');
    const touchesOwner = !!req.set.owner || req.rows.length || req.clear.includes('owner_id');
    const done = touchesBenef ? sel.filter((c) => c.stage === 'sent' && c.status === 'done') : [];
    const benefNow = req.set.beneficiary ? (findPersonByNid(req.set.beneficiary.national_id) || findPersonByName(req.set.beneficiary.name)) : null;
    const prevBenef = req.set.beneficiary ? sel.filter((c) => c.benefId && !(benefNow && benefNow.id === c.benefId)) : [];
    const clearsPeople = req.clear.includes('beneficiary_id') || req.clear.includes('owner_id');
    const rowIds = new Set(req.rows.map((r) => r.id));
    const ownerless = req.set.beneficiary ? sel.filter((c) => !c.ownerId && !req.set.owner && !rowIds.has(c.id)) : [];
    const notSent = req.set.status ? sel.filter((c) => c.stage !== 'sent') : [];

    // the sum of it
    const what = [];
    if (req.set.party) what.push(`طرف حساب ← ${req.set.party.name}`);
    if (req.set.beneficiary) what.push(`ذینفع ← ${req.set.beneficiary.name} (${req.set.beneficiary.national_id})`);
    if (req.clear.includes('beneficiary_id')) what.push('ذینفع خالی می‌شود');
    if (req.set.owner) what.push(`صاحب چک ← ${req.set.owner.name}`);
    if (req.rows.length) what.push(`صاحب چکِ ${fa(req.rows.length)} چک ردیف به ردیف`);
    if (req.clear.includes('owner_id')) what.push('صاحب چک خالی می‌شود');
    if (req.set.spend_date) what.push(`تاریخ خرج ← ${faDate(isoToJalaliStr(req.set.spend_date))}`);
    if (req.clear.includes('spend_date')) what.push('تاریخ خرج خالی می‌شود');
    if (req.set.status) what.push(`وضعیت ← ${statusById(req.set.status).name}${req.set.status_reason ? `: ${req.set.status_reason}` : ''}`);

    // what the boxes say; «این‌ها را هم» brings the registered ones in, and
    // with them what happens to sent cheques — so the sheet is drawn again
    const pv = { includeDone: false, resend: false, unsend: false };
    const apply = $('editApply');
    const body = $('editSheetBody');
    function draw() {
      body.innerHTML = '';
      const add = (cls, text) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; body.appendChild(d); return d; };
      const counted = sel.filter((c) => pv.includeDone || !done.includes(c));
      add('edit-sheet-sum', `${fa(counted.length)} چک`);
      for (const w of what) add('edit-sheet-what', w);
      const check = (key, label, redraw) => {
        const l = document.createElement('label');
        l.className = 'edit-sheet-check';
        l.innerHTML = '<input type="checkbox"><span></span>';
        const box = l.querySelector('input');
        box.dataset.key = key;
        box.checked = pv[key];
        l.querySelector('span').textContent = label;
        box.addEventListener('change', () => {
          pv[key] = box.checked;
          if (redraw) { draw(); body.querySelector(`[data-key="${key}"]`).focus(); } else gate();
        });
        return l;
      };
      const warning = (text, list) => {
        const d = add('edit-sheet-warn', text);
        if (list && list.length) {
          const more = document.createElement('button');
          more.type = 'button'; more.className = 'edit-sheet-more'; more.textContent = 'کدام‌ها؟';
          more.addEventListener('click', () => { more.replaceWith(Object.assign(document.createElement('span'), { className: 'edit-sheet-list', textContent: list.map((c) => toFa(c.serial)).join('، ') })); });
          d.appendChild(more);
        }
        return d;
      };
      const sent = sel.filter((c) => c.stage === 'sent' && (pv.includeDone || !done.includes(c)));
      pv.unsendNeeded = false;
      if (prevBenef.length) warning(`${fa(prevBenef.length)} چک قبلاً ذینفع دیگری داشتند`, prevBenef);
      if (done.length) {
        warning(`${fa(done.length)} چک «ثبت شد» هستند؛ تغییر ذینفع در چکینو ثبتِ صیاد را عوض نمی‌کند`, done)
          .appendChild(check('includeDone', 'این‌ها را هم', true));
      }
      if (sent.length && clearsPeople) {
        pv.unsendNeeded = true;
        const who = req.clear.includes('beneficiary_id') ? 'ذینفع' : 'صاحب چک';
        warning(`${fa(sent.length)} چک ارسال‌شده‌اند. با خالی کردن ${who} از بُرد برداشته می‌شوند و به «منتظر ذینفع» برمی‌گردند`, sent)
          .appendChild(check('unsend', 'موافقم'));
      } else if (sent.length && (req.set.beneficiary || touchesOwner)) {
        const who = req.set.beneficiary ? 'ذینفع' : 'صاحب چک';
        warning(`${fa(sent.length)} چک قبلاً ارسال شده‌اند؛ با تغییر ${who} باید دوباره بفرستی`, sent)
          .appendChild(check('resend', 'بعد از اعمال، برای ارسالِ دوباره آماده شوند'));
      }
      if (ownerless.length) warning(`${fa(ownerless.length)} چک صاحب چک ندارند؛ در پنجره‌ی ارسال در بخش «بدون صاحب چک» می‌آیند تا همان‌جا تعیین شوند`);
      if (notSent.length) warning(`وضعیت فقط برای چک‌های ارسال‌شده است؛ ${fa(notSent.length)} چکِ دیگر وضعیتشان عوض نمی‌شود`);
      gate();
    }
    // taking cheques off the board waits for «موافقم»; nothing left, nothing to apply
    function gate() {
      const counted = sel.filter((c) => pv.includeDone || !done.includes(c)).length;
      apply.disabled = !counted || (pv.unsendNeeded && !pv.unsend);
    }
    draw();
    $('editSheetErr').textContent = '';
    preview = { req, pv };
    setInert(true);
    sheet.hidden = false;
    setTimeout(() => (apply.disabled ? (body.querySelector('[data-key="unsend"]') || body.querySelector('[data-key="includeDone"]') || $('editSheetBack')) : apply).focus(), 30);
  }
  function closePreview() {
    sheet.hidden = true;
    setInert(false);
    preview = null;
    $('editPreview').focus();
  }
  function setInert(on) {
    const panel = overlay.querySelector('.edit-panel');
    if (on) panel.setAttribute('inert', ''); else panel.removeAttribute('inert');
  }
  $('editPreview').addEventListener('click', openPreview);
  $('editSheetBack').addEventListener('click', closePreview);

  let applying = false;
  async function apply() {
    if (!preview || applying) return;
    const { req } = preview;
    const sel = req.ids.map(recOf).filter(Boolean);
    // (the registered ones left out go anyway: the server leaves them as they are)
    const versions = {};
    for (const c of sel) versions[c.id] = c.version;
    const body = { ...req, versions,
      include_done: preview.pv.includeDone, resend: preview.pv.resend, unsend: preview.pv.unsend };
    if (!Object.keys(body.set).length) delete body.set;
    if (!body.clear.length) delete body.clear;
    if (!body.rows.length) delete body.rows;
    applying = true;
    const btn = $('editApply');
    btn.disabled = true;
    btn.textContent = 'در حال اعمال…';
    let r;
    try {
      r = await apiJson('/checks/bulk-update', { method: 'POST', body: JSON.stringify(body) });
    } catch (e) {
      applying = false;
      btn.disabled = false;
      btn.textContent = 'اعمال';
      if (e.sessionEnded) return;
      const code = e.data && e.data.code;
      if (e.status === 409 && code === 'version_conflict') {
        const serials = (e.data.changed || []).map((id) => (recOf(id) || {}).serial).filter(Boolean).map(toFa).join('، ');
        closePreview();
        await loadChecksFromApi();
        renderTable();
        refresh();
        footMsg.textContent = `این چک‌ها همین حالا جای دیگری تغییر کردند: ${serials}. فهرست تازه شد؛ دوباره بررسی کن.`;
        return;
      }
      $('editSheetErr').textContent = requestErrorText(e, 'اعمال نشد');
      return;
    }
    applying = false;
    btn.disabled = false;
    btn.textContent = 'اعمال';
    closePreview();
    await loadChecksFromApi();
    renderTable();
    ed.rowOwners.clear();
    refresh();
    const n = r.summary.changed;
    const skipped = r.summary.skipped_done.length;
    const note = skipped ? `؛ ${fa(skipped)} چک «ثبت شد» دست نخورد` : '';
    if (!n) { footMsg.textContent = `چیزی عوض نشد${note}`; return; }
    lastOp = r.op_id;
    showToast(`${fa(n)} چک به‌روز شد${note}`, { action: { label: 'برگردون', run: () => undo(r.op_id) }, duration: 30000 });
    // a beneficiary given: on to sending — the ones ready, and the ones
    // that only lack their owner (the window asks for it)
    if (req.set && req.set.beneficiary && window.ChekinoSend) {
      const go = r.updated.filter((c) => c.stage === 'ready' || (c.stage === 'waiting' && c.beneficiary_id && !c.owner_id)).map((c) => c.id);
      if (go.length) window.ChekinoSend.open(go);
    }
  }
  $('editApply').addEventListener('click', apply);

  // «برگردون»: from the toast, Ctrl+Z, or the list of recent changes
  let lastOp = null;
  async function undo(opId) {
    lastOp = null;
    try {
      const r = await apiJson(`/bulk-ops/${opId}/undo`, { method: 'POST' });
      await loadChecksFromApi();
      renderTable();
      if (ed) refresh();
      if (window.ChekinoBulk && window.ChekinoBulk.refreshResume) window.ChekinoBulk.refreshResume();
      showToast(r.kind === 'batch_commit' ? 'برگردانده شد؛ ردیف‌ها دوباره در «افزودن گروهی» هستند' : 'برگردانده شد');
      if (!recent.hidden) showRecent();
    } catch (e) {
      if (e.sessionEnded) return;
      const code = e.data && e.data.code;
      showToast(code === 'changed' ? 'بعضی از این چک‌ها بعد از این تغییر دوباره تغییر کرده‌اند؛ برگرداندن ممکن نیست'
        : code === 'too_old' || code === 'already_undone' ? e.message : requestErrorText(e, 'برگردانده نشد'));
    }
  }
  document.addEventListener('keydown', (e) => {
    if (!lastOp || e.code !== 'KeyZ' || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!$('appToastAction').classList.contains('show')) return;
    e.preventDefault();
    const op = lastOp;
    $('appToastAction').classList.remove('show');
    undo(op);
  });

  // «آخرین تغییرات»: the last ten, each with its «برگردون» while it can be
  const recent = $('editRecent');
  const recentBtn = $('editRecentBtn');
  function relTime(iso) {
    const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (min < 1) return 'همین الان';
    if (min < 60) return `${fa(min)} دقیقه پیش`;
    const h = Math.round(min / 60);
    return h < 24 ? `${fa(h)} ساعت پیش` : 'دیروز';
  }
  const OP_NAME = {
    batch_commit: (o) => `افزودن گروهی${o.party_name ? `، ${o.party_name}` : ''}`,
    mark_sent: () => 'ارسال به صاحب چک‌ها',
    bulk_update: (o) => `ویرایش گروهی${o.label ? `: ${o.label}` : ''}`,
  };
  async function showRecent() {
    recent.hidden = false;
    recentBtn.setAttribute('aria-expanded', 'true');
    recent.innerHTML = '<div class="edit-recent-empty">در حال بارگذاری…</div>';
    let ops;
    try { ops = await apiJson('/bulk-ops?limit=10'); } catch (e) { if (e.sessionEnded) return; recent.innerHTML = ''; const d = document.createElement('div'); d.className = 'edit-recent-empty'; d.textContent = requestErrorText(e, 'فهرست بار نشد'); recent.appendChild(d); return; }
    recent.innerHTML = '';
    if (!ops.length) { recent.innerHTML = '<div class="edit-recent-empty">هنوز تغییر گروهی‌ای نیست</div>'; return; }
    for (const o of ops) {
      const line = document.createElement('div');
      line.className = 'edit-recent-line';
      const text = document.createElement('div');
      text.className = 'edit-recent-text';
      const name = document.createElement('b');
      name.textContent = (OP_NAME[o.kind] || (() => o.kind))(o);
      const meta = document.createElement('span');
      meta.textContent = `${fa(o.count)} چک، ${relTime(o.created_at)}`;
      text.append(name, meta);
      line.appendChild(text);
      if (o.undone_at) {
        const s = document.createElement('span'); s.className = 'edit-recent-state'; s.textContent = 'برگردانده شد'; line.appendChild(s);
      } else if (o.undoable) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'bulk-btn edit-recent-undo'; b.textContent = 'برگردون';
        b.addEventListener('click', () => undo(o.id));
        line.appendChild(b);
      }
      recent.appendChild(line);
    }
    const first = recent.querySelector('button');
    if (first) first.focus();
  }
  function hideRecent() { recent.hidden = true; recentBtn.setAttribute('aria-expanded', 'false'); }
  recentBtn.addEventListener('click', (e) => { e.stopPropagation(); if (recent.hidden) showRecent(); else hideRecent(); });
  recent.addEventListener('click', (e) => e.stopPropagation());
  overlay.addEventListener('click', () => { if (!recent.hidden) hideRecent(); });

  // ---------------------------------------------------------------
  // Opening and closing
  // ---------------------------------------------------------------
  function refresh() {
    if (!ed) return;
    compute();
    showFilters();
    showSummary();
    renderRows();
    showChange();
  }
  function reset() {
    serialsInput.value = '';
    serialsInput.style.height = '';
    partyFilter.value = '';
    FIELDS.forEach((f) => { pick[f].checked = false; });
    Object.assign(mode, { benef: 'set', owner: 'one', spend: 'set', status: '' });
    [partyInput, benefInput, nidInput, ownerInput, reasonInput].forEach((i) => { i.value = ''; });
    spendDate.reset();
    overlay.querySelectorAll('.edit-change .form-field').forEach((f) => f.classList.remove('error'));
    footMsg.textContent = '';
    sheet.hidden = true;
    setInert(false);
    hideRecent();
  }
  // opts: { stages: ['waiting'], serials: '…' }
  function open(opts = {}) {
    reset();
    ed = { stages: new Set(opts.stages || []), party: '', noOwner: false, noBenef: false, sel: new Set(), seen: new Set(), confirmed: new Set(),
      shown: PAGE, open: '', anchor: null, rowOwners: new Map(), results: [], tokens: [], flags: new Map() };
    if (opts.serials) serialsInput.value = opts.serials;
    pushBackGuard();
    overlay.classList.add('show');
    document.body.classList.add('bulk-open');
    refresh();
    setTimeout(() => serialsInput.focus(), 50);
  }
  function close() {
    if (!ed) { overlay.classList.remove('show'); return; }
    destroyRowAcs();
    ed = null;
    rowsEl.innerHTML = '';
    overlay.classList.remove('show');
    if (!(window.ChekinoBulk && window.ChekinoBulk.isOpen()) && !(window.ChekinoSend && window.ChekinoSend.isOpen())) document.body.classList.remove('bulk-open');
  }
  $('editClose').addEventListener('click', close);

  const listsOpen = () => [partyFilterList, partyList, benefList, ownerList, ...rowAcs.map((a) => a.list)].find((l) => l.classList.contains('show'));
  // Escape on an open name list closes the list only
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const l = listsOpen();
    if (l) { e.stopPropagation(); l.classList.remove('show'); }
  }, true);

  $('editBtn').addEventListener('click', () => open());
  window.ChekinoEdit = {
    isOpen: () => overlay.classList.contains('show'),
    escape() {
      const l = listsOpen();
      if (l) { l.classList.remove('show'); return; }
      if (!sheet.hidden) { closePreview(); return; }
      if (!recent.hidden) { hideRecent(); recentBtn.focus(); return; }
      close();
    },
    open,
  };
  if (window.ChekinoPalette) {
    window.ChekinoPalette.register({
      title: 'ویرایش گروهی', hint: 'ذینفع، صاحب چک، طرف حساب… برای چند چک با هم', group: 'چک‌ها', order: 1.55,
      keywords: 'bulk edit many beneficiary owner ویرایش گروهی ذینفع صاحب چک سریال',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
      run: () => open(),
    });
    window.ChekinoPalette.register({
      title: 'منتظر ذینفع', hint: 'چک‌هایی که ذینفع یا صاحب چکشان هنوز معلوم نیست', group: 'چک‌ها', order: 1.56,
      keywords: 'waiting beneficiary منتظر ذینفع',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      when: () => loadCheques().some((c) => c.stage === 'waiting'),
      run: () => open({ stages: ['waiting'] }),
    });
  }
})();
