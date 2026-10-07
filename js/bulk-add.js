// Bulk add (spec F2–F4, 5.2): many cheques at once, in a panel over the
// board. One party and one spend date at the top for all of them; a row per
// cheque — serial, sayad id, amount, due date, and its owner when known; the
// beneficiary at the top too, when the user has one. Saved rows become
// cheques «منتظر ذینفع» (waiting: owner or beneficiary still unknown) or
// «آماده‌ی ارسال» (ready: both known) — never straight onto the board, which
// shows only cheques sent to their owner.
//
// Nothing typed is lost: every change goes at once to this device
// (IndexedDB, keyed by company) and, two seconds after the typing stops, to
// the server (PATCH /api/batches/:id, versioned). Offline, it waits on this
// device and goes when the connection is back. An unfinished batch shows as
// a bar over the board («ادامه» / «حذف»).
//
// Uses the dashboard's shared pieces (js/dashboard.js): createDateField,
// createAutocomplete, askChoice/askConfirm, showToast, apiJson, the people
// lists — and ChekinoSerials (js/serials.js) to read a pasted list.
//
// Every company has it. (The test company had it alone while the round —
// add → send → board — was being built; `enabled` stays as the one switch
// the send window and the page ask.)
(function () {
  const overlay = document.getElementById('bulkOverlay');
  if (!overlay) return;

  function enabled() { return true; }
  const $ = (id) => document.getElementById(id);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c / 4)).toString(16)));
  const digits = (v) => toEnDigits(v || '').replace(/[^0-9]/g, '');
  const fa = (n) => toFa(String(n));

  // ---------------------------------------------------------------
  // This device's copy (IndexedDB «chekino», store «batches»)
  // ---------------------------------------------------------------
  let idbP = null;
  function idb() {
    if (!idbP) {
      idbP = new Promise((resolve) => {
        let req;
        try { req = indexedDB.open('chekino', 1); } catch (e) { resolve(null); return; }
        req.onupgradeneeded = () => req.result.createObjectStore('batches', { keyPath: 'key' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      });
    }
    return idbP;
  }
  async function idbDo(mode, fn) {
    const db = await idb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('batches', mode);
        const req = fn(tx.objectStore('batches'));
        tx.oncomplete = () => resolve(req ? req.result : null);
        tx.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  const mirrorKey = (clientId) => `${PAGE_COMPANY}:${clientId}`;
  const mirrorPut = (rec) => idbDo('readwrite', (s) => s.put(rec));
  const mirrorDel = (clientId) => idbDo('readwrite', (s) => s.delete(mirrorKey(clientId)));
  async function mirrorsOfCompany() {
    const all = (await idbDo('readonly', (s) => s.getAll())) || [];
    return all.filter((r) => r.company === PAGE_COMPANY);
  }

  // ---------------------------------------------------------------
  // The open batch
  // ---------------------------------------------------------------
  // st = { clientId, serverId, version, kind, header, hasBenef, rows,
  //        unsynced, localAt, saving, offline, savedAt, committing }
  // row = { ref, position, serial, sayad_id, amount, due_date, owner,
  //         include, note, serverError, touched, ui }
  let st = null;
  const rowsEl = $('bulkRows');

  const emptyRow = (o) => ({ ref: uuid(), position: 0, serial: '', sayad_id: '', amount: '', due_date: '', owner: null, include: true, note: '', serverError: '', touched: {}, ...o });
  const isBlank = (r) => !r.serial && !r.sayad_id && !r.amount && !r.due_date && !(r.owner && r.owner.name) && !(r.ui && r.ui.due && !r.ui.due.isEmpty());

  function draftOf(b = st) {
    const h = b.header;
    return {
      header: {
        party: h.party && h.party.name ? { name: h.party.name } : null,
        spend_date: h.spend_date || '',
        beneficiary: b.hasBenef && h.beneficiary && (h.beneficiary.name || h.beneficiary.national_id)
          ? { name: h.beneficiary.name || '', national_id: h.beneficiary.national_id || '' } : null,
        has_beneficiary: b.hasBenef,
      },
      rows: b.rows.filter((r) => !isBlank(r)).map((r, i) => ({
        ref: r.ref, position: i + 1, serial: r.serial, sayad_id: r.sayad_id, amount: r.amount,
        due_date: r.due_date, owner: r.owner && r.owner.name ? { name: r.owner.name } : null,
        include: r.include, note: r.note || undefined,
      })),
    };
  }
  function record(b = st) {
    return { key: mirrorKey(b.clientId), company: PAGE_COMPANY, clientId: b.clientId, serverId: b.serverId, version: b.version,
      kind: b.kind, draft: draftOf(b), unsynced: b.unsynced, updatedAt: b.localAt || Date.now() };
  }

  // ---------------------------------------------------------------
  // The panel's own fields: party, spend date, beneficiary
  // ---------------------------------------------------------------
  const partyInput = $('bulkParty'), partyField = $('bulkPartyField'), partyMsg = $('bulkPartyMsg');
  const benefInput = $('bulkBenef'), benefField = $('bulkBenefField'), benefMsg = $('bulkBenefMsg');
  const nidInput = $('bulkNid'), nidField = $('bulkNidField'), nidMsg = $('bulkNidMsg');
  const benefSwitch = $('bulkHasBenef');

  const partyAC = createAutocomplete({
    input: partyInput, list: $('bulkPartyList'), field: partyField,
    search: (q) => allParties().filter((x) => normalizeName(x).includes(normalizeName(q))),
    primary: (x) => x,
    allowNew: true, newLabel: (q) => (findPersonByName(q) ? 'طرف حساب موجود' : 'طرف حساب جدید'),
    hasExact: (q) => allParties().some((x) => normalizeName(x) === normalizeName(q)),
    pick: (x) => { partyInput.value = x; },
    onBlur: () => { foldOntoKnownPerson(partyInput); },
    onChange: () => { if (!st) return; st.header.party = { name: partyInput.value.trim() }; partyField.classList.remove('error'); changed(); },
    onEnter: () => spendDate.input.focus(),
  });
  const spendDate = createDateField({
    input: $('bulkSpend'), field: $('bulkSpendField'), msg: $('bulkSpendMsg'), calBtn: $('bulkSpendCal'), required: true, prefillToday: true,
    onChange: (api) => { if (!st) return; st.header.spend_date = api.isFilled() ? jalaliStrToIso(`${api.yearStr()}/${api.monthStr()}/${api.dayStr()}`) : ''; changed(); },
  });

  const benefsOfParty = () => beneficiariesForParty(partyInput.value);
  // A national id the page fills in itself is selected when the field is
  // entered, so typing one replaces it rather than running on after it (as
  // in the cheque form: ten digits typed after ten filled in made an
  // eleven-digit id — someone else)
  let nidFilledIn = false;
  nidInput.addEventListener('focus', () => { if (nidFilledIn && nidInput.value) nidInput.select(); });
  function fillNid(nid) { nidInput.value = toFa(digits(nid)); nidFilledIn = true; }
  function setBenef(name, nid) {
    benefInput.value = name || '';
    if (nid) fillNid(nid); else nidInput.value = '';
    benefField.classList.remove('error');
    nidField.classList.remove('error');
    syncBenef();
  }
  function syncBenef() {
    if (!st) return;
    st.header.beneficiary = { name: benefInput.value.trim(), national_id: digits(nidInput.value) };
    changed();
  }
  const benefAC = createAutocomplete({
    input: benefInput, list: $('bulkBenefList'), field: benefField,
    search: (q) => benefsOfParty().filter((p) => normalizeName(p.name).includes(normalizeName(q))),
    primary: (p) => p.name, secondary: (p) => p.nid,
    allowNew: true, newLabel: (q) => (findPersonByName(q) ? 'شخص موجود' : 'شخص جدید'),
    hasExact: (q) => benefsOfParty().some((p) => normalizeName(p.name) === normalizeName(q)),
    emptyText: 'برای این طرف حساب شخصی ثبت نشده',
    pick: (p) => setBenef(p.name, p.nid),
    onBlur: () => {
      const person = foldOntoKnownPerson(benefInput);
      if (person && person.national_id && !digits(nidInput.value)) fillNid(person.national_id);
      syncBenef();
    },
    onChange: () => { benefField.classList.remove('error'); syncBenef(); },
    onEnter: () => nidInput.focus(),
  });
  nidInput.addEventListener('input', () => {
    nidFilledIn = false;
    nidInput.value = toFa(digits(nidInput.value).slice(0, 11));
    nidField.classList.remove('error');
    if (digits(nidInput.value).length === 11) checkNid();
    syncBenef();
  });
  nidInput.addEventListener('blur', () => {
    if (!digits(nidInput.value)) return;
    checkNid();
    // a national id on file names its person
    const holder = findPersonByNid(nidInput.value);
    if (holder && !benefInput.value.trim()) { benefInput.value = holder.full_name; syncBenef(); }
  });
  function checkNid() {
    const d = digits(nidInput.value);
    if (!d) { nidField.classList.add('error'); nidMsg.textContent = 'لازم است'; return false; }
    if (d.length !== 10 && d.length !== 11) { nidField.classList.add('error'); nidMsg.textContent = '۱۰ یا ۱۱ رقم باشد'; return false; }
    const v = window.ChekinoNid.check(d);
    if (!v.ok) { nidField.classList.add('error'); nidMsg.textContent = v.error; return false; }
    nidField.classList.remove('error');
    return true;
  }
  benefSwitch.addEventListener('click', () => {
    const on = benefSwitch.getAttribute('aria-checked') !== 'true';
    setBenefSwitch(on);
    if (st) { st.hasBenef = on; changed(); }
    if (on) benefInput.focus();
  });
  function setBenefSwitch(on) {
    benefSwitch.setAttribute('aria-checked', String(on));
    overlay.classList.toggle('has-benef', on);
    benefField.hidden = !on;
    nidField.hidden = !on;
  }

  // ---------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------
  // The columns in order, for Enter, Shift+Enter and Alt+↑/↓
  const COLS = ['serial', 'sayad', 'amount', 'due', 'owner'];
  const LABELS = { serial: 'سریال', sayad: 'شناسه صیادی', amount: 'مبلغ', due: 'سررسید' };
  const CAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  // a digits-only input shown in groups (sayad id in fours, amount in
  // thousands), the caret kept after the same digit as the user types
  function regroup(input, raw, group, max) {
    const caret = input.selectionStart ?? input.value.length;
    const before = digits(input.value.slice(0, caret)).length;
    const d = raw.slice(0, max);
    const shown = group(d);
    input.value = shown;
    if (document.activeElement === input) {
      let seen = 0, pos = shown.length;
      if (before === 0) pos = 0;
      else for (let i = 0; i < shown.length; i++) { if (/[0-9۰-۹]/.test(shown[i])) seen++; if (seen === before) { pos = i + 1; break; } }
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    }
    return d;
  }
  const groupFours = (d) => toFa(d.replace(/(.{4})(?=.)/g, '$1 '));
  const groupThousands = (d) => (d === '' ? '' : toFa(groupDigits(d.replace(/^0+(?=\d)/, ''))));

  function buildRow(row) {
    const el = document.createElement('div');
    el.className = 'bulk-row';
    el.dataset.ref = row.ref;
    el.innerHTML = `
      <label class="b-inc" title="در این ثبت" data-label=""><input type="checkbox" aria-label="در این ثبت"></label>
      <span class="b-idx" aria-hidden="true"></span>
      <div class="form-field b-cell b-serial" data-label="سریال"><div class="ig is-ltr"><input type="text" data-col="serial" inputmode="numeric" maxlength="6" autocomplete="off" aria-label="سریال"></div></div>
      <div class="form-field b-cell b-sayad" data-label="شناسه صیادی"><div class="ig is-ltr"><input type="text" data-col="sayad" inputmode="numeric" maxlength="19" autocomplete="off" aria-label="شناسه صیادی"></div></div>
      <div class="form-field b-cell b-amount" data-label="مبلغ"><div class="amount-box"><input type="text" data-col="amount" class="amount-input" inputmode="numeric" autocomplete="off" aria-label="مبلغ"><span class="amount-unit" title="ریال">﷼</span></div><div class="b-words"></div></div>
      <div class="form-field date-field b-cell b-due" data-label="سررسید"><div class="date-input-wrap"><input type="text" data-col="due" class="date-mask-input" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="روز / ماه / سال" aria-label="سررسید"><button type="button" class="date-cal-btn" tabindex="-1" title="انتخاب از تقویم">${CAL_SVG}</button></div></div>
      <div class="form-field ac-field b-cell b-owner" data-label="صاحب چک"><div class="ig"><input type="text" data-col="owner" class="ac-input" autocomplete="off" aria-label="صاحب چک"></div></div>
      <button type="button" class="b-del" title="حذف ردیف" aria-label="حذف ردیف">${X_SVG}</button>
      <div class="b-msg" aria-live="polite"></div>`;
    const q = (sel) => el.querySelector(sel);
    const ui = {
      el, inc: q('.b-inc input'), idx: q('.b-idx'),
      serial: q('[data-col="serial"]'), sayad: q('[data-col="sayad"]'), amount: q('[data-col="amount"]'), words: q('.b-words'),
      owner: q('[data-col="owner"]'), msg: q('.b-msg'),
      cells: { serial: q('.b-serial'), sayad: q('.b-sayad'), amount: q('.b-amount'), due: q('.b-due'), owner: q('.b-owner') },
      dueMsg: document.createElement('span'),
      ownerList: document.createElement('div'),
    };
    row.ui = ui;
    // the list lives under <body>, like every other (see positionDropdown)
    ui.ownerList.className = 'ac-list';
    document.body.appendChild(ui.ownerList);

    ui.serial.value = row.serial ? toFa(row.serial) : '';
    ui.sayad.value = row.sayad_id ? groupFours(row.sayad_id) : '';
    ui.amount.value = groupThousands(row.amount || '');
    ui.words.textContent = amountInWords(row.amount || '');
    ui.owner.value = row.owner && row.owner.name ? row.owner.name : '';
    ui.inc.checked = row.include !== false;

    // a serial or a sayad id is judged against the other rows too: a change
    // to one can make (or unmake) a twin elsewhere in the list
    const edited = (col) => { delete row.touched[col]; row.serverError = ''; ui.cells[col] && ui.cells[col].classList.remove('error'); if (col === 'serial' || col === 'sayad') revalidate(); else showRow(row); changed(); };
    ui.serial.addEventListener('input', () => {
      row.serial = digits(arabicToFa(ui.serial.value)).slice(0, 6);
      ui.serial.value = toFa(row.serial);
      row.note = '';   // a serial guessed from a longer number: the user has now said what it is
      edited('serial');
    });
    ui.sayad.addEventListener('input', () => { row.sayad_id = regroup(ui.sayad, digits(ui.sayad.value), groupFours, 16); edited('sayad'); });
    ui.amount.addEventListener('input', () => {
      row.amount = regroup(ui.amount, digits(ui.amount.value), groupThousands, 15).replace(/^0+(?=\d)/, '');
      ui.words.textContent = amountInWords(row.amount);
      edited('amount');
    });
    // a space adds three zeros, as in the cheque form
    ui.amount.addEventListener('keydown', (e) => {
      if (e.key !== ' ' || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const caret = ui.amount.selectionStart ?? ui.amount.value.length;
      const before = digits(ui.amount.value.slice(0, caret)).length;
      const d = (row.amount.slice(0, before) + '000' + row.amount.slice(before)).slice(0, 15);
      row.amount = d.replace(/^0+(?=\d)/, '');
      ui.amount.value = groupThousands(row.amount);
      ui.words.textContent = amountInWords(row.amount);
      edited('amount');
    });
    ui.due = createDateField({
      input: q('[data-col="due"]'), field: ui.cells.due, msg: ui.dueMsg, calBtn: q('.date-cal-btn'), required: true,
      onChange: (api) => { row.due_date = api.isFilled() ? jalaliStrToIso(`${api.yearStr()}/${api.monthStr()}/${api.dayStr()}`) : ''; edited('due'); },
    });
    if (row.due_date) {
      const [jy, jm, jd] = isoToJalaliStr(row.due_date).split('/').map(Number);
      ui.due.setDate(jy, jm, jd);
    }
    ui.ownerAC = createAutocomplete({
      input: ui.owner, list: ui.ownerList, field: ui.cells.owner,
      search: (qq) => allOwners().filter((x) => normalizeName(x).includes(normalizeName(qq))),
      primary: (x) => x,
      allowNew: true, newLabel: newPersonLabel,
      hasExact: (qq) => allOwners().some((x) => normalizeName(x) === normalizeName(qq)),
      pick: (x) => { ui.owner.value = x; },
      onBlur: () => { foldOntoKnownPerson(ui.owner); },
      onChange: () => { row.owner = ui.owner.value.trim() ? { name: ui.owner.value.trim() } : null; changed(); },
      onEnter: () => moveFrom(row, 'owner', 1),
    });
    ui.inc.addEventListener('change', () => { row.include = ui.inc.checked; showCount(); changed(); });
    q('.b-del').addEventListener('click', () => removeRow(row));
    // leaving a field is when it's judged
    for (const col of ['serial', 'sayad', 'amount']) ui[col].addEventListener('blur', () => { if (!isBlank(row)) { row.touched[col] = true; showRow(row); } });
    ui.due.input.addEventListener('blur', () => { if (!isBlank(row)) { row.touched.due = true; showRow(row); } });
    return el;
  }
  function destroyRow(row) {
    if (!row.ui) return;
    row.ui.ownerAC.close();
    row.ui.ownerList.remove();
    row.ui.el.remove();
    row.ui = null;
  }
  function addRow(o, { focus } = {}) {
    const row = emptyRow(o);
    st.rows.push(row);
    rowsEl.appendChild(buildRow(row));
    renumber();
    showRow(row);
    if (focus) row.ui.serial.focus();
    return row;
  }
  function removeRow(row) {
    const i = st.rows.indexOf(row);
    if (i < 0) return;
    const next = st.rows[i + 1] || st.rows[i - 1];
    destroyRow(row);
    st.rows.splice(i, 1);
    if (!st.rows.length) addRow({});
    renumber();
    revalidate();
    changed();
    (next && next.ui ? next.ui.serial : $('bulkAddRow')).focus();
  }
  function renumber() {
    st.rows.forEach((r, i) => { if (r.ui) { r.ui.idx.textContent = fa(i + 1); r.ui.inc.parentElement.dataset.label = `ردیف ${fa(i + 1)}`; } });
    showCount();
  }

  // ---- judging a row ----
  // Problems block a row from being saved; a note (a serial seen before, a
  // serial read from a longer number) only asks the user to look.
  function rowProblems(row) {
    const p = {};
    const others = st.rows.filter((r) => r !== row && !isBlank(r));
    if (!row.serial) p.serial = 'لازم است';
    else if (row.serial.length !== 6) p.serial = 'باید ۶ رقم باشد';
    if (!row.sayad_id) p.sayad = 'لازم است';
    else if (row.sayad_id.length !== 16) p.sayad = 'باید ۱۶ رقم باشد';
    else {
      const taken = loadCheques().find((c) => digits(c.sayad) === row.sayad_id);
      const twin = others.find((r) => r.sayad_id === row.sayad_id);
      if (taken) p.sayad = `این شناسه قبلاً ثبت شده — چک ${fa(taken.serial)}`;
      else if (twin) p.sayad = `در همین فهرست تکرار شده — ردیف ${fa(st.rows.indexOf(twin) + 1)}`;
    }
    const amt = row.amount ? Number(row.amount) : 0;
    if (!row.amount) p.amount = 'لازم است';
    else if (!(amt > 0 && amt < 1e13)) p.amount = 'مبلغ غیرعادی است؛ صفر اضافه نیست؟';
    if (!row.due_date) {
      p.due = row.ui && row.ui.due && !row.ui.due.isEmpty() ? (row.ui.due.validate(), row.ui.dueMsg.textContent || 'ناقص است') : 'لازم است';
    }
    return p;
  }
  function rowNote(row) {
    if (row.note) return row.note;
    if (row.serial && row.serial.length === 6) {
      const seen = loadCheques().find((c) => c.serial === row.serial);
      if (seen) return `این سریال برای چک دیگری هم ثبت شده (${seen.party || '—'}، ${faDate(seen.spendDate || seen.sendDate)})؛ بانک دیگری است؟`;
      const twin = st.rows.find((r) => r !== row && r.serial === row.serial);
      if (twin) return `این سریال در ردیف ${fa(st.rows.indexOf(twin) + 1)} هم هست؛ بانک دیگری است؟`;
    }
    return '';
  }
  const isComplete = (row) => !isBlank(row) && Object.keys(rowProblems(row)).length === 0;
  function showRow(row) {
    if (!row.ui) return;
    const p = isBlank(row) ? {} : rowProblems(row);
    const shown = [];
    for (const col of ['serial', 'sayad', 'amount', 'due']) {
      const bad = p[col] && row.touched[col];
      row.ui.cells[col].classList.toggle('error', !!bad);
      if (bad) shown.push(`${LABELS[col]}: ${p[col]}`);
    }
    const note = isBlank(row) ? '' : rowNote(row);
    const text = row.serverError || shown.join('؛ ') || note;
    row.ui.msg.textContent = text;
    row.ui.el.classList.toggle('has-error', !!(row.serverError || shown.length));
    row.ui.el.classList.toggle('has-note', !row.serverError && !shown.length && !!note);
    row.ui.el.classList.toggle('is-complete', isComplete(row));
    showCount();
  }
  function revalidate() { st.rows.forEach(showRow); }

  function showCount() {
    if (!st) return;
    const filled = st.rows.filter((r) => !isBlank(r));
    const complete = filled.filter(isComplete);
    const chosen = complete.filter((r) => r.include);
    const parts = [`${fa(filled.length)} ردیف`];
    if (filled.length) parts.push(`${fa(complete.length)} کامل`);
    if (filled.length - complete.length) parts.push(`${fa(filled.length - complete.length)} ناقص`);
    $('bulkCount').textContent = filled.length ? parts.join('، ') : '';
    const btn = $('bulkCommit');
    if (!st.committing) btn.textContent = chosen.length ? `ثبت ${fa(chosen.length)} چک` : 'ثبت';
  }

  // ---- moving with the keyboard ----
  function cellInput(row, col) { return col === 'due' ? row.ui.due.input : row.ui[col]; }
  function moveFrom(row, col, dir) {
    const i = st.rows.indexOf(row);
    const c = COLS.indexOf(col) + dir;
    if (c >= 0 && c < COLS.length) { cellInput(row, COLS[c]).focus(); return; }
    if (dir > 0) {
      const next = st.rows[i + 1] || addRow({});
      next.ui.serial.focus();
    } else if (i > 0) cellInput(st.rows[i - 1], 'owner').focus();
  }
  function moveRow(row, col, dir) {
    const next = st.rows[st.rows.indexOf(row) + dir];
    if (next) cellInput(next, col).focus();
  }
  overlay.addEventListener('keydown', (e) => {
    if (!st) return;
    // Escape on an open list closes the list only, not the panel
    if (e.key === 'Escape' && anyListOpen()) { e.stopPropagation(); closeLists(); return; }
    const t = e.target;
    const col = t && t.dataset ? t.dataset.col : null;
    const rowEl = t && t.closest ? t.closest('.bulk-row') : null;
    const row = rowEl ? st.rows.find((r) => r.ref === rowEl.dataset.ref) : null;
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); return; }
    if (!row || !col) {
      // the header: party → spend date → beneficiary → national id → the rows
      if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || !t || !t.id) return;
      if ((t.id === 'bulkParty' || t.id === 'bulkBenef') && anyListOpen()) return;
      const order = ['bulkParty', 'bulkSpend'].concat(st.hasBenef ? ['bulkBenef', 'bulkNid'] : []);
      const i = order.indexOf(t.id);
      if (i < 0) return;
      e.preventDefault();
      if (i < order.length - 1) $(order[i + 1]).focus();
      else (st.rows[0] && st.rows[0].ui ? st.rows[0].ui.serial : pasteInput).focus();
      return;
    }
    if (e.key === 'Enter' && !e.altKey) {
      // with its list open, the owner's Enter picks (and then moves on itself)
      if (col === 'owner' && !e.shiftKey && row.ui.ownerList.classList.contains('show')) return;
      e.preventDefault();
      moveFrom(row, col, e.shiftKey ? -1 : 1);
    } else if (e.altKey && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) {
      e.preventDefault();
      moveRow(row, col, e.code === 'ArrowDown' ? 1 : -1);
    }
  }, true);
  function anyListOpen() { return !!document.querySelector('#bulkPartyList.show, #bulkBenefList.show') || (st && st.rows.some((r) => r.ui && r.ui.ownerList.classList.contains('show'))); }
  function closeLists() {
    partyAC.close(); benefAC.close();
    if (st) st.rows.forEach((r) => r.ui && r.ui.ownerAC.close());
  }

  // ---------------------------------------------------------------
  // Pasting a list of serials (spec 6.4, F2)
  // ---------------------------------------------------------------
  const pasteInput = $('bulkPasteInput'), pasteNote = $('bulkPasteNote');
  function makeRowsFromPaste() {
    const tokens = window.ChekinoSerials.parse(pasteInput.value);
    if (!tokens.length) { pasteNote.textContent = 'سریالی پیدا نشد'; return; }
    const have = new Set(st.rows.map((r) => r.serial).filter(Boolean));
    const haveSayad = new Set(st.rows.map((r) => r.sayad_id).filter(Boolean));
    const ignored = [], repeated = [];
    const made = [];
    // an empty last row is filled first rather than left behind
    const reuse = () => { const last = st.rows[st.rows.length - 1]; return last && isBlank(last) ? last : null; };
    for (const t of tokens) {
      if (t.kind === 'invalid') { ignored.push(t.input); continue; }
      if ((t.kind === 'serial' && have.has(t.value)) || (t.kind === 'sayad' && haveSayad.has(t.value))) { repeated.push(t.input); continue; }
      const fields = t.kind === 'serial' ? { serial: t.value } : { sayad_id: t.value };
      if (t.uncertain) fields.note = `از «${toFa(t.input)}» شش رقم آخر را برداشتم؛ درست است؟`;
      const blank = reuse();
      let row;
      if (blank) {
        Object.assign(blank, fields);
        destroyRow(blank);
        rowsEl.appendChild(buildRow(blank));
        row = blank;
      } else row = addRow(fields);
      made.push(row);
      if (t.kind === 'serial') have.add(t.value); else haveSayad.add(t.value);
    }
    renumber();
    revalidate();
    const said = [];
    if (made.length) said.push(`${fa(made.length)} ردیف ساخته شد`);
    if (repeated.length) said.push(`تکراری: ${repeated.map(toFa).join('، ')}`);
    if (ignored.length) said.push(`نادیده گرفته شد: ${ignored.map(toFa).join('، ')}`);
    pasteNote.textContent = said.join('؛ ');
    if (made.length) {
      pasteInput.value = '';
      changed();
      const first = made[0];
      cellInput(first, first.sayad_id ? 'amount' : 'sayad').focus();
    }
  }
  $('bulkPasteGo').addEventListener('click', makeRowsFromPaste);
  pasteInput.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); makeRowsFromPaste(); }
  });
  $('bulkAddRow').addEventListener('click', () => addRow({}, { focus: true }));

  // ---------------------------------------------------------------
  // Saving: this device at once, the server two seconds after typing stops
  // ---------------------------------------------------------------
  let mirrorTimer = null, saveTimer = null, saveDeadline = 0;
  function changed() {
    if (!st) return;
    st.unsynced = true;
    st.localAt = Date.now();
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(() => { if (st) mirrorPut(record()); }, 300);
    // two seconds after the last change, and at least every five
    if (!saveDeadline) saveDeadline = Date.now() + 5000;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(syncNow, Math.max(0, Math.min(2000, saveDeadline - Date.now())));
    showSave();
    showCount();
  }
  function showSave() {
    const el = $('bulkSave');
    if (!st) { el.textContent = ''; return; }
    el.classList.toggle('is-offline', !!(st.offline && st.unsynced));
    if (st.saving) el.textContent = 'در حال ذخیره…';
    else if (st.unsynced && st.offline) el.textContent = 'آفلاین — روی همین دستگاه نگه داشته شد';
    else if (!st.unsynced && st.savedAt) el.textContent = 'ذخیره شد';
    else el.textContent = '';
  }
  // Nothing typed yet is nothing to keep: a batch that is only a party and
  // a date is not sent to the server until it has a row
  const hasWork = (b = st) => !!b && b.rows.some((r) => !isBlank(r));
  async function syncNow(me = st) {
    if (me === st) { clearTimeout(saveTimer); saveDeadline = 0; }
    if (!me || !me.unsynced) return true;
    if (!hasWork(me) && !me.serverId) return true;
    if (me.saving) { me.again = true; return false; }
    me.saving = true;
    showSave();
    const sentAt = me.localAt;
    const draft = draftOf(me);
    try {
      if (!me.serverId) {
        const b = await apiJson('/batches', { method: 'POST', body: JSON.stringify({ kind: me.kind }) });
        me.serverId = b.id;
        me.version = b.version;
      }
      const r = await apiJson(`/batches/${me.serverId}`, { method: 'PATCH', body: JSON.stringify({ version: me.version, draft }) });
      me.version = r.version;
      me.offline = false;
      me.savedAt = Date.now();
      if (me.localAt === sentAt) me.unsynced = false;
      mirrorPut(record(me));
      return !me.unsynced;
    } catch (e) {
      if (e.sessionEnded) return false;   // the session dialog takes over; this device keeps the work
      const code = e.data && e.data.code;
      // (a batch no longer on screen waits on this device: the next time
      // it's opened, the two versions are compared there)
      if (e.status === 409 && code === 'version_conflict') { if (me === st) { me.saving = false; await resolveConflict(e.data); } return false; }
      if (e.status === 409 && code === 'batch_closed') { if (me === st) closedElsewhere(e.data.state); else mirrorDel(me.clientId); return false; }
      if (!e.status) me.offline = true;   // no answer: kept here, sent when the connection is back
      else if (me === st) showFoot(requestErrorText(e, 'ذخیره نشد'));
      return false;
    } finally {
      me.saving = false;
      if (me === st) showSave();
      if (me.again) { me.again = false; if (me === st) changed(); else syncNow(me); }
    }
  }
  window.addEventListener('online', () => { if (st && st.unsynced) syncNow(); });
  setInterval(() => { if (st && st.unsynced && st.offline && navigator.onLine) syncNow(); }, 15000);
  // Closing the tab with something not yet on the server: the browser asks
  // (its own words); this device has it anyway
  window.addEventListener('beforeunload', (e) => {
    if (st && st.unsynced && hasWork()) { e.preventDefault(); e.returnValue = ''; }
  });

  // The batch was changed elsewhere since this page last saved it
  async function resolveConflict(data) {
    const answer = await askChoice({
      title: 'این فهرست جای دیگری هم تغییر کرده',
      body: 'در زبانه یا دستگاه دیگری هم روی همین افزودن گروهی کار شده. کدام نسخه بماند؟',
      choices: [
        { value: 'theirs', label: 'نسخه‌ی تازه‌تر (همان‌جا)', tone: 'primary' },
        { value: 'mine', label: 'نسخه‌ی همین صفحه', tone: 'neutral' },
      ],
      cancel: 'theirs', focus: 'theirs',
    });
    if (!st) return;
    if (answer === 'mine') {
      st.version = data.version;   // written over theirs, on purpose
      changed();
      syncNow();
    } else {
      st.version = data.version;
      st.unsynced = false;
      loadDraft(data.draft);
      mirrorPut(record());
    }
  }
  function closedElsewhere(state) {
    const clientId = st.clientId;
    closePanel({ quiet: true });
    mirrorDel(clientId);
    showToast(state === 'committed' ? 'این فهرست جای دیگری ثبت شده است' : 'این فهرست جای دیگری حذف شده است');
    refreshResume();
  }

  // ---------------------------------------------------------------
  // Commit: the chosen complete rows become cheques
  // ---------------------------------------------------------------
  const footMsg = $('bulkFootMsg');
  const showFoot = (t) => { footMsg.textContent = t || ''; };
  function headerOk() {
    let ok = true;
    if (!partyInput.value.trim()) { partyField.classList.add('error'); partyMsg.textContent = 'لازم است'; ok = false; }
    if (!spendDate.validate()) ok = false;
    if (st.hasBenef) {
      if (!benefInput.value.trim()) { benefField.classList.add('error'); benefMsg.textContent = 'لازم است'; ok = false; }
      if (!checkNid()) ok = false;
    }
    return ok;
  }
  async function commit() {
    if (!st || st.committing) return;
    showFoot('');
    st.rows.forEach((r) => { if (!isBlank(r) && r.include) COLS.forEach((c) => { r.touched[c] = true; }); });
    revalidate();
    if (!headerOk()) {
      showFoot('طرف حساب، تاریخ خرج' + (st.hasBenef ? ' و ذینفع' : '') + ' را کامل کن');
      const bad = overlay.querySelector('.bulk-common .form-field.error input');
      if (bad) bad.focus();
      return;
    }
    const chosen = st.rows.filter((r) => r.include && isComplete(r));
    if (!chosen.length) {
      showFoot('ردیف کاملی برای ثبت نیست');
      const first = st.rows.find((r) => !isBlank(r) && r.include);
      if (first) cellInput(first, COLS.find((c) => first.ui.cells[c] && first.ui.cells[c].classList.contains('error')) || 'serial').focus();
      return;
    }
    const btn = $('bulkCommit');
    const hadBenef = st.hasBenef;
    st.committing = true;
    btn.disabled = true;
    btn.textContent = 'در حال ثبت…';
    const me = st;
    try {
      // what's on screen goes to the server first, so exactly that is saved
      // (an autosave already on its way is waited for, not raced)
      for (let i = 0; i < 100 && me.saving; i++) await new Promise((res) => setTimeout(res, 100));
      if (me !== st) return;
      st.unsynced = true;
      if (!(await syncNow()) || me !== st) {
        if (me === st) showFoot(st.offline ? 'اتصال برقرار نیست؛ کار روی همین دستگاه نگه داشته شد و بعداً ثبتش کن' : 'ذخیره نشد؛ دوباره بزن');
        return;
      }
      const r = await apiJson(`/batches/${st.serverId}/commit`, {
        method: 'POST',
        body: JSON.stringify({ draft_version: st.version, refs: chosen.map((x) => x.ref) }),
      });
      if (me !== st) return;
      st.version = r.batch_version;
      const made = new Set(r.created.map((c) => c.ref));
      for (const row of st.rows.filter((x) => made.has(x.ref))) destroyRow(row);
      st.rows = st.rows.filter((x) => !made.has(x.ref));
      for (const f of r.failed) { const row = st.rows.find((x) => x.ref === f.ref); if (row) row.serverError = f.error; }
      for (const s of r.skipped_incomplete) { const row = st.rows.find((x) => x.ref === s.ref); if (row) row.serverError = `ناقص: ${s.missing.join('، ')}`; }
      // saved with a beneficiary: the send window opens on them (F4), once the list has them
      const sendNow = hadBenef && r.created.length ? r.created.map((c) => c.id) : null;
      loadChecksFromApi().then(() => { renderTable(); if (st) revalidate(); if (sendNow && window.ChekinoSend) window.ChekinoSend.open(sendNow); });
      const n = r.created.length;
      const ready = r.created.filter((c) => c.stage === 'ready').length;
      const left = r.failed.length + r.skipped_incomplete.length;
      let text = !n ? 'چکی ثبت نشد'
        : ready === n ? `${fa(n)} چک ثبت شد و آماده‌ی ارسال است`
          : ready ? `${fa(n)} چک ثبت شد: ${fa(ready)} آماده‌ی ارسال، ${fa(n - ready)} منتظر ذینفع`
            : `${fa(n)} چک ثبت شد و به «منتظر ذینفع» رفت`;
      if (n && left) text = `${fa(n)} چک ثبت شد؛ ${fa(left)} ردیف خطا دارد و در همین صفحه ماند`;
      if (r.batch_state === 'committed') {
        const clientId = st.clientId;
        closePanel({ quiet: true });
        mirrorDel(clientId);
      } else {
        if (!st.rows.length) addRow({});
        renumber();
        revalidate();
        mirrorPut(record());
        showFoot(left ? `${fa(left)} ردیف ثبت نشد؛ پیامِ هر کدام زیرش است` : '');
      }
      if (r.op_id) {
        lastUndo = { opId: r.op_id, at: Date.now() };
        showToast(text, { action: { label: 'برگردون', run: () => undoCommit(r.op_id) } });
      } else showToast(text);
      refreshResume();
    } catch (e) {
      if (e.sessionEnded || me !== st) return;
      const code = e.data && e.data.code;
      if (code === 'plan_limit') {
        showFoot(`پلن شما ${fa(e.data.remaining)} چک دیگر جا دارد ولی ${fa(chosen.length)} ردیف تیکِ «در این ثبت» دارد. تیکِ چند ردیف را بردار یا پلن را ارتقا بده.`);
      } else if (code === 'version_conflict') {
        await resolveConflict({ version: e.data.version, draft: (await apiJson(`/batches/${st.serverId}`)).draft });
      } else showFoot(requestErrorText(e, 'ثبت نشد'));
    } finally {
      if (me === st) {
        st.committing = false;
        btn.disabled = false;
        showCount();
      }
    }
  }
  $('bulkCommit').addEventListener('click', commit);

  // «برگردون»: the cheques of that commit go, their rows come back here
  let lastUndo = null;
  async function undoCommit(opId) {
    lastUndo = null;
    try {
      const r = await apiJson(`/bulk-ops/${opId}/undo`, { method: 'POST' });
      await loadChecksFromApi();
      renderTable();
      if (st && st.serverId === r.batch_id) {
        const b = await apiJson(`/batches/${r.batch_id}`);
        st.version = b.version;
        st.unsynced = false;
        loadDraft(b.draft);
        mirrorPut(record());
      } else if (r.batch_id) {
        await openServerBatch(r.batch_id);
      }
      showToast('برگردانده شد؛ ردیف‌ها دوباره این‌جا هستند');
    } catch (e) {
      if (e.sessionEnded) return;
      const code = e.data && e.data.code;
      showToast(code === 'changed' ? 'بعضی از این چک‌ها بعد از ثبت تغییر کرده‌اند؛ برگرداندن ممکن نیست'
        : code === 'too_old' || code === 'already_undone' ? e.message : requestErrorText(e, 'برگردانده نشد'));
    }
  }
  // Ctrl+Z, outside a text field, while «برگردون» is on screen
  document.addEventListener('keydown', (e) => {
    if (!lastUndo || e.code !== 'KeyZ' || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!$('appToastAction').classList.contains('show')) return;
    e.preventDefault();
    const op = lastUndo.opId;
    $('appToastAction').classList.remove('show');
    undoCommit(op);
  });

  // ---------------------------------------------------------------
  // Opening and closing
  // ---------------------------------------------------------------
  function loadDraft(draft) {
    const d = draft || {};
    const h = d.header || {};
    st.rows.forEach(destroyRow);
    st.header = {
      party: h.party || null,
      spend_date: h.spend_date || '',
      beneficiary: h.beneficiary || null,
    };
    st.hasBenef = !!(h.has_beneficiary || h.beneficiary);
    partyInput.value = h.party && h.party.name ? h.party.name : '';
    spendDate.reset();
    if (h.spend_date) {
      const [jy, jm, jd] = isoToJalaliStr(h.spend_date).split('/').map(Number);
      spendDate.setDate(jy, jm, jd);
    } else st.header.spend_date = spendDateIso();
    setBenefSwitch(st.hasBenef);
    benefInput.value = h.beneficiary ? h.beneficiary.name || '' : '';
    nidInput.value = h.beneficiary && h.beneficiary.national_id ? toFa(h.beneficiary.national_id) : '';
    [partyField, benefField, nidField].forEach((f) => f.classList.remove('error'));
    st.rows = (d.rows || []).map((r) => emptyRow({
      ref: r.ref, position: r.position, serial: r.serial || '', sayad_id: r.sayad_id || '', amount: r.amount || '',
      due_date: r.due_date || '', owner: r.owner || null, include: r.include !== false, note: r.note || '',
    }));
    rowsEl.innerHTML = '';
    st.rows.forEach((r) => rowsEl.appendChild(buildRow(r)));
    if (!st.rows.length) addRow({});
    renumber();
    revalidate();
    showSave();
  }
  const spendDateIso = () => (spendDate.isFilled() ? jalaliStrToIso(`${spendDate.yearStr()}/${spendDate.monthStr()}/${spendDate.dayStr()}`) : '');

  function showPanel() {
    pushBackGuard();
    overlay.classList.add('show');
    document.body.classList.add('bulk-open');
    showFoot('');
    pasteNote.textContent = '';
    setTimeout(() => (partyInput.value ? (st.rows[0] && st.rows[0].ui ? st.rows[0].ui.serial : pasteInput) : partyInput).focus(), 50);
  }
  function startNew(kind) {
    st = { clientId: uuid(), serverId: null, version: null, kind: kind || 'manual', header: {}, hasBenef: false, rows: [], unsynced: false };
    loadDraft({ header: {}, rows: [] });
    showPanel();
  }
  async function openServerBatch(serverId) {
    let b;
    try { b = await apiJson(`/batches/${serverId}`); } catch (e) { if (!e.sessionEnded) showToast(requestErrorText(e, 'باز نشد')); return; }
    if (b.state !== 'open') { showToast('این فهرست دیگر باز نیست'); refreshResume(); return; }
    // this device may hold something the server hasn't got yet
    const mine = (await mirrorsOfCompany()).find((m) => m.serverId === serverId);
    let draft = b.draft, version = b.version, unsynced = false, clientId = mine ? mine.clientId : uuid();
    if (mine && mine.unsynced) {
      if (mine.version === b.version) { draft = mine.draft; unsynced = true; }
      else {
        const answer = await askChoice({
          title: 'دو نسخه از این فهرست هست',
          body: 'روی این دستگاه تغییری ذخیره‌نشده هست، و جای دیگری هم روی همین فهرست کار شده. کدام بماند؟',
          choices: [{ value: 'theirs', label: 'نسخه‌ی تازه‌تر (همان‌جا)', tone: 'primary' }, { value: 'mine', label: 'نسخه‌ی این دستگاه', tone: 'neutral' }],
          cancel: 'theirs', focus: 'theirs',
        });
        if (answer === 'mine') { draft = mine.draft; unsynced = true; }
      }
    }
    if (st) await leaveCurrent();
    st = { clientId, serverId: b.id, version, kind: b.kind, header: {}, hasBenef: false, rows: [], unsynced };
    loadDraft(draft);
    showPanel();
    if (unsynced) { st.localAt = Date.now(); syncNow(); }
    mirrorPut(record());
  }
  async function openLocal(clientId) {
    const m = (await mirrorsOfCompany()).find((x) => x.clientId === clientId);
    if (!m) return;
    if (m.serverId) { openServerBatch(m.serverId); return; }
    if (st) await leaveCurrent();
    st = { clientId: m.clientId, serverId: null, version: null, kind: m.kind || 'manual', header: {}, hasBenef: false, rows: [], unsynced: true };
    loadDraft(m.draft);
    showPanel();
    st.localAt = Date.now();
    syncNow();
  }
  async function leaveCurrent() {
    const me = st;
    if (!me) return;
    clearTimeout(mirrorTimer);
    clearTimeout(saveTimer);
    saveDeadline = 0;
    if (hasWork(me)) { await mirrorPut(record(me)); syncNow(me); }
    else if (!me.serverId) mirrorDel(me.clientId);
  }
  function closePanel({ quiet } = {}) {
    if (!st) { overlay.classList.remove('show'); return; }
    closeLists();
    closeCalendar();
    const kept = hasWork();
    leaveCurrent();
    st.rows.forEach(destroyRow);
    st = null;
    rowsEl.innerHTML = '';
    overlay.classList.remove('show');
    document.body.classList.remove('bulk-open');
    if (!quiet && kept) showToast('کارت ذخیره شد، هر وقت خواستی ادامه بده');
    refreshResume();
  }
  $('bulkClose').addEventListener('click', () => closePanel());

  // «افزودن گروهی»: an unfinished one is offered first
  async function openBulk(kind) {
    if (!enabled()) return;
    const open = await openBatches();
    if (open.length) {
      const b = open[0];
      const answer = await askChoice({
        title: 'یه افزودن گروهی نیمه‌کاره داری',
        body: `${b.party ? `«${b.party}»، ` : ''}${fa(b.rows)} ردیف. ادامه می‌دهی یا یکی تازه شروع کنی؟`,
        choices: [{ value: 'continue', label: 'ادامه', tone: 'primary' }, { value: 'new', label: 'یکی تازه', tone: 'neutral' }, { value: 'cancel', label: 'انصراف', tone: 'neutral' }],
        cancel: 'cancel', focus: 'continue',
      });
      if (answer === 'continue') { b.open(); return; }
      if (answer !== 'new') return;
    }
    startNew(kind);
  }
  $('bulkAddBtn').addEventListener('click', () => openBulk('manual'));

  // ---------------------------------------------------------------
  // The bar over the board: unfinished batches
  // ---------------------------------------------------------------
  // The open ones: the server's, and any started here while offline
  async function openBatches() {
    let server = [];
    try { server = await apiJson('/batches?state=open'); } catch (e) { server = null; }
    const mirrors = await mirrorsOfCompany();
    const list = [];
    for (const b of server || []) {
      const m = mirrors.find((x) => x.serverId === b.id);
      const rows = m && m.unsynced ? (m.draft.rows || []).length : b.rows_count;
      const party = (m && m.unsynced && m.draft.header && m.draft.header.party && m.draft.header.party.name) || b.party_name || '';
      list.push({ key: 's' + b.id, party, rows, at: Date.parse(b.updated_at) || 0, open: () => openServerBatch(b.id), discard: () => discardServer(b.id, m && m.clientId) });
    }
    for (const m of mirrors) {
      if (m.serverId && server) continue;   // the server's list has it (or it was closed there)
      if (st && m.clientId === st.clientId) continue;
      if (!(m.draft.rows || []).length) continue;
      list.push({ key: 'l' + m.clientId, party: (m.draft.header && m.draft.header.party && m.draft.header.party.name) || '', rows: m.draft.rows.length, at: m.updatedAt || 0,
        open: () => openLocal(m.clientId), discard: () => discardLocal(m) });
    }
    return list.sort((a, b) => b.at - a.at);
  }
  async function discardServer(serverId, clientId) {
    const ok = await askConfirm({ title: 'این افزودن گروهی حذف شود؟', body: 'ردیف‌هایی که ثبت نشده‌اند از بین می‌روند.', confirmLabel: 'حذف', cancelLabel: 'انصراف' });
    if (!ok) return;
    try { await apiJson(`/batches/${serverId}`, { method: 'DELETE' }); } catch (e) { if (e.sessionEnded) return; if (!(e.data && e.data.code === 'batch_closed')) { showToast(requestErrorText(e, 'حذف نشد')); return; } }
    if (clientId) mirrorDel(clientId);
    if (st && st.serverId === serverId) closePanel({ quiet: true });
    refreshResume();
  }
  async function discardLocal(m) {
    const ok = await askConfirm({ title: 'این افزودن گروهی حذف شود؟', body: 'ردیف‌هایی که ثبت نشده‌اند از بین می‌روند.', confirmLabel: 'حذف', cancelLabel: 'انصراف' });
    if (!ok) return;
    await mirrorDel(m.clientId);
    if (m.serverId) { try { await apiJson(`/batches/${m.serverId}`, { method: 'DELETE' }); } catch (e) {} }
    refreshResume();
  }
  function relTime(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 1) return 'همین الان';
    if (min < 60) return `${fa(min)} دقیقه پیش`;
    const h = Math.round(min / 60);
    if (h < 24) return `${fa(h)} ساعت پیش`;
    const d = Math.round(h / 24);
    return d === 1 ? 'دیروز' : `${fa(d)} روز پیش`;
  }
  const resumeEl = $('bulkResume');
  let resumeSeq = 0;
  async function refreshResume() {
    if (!enabled()) { resumeEl.hidden = true; return; }
    const seq = ++resumeSeq;
    const list = (await openBatches()).filter((b) => !(st && (b.key === 's' + st.serverId || b.key === 'l' + st.clientId)));
    if (seq !== resumeSeq) return;
    resumeEl.innerHTML = '';
    resumeEl.hidden = !list.length;
    list.slice(0, 3).forEach((b) => {
      const line = document.createElement('div');
      line.className = 'bulk-resume-line';
      const text = document.createElement('span');
      text.className = 'bulk-resume-text';
      text.textContent = `افزودن گروهی نیمه‌کاره: ${b.party ? `${b.party}، ` : ''}${fa(b.rows)} ردیف، ${relTime(b.at)}`;
      const go = document.createElement('button');
      go.type = 'button'; go.className = 'bulk-resume-go'; go.textContent = 'ادامه';
      go.addEventListener('click', b.open);
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'bulk-resume-del'; del.textContent = 'حذف';
      del.addEventListener('click', b.discard);
      line.append(text, go, del);
      resumeEl.appendChild(line);
    });
    if (list.length > 3) {
      const more = document.createElement('div');
      more.className = 'bulk-resume-more';
      more.textContent = `و ${fa(list.length - 3)} فهرست نیمه‌کاره‌ی دیگر`;
      resumeEl.appendChild(more);
    }
  }

  // ---------------------------------------------------------------
  // For the dashboard: the Escape chain, the back button, signing out
  // ---------------------------------------------------------------
  window.ChekinoBulk = {
    isOpen: () => overlay.classList.contains('show'),
    enabled,
    escape() { if (anyListOpen()) closeLists(); else closePanel(); },
    // signing out takes this browser's copies with it
    async clearLocal() {
      const db = idbP ? await idbP : null;
      if (db) db.close();
      idbP = null;
      return new Promise((resolve) => {
        try { const req = indexedDB.deleteDatabase('chekino'); req.onsuccess = req.onerror = req.onblocked = () => resolve(); } catch (e) { resolve(); }
      });
    },
    open: openBulk,
    refreshResume,
  };

  if (window.ChekinoPalette) {
    window.ChekinoPalette.register({
      title: 'افزودن گروهی', hint: 'چند چک با هم، دستی', group: 'چک‌ها', order: 1.5,
      keywords: 'bulk add many cheques گروهی چند چک سریال',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="11" width="18" height="5" rx="1.5"/><path d="M8 20h8"/></svg>',
      when: enabled, run: () => openBulk('manual'),
    });
  }

  // On load: the button, and the bar of anything unfinished — once the
  // dashboard's lists are in, so names and duplicates are known
  if (enabled()) {
    $('bulkAddBtn').hidden = false;
    const wait = setInterval(() => {
      if (checksLoadedAt === null && !checksLoadFailed) return;
      clearInterval(wait);
      refreshResume();
    }, 150);
  }
})();
