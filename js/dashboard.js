
// ---- Persian digit helper ----
function toFa(str) {
  const en = ['0','1','2','3','4','5','6','7','8','9'];
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(str).replace(/[0-9]/g, d => fa[en.indexOf(d)]);
}

// ---- Gregorian to Jalali conversion ----
function div(a, b) { return ~~(a / b); }
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + div((gy2 + 3), 4) - div((gy2 + 99), 100) + div((gy2 + 399), 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

function pad2(n) { return String(n).padStart(2, '0'); }

// ---- Jalali to Gregorian conversion (for calendar rendering) ----
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + (365 * jy) + (div(jy, 33) * 8) + div(((jy % 33) + 3), 4) + jd +
    ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function isLeapJalali(jy) {
  const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30);
  const [jy2, jm2, jd2] = gregorianToJalali(gy, gm, gd);
  return jy2 === jy && jm2 === 12 && jd2 === 30;
}

function daysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

const jalaliMonthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

// Fixed-date solar national holidays — same every year.
const fixedHolidays = new Set(['1-1','1-2','1-3','1-4','1-12','1-13','3-14','3-15','11-22','12-29']);

// Lunar-based religious holidays shift every year on the Hijri calendar, so they
// need a per-year table. Verified against the published 1405 official calendar.
// Add a new entry each year (or the calendar falls back to solar holidays only).
const lunarHolidaysByYear = {
  1405: new Set([
    '1-1','1-2',      // عید فطر (هم‌زمان با نوروز)
    '1-25',           // شهادت امام جعفر صادق
    '3-6',            // عید قربان
    '3-14',           // عید غدیر خم
    '4-3','4-4',      // تاسوعا و عاشورا
    '5-13',           // اربعین
    '5-21','5-22',    // رحلت پیامبر / شهادت امام حسن مجتبی، شهادت امام رضا
    '6-8',            // میلاد پیامبر و امام جعفر صادق
    '8-22',           // شهادت حضرت فاطمه زهرا
    '10-2','10-16',   // ولادت امام علی، مبعث
    '11-4',           // نیمه شعبان
    '12-9',           // شهادت حضرت علی
    '12-19','12-20'   // عید فطر
  ])
};

function isHolidayDate(jy, jm, jd, weekdayIdx) {
  if (weekdayIdx === 6) return true; // Friday
  const key = `${jm}-${jd}`;
  if (fixedHolidays.has(key)) return true;
  const lunar = lunarHolidaysByYear[jy];
  return !!(lunar && lunar.has(key));
}

// ---- Theme: light/dark, manual toggle or automatic by time of day ----
const THEME_KEY = 'chekino_theme_v1';
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Light is the default — the working theme for a table looked at all day
// — not a time-of-day guess. Dark stays one click away and, once chosen,
// wins forever: a saved choice is never silently overridden by the clock.
const DEFAULT_THEME = 'light';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function currentSavedTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}
function initTheme() {
  applyTheme(currentSavedTheme() || DEFAULT_THEME);
}
themeToggleBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
});
initTheme();

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('chekino_token');
  window.location.href = '/login';
});

// The account button reveals who is signed in and the way out. Logout sits
// behind one deliberate tap rather than bare in the header, where it was a
// single mis-tap away from ending the session mid-entry.
(function wireAccountMenu() {
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');
  const setOpen = (open) => {
    accountMenu.classList.toggle('show', open);
    accountBtn.setAttribute('aria-expanded', String(open));
  };
  accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!accountMenu.classList.contains('show'));
  });
  accountMenu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountMenu.classList.contains('show')) {
      setOpen(false);
      accountBtn.focus();
    }
  });
})();

// Reads the company name straight off the JWT payload (put there at login) —
// no extra request needed just to show who's signed in.
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  } catch (e) {
    return null;
  }
}
(function showCompanyName() {
  const token = getAuthToken();
  const payload = token ? decodeJwtPayload(token) : null;
  if (payload && payload.name) {
    document.getElementById('companyNameLabel').textContent = payload.name;
  }
})();

// The header carries no clock and no date any more: every date that
// matters in this app is on a cheque, and the date picker fills today in
// by itself, so a header copy of it was one more thing to read past.

// ---- Add check button (opens modal) ----
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const serialField = document.getElementById('serialField');
const serialInput = document.getElementById('serialInput');
const serialMsg = document.getElementById('serialMsg');
const sayadField = document.getElementById('sayadField');
const sayadInput = document.getElementById('sayadInput');
const sayadStatic = document.getElementById('sayadStatic');
const sayadMsg = document.getElementById('sayadMsg');
const dueDateField = document.getElementById('dueDateField');
const dueDateRow = document.getElementById('dueDateRow');
const dueDateInput = document.getElementById('dueDateInput');
const dueDateMsg = document.getElementById('dueDateMsg');
const spendDateField = document.getElementById('spendDateField');
const spendDateInput = document.getElementById('spendDateInput');
const spendDateMsg = document.getElementById('spendDateMsg');
const spendDateCalBtn = document.getElementById('spendDateCalBtn');
const sendDateField = document.getElementById('sendDateField');
const sendDateInput = document.getElementById('sendDateInput');
const sendDateMsg = document.getElementById('sendDateMsg');
const sendDateCalBtn = document.getElementById('sendDateCalBtn');
const channelField = document.getElementById('channelField');
const channelBox = document.getElementById('channelBox');
const channelChips = document.getElementById('channelChips');
const channelPlaceholder = document.getElementById('channelPlaceholder');
const channelList = document.getElementById('channelList');
const channelMsg = document.getElementById('channelMsg');
const fileField = document.getElementById('fileField');
const fileBox = document.getElementById('fileBox');
const fileChips = document.getElementById('fileChips');
const fileAddBtn = document.getElementById('fileAddBtn');
const fileInput = document.getElementById('fileInput');
const fileMsg = document.getElementById('fileMsg');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
const lightboxShareBtn = document.getElementById('lightboxShareBtn');
const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
const photoEditorOverlay = document.getElementById('photoEditorOverlay');
const peStage = document.getElementById('peStage');
const peImg = document.getElementById('peImg');
const peCropBox = document.getElementById('peCropBox');
const peCancelBtn = document.getElementById('peCancelBtn');
const peSendBtn = document.getElementById('peSendBtn');
const notesField = document.getElementById('notesField');
const notesInput = document.getElementById('notesInput');
const notesCount = document.getElementById('notesCount');
const amountField = document.getElementById('amountField');
const amountInput = document.getElementById('amountInput');
const amountWords = document.getElementById('amountWords');
const amountMsg = document.getElementById('amountMsg');
const ownerField = document.getElementById('ownerField');
const ownerInput = document.getElementById('ownerInput');
const ownerList = document.getElementById('ownerList');
const ownerMsg = document.getElementById('ownerMsg');
const partyField = document.getElementById('partyField');
const partyInput = document.getElementById('partyInput');
const partyList = document.getElementById('partyList');
const partyMsg = document.getElementById('partyMsg');
const benefField = document.getElementById('benefField');
const benefInput = document.getElementById('benefInput');
const benefList = document.getElementById('benefList');
const benefMsg = document.getElementById('benefMsg');
const nidField = document.getElementById('nidField');
const nidInput = document.getElementById('nidInput');
const nidList = document.getElementById('nidList');
const nidMsg = document.getElementById('nidMsg');
const nidKind = document.getElementById('nidKind');
const dueDateCalBtn = document.getElementById('dueDateCalBtn');
const dueDateCal = document.getElementById('dueDateCal');
const calBackdrop = document.getElementById('calBackdrop');
const calMonthSelect = document.getElementById('calMonthSelect');
const calYearSelect = document.getElementById('calYearSelect');
const calGrid = document.getElementById('calGrid');
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calTodayBtn = document.getElementById('calTodayBtn');
const calFooterSingle = document.getElementById('calFooterSingle');
const calFooterRange = document.getElementById('calFooterRange');
const calConfirmRangeBtn = document.getElementById('calConfirmRangeBtn');
const calClearRangeBtn = document.getElementById('calClearRangeBtn');
const submitCheckBtn = document.getElementById('submitCheckBtn');
const modalBody = document.getElementById('modalBody');
const formAlert = document.getElementById('formAlert');
const formAlertIcon = document.getElementById('formAlertIcon');
const formAlertText = document.getElementById('formAlertText');
const clearFormBtn = document.getElementById('clearFormBtn');

const DRAFT_KEY = 'chekino_draft_v1';

function todayJalali() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// =========================================================
// ---- View / edit an existing cheque (reuses this same form) ----
// =========================================================
const modalTitle = document.getElementById('modalTitle');
const veStatusBanner = document.getElementById('veStatusBanner');
const veHistory = document.getElementById('veHistory');
const veHistoryList = document.getElementById('veHistoryList');

function renderVeHistory(c) {
  const hist = c.history || [];
  // The chain always opens with the cheque's initial "منتظر ثبت" state
  // (from when it was created), then every recorded change after it, in
  // order — one continuous line, not separate expandable cards.
  const chain = [{ to: 'pending', at: c.createdAt }, ...hist];
  veHistory.classList.toggle('show', chain.length > 1);
  veHistoryList.innerHTML = chain.map((h, i) => {
    const st = statusById(h.to);
    const reasonHtml = h.reason ? `<div class="ve-history-reason">${escapeHtml(h.reason)}</div>` : '';
    return `${i > 0 ? '<span class="ve-history-arrow">←</span>' : ''}
      <div class="ve-history-link" style="--hist-dot:${st.color}">
        <span class="ve-history-name">${escapeHtml(st.name)}</span>
        <span class="ve-history-date">${faDate(h.at)}</span>
        ${reasonHtml}
      </div>`;
  }).join('');
}
let modalMode = 'add';        // 'add' | 'view' | 'editing'
let editingChequeId = null;
let veHasEdited = false;

function buildStatusSentence(c) {
  const sendD = faDate(c.sendDate);
  const owner = escapeHtml(c.owner);
  const benef = escapeHtml(c.benef);
  if (c.status === 'done') {
    const changedD = faDate(c.statusChangedAt || c.sendDate);
    return { cls: 'st-done', html: `چک در تاریخ <b>${sendD}</b> جهت ثبت به نام <b>${benef}</b> برای آقای <b>${owner}</b> ارسال شد و در تاریخ <b>${changedD}</b> ثبت شد.` };
  }
  if (c.status === 'problem') {
    const changedD = faDate(c.statusChangedAt || c.sendDate);
    const reason = c.statusReason ? escapeHtml(c.statusReason) : 'نامشخص';
    return { cls: 'st-problem', html: `چک در تاریخ <b>${sendD}</b> جهت ثبت به نام <b>${benef}</b> برای آقای <b>${owner}</b> ارسال شد و در تاریخ <b>${changedD}</b> به دلیل <b>${reason}</b> ثبت نشد.` };
  }
  return { cls: 'st-pending', html: `چک در تاریخ <b>${sendD}</b> برای آقای <b>${owner}</b> ارسال شده و در وضعیت منتظر ثبت می‌باشد.` };
}

const veFieldsWrapA = document.getElementById('veFieldsWrapA');
const veFieldsWrapA2 = document.getElementById('veFieldsWrapA2');
const veFieldsWrapB = document.getElementById('veFieldsWrapB');
const veFieldsWrapC = document.getElementById('veFieldsWrapC');
function lockFormFields(locked) {
  modalBody.classList.toggle('ve-locked', locked);
  [veFieldsWrapA, veFieldsWrapA2, veFieldsWrapB, veFieldsWrapC].forEach(w => {
    if (locked) w.setAttribute('inert', ''); else w.removeAttribute('inert');
  });
  // The sayad field sits outside the inert wrapper so its text can still
  // be selected/copied while viewing — readOnly (not inert) is what stops
  // it from being edited, and nothing about its look changes.
  sayadInput.readOnly = locked;
}

function openModalForView(id) {
  const c = loadCheques().find(x => x.id === id);
  if (!c) return;
  // The eye button's click handler stops the click from bubbling to
  // document, so the document-level "click outside closes it" listener
  // that the status menu relies on never runs — without this, opening the
  // detail modal left an already-open status menu rendered underneath it.
  closeStatusMenu();
  pushBackGuard();
  modalMode = 'view';
  editingChequeId = id;
  veHasEdited = false;
  modalTitle.textContent = 'مشاهده چک';
  hideFormAlert();
  const st = buildStatusSentence(c);
  veStatusBanner.className = 've-status-banner show ' + st.cls;
  veStatusBanner.innerHTML = `<span>${st.html}</span>`;
  veReceiptBtn.style.display = c.status === 'done' ? 'flex' : 'none';
  renderVeHistory(c);

  serialInput.value = toFa(c.serial);
  sayadInput.value = toFa(c.sayad);
  sayadStatic.textContent = toFa(c.sayad);
  sayadField.classList.add('view-mode');
  const [dy, dm, dd] = c.dueDate.split('/').map(n => parseInt(n, 10));
  dueDate.setDate(dy, dm, dd);
  setAmountValue(c.amount);
  ownerInput.value = c.owner;
  partyInput.value = c.party;
  benefInput.value = c.benef;
  nidInput.value = toFa(c.nid);
  updateNidKind();
  if (c.spendDate) {
    const [sy, sm, sd] = c.spendDate.split('/').map(n => parseInt(n, 10));
    spendDate.setDate(sy, sm, sd);
  } else {
    spendDate.reset();
  }
  const [ey, em, ed] = c.sendDate.split('/').map(n => parseInt(n, 10));
  sendDate.setDate(ey, em, ed);
  selectedChannels = Array.isArray(c.channels) ? c.channels.slice() : [];
  renderChannelChips();
  notesInput.value = c.notes || '';
  updateNotesCount();
  attachedFiles = Array.isArray(c.files) ? c.files.map(f => ({ name: f.name, type: f.type, size: 0, dataUrl: f.dataUrl })) : [];
  renderFileChips();
  fileMsg.textContent = '';
  fileField.classList.remove('error');

  [serialField, sayadField, dueDateField, amountField, ownerField, partyField, benefField, nidField, spendDateField, sendDateField, channelField, notesField]
    .forEach(f => f && f.classList.remove('error'));

  lockFormFields(true);
  submitCheckBtn.textContent = 'ویرایش';
  clearFormBtn.title = 'حذف چک';

  modalOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  modalBody.scrollTop = 0;
}
function openViewEdit(id) { openModalForView(id); }

function enterEditMode() {
  modalMode = 'editing';
  veHasEdited = true;
  modalTitle.textContent = 'ویرایش چک';
  lockFormFields(false);
  sayadField.classList.remove('view-mode');
  submitCheckBtn.textContent = 'ذخیره تغییرات';
  cancelPendingDelete();
}

function exitViewEditMode() {
  modalMode = 'add';
  editingChequeId = null;
  veHasEdited = false;
  modalTitle.textContent = 'افزودن چک جدید';
  submitCheckBtn.textContent = 'ثبت چک';
  submitCheckBtn.classList.remove('pending-confirm', 'delete-warning');
  clearFormBtn.title = 'پاک کردن فرم';
  clearFormBtn.classList.remove('confirming-delete');
  document.getElementById('deleteCancelSlideBtn').classList.remove('show');
  veStatusBanner.classList.remove('show');
  veReceiptBtn.style.display = 'none';
  veHistory.classList.remove('show', 'open');
  lockFormFields(false);
  cancelPendingDelete();
  saveConfirmSlideBtn.classList.remove('show');
  clearFormBtn.classList.remove('pending-cancel');
}

function openModal() {
  pushBackGuard();
  // Defensive reset — guarantees a fresh "افزودن چک" state regardless of
  // whatever mode the modal was left in the last time it was open.
  modalMode = 'add';
  editingChequeId = null;
  modalTitle.textContent = 'افزودن چک جدید';
  submitCheckBtn.textContent = 'ثبت چک';
  submitCheckBtn.classList.remove('pending-confirm', 'delete-warning');
  clearFormBtn.title = 'پاک کردن فرم';
  clearFormBtn.classList.remove('confirming-delete');
  veStatusBanner.classList.remove('show');
  veReceiptBtn.style.display = 'none';
  veHistory.classList.remove('show', 'open');
  lockFormFields(false);
  sayadField.classList.remove('view-mode');
  hideFormAlert();

  modalOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  modalBody.scrollTop = 0;
  lastFocusedFormField = null;   // don't let the mobile scroll-assist jump to where we left off last time
  setTimeout(() => serialInput.focus(), 50);
}

let stickyFieldsUntouched = false;
function isFormDirty() {
  const peopleFieldsDirty = stickyFieldsUntouched
    ? false
    : (ownerInput.value.trim() !== '' || partyInput.value.trim() !== '' || benefInput.value.trim() !== '' || nidInput.value.trim() !== '');
  return serialInput.value.trim() !== '' || sayadInput.value.trim() !== '' ||
    !dueDate.isEmpty() || !spendDate.isEmpty() || attachedFiles.length > 0 || selectedChannels.length > 0 || notesInput.value.trim() !== '' || amountInput.value.trim() !== '' ||
    peopleFieldsDirty;
}

function saveDraft() {
  const draft = {
    serial: serialInput.value,
    sayad: sayadInput.value,
    dueSlots: dueDate.slots, dueTouched: dueDate.touched,
    spendSlots: spendDate.slots, spendTouched: spendDate.touched,
    sendSlots: sendDate.slots, sendTouched: sendDate.touched,
    channels: selectedChannels, notes: notesInput.value, amount: amountInput.value, owner: ownerInput.value, party: partyInput.value, benef: benefInput.value, nid: nidInput.value
  };
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

function restoreDraftIfAny() {
  let raw;
  try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
  if (!raw) return;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return; }
  const hasData = (d.serial || '') !== '' || (d.sayad || '') !== '' || (d.amount || '') !== '' || (d.owner || '') !== '' || (d.party || '') !== '' || (Array.isArray(d.dueSlots) && d.dueSlots.some(x => x !== null));
  if (!hasData) return;
  serialInput.value = d.serial || '';
  sayadInput.value = d.sayad || '';
  if (Array.isArray(d.dueSlots) && d.dueSlots.length === 8) dueDate.slots = d.dueSlots.slice();
  dueDate.touched = !!d.dueTouched;
  dueDate.render();
  if (Array.isArray(d.spendSlots) && d.spendSlots.length === 8) spendDate.slots = d.spendSlots.slice();
  spendDate.touched = !!d.spendTouched;
  spendDate.render();
  if (Array.isArray(d.sendSlots) && d.sendSlots.length === 8) sendDate.slots = d.sendSlots.slice();
  sendDate.touched = !!d.sendTouched;
  sendDate.render();
  selectedChannels = Array.isArray(d.channels) ? d.channels.slice() : [];
  renderChannelChips();
  notesInput.value = d.notes || '';
  updateNotesCount();
  amountInput.value = d.amount || '';
  updateAmountWords();
  ownerInput.value = d.owner || '';
  partyInput.value = d.party || '';
  benefInput.value = d.benef || '';
  nidInput.value = d.nid || '';
  updateNidKind();
  openModal();
}

function resetAllFields(opts) {
  const keepParty = opts && opts.keepParty;
  const keptParty = partyInput.value, keptBenef = benefInput.value, keptNid = nidInput.value;
  serialInput.value = '';
  serialField.classList.remove('error');
  sayadInput.value = '';
  sayadField.classList.remove('error');
  sayadField.classList.remove('view-mode');
  dueDate.reset();
  spendDate.reset();
  sendDate.reset();
  clearFiles();
  clearChannels();
  closeChannelList();
  notesInput.value = '';
  updateNotesCount();
  amountInput.value = '';
  amountWords.textContent = '';
  amountField.classList.remove('error');
  ownerInput.value = '';
  ownerField.classList.remove('error');
  partyInput.value = '';
  partyField.classList.remove('error');
  benefInput.value = '';
  benefField.classList.remove('error');
  nidInput.value = '';
  nidField.classList.remove('error');
  nidKind.textContent = '';
  closeCalendar();
  // The party and their beneficiary usually stay the same across a batch, so
  // put those three back once everything else has been cleared.
  if (keepParty) {
    partyInput.value = keptParty;
    benefInput.value = keptBenef;
    nidInput.value = keptNid;
    updateNidKind();
  } else {
    stickyFieldsUntouched = false;
  }
}

// ---- Styled confirmation dialog ----
// The browser's own confirm() showed up in the OS language, with OS buttons,
// left-to-right, in the middle of an otherwise Persian app. This replaces it.
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitleEl = document.getElementById('confirmTitle');
const confirmBodyEl = document.getElementById('confirmBody');
const confirmOkBtn = document.getElementById('confirmOk');
const confirmCancelBtn = document.getElementById('confirmCancel');
let confirmResolve = null;
let confirmReturnFocus = null;

function confirmIsOpen() { return confirmResolve !== null; }
function closeConfirm(answer) {
  if (!confirmResolve) return;
  confirmOverlay.classList.remove('show');
  const resolve = confirmResolve;
  confirmResolve = null;
  resolve(answer);
  // Answering "no" puts the user back in the form, so the caret goes back
  // where it was too. Answering "yes" closes the form, so there is nothing
  // to return to.
  const back = confirmReturnFocus;
  confirmReturnFocus = null;
  if (!answer && back && document.contains(back)) back.focus();
}
function askConfirm({ title, body, confirmLabel, cancelLabel }) {
  confirmTitleEl.textContent = title;
  confirmBodyEl.textContent = body || '';
  confirmBodyEl.style.display = body ? '' : 'none';
  confirmOkBtn.textContent = confirmLabel || 'تأیید';
  confirmCancelBtn.textContent = cancelLabel || 'انصراف';
  confirmReturnFocus = document.activeElement;
  confirmOverlay.classList.add('show');
  // Focus lands on "keep working", the non-destructive side, so Enter never
  // throws the form away.
  confirmCancelBtn.focus();
  return new Promise((resolve) => { confirmResolve = resolve; });
}
confirmOkBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) closeConfirm(false);
});
// Tab stays inside the dialog while it is up — otherwise it walks into the
// form underneath, which is exactly the thing being asked about.
confirmOverlay.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  (document.activeElement === confirmCancelBtn ? confirmOkBtn : confirmCancelBtn).focus();
});

// closeModal stays synchronous for every caller (the × button, the Escape
// chain, and the mobile back handler, whose return value drives the history
// guard). When a confirmation is needed it returns after putting the dialog
// up, and re-enters itself with force once the answer comes back.
function closeModal(force) {
  if (!force) {
    if (confirmIsOpen()) return;   // already asking — a second Escape must not stack a second dialog
    let ask = null;
    if (modalMode === 'editing' && veHasEdited) {
      ask = {
        title: 'تغییرات ذخیره نشده',
        body: 'اگر ببندید، ویرایش‌هایی که روی این چک انجام دادید از بین می‌رود.',
        confirmLabel: 'بستن بدون ذخیره',
        cancelLabel: 'برگشت به فرم',
      };
    } else if (modalMode === 'add' && isFormDirty()) {
      ask = {
        title: 'اطلاعات ذخیره نشده',
        body: 'اگر ببندید، چیزی که تا اینجا وارد کردید ثبت نمی‌شود.',
        confirmLabel: 'بستن بدون ثبت',
        cancelLabel: 'برگشت به فرم',
      };
    }
    // modalMode === 'view' (nothing changed yet) always closes freely
    if (ask) {
      askConfirm(ask).then((ok) => { if (ok) closeModal(true); });
      return;
    }
  }
  const wasViewOrEdit = modalMode !== 'add';
  modalOverlay.classList.remove('show');
  document.body.style.overflow = '';
  resetAllFields();
  if (!wasViewOrEdit) clearDraft();
  if (wasViewOrEdit) exitViewEditMode();
}

const addCheckBtn = document.getElementById('addCheckBtn');
addCheckBtn.addEventListener('click', openModal);

// Insert opens the add-cheque form from anywhere on the dashboard.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Insert') return;
  if (modalOverlay.classList.contains('show')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  e.preventDefault();
  openModal();
});
// F2 jumps straight to the search box, from anywhere on the dashboard.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'F2') return;
  if (modalOverlay.classList.contains('show')) return;
  e.preventDefault();
  searchInput.focus();
  searchInput.select();
});
// Escape gives the keyboard back to the page — handy after F2, so Insert
// works again without having to click somewhere first.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOverlay.classList.contains('show')) return;
  if (lightboxOverlay.classList.contains('show')) return;   // that has its own Escape handling
  const t = document.activeElement;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) t.blur();
});
modalClose.addEventListener('click', () => closeModal(false));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal(false);
});
// Enter moves to the next field, like Tab — it only acts as "ثبت چک" on the
// very last field. Shift+Enter still breaks a line in the notes box, Enter
// inside an open dropdown/calendar picks the highlighted row/date, and a
// button (file-add, calendar-icon, etc.) still responds to Enter natively.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !modalOverlay.classList.contains('show')) return;
  if (e.shiftKey) return;
  const t = e.target;
  if (t === notesInput) return;
  if (t === channelBox || (channelList && channelList.contains(t))) return;
  if (dueDateCal.classList.contains('show')) return;
  const openList = document.querySelector('.ac-list.show');
  if (openList && openList.querySelector('.ac-item.active')) return;
  if (t.tagName === 'BUTTON' && t !== submitCheckBtn) return;

  e.preventDefault();

  if (submitCheckBtn.classList.contains('pending-confirm')) {
    saveConfirmSlideBtn.click();
    return;
  }
  if (t === submitCheckBtn) { submitCheckBtn.click(); return; }

  const fields = Array.from(modalBody.querySelectorAll('input, textarea'))
    .filter(el => !el.disabled && el.offsetParent !== null);
  const idx = fields.indexOf(t);
  if (idx === -1 || idx === fields.length - 1) {
    submitCheckBtn.click();
  } else {
    fields[idx + 1].focus();
  }
});


// ---- Serial number field: digits only, live validation ----
serialInput.addEventListener('input', () => {
  serialInput.value = serialInput.value.replace(/[^0-9۰-۹]/g, '');
  if (serialInput.value.length === 6) {
    serialField.classList.remove('error');
  }
  saveDraft();
});
serialInput.addEventListener('blur', () => {
  if (serialInput.value.length > 0) validateSerial();
});

// ---- Sayad ID field: digits only, live validation ----
sayadInput.addEventListener('input', () => {
  sayadInput.value = sayadInput.value.replace(/[^0-9۰-۹]/g, '');
  if (sayadInput.value.length === 16) {
    sayadField.classList.remove('error');
  }
  checkSayadDuplicate();
  saveDraft();
});
sayadInput.addEventListener('blur', () => {
  if (sayadInput.value.length > 0) validateSayad();
});

function validateSerial() {
  const len = serialInput.value.length;
  if (len === 0) {
    serialField.classList.add('error');
    serialMsg.textContent = 'شماره سریال چک را وارد کنید';
    return false;
  }
  if (len !== 6) {
    serialField.classList.add('error');
    serialMsg.textContent = `شماره سریال باید ۶ رقم باشد (${toFa(len)} رقم وارد شده)`;
    return false;
  }
  serialField.classList.remove('error');
  return true;
}

function validateSayad() {
  const len = sayadInput.value.length;
  if (len === 0) {
    sayadField.classList.add('error');
    sayadMsg.textContent = 'شناسه صیادی چک را وارد کنید';
    return false;
  }
  if (len !== 16) {
    sayadField.classList.add('error');
    sayadMsg.textContent = `شناسه صیادی باید ۱۶ رقم باشد (${toFa(len)} رقم وارد شده)`;
    return false;
  }
  sayadField.classList.remove('error');
  return true;
}

// =========================================================
// ---- Date fields: reusable masked input + shared calendar ----
// =========================================================
// slots[0..1]=day, [2..3]=month, [4..7]=year.
// Displayed as YYYY/MM/DD left-to-right, so read right-to-left it is day/month/year.
const IDX_TO_SLOT = [4, 5, 6, 7, null, 2, 3, null, 0, 1];
const SLOT_TO_IDX = [8, 9, 5, 6, 0, 1, 2, 3];

function toEnDigits(str) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(str).replace(/[۰-۹]/g, ch => String(fa.indexOf(ch)));
}

function createDateField(cfg) {
  const api = {
    input: cfg.input,
    field: cfg.field,
    msg: cfg.msg,
    calBtn: cfg.calBtn,
    required: !!cfg.required,
    slots: [null, null, null, null, null, null, null, null],
    touched: false
  };

  // Focusing this field auto-fills just the year (a convenience, not user
  // input), so "empty" must ignore that and the touched flag — otherwise
  // merely tabbing into the field marks the whole form as dirty.
  api.isEmpty = () => api.slots.slice(0, 4).every(x => x === null);
  api.isFilled = () => api.slots.every(x => x !== null);
  api.dayStr = () => api.slots.slice(0, 2).join('');
  api.monthStr = () => api.slots.slice(2, 4).join('');
  api.yearStr = () => api.slots.slice(4, 8).join('');

  api.build = () => {
    const ch = i => (api.slots[i] === null ? '_' : toFa(api.slots[i]));
    return `${ch(4)}${ch(5)}${ch(6)}${ch(7)}/${ch(2)}${ch(3)}/${ch(0)}${ch(1)}`;
  };

  api.render = (caretSlot) => {
    if (api.slots.every(x => x === null) && !api.touched) {
      api.input.value = '';                 // placeholder shows through
      return;
    }
    api.input.value = api.build();
    if (typeof caretSlot === 'number' && document.activeElement === api.input) {
      const pos = SLOT_TO_IDX[Math.max(0, Math.min(7, caretSlot))];
      api.input.setSelectionRange(pos, pos);
    }
  };

  api.reset = () => {
    api.slots = [null, null, null, null, null, null, null, null];
    api.touched = false;
    api.field.classList.remove('error');
    if (cfg.prefillToday) {
      const [ty, tm, td] = todayJalali();
      api.setDate(ty, tm, td);                // starts filled in with today
    } else {
      api.render();
    }
  };

  // If the user clears this field and forgets it, fall back to today on submit.
  api.fillTodayIfEmpty = () => {
    if (api.slots.every(x => x === null)) {
      const [ty, tm, td] = todayJalali();
      api.setDate(ty, tm, td);
    }
  };

  api.setDate = (y, m, d) => {
    api.slots = (pad2(d) + pad2(m) + String(y)).split('');
    api.touched = true;
    api.render();
    api.field.classList.remove('error');
  };

  // Would this digit keep the whole date on track? Checks the other digits in the
  // same group too, so editing one digit of an existing value is caught immediately.
  function accepts(slot, d) {
    const next = api.slots.slice();
    next[slot] = d;
    const dayT = next[0], dayO = next[1], monT = next[2], monO = next[3];
    const yr = next.slice(4);

    if (slot <= 1) {
      if (dayT !== null && !['0','1','2','3'].includes(dayT)) return false;
      if (dayT !== null && dayO !== null) {
        const n = parseInt(dayT + dayO, 10);
        if (n < 1 || n > 31) return false;
        const m = (monT !== null && monO !== null) ? parseInt(monT + monO, 10) : null;
        const y = yr.every(x => x !== null) ? parseInt(yr.join(''), 10) : null;
        if (m !== null && y !== null && m >= 1 && m <= 12 && n > daysInJalaliMonth(y, m)) return false;
      }
      return true;
    }
    if (slot <= 3) {
      if (monT !== null && !['0','1'].includes(monT)) return false;
      if (monT !== null && monO !== null) {
        const n = parseInt(monT + monO, 10);
        if (n < 1 || n > 12) return false;
        if (dayT !== null && dayO !== null) {
          const dn = parseInt(dayT + dayO, 10);
          const y = yr.every(x => x !== null) ? parseInt(yr.join(''), 10) : null;
          if (y !== null && dn > daysInJalaliMonth(y, n)) return false;
        }
      }
      return true;
    }
    if (next[4] !== null && next[4] !== '1') return false;
    if (next[5] !== null && !['3','4','5'].includes(next[5])) return false;
    if (yr.every(x => x !== null)) {
      const y = parseInt(yr.join(''), 10);
      if (y < 1300 || y > 1500) return false;
      if (monT !== null && monO !== null && dayT !== null && dayO !== null) {
        const m = parseInt(monT + monO, 10);
        const dn = parseInt(dayT + dayO, 10);
        if (m >= 1 && m <= 12 && dn > daysInJalaliMonth(y, m)) return false;
      }
    }
    return true;
  }

  function slotAtCaret(pos) {
    const p = Math.max(0, Math.min(10, pos));
    if (p >= 10) return 1;
    const direct = IDX_TO_SLOT[p];
    if (direct !== null && direct !== undefined) return direct;
    return IDX_TO_SLOT[p + 1];
  }

  function placeCaretAtEnd() {
    api.render();
    const len = api.input.value.length;
    api.input.setSelectionRange(len, len);
  }

  api.input.addEventListener('focus', () => {
    if (!api.touched) {
      api.touched = true;
      if (api.slots.slice(4).every(x => x === null)) {
        const [jy] = todayJalali();          // the system fills in the year
        String(jy).split('').forEach((c, i) => { api.slots[4 + i] = c; });
      }
      api.render(0);
    } else {
      // A filled field should behave like any normal input: cursor lands at
      // the end, so backspace deletes from there — which, because the day
      // sits last in the displayed YYYY/MM/DD string, means backspace
      // clears the day first, exactly as expected.
      placeCaretAtEnd();
    }
    // The calendar opens only from the field's own calendar button: focusing
    // a date field (to type it) no longer pops it open.
  });
  api.input.addEventListener('mouseup', () => {
    // Clicking on empty space inside the field (not directly on a typed
    // digit) should land at the end too, for the same reason as above.
    setTimeout(() => {
      if (document.activeElement !== api.input) return;
      const pos = api.input.selectionStart;
      const len = api.input.value.length;
      if (pos === 0 || pos === len) placeCaretAtEnd();
    }, 0);
  });

  api.input.addEventListener('blur', () => {
    // Focusing the field auto-fills the year. If the user tabbed through without
    // typing a day or month, treat it as never touched instead of "incomplete".
    const noDayOrMonth = api.slots.slice(0, 4).every(x => x === null);
    if (noDayOrMonth) {
      api.slots = [null, null, null, null, null, null, null, null];
      api.touched = false;
      api.field.classList.remove('error');
      api.render();
      return;
    }
    api.render();
    api.validate();
  });

  api.input.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === 'Tab') {
      // A mobile keyboard's own "Next" action often behaves like a native
      // Tab press rather than firing a synthetic Enter, and browsers'
      // built-in tab order sometimes skips right over a non-input "next"
      // element like the channels button — so once the date is complete,
      // send it there explicitly instead of trusting native traversal.
      if (!e.shiftKey && api.slots.every(x => x !== null) && cfg.nextEl) {
        e.preventDefault();
        cfg.nextEl.focus();
      }
      return;
    }
    if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;

    const selStart = api.input.selectionStart ?? 0;
    const selEnd = api.input.selectionEnd ?? selStart;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (selEnd > selStart) {
        for (let i = selStart; i < selEnd; i++) {
          const sl = IDX_TO_SLOT[i];
          if (sl !== null && sl !== undefined) api.slots[sl] = null;
        }
      }
      const slot = slotAtCaret(selStart);
      if (slot === 0 && ['4','5','6','7','8','9'].includes(e.key)) {
        api.slots[0] = '0'; api.slots[1] = e.key;
        api.render(2);
      } else if (slot === 2 && ['2','3','4','5','6','7','8','9'].includes(e.key)) {
        api.slots[2] = '0'; api.slots[3] = e.key;
        api.render(4);
      } else if (accepts(slot, e.key)) {
        api.slots[slot] = e.key;
        api.render(slot + 1);
      } else {
        api.render(slot);
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (selEnd > selStart) {
        let first = null;
        for (let i = selStart; i < selEnd; i++) {
          const sl = IDX_TO_SLOT[i];
          if (sl !== null && sl !== undefined) { api.slots[sl] = null; if (first === null) first = sl; }
        }
        api.render(first === null ? 0 : first);
      } else {
        let i = e.key === 'Backspace' ? selStart - 1 : selStart;
        while (i >= 0 && i < 10 && IDX_TO_SLOT[i] === null) i += (e.key === 'Backspace' ? -1 : 1);
        if (i >= 0 && i < 10) {
          const sl = IDX_TO_SLOT[i];
          api.slots[sl] = null;
          api.render(sl);
        }
      }
    } else if (e.key === 'Enter') {
      // On mobile, the "Next" key on the numeric keypad often fires this
      // instead of moving focus itself (unlike a real Tab press) — with no
      // handling at all here it just did nothing, most noticeably when the
      // next field is a button (like the channels selector) rather than
      // another text input a numeric keypad would naturally hand off to.
      e.preventDefault();
      if (api.slots.every(x => x !== null) && cfg.nextEl) cfg.nextEl.focus();
      return;
    } else {
      e.preventDefault();
      return;
    }
    api.field.classList.remove('error');
    saveDraft();
  });

  // Pasting used to just be swallowed outright — the field is a segmented
  // mask, so raw text genuinely can't be dropped in character-by-character,
  // but silently discarding the paste (rather than reading it) meant
  // copying a date from anywhere and pasting it here simply did nothing.
  // Now it reads the clipboard itself, pulls out 8 digits (Persian or
  // English) in the field's own YYYY MM DD order, and fills the slots —
  // so the paste is honored, just not as a literal text insertion.
  api.input.addEventListener('paste', (e) => {
    e.preventDefault();
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    const digits = toEnDigits(raw).replace(/[^0-9]/g, '');
    if (digits.length !== 8) return;   // not a recognizable date — leave the field alone rather than guess wrong
    const y = parseInt(digits.slice(0, 4), 10);
    const m = parseInt(digits.slice(4, 6), 10);
    const d = parseInt(digits.slice(6, 8), 10);
    api.setDate(y, m, d);
    saveDraft();
  });

  api.validate = () => {
    const untouched = api.slots.every(x => x === null);
    if (!api.required && untouched) { api.field.classList.remove('error'); return true; }
    if (untouched) {
      api.field.classList.add('error');
      api.msg.textContent = 'تاریخ را وارد کنید';
      return false;
    }
    if (!api.isFilled()) {
      api.field.classList.add('error');
      api.msg.textContent = 'تاریخ ناقص است — روز، ماه و سال را کامل کنید';
      return false;
    }
    const y = parseInt(api.yearStr(), 10);
    const m = parseInt(api.monthStr(), 10);
    const d = parseInt(api.dayStr(), 10);
    if (y < 1300 || y > 1500) {
      api.field.classList.add('error');
      api.msg.textContent = 'سال باید بین ۱۳۰۰ تا ۱۵۰۰ باشد';
      return false;
    }
    if (m < 1 || m > 12) {
      api.field.classList.add('error');
      api.msg.textContent = 'ماه نامعتبر است';
      return false;
    }
    const maxDay = daysInJalaliMonth(y, m);
    if (d < 1 || d > maxDay) {
      api.field.classList.add('error');
      api.msg.textContent = `روز نامعتبر است (حداکثر ${maxDay} روز در این ماه)`;
      return false;
    }
    api.field.classList.remove('error');
    return true;
  };

  if (api.calBtn) {
    api.calBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dueDateCal.classList.contains('show') && activeDateField === api) closeCalendar();
      else openCalendarFor(api);
    });
  }

  if (cfg.prefillToday) {
    const [ty, tm, td] = todayJalali();
    api.setDate(ty, tm, td);
  } else {
    api.render();
  }
  return api;
}

const dueDate = createDateField({
  input: dueDateInput, field: dueDateField, msg: dueDateMsg,
  calBtn: dueDateCalBtn, required: true
});
const spendDate = createDateField({
  input: spendDateInput, field: spendDateField, msg: spendDateMsg,
  calBtn: spendDateCalBtn, required: false
});
const sendDate = createDateField({
  input: sendDateInput, field: sendDateField, msg: sendDateMsg,
  calBtn: sendDateCalBtn, required: true, prefillToday: true
  // nextEl used to jump straight to channelBox here — a leftover from
  // before the two-column layout, when sendDate really was the field
  // right before channel. Now party/spendDate/benef/nid sit between them,
  // so that jump was skipping four required fields on Tab. Natural tab
  // order (into partyInput next) is correct again without it.
});

// =========================================================
// ---- Amount field: live 3-digit grouping + amount in words ----
// =========================================================
const YEKAN  = ['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه'];
const DAH    = ['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
const DAHYEK = ['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
const SADGAN = ['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
const SCALES = ['','هزار','میلیون','میلیارد','بیلیون','بیلیارد'];

function threeDigitToWords(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(SADGAN[h]);
  if (rest >= 10 && rest <= 19) {
    parts.push(DAHYEK[rest - 10]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t > 0) parts.push(DAH[t]);
    if (o > 0) parts.push(YEKAN[o]);
  }
  return parts.join(' و ');
}

function numberToPersianWords(num) {
  if (num === 0) return 'صفر';
  const groups = [];
  let n = num;
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const out = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const w = threeDigitToWords(groups[i]);
    out.push(SCALES[i] ? `${w} ${SCALES[i]}` : w);
  }
  return out.join(' و ');
}

function groupDigits(str) {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function amountRawDigits() {
  return toEnDigits(amountInput.value).replace(/[^0-9]/g, '');
}

// keep the caret sensible while commas are inserted as the user types
function setAmountValue(rawDigits, digitsBeforeCaret) {
  const trimmed = rawDigits.replace(/^0+(?=\d)/, '');
  const formatted = trimmed === '' ? '' : toFa(groupDigits(trimmed));
  amountInput.value = formatted;
  if (typeof digitsBeforeCaret === 'number' && document.activeElement === amountInput) {
    let seen = 0, pos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') seen++;
      if (seen === digitsBeforeCaret) { pos = i + 1; break; }
    }
    if (digitsBeforeCaret === 0) pos = 0;
    amountInput.setSelectionRange(pos, pos);
  }
  updateAmountWords(trimmed);
}

function updateAmountWords(rawDigits) {
  const raw = rawDigits === undefined ? amountRawDigits() : rawDigits;
  if (raw === '' || parseInt(raw, 10) === 0) {
    amountWords.textContent = '';
    return;
  }
  const rial = parseInt(raw, 10);
  if (!Number.isSafeInteger(rial)) { amountWords.textContent = ''; return; }
  const toman = Math.floor(rial / 10);
  const remRial = rial % 10;
  let text = '';
  if (toman > 0) text = numberToPersianWords(toman) + ' تومان';
  if (remRial > 0) text += (text ? ' و ' : '') + numberToPersianWords(remRial) + ' ریال';
  amountWords.textContent = text;
}

amountInput.addEventListener('input', () => {
  const caret = amountInput.selectionStart ?? amountInput.value.length;
  const before = amountInput.value.slice(0, caret);
  const digitsBeforeCaret = toEnDigits(before).replace(/[^0-9]/g, '').length;
  const raw = amountRawDigits().slice(0, 15);
  setAmountValue(raw, digitsBeforeCaret);
  amountField.classList.remove('error');
  saveDraft();
});

amountInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === ' ') {
    e.preventDefault();
    const caret = amountInput.selectionStart ?? amountInput.value.length;
    const before = amountInput.value.slice(0, caret);
    const digitsBeforeCaret = toEnDigits(before).replace(/[^0-9]/g, '').length;
    const raw = (amountRawDigits().slice(0, digitsBeforeCaret) + '000' + amountRawDigits().slice(digitsBeforeCaret)).slice(0, 15);
    setAmountValue(raw, digitsBeforeCaret + 3);
    amountField.classList.remove('error');
    saveDraft();
    return;
  }
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'];
  if (allowed.includes(e.key)) return;
  if (!/^[0-9۰-۹]$/.test(e.key)) e.preventDefault();
});

amountInput.addEventListener('blur', () => {
  if (amountRawDigits() !== '') validateAmount();
});

function validateAmount() {
  const raw = amountRawDigits();
  if (raw === '') {
    amountField.classList.add('error');
    amountMsg.textContent = 'مبلغ چک را وارد کنید';
    return false;
  }
  if (parseInt(raw, 10) === 0) {
    amountField.classList.add('error');
    amountMsg.textContent = 'مبلغ نمی‌تواند صفر باشد';
    return false;
  }
  amountField.classList.remove('error');
  return true;
}

// =========================================================
// ---- Backend API: auth + fetch wrapper ----
// =========================================================

function getAuthToken() { return localStorage.getItem('chekino_token'); }

async function apiFetch(path, opts) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login';
    throw new Error('no token');
  }
  const res = await fetch(API_BASE_URL + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts && opts.headers ? opts.headers : {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('chekino_token');
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  return res;
}

async function apiJson(path, opts) {
  const res = await apiFetch(path, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || 'خطای سرور'), { status: res.status, data });
  return data;
}

// =========================================================
// ---- People: shared list of people (owners/parties/beneficiaries all
// draw from and write to the same /api/people table) ----
// =========================================================
let peopleCache = [];
// Guards against out-of-order responses: if several fetches are in flight at
// once (e.g. the modal's own refresh racing an add/edit's refresh), only the
// result of the most recently *started* one is allowed to land.
let peopleFetchSeq = 0;

async function fetchPeopleCache() {
  const seq = ++peopleFetchSeq;
  let result;
  try {
    result = await apiJson('/people');
  } catch (e) {
    result = [];
  }
  if (seq === peopleFetchSeq) {
    peopleCache = result;
  }
  return peopleCache;
}

function findPersonByName(name) {
  return peopleCache.find(p => normalizeName(p.full_name) === normalizeName(name)) || null;
}
function findPersonById(id) {
  return peopleCache.find(p => p.id === id) || null;
}

// Creates the person if the name is new, or updates their national ID if a
// different one was typed for an existing match. Returns the person's id
// (or null if the name was blank / the request failed). `role` only files a
// brand-new person under a tab of the people panel until a cheque gives them
// a real one — see personInRole below.
async function ensurePerson(name, nid, role) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return null;
  const cleanNid = nid ? toEnDigits(nid).replace(/[^0-9]/g, '') : null;
  const existing = findPersonByName(trimmedName);
  if (existing) {
    if (cleanNid && existing.national_id !== cleanNid) {
      try {
        await apiJson(`/people/${existing.id}`, { method: 'PUT', body: JSON.stringify({ national_id: cleanNid }) });
        // Patch the one row we just changed instead of re-downloading every
        // person: this sits on the path between the user pressing save and the
        // cheque actually being written.
        existing.national_id = cleanNid;
      } catch (e) {}
      return existing.id;
    }
    return existing.id;
  }
  try {
    const created = await apiJson('/people', {
      method: 'POST',
      body: JSON.stringify({ full_name: trimmedName, national_id: cleanNid, role: role || null }),
    });
    peopleCache.push(created);
    return created.id;
  } catch (e) {
    return null;
  }
}

// Owner, party and beneficiary are independent of one another, so resolving
// them one await at a time cost three round-trips of dead time on every save
// that introduced new names. They go together now — except when two of the
// fields name the same *new* person, where firing parallel creates would race
// and insert them twice; those share one call and reuse its id.
async function ensurePeople(rec) {
  const slots = [
    { name: rec.owner, nid: null, role: 'owner' },
    { name: rec.party, nid: null, role: 'party' },
    { name: rec.benef, nid: rec.nid, role: 'benef' },
  ];
  const byName = new Map();
  slots.forEach((s) => {
    const key = normalizeName((s.name || '').trim());
    if (!key) return;
    // A slot carrying a national id wins the shared call, so the id is not lost.
    if (!byName.has(key) || s.nid) byName.set(key, s);
  });
  const resolved = new Map();
  await Promise.all([...byName.entries()].map(async ([key, s]) => {
    resolved.set(key, await ensurePerson(s.name, s.nid, s.role));
  }));
  return slots.map((s) => {
    const key = normalizeName((s.name || '').trim());
    return key ? (resolved.get(key) ?? null) : null;
  });
}

// Arabic/Persian look-alikes and stray spacing differ between typists; fold them
// together so the same person never gets stored twice.
function normalizeName(str) {
  return String(str)
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/[\u0643]/g, 'ک')
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
}
function writeStore(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch (e) { return false; }
}

// Owners, parties and beneficiaries share one /api/people table (see
// fetchPeopleCache above), but each form field only offers the people who
// have actually played that role. Offering the whole table made every field
// suggest every name, which is how a طرف حساب ended up proposed as a صاحب چک.
// GET /api/people deliberately stays unfiltered: the pairing lives in the
// cheques, both lists are already in memory, and scoping here costs one pass
// over an array instead of another round-trip on a 480ms link.
function peopleInRole(role) {
  const roleIdx = buildRoleIndex();
  return peopleCache.filter(p => personInRole(p, role, roleIdx));
}
function allOwners() { return peopleInRole('owner').map(p => p.full_name); }
function allParties() { return peopleInRole('party').map(p => p.full_name); }
// Every beneficiary, ignoring which party they belong to — for the filter bar,
// where there is no party to scope against.
function allBeneficiaries() {
  return peopleInRole('benef').map(p => ({ name: p.full_name, nid: toFa(p.national_id || '') }));
}

// A national ID has to belong to exactly one person across the whole shared
// list — this returns who currently holds it, if anyone (other than
// excludeName, so re-saving the same person's own unchanged nid doesn't
// flag itself as a conflict).
function findNidOwner(nid, excludeName) {
  const norm = toEnDigits(nid).replace(/[^0-9]/g, '');
  if (!norm) return null;
  const hit = peopleCache.find(p =>
    (!excludeName || normalizeName(p.full_name) !== normalizeName(excludeName)) &&
    toEnDigits(p.national_id || '').replace(/[^0-9]/g, '') === norm
  );
  return hit ? { name: hit.full_name, party: null } : null;
}
// A cheque records the pair (party, beneficiary), so the beneficiary field is
// scoped to the طرف حساب currently typed into the form: only the people this
// party has actually paid. With no party chosen yet — or one that has no
// cheques — the list is empty and the field falls back to "new person".
// Reads the party field live rather than taking an argument, so the suggestion
// list re-scopes itself the moment the party changes.
function beneficiariesForParty() {
  const party = normalizeName(partyInput.value.trim());
  if (!party) return [];
  const seen = new Map();
  loadCheques().forEach(c => {
    if (normalizeName(c.party || '') !== party) return;
    const name = (c.benef || '').trim();
    if (!name) return;
    const key = normalizeName(name);
    if (seen.has(key)) return;
    // Prefer the person record: the cheque carries the name and nid as they
    // were at write time, the record carries them as they are now.
    const person = findPersonById(c.benefId) || findPersonByName(name);
    seen.set(key, {
      name: person ? person.full_name : name,
      nid: toFa((person && person.national_id) || c.nid || ''),
    });
  });
  return [...seen.values()];
}

// =========================================================
// ---- People management panel (owners / parties / beneficiaries) ----
// So typos don't quietly pile up as "new" people in the autocomplete lists,
// this lets someone pre-populate or correct the master lists directly,
// independent of any cheque actually referencing them yet.
// =========================================================
const peopleModalOverlay = document.getElementById('peopleModalOverlay');
const peopleModalClose = document.getElementById('peopleModalClose');
const peopleMgmtBtn = document.getElementById('peopleMgmtBtn');
const ownersListBox = document.getElementById('ownersListBox');
const partiesListBox = document.getElementById('partiesListBox');
const benefListBox = document.getElementById('benefListBox');
const benefPartySelect = document.getElementById('benefPartySelect');
const newOwnerInput = document.getElementById('newOwnerInput');
const newPartyInput = document.getElementById('newPartyInput');
const newBenefNameInput = document.getElementById('newBenefNameInput');
const newBenefNidInput = document.getElementById('newBenefNidInput');

// Beneficiaries used to be scoped to a selected party; the shared people
// list drops that scoping, so the party picker above the beneficiary tab
// is no longer needed.
const benefPartySelectWrap = document.querySelector('.people-benef-party-select');
if (benefPartySelectWrap) benefPartySelectWrap.style.display = 'none';

// A role belongs to the *cheque* — who was picked into which field — not to
// the person, so a person's categories are counted off the cheques that
// reference them. The same company really can be a طرف حساب on one cheque and
// a ذینفع on another, and it belongs in both tabs.
// personId -> { owner, party, benef } cheque counts. The suggestion lists ask
// for this on every keystroke, so it is memoised against the cheque array
// itself — checksCache is only ever replaced wholesale (never mutated in
// place), which makes identity a sound staleness check.
let roleIndexCache = null;
let roleIndexSource = null;
function buildRoleIndex() {
  const cheques = loadCheques();
  if (roleIndexCache && roleIndexSource === cheques) return roleIndexCache;
  const idx = new Map();
  const bump = (personId, role) => {
    if (!personId) return;
    let entry = idx.get(personId);
    if (!entry) { entry = { owner: 0, party: 0, benef: 0 }; idx.set(personId, entry); }
    entry[role]++;
  };
  cheques.forEach(c => {
    bump(c.ownerId, 'owner');
    bump(c.partyId, 'party');
    bump(c.benefId, 'benef');
  });
  roleIndexSource = cheques;
  roleIndexCache = idx;
  return idx;
}

// Cheques decide the tab whenever there are any. With none, the person was
// added by hand from the panel and falls back to the tab they were filed
// under. A leftover from before roles existed has neither, so it shows in
// every tab rather than disappearing from all three and becoming impossible
// to rename or delete while still haunting the suggestion lists.
function personInRole(person, role, roleIdx) {
  const used = roleIdx.get(person.id);
  if (used) return used[role] > 0;
  return !person.role || person.role === role;
}

// A single row: shows plain (non-editable) text by default, with an edit
// (pencil) button that swaps the row into inputs — so a stray click never
// accidentally starts an edit, and the field genuinely can't be typed into
// until that's deliberately requested. The delete button is left out
// entirely once any cheque references the entry, since the server itself
// also refuses to delete a person who's still linked to a check.
function peopleItemHtml(person, count, showNid) {
  const nid = person.national_id;
  const hasNid = showNid && nid;
  const canDelete = count === 0;
  return `<div class="people-item" data-id="${person.id}" data-name="${escapeHtml(person.full_name)}" data-nid="${hasNid ? escapeHtml(nid) : ''}">
    <button type="button" class="people-item-edit" title="ویرایش">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
    </button>
    <button type="button" class="people-item-confirm" title="تأیید ویرایش" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <button type="button" class="people-item-cancel" title="لغو" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="people-item-display">
      <span class="people-item-name-text">${escapeHtml(person.full_name)}</span>
      ${hasNid ? `<span class="people-item-nid">${toFa(nid)}</span>` : ''}
    </div>
    <div class="people-item-edit-fields" style="display:none">
      <input type="text" class="people-item-name-input" value="${escapeHtml(person.full_name)}">
      ${hasNid ? `<input type="text" class="people-item-nid-input" value="${toFa(nid)}" inputmode="numeric" maxlength="11">` : ''}
    </div>
    <span class="people-item-count">${count > 0 ? toFa(count) + ' چک' : 'بدون چک'}</span>
    ${canDelete ? `<button type="button" class="people-item-delete" title="حذف">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>` : ''}
  </div>`;
}

// The count shown on a row is the count for *that* tab, so the delete button
// only appears where the person really has no cheque holding them.
function renderRoleList(box, role, showNid, rerender, emptyText) {
  const roleIdx = buildRoleIndex();
  const rows = peopleCache.filter(p => personInRole(p, role, roleIdx));
  box.innerHTML = rows.length
    ? rows.map(p => peopleItemHtml(p, (roleIdx.get(p.id) || {})[role] || 0, showNid)).join('')
    : `<div class="people-empty">${emptyText}</div>`;
  box.querySelectorAll('.people-item').forEach(item => wirePeopleItem(item, { rerender }));
}

function renderOwnersList() {
  renderRoleList(ownersListBox, 'owner', false, renderOwnersList, 'هنوز صاحب چکی ثبت نشده');
}

function renderPartiesList() {
  renderRoleList(partiesListBox, 'party', false, renderPartiesList, 'هنوز طرف حسابی ثبت نشده');
}

function renderBenefList() {
  renderRoleList(benefListBox, 'benef', true, renderBenefList, 'هنوز ذینفعی ثبت نشده');
}

// The three tabs are three views of one shared people table, so any
// add/edit/delete refreshes all of them at once (plus the cheque table, since
// names may be shown there).
function renderAllPeopleLists() {
  renderOwnersList();
  renderPartiesList();
  renderBenefList();
}

// A generic wire-up shared by every row: click the pencil to reveal real
// inputs (name, and national ID when the row has one), Enter/✓ commits via
// PUT /api/people/:id, Escape/✗ cancels, and delete calls DELETE
// /api/people/:id (the server itself rejects it with a clear message if a
// check still references this person).
function wirePeopleItem(item, cfg) {
  const editBtn = item.querySelector('.people-item-edit');
  const confirmBtn = item.querySelector('.people-item-confirm');
  const cancelBtn = item.querySelector('.people-item-cancel');
  const deleteBtn = item.querySelector('.people-item-delete');
  const display = item.querySelector('.people-item-display');
  const editFields = item.querySelector('.people-item-edit-fields');
  const nameInput = item.querySelector('.people-item-name-input');
  const nidInput = item.querySelector('.people-item-nid-input');
  const personId = parseInt(item.dataset.id, 10);
  const oldName = item.dataset.name;
  const oldNid = item.dataset.nid;

  function enterEdit() {
    display.style.display = 'none';
    editFields.style.display = 'flex';
    editBtn.style.display = 'none';
    confirmBtn.style.display = 'flex';
    if (deleteBtn) deleteBtn.style.display = 'none';
    cancelBtn.style.display = 'flex';
    nameInput.focus();
    nameInput.select();
  }
  // Only Enter/✓ confirms and only Esc/✗ cancels — clicking away no longer
  // saves on its own, so a stray blur can't commit a half-finished edit.
  async function exitEdit(commit) {
    if (commit) {
      const newName = nameInput.value.trim();
      const newNid = nidInput ? toEnDigits(nidInput.value).replace(/[^0-9]/g, '') : null;
      if ((newName && newName !== oldName) || (nidInput && newNid !== oldNid)) {
        if (nidInput && newNid) {
          const conflict = findNidOwner(newNid, oldName);
          if (conflict) { showToast(`این کد ملی قبلاً برای «${conflict.name}» ثبت شده`); return; }
        }
        try {
          await apiJson(`/people/${personId}`, {
            method: 'PUT',
            body: JSON.stringify({ full_name: newName || oldName, national_id: nidInput ? (newNid || null) : undefined }),
          });
          await fetchPeopleCache();
          renderAllPeopleLists();
          renderTable();
          showToast('ذخیره شد');
          return;
        } catch (e) {
          showToast(e.message || 'ذخیره ناموفق بود');
          return;
        }
      }
    }
    cfg.rerender();
  }
  editBtn.addEventListener('click', enterEdit);
  confirmBtn.addEventListener('click', () => exitEdit(true));
  cancelBtn.addEventListener('click', () => exitEdit(false));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); exitEdit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); exitEdit(false); }
  });
  if (nidInput) {
    nidInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); exitEdit(true); }
      else if (e.key === 'Escape') { e.preventDefault(); exitEdit(false); }
    });
  }
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      try {
        await apiJson(`/people/${personId}`, { method: 'DELETE' });
        await fetchPeopleCache();
        renderAllPeopleLists();
      } catch (e) {
        showToast(e.message || 'حذف ناموفق بود');
      }
    });
  }
}

// Adding from a tab files the person under that tab. A name that already
// exists is never inserted twice: if no cheque has given them a role yet they
// simply move here, and if one has, they stay where their cheques put them and
// the user is told why — the click used to just clear the box and look broken.
async function addPersonToRole(role, name, nid) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const existed = findPersonByName(trimmed);
  const id = await ensurePerson(trimmed, nid, role);
  if (id === null) { showToast('ثبت ناموفق بود'); return; }
  if (!existed) return;                                   // brand new — already filed here
  if (buildRoleIndex().has(id)) {
    showToast(`«${existed.full_name}» ثبت شده و دسته‌اش از روی چک‌هایش تعیین می‌شود`);
    return;
  }
  if (existed.role === role) { showToast(`«${existed.full_name}» از قبل در این دسته است`); return; }
  try {
    await apiJson(`/people/${id}`, { method: 'PUT', body: JSON.stringify({ role }) });
    existed.role = role;
  } catch (e) {
    showToast(e.message || 'ذخیره ناموفق بود');
  }
}

document.getElementById('addOwnerBtn').addEventListener('click', async () => {
  const name = newOwnerInput.value.trim();
  if (!name) return;
  await addPersonToRole('owner', name);
  newOwnerInput.value = '';
  renderAllPeopleLists();
});
document.getElementById('addPartyBtn').addEventListener('click', async () => {
  const name = newPartyInput.value.trim();
  if (!name) return;
  await addPersonToRole('party', name);
  newPartyInput.value = '';
  renderAllPeopleLists();
});
document.getElementById('addBenefBtn').addEventListener('click', async () => {
  const name = newBenefNameInput.value.trim();
  const nid = toEnDigits(newBenefNidInput.value).replace(/[^0-9]/g, '');
  if (!name) return;
  if (nid) {
    const conflict = findNidOwner(nid, name);
    if (conflict) { showToast(`این کد ملی قبلاً برای «${conflict.name}» ثبت شده`); return; }
  }
  await addPersonToRole('benef', name, nid);
  newBenefNameInput.value = '';
  newBenefNidInput.value = '';
  renderAllPeopleLists();
});

document.querySelectorAll('.people-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.people-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('peoplePanelOwners').style.display = tab.dataset.peopleTab === 'owners' ? 'block' : 'none';
    document.getElementById('peoplePanelParties').style.display = tab.dataset.peopleTab === 'parties' ? 'block' : 'none';
    document.getElementById('peoplePanelBenef').style.display = tab.dataset.peopleTab === 'benef' ? 'block' : 'none';
  });
});

function openPeopleModal() {
  pushBackGuard();
  renderAllPeopleLists();
  peopleModalOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  fetchPeopleCache().then(renderAllPeopleLists);
}
function closePeopleModal() {
  peopleModalOverlay.classList.remove('show');
  document.body.style.overflow = modalOverlay.classList.contains('show') ? 'hidden' : '';
}
peopleMgmtBtn.addEventListener('click', openPeopleModal);
peopleModalClose.addEventListener('click', closePeopleModal);
peopleModalOverlay.addEventListener('click', (e) => { if (e.target === peopleModalOverlay) closePeopleModal(); });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const idx = normalizeName(text).indexOf(normalizeName(query));
  if (idx < 0) return safe;
  const len = normalizeName(query).length;
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + len)) +
         '</mark>' + escapeHtml(text.slice(idx + len));
}

// One autocomplete implementation, configured per field.
// Every dropdown-style list (autocomplete, channel picker, status menu) is
// position:fixed and anchored to its trigger via this — immune to being
// clipped by any scrollable ancestor (modal body, filter popovers, etc).
function positionDropdown(listEl, anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  const w = r.width;   // always match the field's own width exactly
  const h = listEl.offsetHeight || 200;
  let left = r.right - w;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  // These are viewport coordinates, which only work while the list has no
  // ancestor carrying a transform, filter, backdrop-filter or perspective:
  // any one of those quietly becomes the containing block for a fixed
  // descendant and re-bases left/top onto its own padding box. That is how
  // the person lists ended up hundreds of pixels from their field once the
  // modal grew an open animation (transform, fill-mode both) and a blurred
  // overlay. So every list this positions lives directly under <body> —
  // keep it that way when adding new ones. Measuring the element back and
  // correcting the delta does not work as a safety net here: menuIn scales
  // the box while it opens, so the reading is wrong exactly when it is taken.
  listEl.style.left = left + 'px';
  listEl.style.top = top + 'px';
  listEl.style.width = w + 'px';
}

function createAutocomplete(cfg) {
  let matches = [];
  let activeIdx = -1;
  let repositionFn = null;

  function close() {
    cfg.list.classList.remove('show');
    activeIdx = -1;
    if (repositionFn) {
      window.removeEventListener('scroll', repositionFn, true);
      window.removeEventListener('resize', repositionFn);
      repositionFn = null;
    }
  }

  // browse: the arrow in the field's suffix asks for the list even while
  // the field is empty, so the people on file can be picked without
  // remembering how their name starts.
  function render(browse) {
    const query = cfg.input.value;
    const empty = query.trim() === '';
    if (empty && !browse) { close(); return; }
    matches = cfg.search(query).slice(0, empty ? 20 : 8);
    activeIdx = -1;

    let html = '';
    matches.forEach((item, i) => {
      const main = `<span class="ac-main">${highlightMatch(cfg.primary(item), query)}</span>`;
      const sub = cfg.secondary ? `<span class="ac-tag">${escapeHtml(cfg.secondary(item))}</span>` : '';
      html += `<div class="ac-item" data-idx="${i}">${main}${sub}</div>`;
    });
    if (cfg.allowNew && !empty && !cfg.hasExact(query)) {
      // The label can depend on the query: a name that is new to *this* field
      // may still be someone already on file under another role, and calling
      // them "new" would suggest a second record is about to be created.
      const newLabel = typeof cfg.newLabel === 'function' ? cfg.newLabel(query) : (cfg.newLabel || 'مورد جدید');
      html += `<div class="ac-item ac-new" data-new="1"><span class="ac-main">${escapeHtml(query.trim())}</span><span class="ac-tag">${escapeHtml(newLabel)}</span></div>`;
    }
    if (html === '') {
      if (cfg.hideWhenEmpty) { close(); return; }   // nothing to offer — stay out of the way
      html = `<div class="ac-empty">${cfg.emptyText || 'موردی یافت نشد'}</div>`;
    }

    cfg.list.innerHTML = html;
    cfg.list.classList.add('show');
    positionDropdown(cfg.list, cfg.input);
    if (!repositionFn) {
      repositionFn = () => positionDropdown(cfg.list, cfg.input);
      window.addEventListener('scroll', repositionFn, true);
      window.addEventListener('resize', repositionFn);
    }

    cfg.list.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (el.dataset.new) { close(); cfg.field.classList.remove('error'); saveDraft(); return; }
        cfg.pick(matches[parseInt(el.dataset.idx, 10)]);
        close();
        cfg.field.classList.remove('error');
        saveDraft();
      });
    });
  }

  function setActive(i) {
    const items = cfg.list.querySelectorAll('.ac-item');
    if (!items.length) return;
    activeIdx = (i + items.length) % items.length;
    items.forEach((el, n) => el.classList.toggle('active', n === activeIdx));
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  cfg.input.addEventListener('input', () => {
    if (cfg.sanitize) cfg.input.value = cfg.sanitize(cfg.input.value);
    render();                                  // list appears from the first character
    cfg.field.classList.remove('error');
    if (cfg.onType) cfg.onType();
    saveDraft();
  });

  cfg.input.addEventListener('keydown', (e) => {
    if (!cfg.list.classList.contains('show')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();   // this Enter picks a suggestion — it must not also submit the form
      if (activeIdx >= 0) {
        const el = cfg.list.querySelectorAll('.ac-item')[activeIdx];
        if (!el.dataset.new) cfg.pick(matches[parseInt(el.dataset.idx, 10)]);
      }
      close();
      saveDraft();
    } else if (e.key === 'Escape') close();
  });

  cfg.input.addEventListener('blur', () => {
    close();
    if (cfg.onBlur) cfg.onBlur();
    saveDraft();
  });

  // Sent by the suffix arrow (js/field-addons.js): toggle the full list.
  cfg.input.addEventListener('ac-browse', () => {
    if (cfg.list.classList.contains('show')) close();
    else render(true);
  });

  return { close, render };
}

// A name typed by hand is folded onto the person already on file whenever one
// matches, so ی/ک variants and stray spacing resolve to that record instead of
// looking like someone new. The lookup is deliberately across the whole table,
// not the role-scoped list: the *suggestions* are scoped, but a person is a
// person, and a second row for the same human is never the right outcome.
function foldOntoKnownPerson(input) {
  const typed = input.value.trim();
  if (!typed) return null;
  const person = findPersonByName(typed);
  if (person) input.value = person.full_name;
  return person;
}

// Tag for the "create" row: honest about whether this really is a new person.
const newPersonLabel = q => (findPersonByName(q) ? 'شخص موجود' : 'شخص جدید');

// ---- صاحب چک ----
const ownerAC = createAutocomplete({
  input: ownerInput, list: ownerList, field: ownerField,
  search: q => allOwners().filter(x => normalizeName(x).includes(normalizeName(q))),
  primary: x => x,
  allowNew: true, newLabel: newPersonLabel,
  hasExact: q => allOwners().some(x => normalizeName(x) === normalizeName(q)),
  pick: x => { ownerInput.value = x; },
  // Leaving it empty isn't an error yet — a stray click-in-click-out with
  // nothing typed shouldn't scold the user. That "required" check only
  // matters at submit time (see the checks array there); blur here only
  // catches something actually typed.
  onBlur: () => {
    foldOntoKnownPerson(ownerInput);
    if (ownerInput.value.trim()) validateOwner(); else ownerField.classList.remove('error');
  }
});

// ---- طرف حساب ----
const partyAC = createAutocomplete({
  input: partyInput, list: partyList, field: partyField,
  search: q => allParties().filter(x => normalizeName(x).includes(normalizeName(q))),
  primary: x => x,
  allowNew: true, newLabel: q => (findPersonByName(q) ? 'طرف حساب موجود' : 'طرف حساب جدید'),
  hasExact: q => allParties().some(x => normalizeName(x) === normalizeName(q)),
  pick: x => { partyInput.value = x; clearBeneficiaryPair(); benefAC.close(); nidAC.close(); },
  onType: () => clearBeneficiaryPair(),        // beneficiaries belong to a party
  onBlur: () => {
    foldOntoKnownPerson(partyInput);
    if (partyInput.value.trim()) validateParty(); else partyField.classList.remove('error');
  }
});

function clearBeneficiaryPair() {
  benefInput.value = '';
  nidInput.value = '';
  nidKind.textContent = '';
  benefField.classList.remove('error');
  nidField.classList.remove('error');
}

// ---- ذینفع: name and national id are two views of the same record ----
// Picking either one fills the other, in both directions, so the pair can
// never end up describing two different people.
function selectBeneficiary(p) {
  benefInput.value = p.name;
  nidInput.value = p.nid;
  benefField.classList.remove('error');
  nidField.classList.remove('error');
  updateNidKind();
}

const benefAC = createAutocomplete({
  input: benefInput, list: benefList, field: benefField,
  search: q => beneficiariesForParty().filter(p => normalizeName(p.name).includes(normalizeName(q))),
  primary: p => p.name,
  secondary: p => p.nid,
  allowNew: true, newLabel: newPersonLabel,
  hasExact: q => beneficiariesForParty().some(p => normalizeName(p.name) === normalizeName(q)),
  emptyText: 'برای این طرف حساب شخصی ثبت نشده',
  pick: selectBeneficiary,
  onBlur: () => {
    const typed = benefInput.value.trim();
    if (!typed) { benefField.classList.remove('error'); return; }
    const hit = beneficiariesForParty().find(p => normalizeName(p.name) === normalizeName(typed));
    if (hit) {
      // Already a beneficiary of this party — same record, so take its
      // spelling and its national id rather than treating it as a new person.
      benefInput.value = hit.name;
      if (!nidInput.value.trim()) { nidInput.value = hit.nid; updateNidKind(); }
    } else {
      // Not one of this party's beneficiaries, but possibly someone already on
      // file under another role. Fold onto that record so the save reuses it.
      const person = foldOntoKnownPerson(benefInput);
      if (person && person.national_id && !nidInput.value.trim()) {
        nidInput.value = toFa(person.national_id);
        updateNidKind();
      }
    }
    validateBenef();
  }
});

const nidAC = createAutocomplete({
  input: nidInput, list: nidList, field: nidField,
  sanitize: v => toFa(toEnDigits(v).replace(/[^0-9]/g, '').slice(0, 11)),
  onType: () => updateNidKind(),
  search: q => beneficiariesForParty().filter(p => p.nid && toEnDigits(p.nid).includes(toEnDigits(q))),
  primary: p => p.nid,
  secondary: p => p.name,
  allowNew: false,
  hasExact: q => beneficiariesForParty().some(p => toEnDigits(p.nid) === toEnDigits(q)),
  hideWhenEmpty: true,
  pick: selectBeneficiary,
  onBlur: () => {
    const typed = toEnDigits(nidInput.value).trim();
    if (!typed) { nidField.classList.remove('error'); return; }
    const hit = beneficiariesForParty().find(p => toEnDigits(p.nid) === typed);
    if (hit && !benefInput.value.trim()) benefInput.value = hit.name;
    validateNid();
  }
});

// A real edit to any of these — typing, not just the sticky carry-over from
// the last save — means the form is genuinely dirty again.
[ownerInput, partyInput, benefInput, nidInput].forEach(el => {
  el.addEventListener('input', () => { stickyFieldsUntouched = false; });
});

function validateOwner() {
  if (ownerInput.value.trim() === '') {
    ownerField.classList.add('error');
    ownerMsg.textContent = 'نام صاحب چک را وارد کنید';
    return false;
  }
  ownerField.classList.remove('error');
  return true;
}
function validateParty() {
  if (partyInput.value.trim() === '') {
    partyField.classList.add('error');
    partyMsg.textContent = 'نام طرف حساب را وارد کنید';
    return false;
  }
  partyField.classList.remove('error');
  return true;
}
function validateBenef() {
  if (benefInput.value.trim() === '') {
    benefField.classList.add('error');
    benefMsg.textContent = 'نام ذینفع را وارد کنید';
    return false;
  }
  benefField.classList.remove('error');
  return true;
}
function updateNidKind() {
  const n = toEnDigits(nidInput.value).replace(/[^0-9]/g, '').length;
  if (n === 10) nidKind.textContent = 'حقیقی';
  else if (n === 11) nidKind.textContent = 'حقوقی';
  else nidKind.textContent = '';
}

function validateNid() {
  const raw = toEnDigits(nidInput.value).replace(/[^0-9]/g, '');
  if (raw.length === 0) {
    nidField.classList.add('error');
    nidMsg.textContent = 'کد یا شناسه ملی را وارد کنید';
    return false;
  }
  if (raw.length !== 10 && raw.length !== 11) {
    nidField.classList.add('error');
    nidMsg.textContent = `باید ۱۰ رقم (حقیقی) یا ۱۱ رقم (حقوقی) باشد — ${toFa(raw.length)} رقم وارد شده`;
    return false;
  }
  const conflict = findNidOwner(raw, benefInput.value.trim());
  if (conflict) {
    nidField.classList.add('error');
    nidMsg.textContent = `این کد ملی قبلاً برای «${conflict.name}» ثبت شده`;
    return false;
  }
  nidField.classList.remove('error');
  return true;
}

// On a phone, moving to the next field scrolls it up to just under the
// previous one — one field's worth each time, same as pressing Next again.
function scrollFieldIntoView(field) {
  if (window.innerWidth > 600 || !field) return;
  setTimeout(() => {
    const bodyTop = modalBody.getBoundingClientRect().top;
    const fieldTop = field.getBoundingClientRect().top;
    const gap = 16;   // the previous field's bottom edge stays just above this
    const delta = fieldTop - bodyTop - gap;
    if (Math.abs(delta) > 4) modalBody.scrollBy({ top: delta, behavior: 'smooth' });
  }, 120);
}

let lastFocusedFormField = null;
modalBody.addEventListener('focusin', (e) => {
  const field = e.target.closest('.form-field');
  if (!field) return;
  // Send the field we just left to the top of the screen — the one we're now
  // filling naturally lands right under it, already clear of the keyboard.
  const prev = (lastFocusedFormField && lastFocusedFormField !== field) ? lastFocusedFormField : field;
  scrollFieldIntoView(prev);
  lastFocusedFormField = field;
});

// ---- Notes ----
// A single line beside the photo (it grows as it fills); the channels field
// comes after it now, so nothing needs redirecting on the way in.
function updateNotesCount() {
  const n = notesInput.value.length;
  notesCount.textContent = n === 0 ? '' : `${toFa(n)} / ${toFa(500)}`;
}
// Enter moves on to the next field (the owner, first of the people)
// instead of inserting a newline — matching the "next"-labeled key the
// enterkeyhint asks mobile keyboards to show. Shift+Enter still breaks a line.
notesInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ownerInput.focus(); }
});
notesInput.addEventListener('input', () => {
  updateNotesCount();
  saveDraft();
});

// =========================================================
// ---- "Sent via" multi-select ----
// =========================================================
// Logo files supplied by the user. Single-colour marks inherit their colour from
// CSS; Rubika's mark is multi-colour and keeps its own palette.
const LOGO_WHATSAPP = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 22L3.41152 16.8691C2.54422 15.3639 2.08876 13.6568 2.09099 11.9196C2.08095 6.44549 6.52644 2 11.99 2C14.6417 2 17.1315 3.02806 19.0062 4.9034C19.9303 5.82266 20.6627 6.91616 21.1611 8.12054C21.6595 9.32492 21.9139 10.6162 21.9096 11.9196C21.9096 17.3832 17.4641 21.8287 12 21.8287C10.3368 21.8287 8.71374 21.4151 7.26204 20.6192L2 22ZM7.49424 18.8349L7.79675 19.0162C9.06649 19.7676 10.5146 20.1644 11.99 20.1654C16.5264 20.1654 20.2263 16.4662 20.2263 11.9291C20.2263 9.73176 19.3696 7.65554 17.8168 6.1034C17.0533 5.33553 16.1453 4.72636 15.1453 4.31101C14.1452 3.89565 13.0728 3.68232 11.99 3.68331C7.44343 3.6839 3.74476 7.38316 3.74476 11.9202C3.74476 13.4724 4.17843 14.995 5.00502 16.3055L5.19645 16.618L4.35982 19.662L7.49483 18.8354L7.49424 18.8349Z" fill="currentColor"/> <path fill-rule="evenodd" clip-rule="evenodd" d="M9.52024 7.76662C9.33885 7.35303 9.13737 7.34298 8.96603 7.34298C8.81477 7.33294 8.65288 7.33294 8.48154 7.33294C8.32083 7.33294 8.04845 7.39321 7.81684 7.64549C7.58464 7.89719 6.95007 8.49217 6.95007 9.71167C6.95007 10.9318 7.83693 12.1111 7.95805 12.2724C8.07858 12.4337 9.67149 15.0139 12.192 16.0124C14.2883 16.839 14.712 16.6777 15.1657 16.6269C15.6189 16.5767 16.6275 16.0325 16.839 15.4476C17.0405 14.8733 17.0405 14.3693 16.9802 14.2682C16.9199 14.1678 16.748 14.1069 16.5064 13.9758C16.2541 13.8552 15.0446 13.2502 14.813 13.1693C14.5808 13.0889 14.4195 13.0487 14.2582 13.2904C14.0969 13.5427 13.623 14.0969 13.4724 14.2582C13.3306 14.4195 13.1799 14.4396 12.9377 14.3185C12.686 14.1979 11.8895 13.9356 10.9418 13.0889C10.2056 12.4331 9.71167 11.6171 9.56041 11.3755C9.41979 11.1232 9.54032 10.992 9.67149 10.8709C9.78257 10.7604 9.92378 10.579 10.0449 10.4378C10.1654 10.296 10.2056 10.1855 10.2966 10.0242C10.377 9.86292 10.3368 9.71167 10.2765 9.59114C10.2157 9.48006 9.74239 8.25997 9.52024 7.76603V7.76662Z" fill="currentColor"/></svg>';
const LOGO_EITAA    = '<svg viewBox="0 0 3584.55 3673.6" xmlns="http://www.w3.org/2000/svg"><g id="Isolation_Mode" data-name="Isolation Mode"> <path d="M1071.43,2.75H2607.66C3171,2.75,3631.82,462.91,3631.82,1026.2v493.93c-505,227-1014.43,1348.12-1756.93,1104.51-61.16,43.46-202.11,222.55-212,358.43-257.11-34.24-553.52-328.88-517.95-646.62C717,2026.91,1070.39,1455.5,1409.74,1225.51c727.32-492.94,1737.05-69,1175.39,283.45-341.52,214.31-1071.84,355.88-995.91-170.24-200.34,57.78-328.58,431.34-87.37,626-223.45,219.53-180.49,623.07,58.36,755.57,241.56-625.87,1082.31-544.08,1422-1291.2,255.57-562-123.34-1202.37-880.91-1104C1529.56,399.34,993.64,881.63,725.62,1453.64,453.68,2034,494.15,2811.15,1052.55,3202.82c657.15,460.92,1356.78,34.13,1780.52-523.68,249.77-328.78,468-693,798.75-903.37v875.72c0,563.28-460.88,1024.86-1024.16,1024.86H1071.43c-563.29,0-1024.16-460.87-1024.16-1024.16V1026.9C47.27,463.61,508.14,2.74,1071.43,2.74Z" transform="translate(-47.27 -2.74)" fill-rule="evenodd" fill="currentColor"/> </g></svg>';
const LOGO_TELEGRAM = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M41.4193 7.30899C41.4193 7.30899 45.3046 5.79399 44.9808 9.47328C44.8729 10.9883 43.9016 16.2908 43.1461 22.0262L40.5559 39.0159C40.5559 39.0159 40.3401 41.5048 38.3974 41.9377C36.4547 42.3705 33.5408 40.4227 33.0011 39.9898C32.5694 39.6652 24.9068 34.7955 22.2086 32.4148C21.4531 31.7655 20.5897 30.4669 22.3165 28.9519L33.6487 18.1305C34.9438 16.8319 36.2389 13.8019 30.8426 17.4812L15.7331 27.7616C15.7331 27.7616 14.0063 28.8437 10.7686 27.8698L3.75342 25.7055C3.75342 25.7055 1.16321 24.0823 5.58815 22.459C16.3807 17.3729 29.6555 12.1786 41.4193 7.30899Z" fill="currentColor"/></svg>';
const LOGO_BALE     = '<svg viewBox="0 0 1000 999.63" xmlns="http://www.w3.org/2000/svg"><g id="File"> <path d="M1009.65,466.44c-1.3-21.39-5-42.79-9.7-63.78C987.56,346,964.66,291.8,933.47,242.91,863.09,132.24,747.53,51,619,24a411.57,411.57,0,0,0-57.28-9.1,443.14,443.14,0,0,0-76.38-1.7,388.45,388.45,0,0,0-61.88,7.2c-18.7,2.6-36.89,7.8-55,12.69-16.9,5.3-33.69,11.3-50.09,18.2a469.62,469.62,0,0,0-45.78,22.09,437.61,437.61,0,0,0-42.69,26.29,100.06,100.06,0,0,1-10.6,6.8c-34.19-26-68.78-51.38-104.77-74.77-9.89-6.1-19.49-13-30.59-16.7-18.19-6.4-39.48-1.5-53.78,11.5C16.55,38.57,10.66,57.37,12.26,75.26c.1,23.79-.1,47.69.2,71.48-.3,24-.1,48.18-.2,72.18s-.1,48,.1,72q-.3,42,0,83.87-.3,40.78.1,81.57c.2,34-1.6,68.18,2.19,102.07,2.7,34.89,9.9,69.48,20.3,102.77,47.38,154.85,175.24,283,330.8,328.3l.1.6c32.39,9.6,65.68,16.7,99.27,19.29,37.28,3.6,75.07,3.5,112.16-2.19,19.9-1.5,39.39-6.4,58.88-10.7A566.24,566.24,0,0,0,702,974.59c20.1-8.6,40-17.9,58.89-29.1a455,455,0,0,0,48.38-31.59,496.83,496.83,0,0,0,51.28-43.48,486.75,486.75,0,0,0,35.19-38A500,500,0,0,0,926.27,792c8.6-12.79,16.6-26.09,24.3-39.49,7.89-15.19,15.49-30.39,22.29-46.08,7.4-18.8,14.7-37.69,19.89-57.18,4.4-16,9.2-32,10.8-48.49,4.2-17.39,6.1-35.69,6.8-53.48A412.52,412.52,0,0,0,1009.65,466.44ZM826.51,400.86c-6.1,16.2-16.8,30.09-29.5,41.69-11.09,11-22.09,22.09-33.19,33.19-11.79,11.79-23.59,23.49-35.28,35.39-11.3,11.19-22.6,22.39-33.89,33.79-12.3,12.29-24.7,24.59-36.89,36.89-14,14.09-28.09,28-42.09,42.08-13.2,13.3-26.49,26.49-39.79,39.79s-26.79,26.69-40.09,40.09c-12.29,11.79-23.49,24.89-37.38,35a105.49,105.49,0,0,1-57.89,16c-23.59-1.5-46.68-10.79-63.68-27.39q-78.42-78.42-156.95-157c-12.79-12.7-21.39-29.09-26-46.39-4.8-23.89-2-49.48,10.3-70.77,9.39-16.5,23.79-29.6,40.18-39a107.88,107.88,0,0,1,57.89-9.7c21.39,3.2,41.88,13,56.88,28.79,28.39,28.39,56.68,56.88,85.27,85.18,8.6-8.2,16.9-16.8,25.1-25.3,12-11.49,23.79-23.29,35.28-35.39,11.4-10.59,22.3-21.79,33.09-33.09,7.7-6.89,14.7-14.49,22.1-21.79,12-11.7,23.69-23.59,35.39-35.49,11.29-10.79,22.19-22,33.09-33,11.79-11.49,23.29-23.29,35-34.89a106.64,106.64,0,0,1,42.18-26.39A107.77,107.77,0,0,1,768,274.5c25.7,9.8,46.29,30,57.59,54.88C833.9,352.28,834.9,377.87,826.51,400.86Z" transform="translate(-12 -12.19)" fill="currentColor"/> </g></svg>';
const LOGO_CALL     = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" fill="none"/></svg>';
const LOGO_SMS      = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/> <path d="M17 9L13.87 11.5C12.84 12.32 11.15 12.32 10.12 11.5L7 9" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
const LOGO_RUBIKA   = '<svg viewBox="0 0 495.37 543.04" xmlns="http://www.w3.org/2000/svg"><path d="M246.07,0h1.76c.48,42.73-.25,128.44-.25,128.44-40.86-22.92-82-45.3-122.84-68.29q40.13-22.81,80.32-45.51c12.69-7.16,26.33-13.31,41-14.64Z" fill="#b8ce01"/><path d="M247.73,0h3C266.62,1.43,281,9,294.67,16.68Q332.91,38.25,371.05,60c-41,22.73-82.45,45.82-123.51,68.48-.35-42.73.63-85.77.15-128.5Z" fill="#7db425"/><path d="M124.77,60.11,247.61,128.4,123.92,200.66s-.06-45.85.08-68.71C123.89,108.21,124.77,60.11,124.77,60.11Z" fill="#f6a925"/><path d="M371.19,60l.35.19c-.1,42.59,0,85.18,0,127.77-.07,4.17-.11,12.77-.11,12.77L247.62,128.45S330.2,82.76,371.23,60Z" fill="#35ac9d"/><path d="M371.44,60.21c27.28,15.51,54.37,31.36,81.47,47.17,13.11,7.36,27,15.52,34.16,29.39-38.38,21.25-115.68,64-115.68,64s-.06-8.61,0-12.78q0-63.89,0-127.77Z" fill="#59d6bd"/><path d="M46.5,105c25.65-15,78.19-44.88,78.19-44.88L124,200.66S47,158.21,8.71,137C17.05,122.13,32.11,113.12,46.5,105Z" fill="#ef7414"/><path d="M247.5,128.44l123.81,72.3s-39.84,22-59.62,32.64c-21.14,12-64.09,35.82-64.09,35.82L123.94,200.66Z" fill="#fff"/><path d="M0,193C.11,174.17-.23,154.15,8.66,137,47,158.21,123.92,200.66,123.92,200.66,82.55,224.58,41.38,248.86,0,272.81,0,246.21,0,219.62,0,193Z" fill="#e74b50"/><path d="M487.07,136.77c7.54,14.1,8.64,30.5,8.22,46.19v90.11L371.41,200.76S448.69,158,487.07,136.77Z" fill="#794387"/><path d="M123.92,200.66c.19-.08,123.66,68.54,123.66,68.54s0,71.69.07,106.76c.2,11.29-.07,34.11-.07,34.11-41.27-22.78-82.32-45.76-123.6-68.54l-.07-.31V200.66Z" fill="#e4e4e4"/><path d="M0,272.81c41.35-24,82.52-48.23,123.89-72.15q-.06,70.29,0,140.56c-6.35-2.65-12.13-6.43-18.19-9.64C70.5,312.21,35.38,292.39,0,273.21v-.4Z" fill="#794387"/><path d="M371.39,200.76v86.18c-.13,18.27.46,36.47,0,54.73-41.21,22.4-123.82,68.4-123.82,68.4s.27-22.82.07-34.11c0-35.07-.07-106.76-.07-106.76Z" fill="#f1f1f1"/><path d="M371.39,200.76s123.88,72.14,123.88,72.31c-41.17,22.82-123.87,68.6-123.87,68.6h0c.46-18.26-.13-36.46,0-54.73V200.76Z" fill="#4c3683"/><path d="M0,273.21c35.36,19.21,70.43,39,105.7,58.4,6.06,3.21,11.84,7,18.19,9.64l.07.31Q67,374.79,10,408.05C6,402,4,394.86,2.53,387.8.14,376,0,364,0,352v-78.8Z" fill="#4c3683"/><path d="M495.27,273.07c.06,27.65,0,55.3,0,82.95.4,17.73-.12,36.62-9.57,52.25-34.2-20-114.33-66.6-114.33-66.6S454.1,295.89,495.27,273.07Z" fill="#e74b50"/><path d="M10,408Q67,374.72,124,341.53c-.25,46.83.08,93.67-.16,140.49q-40.35-22.75-80.49-45.86C30.82,428.76,18,420.53,10,408Z" fill="#0f68a0"/><path d="M124,341.53c41.28,22.78,82.33,45.76,123.6,68.54-41.2,24-123.7,72-123.76,71.95.24-46.82-.09-93.66.16-140.49Z" fill="#49bdca"/><path d="M371.2,341.76l.2-.09c.12,46.84-.25,93.69.19,140.53l-.31.15c-32.66-19.51-65.71-38.4-98.52-57.68-8.26-4.7-25.18-14.6-25.18-14.6S330,364.21,371.2,341.76Z" fill="#f6a925"/><path d="M371.4,341.67h0c3.65,2.49,80.13,46.62,114.33,66.6-4.86,8.3-12.56,14.39-20.32,19.84-12.52,8.42-25.88,15.47-38.9,23.05-18.31,10.35-36.5,20.91-54.92,31-.44-46.84-.07-93.69-.19-140.53Z" fill="#ef7414"/><path d="M247.58,410.07V543c-10.25-1.51-21.42-3.87-30.5-9.08C186,516.66,154.81,499.5,123.82,482,165,458,206.38,434.12,247.58,410.07Z" fill="#7db425"/><path d="M247.58,410.07s16.92,9.9,25.18,14.6c32.81,19.28,65.86,38.17,98.52,57.68q-47.79,26.44-95.57,53A62.47,62.47,0,0,1,249.84,543h-2.26Z" fill="#b8ce01"/><path d="M602.83,233.66" fill="#f1f1f1"/></svg>';

const CHANNELS = [
  { id: 'rubika',   name: 'روبیکا',  color: '#FFFFFF', icon: LOGO_RUBIKA,   mono: false },
  { id: 'whatsapp', name: 'واتس‌اپ', color: '#25D366', icon: LOGO_WHATSAPP, mono: true },
  { id: 'eitaa',    name: 'ایتا',    color: '#F5911E', icon: LOGO_EITAA,    mono: true },
  { id: 'telegram', name: 'تلگرام',  color: '#229ED9', icon: LOGO_TELEGRAM, mono: true },
  { id: 'bale',     name: 'بله',     color: '#1BA13E', icon: LOGO_BALE,     mono: true },
  { id: 'call',     name: 'تماس',    color: '#2D8CFF', icon: LOGO_CALL,     mono: true },
  { id: 'sms',      name: 'پیامک',   color: '#64748B', icon: LOGO_SMS,      mono: true }
];

let selectedChannels = [];
let channelActiveIdx = -1;

function renderChannelOptions() {
  channelList.innerHTML = CHANNELS.map(c => `
    <div class="ms-option${selectedChannels.includes(c.id) ? ' checked' : ''}" data-id="${c.id}" role="option" aria-selected="${selectedChannels.includes(c.id)}">
      <span class="ms-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <span class="ms-icon${c.mono ? '' : ' ms-icon-plain'}" style="background:${c.color}">${c.icon}</span>
      <span>${c.name}</span>
    </div>`).join('');

  channelList.querySelectorAll('.ms-option').forEach((el, i) => {
    el.classList.toggle('kb-active', i === channelActiveIdx);
    el.addEventListener('mousedown', (e) => e.preventDefault());  // don't steal focus from the field
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      channelActiveIdx = i;
      toggleChannel(el.dataset.id);
    });
  });
}

function setChannelActive(idx) {
  const items = channelList.querySelectorAll('.ms-option');
  if (!items.length) return;
  channelActiveIdx = (idx + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('kb-active', i === channelActiveIdx));
  items[channelActiveIdx].scrollIntoView({ block: 'nearest' });
}

const CHANNEL_COLS = 2;
// Row/column-aware navigation for the two-column channel grid, so all four
// arrow keys move the way they visually look like they should — not just a
// flat +1/-1 through the list, which used to make ArrowDown zig-zag across
// columns instead of moving straight down.
function moveChannelActive(dRow, dCol) {
  const items = channelList.querySelectorAll('.ms-option');
  if (!items.length) return;
  if (channelActiveIdx < 0) { setChannelActive(0); return; }
  const row = Math.floor(channelActiveIdx / CHANNEL_COLS);
  const col = channelActiveIdx % CHANNEL_COLS;
  const newCol = col + dCol;
  if (newCol < 0 || newCol >= CHANNEL_COLS) return;
  const newIdx = (row + dRow) * CHANNEL_COLS + newCol;
  if (newIdx < 0 || newIdx >= items.length) return;
  setChannelActive(newIdx);
}

function toggleChannel(id) {
  const i = selectedChannels.indexOf(id);
  if (i >= 0) selectedChannels.splice(i, 1);
  else selectedChannels.push(id);
  renderChannelOptions();
  renderChannelChips();
  channelField.classList.remove('error');
  saveDraft();
}

function renderChannelChips() {
  if (selectedChannels.length === 0) {
    channelChips.innerHTML = '';
    channelPlaceholder.style.display = '';
    return;
  }
  channelPlaceholder.style.display = 'none';
  // A channel id the front-end doesn't know (an older record, a channel
  // retired from the list) used to throw here and leave the whole view
  // modal blank. Show the raw id instead and keep the form usable.
  channelChips.innerHTML = selectedChannels.map(id => {
    const c = CHANNELS.find(x => x.id === id);
    if (!c) return `<span class="ms-chip"><span class="ch-dot" style="background:var(--muted)"></span>${escapeHtml(id)}</span>`;
    return `<span class="ms-chip"><span class="ch-dot" style="background:${c.color === '#FFFFFF' ? 'var(--blue-600)' : c.color}"></span>${c.name}</span>`;
  }).join('');
}

// Positioned like the calendar: fixed, computed from the field's own rect, so it
// floats above the form instead of forcing it to scroll.
function positionChannelList() {
  const r = channelBox.getBoundingClientRect();
  const w = Math.max(r.width, 300);
  const h = channelList.offsetHeight || 200;
  let left = r.right - w;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  channelList.style.left = left + 'px';
  channelList.style.top = top + 'px';
  channelList.style.width = w + 'px';
}

function openChannelList() {
  renderChannelOptions();
  channelList.classList.add('show');
  channelField.classList.add('open');
  channelBox.setAttribute('aria-expanded', 'true');
  positionChannelList();
  window.addEventListener('scroll', positionChannelList, true);
  window.addEventListener('resize', positionChannelList);
}
function closeChannelList() {
  channelList.classList.remove('show');
  channelField.classList.remove('open');
  channelBox.setAttribute('aria-expanded', 'false');
  channelActiveIdx = -1;
  window.removeEventListener('scroll', positionChannelList, true);
  window.removeEventListener('resize', positionChannelList);
}

// A plain click both focuses the button and fires 'click' in the same gesture,
// so opening on focus and toggling on click would fight each other (open, then
// immediately close). Only toggle when the button already had focus beforehand.
let channelWasFocused = false;
channelBox.addEventListener('mousedown', () => {
  channelWasFocused = (document.activeElement === channelBox);
});
channelBox.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!channelWasFocused) return;   // the focus handler just opened it — leave it be
  if (channelList.classList.contains('show')) closeChannelList();
  else openChannelList();
});
document.addEventListener('click', (e) => {
  if (channelList.classList.contains('show') && !channelList.contains(e.target) && e.target !== channelBox) closeChannelList();
});

// Tab onto the field opens it; arrows move between logos; space/enter ticks the
// highlighted one; tab moves on to the next field, same as any ordinary control.
channelBox.addEventListener('focus', () => {
  if (!channelList.classList.contains('show')) openChannelList();
});
channelBox.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeChannelList(); return; }
  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    if (!channelList.classList.contains('show')) openChannelList();
    // Two-column grid, right-to-left: column 0 is the visually-right column.
    if (e.key === 'ArrowDown') moveChannelActive(1, 0);
    else if (e.key === 'ArrowUp') moveChannelActive(-1, 0);
    else if (e.key === 'ArrowRight') moveChannelActive(0, -1);
    else if (e.key === 'ArrowLeft') moveChannelActive(0, 1);
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    if (!channelList.classList.contains('show')) { openChannelList(); return; }
    if (channelActiveIdx >= 0) {
      toggleChannel(CHANNELS[channelActiveIdx].id);
      setChannelActive(channelActiveIdx);   // keep the highlight after the re-render
    }
    return;
  }
  if (e.key === 'Tab') {
    closeChannelList();   // let the browser carry on to the next/previous field
  }
});

function clearChannels() {
  selectedChannels = [];
  renderChannelChips();
  renderChannelOptions();
  channelField.classList.remove('error');
}

function validateChannels() {
  if (selectedChannels.length === 0) {
    channelField.classList.add('error');
    channelMsg.textContent = 'حداقل یک روش ارسال را انتخاب کنید';
    return false;
  }
  channelField.classList.remove('error');
  return true;
}

renderChannelChips();

// =========================================================
// ---- Cheque image field: multiple images / PDFs ----
// =========================================================
const MAX_FILE_BYTES = 10 * 1024 * 1024;   // files are stored as base64 text in local storage
let attachedFiles = [];                    // { name, type, size, dataUrl }

function renderFileChips() {
  fileChips.innerHTML = '';
  attachedFiles.forEach((item, i) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';

    const isImage = item.type.startsWith('image/');
    const thumb = isImage
      ? `<img src="${item.dataUrl}" alt=""><span class="file-view-overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>`
      : `<span class="file-doc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>`;

    chip.title = item.name;
    chip.innerHTML = `
      ${thumb}
      <button type="button" class="file-remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;

    chip.querySelector('.file-remove').addEventListener('click', (e) => { e.stopPropagation(); removeFile(i); });
    if (isImage) {
      chip.addEventListener('click', () => openLightbox(item.dataUrl, item.name));
    }
    fileChips.appendChild(chip);
  });
}

function openLightbox(dataUrl, name) {
  lightboxImg.src = dataUrl;
  lightboxImg.dataset.filename = name || 'cheque-photo.jpg';
  lightboxOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  // Opened from a thumbnail click, so nothing inside the lightbox itself
  // has focus yet — this makes Enter do the standard thing (dismiss it),
  // same as Escape already does.
  lightboxCloseBtn.focus();
}
function closeLightbox() {
  lightboxOverlay.classList.remove('show');
  document.body.style.overflow = modalOverlay.classList.contains('show') ? 'hidden' : '';
}

function removeFile(i) {
  attachedFiles.splice(i, 1);
  renderFileChips();
  fileMsg.textContent = '';
  fileField.classList.remove('error');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

let peQueue = [];   // image Files waiting their turn in the crop/rotate editor

async function addFiles(list) {
  const rejected = [];
  const toEdit = [];
  for (const file of Array.from(list)) {
    const okType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!okType) { rejected.push(`${file.name} (فرمت پشتیبانی نمی‌شود)`); continue; }
    if (file.size > MAX_FILE_BYTES) { rejected.push(`${file.name} (بیش از ۱۰ مگابایت)`); continue; }
    const duplicate = attachedFiles.some(x => x.name === file.name && x.size === file.size);
    if (duplicate) continue;
    if (file.type === 'application/pdf') {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        attachedFiles.push({ name: file.name, type: file.type, size: file.size, dataUrl });
      } catch (e) {
        rejected.push(`${file.name} (خطا در خواندن فایل)`);
      }
    } else {
      toEdit.push(file);   // images go through the crop/rotate editor first
    }
  }
  renderFileChips();
  if (rejected.length) {
    fileField.classList.add('error');
    fileMsg.textContent = 'اضافه نشد: ' + rejected.join('، ');
  } else {
    fileField.classList.remove('error');
    fileMsg.textContent = '';
  }
  if (toEdit.length) {
    peQueue.push(...toEdit);
    if (!photoEditorOverlay.classList.contains('show')) openNextInQueue();
  }
}

function clearFiles() {
  attachedFiles = [];
  renderFileChips();
  fileMsg.textContent = '';
  fileField.classList.remove('error');
}

fileAddBtn.addEventListener('click', () => fileInput.click());
// Enter opens this via the keyboard rather than a mouse click, and the
// native OS file picker that pops up then hides the mouse pointer until
// it's moved (Windows keeps it hidden while "in keyboard mode") — since
// this field needs the mouse right after it opens, Enter is deliberately
// left inert here so the dialog only ever opens from an actual click.
fileAddBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); }
});
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';        // let the same file be picked again after removal
});

['dragenter', 'dragover'].forEach(ev =>
  fileBox.addEventListener(ev, (e) => { e.preventDefault(); fileBox.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(ev =>
  fileBox.addEventListener(ev, (e) => { e.preventDefault(); fileBox.classList.remove('dragging'); }));
fileBox.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});

// ---- Calendar popup (shared by every date field) ----
let calViewYear, calViewMonth;
let activeDateField = null;
let calendarMode = 'single';   // 'single' | 'range'
let calendarAnchorEl = null;

jalaliMonthNames.forEach((name, i) => {
  const opt = document.createElement('option');
  opt.value = i + 1;
  opt.textContent = name;
  calMonthSelect.appendChild(opt);
});
(function populateYearSelect() {
  const [ty] = todayJalali();
  for (let y = ty - 10; y <= ty + 10; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = toFa(y);
    calYearSelect.appendChild(opt);
  }
})();
calMonthSelect.addEventListener('change', () => {
  calViewMonth = parseInt(calMonthSelect.value, 10);
  renderCalendar();
});
calYearSelect.addEventListener('change', () => {
  calViewYear = parseInt(calYearSelect.value, 10);
  renderCalendar();
});
calMonthSelect.addEventListener('click', (e) => e.stopPropagation());
calYearSelect.addEventListener('click', (e) => e.stopPropagation());

function positionCalendar() {
  // Mobile keeps the centered overlay from CSS; desktop anchors under the field.
  // position:fixed lets it sit above the modal's scroll area instead of being clipped.
  if (window.innerWidth <= 600 || !calendarAnchorEl) {
    dueDateCal.classList.remove('anchored');
    dueDateCal.style.top = '';
    dueDateCal.style.left = '';
    return;
  }
  dueDateCal.classList.add('anchored');
  const r = calendarAnchorEl.getBoundingClientRect();
  const w = dueDateCal.offsetWidth || 300;
  const h = dueDateCal.offsetHeight || 360;
  let left = r.right - w;                       // RTL: align right edges
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  dueDateCal.style.left = left + 'px';
  dueDateCal.style.top = top + 'px';
}

function openCalendarFor(target) {
  calendarMode = 'single';
  activeDateField = target;
  // Anchor to the whole bordered box, not the bare <input> — the calendar
  // button now lives inside that same box, so the input's own rect is inset
  // from the box's real right edge and anchoring to it landed the popup
  // slightly off the field instead of flush against it.
  calendarAnchorEl = target.input.closest('.date-input-wrap') || target.input;
  calFooterRange.classList.remove('show');
  calFooterSingle.classList.add('show');
  const m = parseInt(target.monthStr(), 10);
  const yFull = target.slots.slice(4).every(x => x !== null);
  if (target.slots[2] !== null && target.slots[3] !== null && yFull && m >= 1 && m <= 12) {
    calViewYear = parseInt(target.yearStr(), 10);
    calViewMonth = m;
  } else {
    const [ty, tm] = todayJalali();
    calViewYear = ty;
    calViewMonth = tm;
  }
  renderCalendar();
  dueDateCal.classList.add('show');
  calBackdrop.classList.add('show');
  positionCalendar();
}

// The date-range filter uses the same calendar, but two clicks pick a span
// instead of one click picking a single day.
function openRangeCalendar() {
  calendarMode = 'range';
  activeDateField = null;
  calendarAnchorEl = filterRangeWrap;
  draftRangeFrom = rangeFrom;
  draftRangeTo = rangeTo;
  calFooterSingle.classList.remove('show');
  calFooterRange.classList.add('show');
  if (rangeFrom) { calViewYear = rangeFrom.y; calViewMonth = rangeFrom.m; }
  else { const [ty, tm] = todayJalali(); calViewYear = ty; calViewMonth = tm; }
  renderCalendar();
  dueDateCal.classList.add('show');
  calBackdrop.classList.add('show');
  positionCalendar();
}

function closeCalendar() {
  // Any picks made but never confirmed with "ثبت" are discarded here.
  if (calendarMode === 'range') { draftRangeFrom = rangeFrom; draftRangeTo = rangeTo; }
  dueDateCal.classList.remove('show');
  calBackdrop.classList.remove('show');
  activeDateField = null;
  calendarAnchorEl = null;
}

// Enter confirms the range picker's "ثبت" button — this covers the filter's
// standalone date-range calendar, which sits outside the cheque modal, so
// the modal's own Enter-to-submit handling never reaches it.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (!dueDateCal.classList.contains('show') || calendarMode !== 'range') return;
  e.preventDefault();
  calConfirmRangeBtn.click();
});

// Tabbing (not just clicking) to any field other than the one the calendar
// is currently open for should close it — covers moving to a non-date field
// too, which a per-field focus check alone wouldn't catch.
document.addEventListener('focusin', (e) => {
  if (!dueDateCal.classList.contains('show')) return;
  if (dueDateCal.contains(e.target)) return;
  if (activeDateField && e.target === activeDateField.input) return;
  closeCalendar();
});

window.addEventListener('resize', () => {
  if (dueDateCal.classList.contains('show')) positionCalendar();
});
modalBody.addEventListener('scroll', () => {
  if (dueDateCal.classList.contains('show')) positionCalendar();
});

function selectDate(y, m, d) {
  if (!activeDateField) return;
  activeDateField.setDate(y, m, d);
  closeCalendar();
  saveDraft();
}

function dateNum(y, m, d) { return y * 10000 + m * 100 + d; }

function updateRangeDisplay() {
  // Isolate each date's digits so they read correctly internally (as before),
  // and also wrap the whole "از ... تا ..." phrase in its own RTL isolate so
  // the two words themselves can't be reordered relative to one another either.
  const LRI = '\u2066', RLI = '\u2067', PDI = '\u2069';
  if (!rangeFrom) { filterRangeInput.value = ''; return; }
  const f = `${LRI}${toFa(rangeFrom.y)}/${toFa(pad2(rangeFrom.m))}/${toFa(pad2(rangeFrom.d))}${PDI}`;
  if (!rangeTo) { filterRangeInput.value = `${RLI}از ${f}${PDI}`; return; }
  const t = `${LRI}${toFa(rangeTo.y)}/${toFa(pad2(rangeTo.m))}/${toFa(pad2(rangeTo.d))}${PDI}`;
  filterRangeInput.value = `${RLI}از ${f}   تا ${t}${PDI}`;
}

// First click starts a new span; the second click (anywhere else) completes
// it, swapping the two if picked out of order. Nothing is applied to the
// table yet — that only happens when "ثبت" is pressed.
function handleRangeDayClick(y, m, d) {
  const clicked = { y, m, d };
  if (!draftRangeFrom || draftRangeTo) {
    draftRangeFrom = clicked;
    draftRangeTo = null;
  } else if (dateNum(clicked.y, clicked.m, clicked.d) < dateNum(draftRangeFrom.y, draftRangeFrom.m, draftRangeFrom.d)) {
    draftRangeTo = draftRangeFrom;
    draftRangeFrom = clicked;
  } else {
    draftRangeTo = clicked;
  }
  renderCalendar();
}

function renderCalendar() {
  calMonthSelect.value = calViewMonth;
  calYearSelect.value = calViewYear;
  const [gy, gm, gd] = jalaliToGregorian(calViewYear, calViewMonth, 1);
  const jsDay = new Date(gy, gm - 1, gd).getDay();
  const startOffset = (jsDay + 1) % 7; // Saturday-first index
  const totalDays = daysInJalaliMonth(calViewYear, calViewMonth);
  const [ty, tm, td] = todayJalali();

  let selY = null, selM = null, selD = null;
  if (calendarMode === 'single') {
    const t = activeDateField;
    const complete = t && t.slots.every(x => x !== null);
    selY = complete ? parseInt(t.yearStr(), 10) : null;
    selM = complete ? parseInt(t.monthStr(), 10) : null;
    selD = complete ? parseInt(t.dayStr(), 10) : null;
  }

  // The weeks are filled out with the neighbouring months' days, faded and
  // not clickable (HeroUI's calendar does the same), so the grid is always
  // whole weeks instead of starting and ending on blank cells.
  const prevM = calViewMonth === 1 ? 12 : calViewMonth - 1;
  const prevY = calViewMonth === 1 ? calViewYear - 1 : calViewYear;
  const prevDays = daysInJalaliMonth(prevY, prevM);
  let html = '';
  for (let i = 0; i < startOffset; i++) {
    html += `<button type="button" class="cal-day outside" disabled tabindex="-1" aria-hidden="true">${toFa(prevDays - startOffset + 1 + i)}</button>`;
  }
  for (let day = 1; day <= totalDays; day++) {
    const weekdayIdx = (startOffset + (day - 1)) % 7;
    let cls = 'cal-day';
    if (isHolidayDate(calViewYear, calViewMonth, day, weekdayIdx)) cls += ' holiday';
    if (calViewYear === ty && calViewMonth === tm && day === td) cls += ' today';

    if (calendarMode === 'range') {
      if (draftRangeFrom) {
        const fromNum = dateNum(draftRangeFrom.y, draftRangeFrom.m, draftRangeFrom.d);
        const thisNum = dateNum(calViewYear, calViewMonth, day);
        if (draftRangeTo) {
          const toNum = dateNum(draftRangeTo.y, draftRangeTo.m, draftRangeTo.d);
          const lo = Math.min(fromNum, toNum), hi = Math.max(fromNum, toNum);
          if (thisNum === lo) cls += ' range-start';
          if (thisNum === hi) cls += ' range-end';
          if (thisNum > lo && thisNum < hi) cls += ' range-mid';
        } else if (thisNum === fromNum) {
          cls += ' range-start range-end';
        }
      }
    } else if (calViewYear === selY && calViewMonth === selM && day === selD) {
      cls += ' selected';
    }
    html += `<button type="button" class="${cls}" data-day="${day}">${toFa(day)}</button>`;
  }
  const trailing = (7 - ((startOffset + totalDays) % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    html += `<button type="button" class="cal-day outside" disabled tabindex="-1" aria-hidden="true">${toFa(i)}</button>`;
  }
  calGrid.innerHTML = html;

  calGrid.querySelectorAll('.cal-day[data-day]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Picking a day rebuilds this whole grid right away (to show the new
      // selection), which detaches the clicked button from the page while the
      // click is still bubbling — any "did this click land outside X?" check
      // further up would then wrongly see no target and close things. Stop it
      // here, before that rebuild happens.
      e.stopPropagation();
      const day = parseInt(btn.dataset.day, 10);
      if (calendarMode === 'range') handleRangeDayClick(calViewYear, calViewMonth, day);
      else selectDate(calViewYear, calViewMonth, day);
    });
  });
}

calPrevBtn.addEventListener('click', () => {
  calViewMonth--;
  if (calViewMonth < 1) { calViewMonth = 12; calViewYear--; }
  renderCalendar();
});
calNextBtn.addEventListener('click', () => {
  calViewMonth++;
  if (calViewMonth > 12) { calViewMonth = 1; calViewYear++; }
  renderCalendar();
});
calTodayBtn.addEventListener('click', () => {
  const [ty, tm, td] = todayJalali();
  selectDate(ty, tm, td);
});
calConfirmRangeBtn.addEventListener('click', () => {
  rangeFrom = draftRangeFrom;
  rangeTo = draftRangeTo;
  updateRangeDisplay();
  filterRangeField.classList.remove('error');
  closeCalendar();
  closePopover();
  refreshTable();
});
calClearRangeBtn.addEventListener('click', () => {
  draftRangeFrom = null;
  draftRangeTo = null;
  renderCalendar();
});
calBackdrop.addEventListener('click', closeCalendar);

document.addEventListener('click', (e) => {
  if (!dueDateCal.classList.contains('show')) return;
  if (dueDateCal.contains(e.target)) return;
  if (calendarAnchorEl && calendarAnchorEl.contains(e.target)) return;
  closeCalendar();
});

// =========================================================
// ---- Saving a cheque ----
// =========================================================
// ---- Date helpers between the API's ISO dates and the form's Jalali strings ----
function isoToJalaliStr(isoStr) {
  if (!isoStr) return '';
  const datePart = String(isoStr).slice(0, 10);
  const [gy, gm, gd] = datePart.split('-').map(n => parseInt(n, 10));
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}
function jalaliStrToIso(jalaliStr) {
  if (!jalaliStr) return null;
  const [jy, jm, jd] = jalaliStr.split('/').map(n => parseInt(n, 10));
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

// Cheques now live in Postgres (checks table), fetched through the API —
// this in-memory cache is what every render/lookup in this file reads from.
let checksCache = [];
let checksFetchSeq = 0;

function apiCheckToRec(c) {
  const hist = c.status_history || [];
  const last = hist.length ? hist[hist.length - 1] : null;
  return {
    id: c.id,
    serial: c.serial || '',
    sayad: c.sayad_id || '',
    dueDate: isoToJalaliStr(c.due_date),
    amount: String(Math.round(parseFloat(c.amount || 0))),
    ownerId: c.owner_id, owner: c.owner_name || '',
    partyId: c.party_id, party: c.party_name || '',
    benefId: c.beneficiary_id, benef: c.beneficiary_name || '',
    nid: c.beneficiary_national_id || '',
    status: c.status,
    history: hist.map(h => ({ to: h.to, reason: h.reason || '', at: isoToJalaliStr(h.at) })),
    statusChangedAt: last ? isoToJalaliStr(last.at) : '',
    // Raw ISO, kept alongside the Jalali display strings above — those only
    // carry a date, not a time, so two changes on the same day would sort as
    // ties. These are what the board actually sorts columns by.
    statusChangedAtIso: last ? last.at : null,
    statusReason: last ? (last.reason || '') : '',
    createdAt: isoToJalaliStr(c.created_at),
    createdAtIso: c.created_at || null,
    spendDate: c.spend_date ? isoToJalaliStr(c.spend_date) : '',
    sendDate: isoToJalaliStr(c.send_date),
    channels: Array.isArray(c.channels) ? c.channels : [],
    notes: c.notes || '',
    receiptImage: c.receipt_image || '',
    files: c.receipt_image ? [{ name: 'رسید.jpg', type: 'image/jpeg', dataUrl: c.receipt_image }] : [],
  };
}

async function loadChecksFromApi() {
  const seq = ++checksFetchSeq;
  let result;
  try {
    const rows = await apiJson('/checks');
    result = rows.map(apiCheckToRec);
  } catch (e) {
    result = [];
  }
  if (seq === checksFetchSeq) {
    checksCache = result;
  }
  return checksCache;
}
// Every existing render/lookup in this file reads cheques through this
// synchronous getter — it's simply a view over checksCache, refreshed by
// loadChecksFromApi() after every create/edit/delete/status-change.
function loadCheques() { return checksCache; }
// Bulk "save the whole list" no longer applies — each mutation now goes
// straight to the API (see the create/edit/delete/status handlers below) —
// this stays only so any leftover caller doesn't throw.
function saveCheques() { return true; }

function currentFormRecord() {
  return {
    serial: toEnDigits(serialInput.value),
    sayad: toEnDigits(sayadInput.value),
    dueDate: dueDate.yearStr() + '/' + dueDate.monthStr() + '/' + dueDate.dayStr(),
    amount: amountRawDigits(),
    owner: ownerInput.value.trim(),
    party: partyInput.value.trim(),
    benef: benefInput.value.trim(),
    nid: toEnDigits(nidInput.value),
    spendDate: spendDate.isFilled() ? spendDate.yearStr() + '/' + spendDate.monthStr() + '/' + spendDate.dayStr() : '',
    sendDate: sendDate.yearStr() + '/' + sendDate.monthStr() + '/' + sendDate.dayStr(),
    channels: selectedChannels.slice(),
    notes: notesInput.value.trim(),
    files: attachedFiles.map(f => ({ name: f.name, type: f.type, dataUrl: f.dataUrl }))
  };
}

// A repeat is caught two ways: the sayad id is unique on its own, and — in case a
// digit of it was mistyped — serial + due date + amount + owner all matching.
function findDuplicate(rec, excludeId) {
  const list = loadCheques().filter(c => c.id !== excludeId);
  const bySayad = list.find(c => c.sayad === rec.sayad);
  if (bySayad) return { cheque: bySayad, reason: 'sayad' };
  const byCombo = list.find(c =>
    c.serial === rec.serial &&
    c.dueDate === rec.dueDate &&
    c.amount === rec.amount &&
    normalizeName(c.owner) === normalizeName(rec.owner));
  if (byCombo) return { cheque: byCombo, reason: 'combo' };
  return null;
}

const ALERT_ICON_WARN = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="7" x2="12" y2="13" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1.1" fill="currentColor" stroke="none"/>';
const ALERT_ICON_CHECK = '<circle cx="12" cy="12" r="10"/><polyline points="8 12.5 10.8 15.5 16 9.5"/>';

function showFormAlert(kind, text) {
  formAlertIcon.innerHTML = kind === 'success' ? ALERT_ICON_CHECK : ALERT_ICON_WARN;
  formAlert.className = 'form-alert ' + kind + ' show';
  formAlertText.textContent = text;
  modalBody.scrollTop = 0;
  if (kind === 'success') {
    clearTimeout(showFormAlert._t);
    showFormAlert._t = setTimeout(() => formAlert.classList.remove('show'), 6000);
  }
}
function hideFormAlert() { formAlert.classList.remove('show'); }

// Live check while typing the sayad id, so a repeat is caught before submit.
function checkSayadDuplicate() {
  const raw = toEnDigits(sayadInput.value);
  if (raw.length !== 16) return;
  const hit = loadCheques().find(c => c.sayad === raw);
  if (hit) {
    sayadField.classList.add('error');
    sayadMsg.textContent = `این چک قبلاً ثبت شده است (سریال ${toFa(hit.serial)})`;
  }
}

submitCheckBtn.addEventListener('click', async () => {
  if (modalMode === 'view') { enterEditMode(); return; }
  if (modalMode === 'editing') { handleSaveEdit(); return; }

  hideFormAlert();

  const checks = [
    [validateSerial(), serialInput],
    [validateSayad(), sayadInput],
    [dueDate.validate(), dueDateInput],
    [validateAmount(), amountInput],
    [validateOwner(), ownerInput],
    [validateParty(), partyInput],
    [validateBenef(), benefInput],
    [validateNid(), nidInput],
    [spendDate.validate(), spendDateInput]
  ];
  sendDate.fillTodayIfEmpty();          // never let this one go unrecorded
  checks.push([sendDate.validate(), sendDateInput]);
  checks.push([validateChannels(), channelBox]);

  const firstBad = checks.find(([ok]) => !ok);
  if (firstBad) {
    showFormAlert('error', 'لطفاً فیلدهای مشخص‌شده را اصلاح کنید');
    firstBad[1].focus();
    return;
  }

  const rec = currentFormRecord();
  const dup = findDuplicate(rec);
  if (dup) {
    if (dup.reason === 'sayad') {
      sayadField.classList.add('error');
      sayadMsg.textContent = 'این شناسه صیادی قبلاً ثبت شده است';
      showFormAlert('error', 'چکی با این شناسه صیادی قبلاً در سیستم ثبت شده است');
      sayadInput.focus();
    } else {
      showFormAlert('error', `چکی با این مشخصات قبلاً در سیستم ثبت شده است (شناسه صیادی ${toFa(dup.cheque.sayad)})`);
    }
    return;
  }

  submitCheckBtn.disabled = true;
  submitCheckBtn.textContent = 'در حال ثبت…';
  try {
    const [ownerId, partyId, benefId] = await ensurePeople(rec);

    await apiJson('/checks', {
      method: 'POST',
      body: JSON.stringify({
        serial: rec.serial,
        sayad_id: rec.sayad || null,
        amount: rec.amount,
        due_date: jalaliStrToIso(rec.dueDate),
        send_date: jalaliStrToIso(rec.sendDate),
        spend_date: rec.spendDate ? jalaliStrToIso(rec.spendDate) : null,
        owner_id: ownerId,
        party_id: partyId,
        beneficiary_id: benefId,
        notes: rec.notes || null,
        receipt_image: rec.files && rec.files[0] ? rec.files[0].dataUrl : null,
        channels: rec.channels,
        status: 'pending',
      }),
    });
    // The board refresh is not on the path between "saved" and the form
    // being ready for the next cheque — at this round-trip time waiting
    // for it added a second and a half of dead time to every save.
    loadChecksFromApi().then(renderTable).catch(() => {});

    clearDraft();
    const savedSerial = toFa(rec.serial);
    // The party and their beneficiary usually stay the same across a batch of
    // cheques, so those three fields survive the reset.
    resetAllFields({ keepParty: true });
    stickyFieldsUntouched = true;
    renderTable();
    addCheckBtn.classList.add('just-saved');
    setTimeout(() => addCheckBtn.classList.remove('just-saved'), 700);
    showFormAlert('success', `چک با شماره سریال ${savedSerial} با موفقیت ثبت شد`);
    serialInput.focus();
  } catch (e) {
    showFormAlert('error', e.message || 'ذخیره در سرور ناموفق بود');
  } finally {
    submitCheckBtn.disabled = false;
    submitCheckBtn.textContent = 'ثبت چک';   // this path only ever runs while adding, so the label is always this one
  }
});

// Saving an edit needs one extra confirming click, since it overwrites an
// already-registered cheque rather than creating a new one.
function handleSaveEdit() {
  hideFormAlert();

  const checks = [
    [validateSerial(), serialInput],
    [validateSayad(), sayadInput],
    [dueDate.validate(), dueDateInput],
    [validateAmount(), amountInput],
    [validateOwner(), ownerInput],
    [validateParty(), partyInput],
    [validateBenef(), benefInput],
    [validateNid(), nidInput],
    [spendDate.validate(), spendDateInput]
  ];
  sendDate.fillTodayIfEmpty();
  checks.push([sendDate.validate(), sendDateInput]);
  checks.push([validateChannels(), channelBox]);

  const firstBad = checks.find(([ok]) => !ok);
  if (firstBad) {
    showFormAlert('error', 'لطفاً فیلدهای مشخص‌شده را اصلاح کنید');
    firstBad[1].focus();
    return;
  }

  const rec = currentFormRecord();
  const dup = findDuplicate(rec, editingChequeId);
  if (dup) {
    if (dup.reason === 'sayad') {
      sayadField.classList.add('error');
      sayadMsg.textContent = 'این شناسه صیادی قبلاً برای چک دیگری ثبت شده است';
      showFormAlert('error', 'این شناسه صیادی قبلاً برای چک دیگری ثبت شده است');
      sayadInput.focus();
    } else {
      showFormAlert('error', `چک دیگری با این مشخصات قبلاً در سیستم ثبت شده است (شناسه صیادی ${toFa(dup.cheque.sayad)})`);
    }
    return;
  }

  // valid and no conflicts — reveal the small confirm button beside "ذخیره تغییرات"
  saveConfirmSlideBtn.classList.add('show');
  submitCheckBtn.textContent = 'آیا تغییرات ذخیره شود؟';
  submitCheckBtn.classList.add('pending-confirm');
  clearFormBtn.classList.add('pending-cancel');
  clearFormBtn.title = 'انصراف از ذخیره';
}

// Cancels the pending save-confirmation and reverts the whole form back to
// read-only view mode, discarding whatever was edited.
function cancelPendingSave() {
  saveConfirmSlideBtn.classList.remove('show');
  submitCheckBtn.textContent = 'ذخیره تغییرات';
  submitCheckBtn.classList.remove('pending-confirm');
  clearFormBtn.classList.remove('pending-cancel');
  clearFormBtn.title = 'حذف چک';
  const c = loadCheques().find(x => x.id === editingChequeId);
  if (c) openModalForView(editingChequeId);   // re-populate + re-lock from the saved record
}

async function commitSaveEdit() {
  saveConfirmSlideBtn.classList.remove('show');
  const rec = currentFormRecord();
  const stored = loadCheques().find(x => x.id === editingChequeId);
  if (!stored) { closeModal(true); return; }

  // The checkmark hides the instant it's clicked, but nothing here used to
  // stop a second Enter/click from firing a second PUT while the first was
  // still in flight, and the button gave no sign anything was happening in
  // between — same gap the create path already had (see submitCheckBtn.disabled
  // just below in that function).
  submitCheckBtn.disabled = true;
  submitCheckBtn.textContent = 'در حال ذخیره…';
  try {
    const [ownerId, partyId, benefId] = await ensurePeople(rec);

    await apiJson(`/checks/${editingChequeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        serial: rec.serial,
        sayad_id: rec.sayad || null,
        amount: rec.amount,
        due_date: jalaliStrToIso(rec.dueDate),
        send_date: jalaliStrToIso(rec.sendDate),
        spend_date: rec.spendDate ? jalaliStrToIso(rec.spendDate) : null,
        owner_id: ownerId,
        party_id: partyId,
        beneficiary_id: benefId,
        notes: rec.notes || null,
        receipt_image: rec.files && rec.files[0] ? rec.files[0].dataUrl : null,
        channels: rec.channels,
      }),
    });
    // Same rule the create path already follows: the board refresh is not on
    // the path between "saved" and the modal being done with. Awaiting a full
    // re-download of every cheque here is what made saving an edit feel slow.
    loadChecksFromApi().then(renderTable).catch(() => {});
    closeModal(true);
  } catch (e) {
    showFormAlert('error', e.message || 'ذخیره در سرور ناموفق بود');
    // Failed — put the confirm step back so the user can just try again
    // instead of having to re-trigger "ذخیره تغییرات" from scratch.
    submitCheckBtn.disabled = false;
    submitCheckBtn.textContent = 'آیا تغییرات ذخیره شود؟';
    saveConfirmSlideBtn.classList.add('show');
  }
}

let clearConfirmPending = false;
let deleteInFlight = false;   // one DELETE per confirmation, not one per click
const saveConfirmSlideBtn = document.getElementById('saveConfirmSlideBtn');
const deleteCancelSlideBtn = document.getElementById('deleteCancelSlideBtn');
saveConfirmSlideBtn.addEventListener('click', commitSaveEdit);

// Deleting a cheque uses the exact same slide-morph mechanic as saving an
// edit: the trash icon widens into a red "بله، حذف شود" button, and a small
// "انصراف" button slides in beside it.
function cancelPendingDelete() {
  clearFormBtn.classList.remove('confirming-delete');
  deleteCancelSlideBtn.classList.remove('show');
  submitCheckBtn.classList.remove('delete-warning');
  submitCheckBtn.textContent = modalMode === 'editing' ? 'ذخیره تغییرات' : 'ویرایش';
}
deleteCancelSlideBtn.addEventListener('click', cancelPendingDelete);

clearFormBtn.addEventListener('click', async () => {
  if (clearFormBtn.classList.contains('pending-cancel')) {
    cancelPendingSave();
    return;
  }
  if (modalMode !== 'add') {
    // view/editing mode: this same trash icon deletes the whole cheque instead
    if (!clearFormBtn.classList.contains('confirming-delete')) {
      clearFormBtn.classList.add('confirming-delete');
      deleteCancelSlideBtn.classList.add('show');
      submitCheckBtn.classList.add('delete-warning');
      submitCheckBtn.textContent = 'این چک حذف خواهد شد';
      return;
    }
    // second click — the button now reads "بله، حذف شود".
    // Guarded the same way the save button is: the round trip takes long
    // enough that the armed button stayed clickable through it, and every
    // extra click fired another DELETE for the same cheque.
    if (deleteInFlight) return;
    deleteInFlight = true;
    clearFormBtn.disabled = true;
    submitCheckBtn.disabled = true;
    try {
      await apiJson(`/checks/${editingChequeId}`, { method: 'DELETE' });
      // Drop it locally and repaint now, then reconcile with the server in the
      // background — waiting for a full re-download left the just-deleted card
      // sitting on the board.
      checksCache = checksCache.filter((c) => c.id !== editingChequeId);
      renderTable();
      loadChecksFromApi().then(renderTable).catch(() => {});
      closeModal(true);
    } catch (e) {
      showFormAlert('error', e.message || 'حذف در سرور ناموفق بود');
    } finally {
      deleteInFlight = false;
      clearFormBtn.disabled = false;
      submitCheckBtn.disabled = false;
    }
    return;
  }

  if (!clearConfirmPending) {
    clearConfirmPending = true;
    clearFormBtn.title = 'برای تأیید دوباره بزنید';
    clearFormBtn.style.borderColor = 'var(--error)';
    clearFormBtn.style.color = 'var(--error)';
    setTimeout(() => {
      clearConfirmPending = false;
      clearFormBtn.title = 'پاک کردن فرم';
      clearFormBtn.style.borderColor = '';
      clearFormBtn.style.color = '';
    }, 2500);
    return;
  }
  resetAllFields();
  clearDraft();
  clearConfirmPending = false;
  clearFormBtn.title = 'پاک کردن فرم';
  clearFormBtn.style.borderColor = '';
  clearFormBtn.style.color = '';
  serialInput.focus();
});

// =========================================================
// ---- Cheque table ----
// =========================================================
const filterBar = document.getElementById('filterBar');
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const activeFiltersRow = document.getElementById('activeFiltersRow');
const popDate = document.getElementById('popDate');
const popAmount = document.getElementById('popAmount');
const popPeople = document.getElementById('popPeople');
const filterRangeField = document.getElementById('filterRangeField');
const filterRangeWrap = document.getElementById('filterRangeWrap');
const filterRangeInput = document.getElementById('filterRangeInput');
const filterRangeCalBtn = document.getElementById('filterRangeCalBtn');
const filterRangeMsg = document.getElementById('filterRangeMsg');
const filterAmountMin = document.getElementById('filterAmountMin');
const filterAmountMax = document.getElementById('filterAmountMax');
const filterOwnerField = document.getElementById('filterOwnerField');
const filterOwnerInput = document.getElementById('filterOwnerInput');
const filterOwnerList = document.getElementById('filterOwnerList');
const filterPartyField = document.getElementById('filterPartyField');
const filterPartyInput = document.getElementById('filterPartyInput');
const filterPartyList = document.getElementById('filterPartyList');
const filterBenefField = document.getElementById('filterBenefField');
const filterBenefInput = document.getElementById('filterBenefInput');
const filterBenefList = document.getElementById('filterBenefList');
const showArchivedCheckbox = document.getElementById('showArchivedCheckbox');
const filterClearBtn = document.getElementById('filterClearBtn');
const boardColumns = document.getElementById('boardColumns');
const boardWrap = document.getElementById('boardWrap');
const boardStatusTabs = document.getElementById('boardStatusTabs');
const tableEmpty = document.getElementById('tableEmpty');

const STATUSES = [
  { id: 'pending', name: 'منتظر ثبت',   color: 'var(--st-pending)', cls: 'st-pending' },
  { id: 'done',    name: 'ثبت شد',      color: 'var(--st-done)', cls: 'st-done' },
  { id: 'problem', name: 'مشکل در ثبت', color: 'var(--st-problem)', cls: 'st-problem' }
];
const STATUSES_IDS = new Set(STATUSES.map(s => s.id));
let openStatusMenu = null;

function statusById(id) { return STATUSES.find(s => s.id === id) || STATUSES[0]; }

function faDate(str) { return str ? toFa(str) : '—'; }
function faAmount(raw) { return raw ? toFa(groupDigits(raw)) : '—'; }
// Cards and anywhere else a figure stands alone need the unit spelled out —
// an unlabelled number on a cheque card is ambiguous by itself.
function faAmountRial(raw) { return raw ? `${toFa(groupDigits(raw))} ریال` : '—'; }


function statusButtonHtml(c, st) {
  return `<button type="button" class="status-btn" data-status-for="${c.id}">
    <span class="st-dot" style="background:${st.color}"></span>${st.name}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>`;
}
function eyeButtonHtml(c) {
  return `<button type="button" class="eye-btn" data-view="${c.id}" data-tip="مشاهده‌ی جزئیات چک" aria-label="مشاهده‌ی جزئیات چک ${toFa(c.serial)}">
    ${icon('eye')}
  </button>`;
}

// The message a person copies to send the other party once a cheque is
// confirmed registered in Sayad — only meaningful once status is "done".
function buildReceiptMessage(c) {
  const amountFa = toFa(groupDigits(c.amount || '0'));
  return `چک به شماره سریال ${toFa(c.serial)}، به شناسه صیادی ${toFa(c.sayad)}، به مبلغ ${amountFa} ریال و تاریخ سررسید ${faDate(c.dueDate)} در وجه ${c.benef} با کد ملی ${toFa(c.nid)} در سامانه صیاد ثبت گردید.
${faDate(c.statusChangedAt)}`;
}
// Only a registered cheque has a receipt message to copy. It sits next to
// the status-change button on the card's left — both mutate or act on the
// record — while the eye, present on every card, stands alone on the
// right as the one pure "view" action.
function receiptButtonHtml(c) {
  if (c.status !== 'done') return '';
  return `<button type="button" class="receipt-btn" data-receipt="${c.id}" data-tip="کپی پیام رسید ثبت" aria-label="کپی پیام رسید ثبت چک ${toFa(c.serial)}">
    ${icon('receipt')}
  </button>`;
}
function showToast(message) {
  const el = document.getElementById('appToast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function copyReceiptMessage(id, btn) {
  const c = loadCheques().find(x => x.id === id);
  if (!c) return;
  closeStatusMenu();   // same stopPropagation gap as the eye button — see openModalForView
  const text = buildReceiptMessage(c);
  const showCopied = () => {
    showToast('پیام رسید ثبت کپی شد');
    if (!btn) return;
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1400);
  };
  // A file:// page (no real server) is not a "secure context", so
  // navigator.clipboard.writeText can silently reject there in some
  // browsers — the older execCommand approach still works on file://,
  // so it's the fallback whenever the modern API exists but fails, not
  // just when it's missing entirely.
  const legacyCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopied(); } catch (e) {}
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopied).catch(legacyCopy);
  } else {
    legacyCopy();
  }
}
let rangeFrom = null, rangeTo = null;   // { y, m, d } or null — the applied date-range filter
let draftRangeFrom = null, draftRangeTo = null;   // in-progress picks, live in the calendar until "ثبت"

// Clicking anywhere on the range field (input or icon) opens its calendar —
// no separate "from"/"to" buttons needed.
filterRangeWrap.addEventListener('click', (e) => {
  e.stopPropagation();
  if (dueDateCal.classList.contains('show') && calendarMode === 'range') closeCalendar();
  else openRangeCalendar();
});

// =========================================================
// ---- Search & filter engine ----
// =========================================================

function amountToRial(str) { return parseInt(str, 10) || 0; }

function jalaliDateToNum(str) {
  // "1405/06/14" -> 14050614, so plain numeric comparison sorts chronologically
  if (!str) return null;
  const [y, m, d] = str.split('/').map(x => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return y * 10000 + m * 100 + d;
}

// A cheque that has sat "ثبت شد" or "مشکل در ثبت" for a month or more is
// archived automatically — it stays in storage, just out of the everyday view.
const ARCHIVE_AFTER_DAYS = 30;

function jalaliToJsDate(y, m, d) {
  const [gy, gm, gd] = jalaliToGregorian(y, m, d);
  return new Date(gy, gm - 1, gd);
}
function daysSinceJalali(dateStr) {
  if (!dateStr) return -1;
  const [y, m, d] = dateStr.split('/').map(n => parseInt(n, 10));
  if (!y || !m || !d) return -1;
  const then = jalaliToJsDate(y, m, d).setHours(0, 0, 0, 0);
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.round((now - then) / 86400000);
}
function isArchived(c) {
  if (c.status !== 'done' && c.status !== 'problem') return false;
  return daysSinceJalali(c.statusChangedAt) >= ARCHIVE_AFTER_DAYS;
}

function getFilteredCheques() {
  let list = loadCheques();

  if (!showArchivedCheckbox || !showArchivedCheckbox.checked) {
    list = list.filter(c => !isArchived(c));
  }

  // live search: 1-6 digits searches the serial, more than 6 searches the sayad id
  const q = toEnDigits(searchInput.value).replace(/[^0-9]/g, '');
  if (q) {
    list = q.length <= 6
      ? list.filter(c => c.serial.includes(q))
      : list.filter(c => c.sayad.includes(q));
  }

  // date range, on whichever basis the radio picks
  const basis = document.querySelector('input[name="dateBasis"]:checked').value;
  const fromNum = rangeFrom ? dateNum(rangeFrom.y, rangeFrom.m, rangeFrom.d) : null;
  const toNum = rangeTo ? dateNum(rangeTo.y, rangeTo.m, rangeTo.d) : null;
  if (fromNum !== null || toNum !== null) {
    list = list.filter(c => {
      const n = jalaliDateToNum(c[basis]);
      if (n === null) return false;
      if (fromNum !== null && n < fromNum) return false;
      if (toNum !== null && n > toNum) return false;
      return true;
    });
  }

  // amount range — only restricts anything once it's been moved off the full span
  const minA = parseInt(toEnDigits(filterAmountMin.value).replace(/[^0-9]/g, ''), 10) || 0;
  const maxRaw = toEnDigits(filterAmountMax.value).replace(/[^0-9]/g, '');
  const maxA = maxRaw ? parseInt(maxRaw, 10) : 100000000000;
  if (minA > 0 || maxRaw) {
    list = list.filter(c => {
      const a = amountToRial(c.amount);
      return a >= minA && a <= maxA;
    });
  }

  // people — only counts once an actual person has been selected from the
  // dropdown, not while the user is still typing a partial name
  const ownerQ = normalizeName(filterOwnerSelected);
  if (ownerQ) list = list.filter(c => normalizeName(c.owner).includes(ownerQ));
  const partyQ = normalizeName(filterPartySelected);
  if (partyQ) list = list.filter(c => normalizeName(c.party).includes(partyQ));
  const benefQ = filterBenefSelected.trim();
  if (benefQ) {
    const benefNorm = normalizeName(benefQ);
    const benefDigits = toEnDigits(benefQ).replace(/[^0-9]/g, '');
    list = list.filter(c =>
      normalizeName(c.benef).includes(benefNorm) || (benefDigits && toEnDigits(c.nid).includes(benefDigits)));
  }

  return list;
}

function pillBtn(popId) { return document.querySelector(`.filter-pill-btn[data-pop="${popId}"]`); }

function updateFilterUI() {
  const dateOn = !!rangeFrom;
  const amountOn = filterAmountMin.value.trim() !== '' || filterAmountMax.value.trim() !== '';
  const ownerOn = !!filterOwnerSelected.trim();
  const partyOn = !!filterPartySelected.trim();
  const benefOn = !!filterBenefSelected.trim();
  const peopleOn = ownerOn || partyOn || benefOn;

  pillBtn('popDate').classList.toggle('active', dateOn);
  pillBtn('popAmount').classList.toggle('active', amountOn);
  pillBtn('popPeople').classList.toggle('active', peopleOn);

  filterClearBtn.classList.toggle('show', dateOn || amountOn || peopleOn);

  const basisLabel = document.querySelector('input[name="dateBasis"]:checked').value === 'dueDate' ? 'تاریخ سررسید' : 'تاریخ ثبت';
  const chips = [];
  if (dateOn) {
    const LRI = '\u2066', RLI = '\u2067', PDI = '\u2069';
    const f = rangeFrom ? `${LRI}${toFa(rangeFrom.y)}/${toFa(pad2(rangeFrom.m))}/${toFa(pad2(rangeFrom.d))}${PDI}` : '…';
    const t = rangeTo ? `${LRI}${toFa(rangeTo.y)}/${toFa(pad2(rangeTo.m))}/${toFa(pad2(rangeTo.d))}${PDI}` : '…';
    chips.push({ key: 'date', label: `${basisLabel}: ${RLI}از ${f} تا ${t}${PDI}` });
  }
  if (amountOn) {
    const loLabel = filterAmountMin.value.trim() || '۰';
    const hiLabel = filterAmountMax.value.trim() || '۱۰,۰۰۰,۰۰۰,۰۰۰';
    chips.push({ key: 'amount', label: `مبلغ: ${loLabel} تا ${hiLabel} ریال` });
  }
  if (ownerOn) chips.push({ key: 'owner', label: `صاحب چک: ${filterOwnerSelected.trim()}` });
  if (partyOn) chips.push({ key: 'party', label: `طرف حساب: ${filterPartySelected.trim()}` });
  if (benefOn) chips.push({ key: 'benef', label: `ذینفع: ${filterBenefSelected.trim()}` });
  activeFiltersRow.innerHTML = chips.map(c => `
    <span class="active-chip" data-key="${c.key}">${c.html || escapeHtml(c.label)}
      <button type="button" data-clear="${c.key}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>`).join('');

  activeFiltersRow.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => clearOneFilter(btn.dataset.clear));
  });
}

function clearOneFilter(key) {
  if (key === 'date') { rangeFrom = null; rangeTo = null; updateRangeDisplay(); filterRangeField.classList.remove('error'); }
  else if (key === 'amount') { filterAmountMin.value = ''; filterAmountMax.value = ''; setActivePreset(null); }
  else if (key === 'owner') { filterOwnerInput.value = ''; filterOwnerSelected = ''; }
  else if (key === 'party') { filterPartyInput.value = ''; filterPartySelected = ''; }
  else if (key === 'benef') { filterBenefInput.value = ''; filterBenefSelected = ''; }
  refreshTable();
}

// No combined total in the toolbar — the reference page header carries
// nothing heavier than the title and search either. Each status's own
// count and sum live where they're actually being asked about: in that
// column's own badge and footer, built in renderTable() below.
function updateBoardCountBadge(list) {
  exportCluster.style.display = list.length === 0 ? 'none' : 'inline-flex';
  if (list.length === 0) closeExportMenu();
}

function refreshTable() {
  updateFilterUI();
  renderTable();
}

// ---- search box ----
searchInput.addEventListener('input', () => {
  searchInput.value = toFa(toEnDigits(searchInput.value).replace(/[^0-9]/g, '').slice(0, 16));
  searchClearBtn.classList.toggle('show', searchInput.value.length > 0);
  refreshTable();
});
searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.classList.remove('show');
  refreshTable();
  searchInput.focus();
});

// ---- filter popovers: fixed, positioned under their own pill button ----
const filterPopovers = { popDate, popAmount, popPeople };
let activePopover = null;
let activePopoverBtn = null;

function positionPopover(pop, btn) {
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 340;
  const h = pop.offsetHeight || 200;
  const margin = window.innerWidth <= 700 ? 16 : 8;   // matches .main's own side padding on mobile
  let left = r.right - w;
  left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function closePopover() {
  if (!activePopover) return;
  activePopover.classList.remove('show');
  if (activePopoverBtn) {
    activePopoverBtn.classList.remove('open');
    activePopoverBtn.setAttribute('aria-expanded', 'false');
  }
  window.removeEventListener('scroll', repositionActivePopover, true);
  window.removeEventListener('resize', repositionActivePopover);
  activePopover = null;
  activePopoverBtn = null;
}
function repositionActivePopover() {
  if (activePopover && activePopoverBtn) positionPopover(activePopover, activePopoverBtn);
}

document.querySelectorAll('.filter-pill-btn[data-pop]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = filterPopovers[btn.dataset.pop];
    if (activePopover === pop) { closePopover(); return; }
    closePopover();
    pop.classList.add('show');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    activePopover = pop;
    activePopoverBtn = btn;
    positionPopover(pop, btn);
    window.addEventListener('scroll', repositionActivePopover, true);
    window.addEventListener('resize', repositionActivePopover);
    pushBackGuard();
  });
});
Object.values(filterPopovers).forEach(pop => pop.addEventListener('click', (e) => e.stopPropagation()));
document.addEventListener('click', (e) => {
  if (!activePopover) return;
  if (activePopover.contains(e.target)) return;
  // the calendar now lives outside every popover so it isn't hidden by them —
  // clicking inside it must not read as "clicked away from the date filter"
  if (dueDateCal.contains(e.target) || calBackdrop.contains(e.target)) return;
  closePopover();
});

// ---- date-range radio + inputs ----
document.querySelectorAll('input[name="dateBasis"]').forEach(r => r.addEventListener('change', refreshTable));
// (date-range input is filled only via the calendar; no free-typing to wire up)

// ---- amount filter: two plain grouped-digit fields, capped at 10 billion ----
const AMOUNT_FILTER_MAX = 100000000000;

function sanitizeAmountFilterInput(input) {
  let raw = toEnDigits(input.value).replace(/[^0-9]/g, '');
  raw = raw.replace(/^0+(?=\d)/, '');
  if (raw && parseInt(raw, 10) > AMOUNT_FILTER_MAX) raw = String(AMOUNT_FILTER_MAX);
  input.value = raw === '' ? '' : toFa(groupDigits(raw));
}

function setActivePreset(min, max) {
  document.querySelectorAll('.af-preset').forEach(btn => {
    btn.classList.toggle('active',
      min !== null && parseInt(btn.dataset.min, 10) === min && parseInt(btn.dataset.max, 10) === max);
  });
}

[filterAmountMin, filterAmountMax].forEach(inp => {
  inp.addEventListener('input', () => {
    sanitizeAmountFilterInput(inp);
    setActivePreset(null);
    refreshTable();
  });
});

document.querySelectorAll('.af-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const min = parseInt(btn.dataset.min, 10);
    const max = parseInt(btn.dataset.max, 10);
    filterAmountMin.value = min > 0 ? toFa(groupDigits(String(min))) : '';
    filterAmountMax.value = max < AMOUNT_FILTER_MAX ? toFa(groupDigits(String(max))) : '';
    setActivePreset(min, max);
    refreshTable();
  });
});

// ---- people filters: only actually filter once a suggestion is picked ----
let filterOwnerSelected = '';
let filterPartySelected = '';
let filterBenefSelected = '';
function wireFilterAutocomplete(input, list, source, onSelect) {
  // Renders and opens the dropdown for a given match set — shared by
  // "focus, before anything is typed" (browse everyone) and "input"
  // (narrow as you type), so both actually open the same list.
  function showMatches(matches) {
    if (matches.length === 0) { list.classList.remove('show'); return; }
    list.innerHTML = matches.map(x => {
      const name = typeof x === 'string' ? x : x.name;
      const sub = typeof x === 'string' ? '' : `<span class="ac-tag">${escapeHtml(x.nid)}</span>`;
      return `<div class="ac-item"><span class="ac-main">${escapeHtml(name)}</span>${sub}</div>`;
    }).join('');
    list.querySelectorAll('.ac-item').forEach((el, i) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const x = matches[i];
        const name = typeof x === 'string' ? x : x.name;
        input.value = name;
        list.classList.remove('show');
        onSelect(name);
        refreshTable();
      });
    });
    list.classList.add('show');
    positionDropdown(list, input);
  }
  input.addEventListener('input', () => {
    const q = normalizeName(input.value);
    if (!q) { onSelect(''); refreshTable(); showMatches(source().slice(0, 20)); return; }
    showMatches(source().filter(x => normalizeName(typeof x === 'string' ? x : x.name).includes(q)).slice(0, 6));
    // no refreshTable() here — typing a partial name only updates the
    // suggestion list, it doesn't filter the table until one is picked
  });
  // The field's whole point is choosing from the people who already exist —
  // opening on focus, with the field still empty, is what makes it browsable
  // instead of a search box that only works if you already know the name.
  input.addEventListener('focus', () => {
    if (normalizeName(input.value)) return;   // typing already re-opens it
    showMatches(source().slice(0, 20));
  });
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 120));
}
wireFilterAutocomplete(filterOwnerInput, filterOwnerList, allOwners, (name) => { filterOwnerSelected = name; });
wireFilterAutocomplete(filterPartyInput, filterPartyList, allParties, (name) => { filterPartySelected = name; });
// The filter bar has no party field to scope against, so it offers every
// beneficiary rather than beneficiariesForParty()'s party-scoped subset.
wireFilterAutocomplete(filterBenefInput, filterBenefList, allBeneficiaries, (name) => { filterBenefSelected = name; });

// Filtering by status went away with the board: the three columns already
// are that filter, and each one exports its own set from its header.
showArchivedCheckbox.addEventListener('change', refreshTable);

// ---- clear all filters ----
filterClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.classList.remove('show');
  document.querySelector('input[name="dateBasis"][value="dueDate"]').checked = true;
  rangeFrom = null;
  rangeTo = null;
  updateRangeDisplay();
  filterRangeField.classList.remove('error');
  filterAmountMin.value = '';
  filterAmountMax.value = '';
  setActivePreset(null);
  filterOwnerInput.value = '';
  filterPartyInput.value = '';
  filterBenefInput.value = '';
  filterOwnerSelected = '';
  filterPartySelected = '';
  filterBenefSelected = '';
  showArchivedCheckbox.checked = false;
  refreshTable();
});

// Builds the printable report from whatever the current filters show (the
// full matching set, not just the page currently visible in the table),
// then hands off to the browser's own print dialog — "Save as PDF" there
// is what actually produces the file, with no extra library needed.
const reportBtn = document.getElementById('reportBtn');
// statusId narrows the report to one board column — used by each column's
// own PDF button; the toolbar's own button calls this with nothing, which
// reports the whole filtered set exactly as before.
function generateReport() {
  const all = getFilteredCheques().slice().reverse();
  if (!all.length) { showToast('چکی برای گزارش‌گیری نیست'); return; }
  const [jy, jm, jd] = todayJalali();
  const totalAmount = all.reduce((sum, c) => sum + (parseInt(c.amount, 10) || 0), 0);
  const counts = { pending: 0, done: 0, problem: 0 };
  all.forEach(c => { counts[c.status || 'pending'] = (counts[c.status || 'pending'] || 0) + 1; });

  const rowsHtml = all.map((c, i) => {
    const st = statusById(c.status || 'pending');
    return `<tr>
      <td>${toFa(i + 1)}</td>
      <td>${toFa(c.serial)}</td>
      <td>${toFa(c.sayad)}</td>
      <td>${faDate(c.dueDate)}</td>
      <td>${faAmount(c.amount)}</td>
      <td>${escapeHtml(c.owner)}</td>
      <td>${escapeHtml(c.party)}</td>
      <td>${escapeHtml(c.benef)}<div class="print-nid">${toFa(c.nid)}</div></td>
      <td><span class="print-status-pill ${st.cls}">${st.name}</span></td>
    </tr>`;
  }).join('');

  // A fully separate, self-contained document (its own <style>, since a new
  // tab shares nothing with the dashboard's own stylesheet) — opened in a
  // new tab so the person can review it before deciding to print/save it,
  // without disturbing the dashboard page itself. The font is embedded the
  // same way the dashboard's own is, so it doesn't fall back to a generic
  // system font just because it's a separate document.
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش چک‌های ${statusId ? statusById(statusId).name : 'همه'} — چکینو</title>
<style>
  @font-face {
    font-family: 'IRANSansX';
    src: url('${location.origin}/fonts/IRANSansXVFaNum.woff2') format('woff2'),
         url('${location.origin}/fonts/IRANSansXVFaNum.woff') format('woff');
    font-weight: 100 1000;
    font-display: swap;
  }
  * { font-family: 'IRANSansX', Tahoma, Arial, sans-serif; }
  body { padding: 28px 34px; color: #0A0A0A; font-size: 15px; }
  .report-brand { text-align: center; font-size: 27px; font-weight: 700; color: #171717; margin-bottom: 6px; }
  .report-titlebar { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 22px; flex-wrap: wrap; gap: 8px; }
  .report-titlebar h1 { font-size: 21px; margin: 0; color: #0A0A0A; }
  .print-meta { font-size: 14px; color: #737373; }
  .report-actions { text-align: center; margin-bottom: 24px; }
  .report-print-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 26px;
    border: none;
    border-radius: 9px;
    background: #171717;
    color: #fff;
    font-family: inherit;
    font-size: 16px;
    cursor: pointer;
  }
  .report-print-btn:hover { background: #404040; }
  .print-summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  .ps-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 130px; padding: 12px 16px; border-radius: 8px; background: #F5F5F5; font-size: 13.5px; color: #171717; }
  .ps-item b { font-size: 20px; }
  .ps-item.ps-done { background: #F0FDF4; color: #15803D; }
  .ps-item.ps-problem { background: #FEF2F2; color: #B91C1C; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid #E5E5E5; padding: 9px 11px; text-align: center; }
  .print-nid { font-size: 11.5px; color: #737373; margin-top: 2px; }
  th { background: #171717; color: #fff; font-weight: normal; }
  tbody tr:nth-child(even) { background: #FAFAFA; }
  .print-status-pill { display: inline-block; padding: 3px 12px; border-radius: 6px; font-size: 13px; color: #fff; }
  .print-status-pill.st-pending { background: #171717; }
  .print-status-pill.st-done { background: #15803D; }
  .print-status-pill.st-problem { background: #B91C1C; }
  @media print {
    @page { size: A4 landscape; margin: 14mm; }
    html, body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .report-actions { display: none; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-brand">چکینو</div>
  <div class="report-titlebar">
    <h1>گزارش چک‌های ${statusId ? statusById(statusId).name : 'همه'}</h1>
    <div class="print-meta">تاریخ تهیه‌ی گزارش: ${toFa(jy)}/${toFa(pad2(jm))}/${toFa(pad2(jd))}</div>
  </div>
  <div class="report-actions">
    <button class="report-print-btn" id="reportPrintBtn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      دانلود / چاپ گزارش
    </button>
  </div>
  <div class="print-summary">
    <div class="ps-item"><b>${toFa(all.length)}</b>تعداد کل چک‌ها</div>
    <div class="ps-item"><b>${toFa(groupDigits(String(totalAmount)))} ریال</b>جمع مبلغ</div>
    ${statusId ? '' : `
    <div class="ps-item"><b>${toFa(counts.pending)}</b>منتظر ثبت</div>
    <div class="ps-item ps-done"><b>${toFa(counts.done)}</b>ثبت شد</div>
    <div class="ps-item ps-problem"><b>${toFa(counts.problem)}</b>مشکل در ثبت</div>`}
  </div>
  <table>
    <thead><tr>
      <th>ردیف</th><th>شماره سریال</th><th>شناسه صیادی</th><th>تاریخ سررسید</th>
      <th>مبلغ (ریال)</th><th>صاحب چک</th><th>طرف حساب</th><th>ذینفع</th><th>وضعیت</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  const reportWin = window.open('', '_blank');
  if (!reportWin) { alert('اجازه‌ی باز شدن پنجره‌ی جدید داده نشد. لطفاً پاپ‌آپ‌بلاکر مرورگر رو برای این صفحه غیرفعال کنید.'); return; }
  reportWin.document.write(html);
  reportWin.document.close();
  // Wired from here rather than an inline onclick= in the generated
  // markup: the report inherits this page's Content-Security-Policy, and
  // an inline handler is exactly what script-src 'self' blocks.
  const printBtn = reportWin.document.getElementById('reportPrintBtn');
  if (printBtn) printBtn.addEventListener('click', () => reportWin.print());
}
// ---- Export cluster: the report button opens into a PDF / Excel pair
// rather than crowding the strip with three buttons at rest. ----
const exportCluster = document.getElementById('exportCluster');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');

function closeExportMenu() {
  if (!exportCluster.classList.contains('open')) return;
  exportCluster.classList.remove('open');
  reportBtn.setAttribute('aria-expanded', 'false');
}
function openExportMenu() {
  exportCluster.classList.add('open');
  reportBtn.setAttribute('aria-expanded', 'true');
  pushBackGuard();
}
reportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (exportCluster.classList.contains('open')) closeExportMenu();
  else openExportMenu();
});
// Clicking anywhere else rolls it back up, the same way the status menu behaves.
document.addEventListener('click', (e) => {
  if (!exportCluster.contains(e.target)) closeExportMenu();
});
exportPdfBtn.addEventListener('click', () => { closeExportMenu(); generateReport(); });
exportExcelBtn.addEventListener('click', () => { closeExportMenu(); exportChecksToExcel(); });

// ---- Excel export: same filtered/sorted list the on-screen table and the
// print report use, so what a user exports always matches what they see. ----
// statusId narrows the export to one board column; without it the whole
// filtered set goes out, which is what the toolbar's own button does.
// The xlsx library is ~880KB and this is the only thing in the app that
// touches it, so it is not on the page's critical path any more: it loads
// the first time someone actually asks for an Excel file, and is reused
// from then on. A failed load says so instead of silently doing nothing.
let xlsxLoader = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  if (!xlsxLoader) {
    xlsxLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/js/vendor/xlsx.full.min.js';
      s.onload = () => resolve();
      s.onerror = () => { xlsxLoader = null; reject(new Error('xlsx load failed')); };
      document.head.appendChild(s);
    });
  }
  return xlsxLoader;
}

async function exportChecksToExcel(statusId) {
  let all = getFilteredCheques().slice().reverse();
  if (statusId) all = all.filter(c => (c.status || 'pending') === statusId);
  if (!all.length) { showToast('چکی برای خروجی گرفتن نیست'); return; }
  try {
    await loadXlsx();
  } catch (e) {
    showToast('بارگذاری ابزار خروجی اکسل ناموفق بود. اتصال اینترنت را بررسی کنید.');
    return;
  }
  const header = [
    'ردیف', 'شماره سریال', 'شناسه صیادی', 'مبلغ (ریال)',
    'تاریخ سررسید (شمسی)', 'تاریخ سررسید (میلادی)',
    'صاحب چک', 'طرف حساب', 'ذینفع', 'کد ملی ذینفع', 'وضعیت', 'یادداشت',
  ];
  const rows = all.map((c, i) => [
    i + 1,
    c.serial || '',
    c.sayad || '',
    parseInt(c.amount, 10) || 0,
    c.dueDate || '',
    jalaliStrToIso(c.dueDate) || '',
    c.owner || '',
    c.party || '',
    c.benef || '',
    c.nid || '',
    statusById(c.status || 'pending').name,
    c.notes || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = header.map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, statusId ? statusById(statusId).name : 'چک‌ها');
  const [jy, jm, jd] = todayJalali();
  const scope = statusId ? `-${statusId}` : '';
  XLSX.writeFile(wb, `chekino-checks${scope}-${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}.xlsx`);
}

// Only a still-pending cheque has a due date someone needs to act before —
// once it's registered or flagged, the date is history, not a deadline.
const DUE_SOON_DAYS = 3;
function daysUntilDue(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('/').map(n => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const target = jalaliToJsDate(y, m, d).setHours(0, 0, 0, 0);
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}
function dueUrgencyClass(c) {
  if (c.status !== 'pending') return '';
  const days = daysUntilDue(c.dueDate);
  if (days === null) return '';
  if (days < 0) return ' chk-due-overdue';
  if (days <= DUE_SOON_DAYS) return ' chk-due-soon';
  return '';
}


// ---- Card builder — one check, one card ----
// A fixed two-column grid instead of a flowing list of fields: every card
// carries the same rows in the same spots, so scanning down a column reads
// like scanning a table instead of hunting for where a given field landed
// on this particular card.
// The status trigger carries the same icon as its column badge, filled in
// the status colour — a small solid badge rather than a bordered circle
// around a dot, so it reads as its own object instead of a plain toggle.
// Hovering it still explains a problem cheque's reason; the door it opens
// is unchanged (still asks for a reason on "مشکل", still confirms a
// revert to "منتظر ثبت").
function statusDotTriggerHtml(c, st) {
  const reasonText = c.status === 'problem' && c.statusReason ? c.statusReason : '';
  const tip = reasonText ? `مشکل: ${reasonText}` : 'تغییر وضعیت';
  return `<button type="button" class="status-dot-btn" data-status-for="${c.id}" style="background:${st.color}" data-tip="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${BOARD_COL_ICON[c.status || 'pending'] || ''}</svg>
  </button>`;
}

// Every field on the card gets its own icon, and the icon set leans on
// rounded corners and joins throughout — rx on the rectangles, round caps
// on every line — to sit comfortably next to the rest of the system.
const ICON_CALENDAR = icon('calendar');
const ICON_PERSON = icon('user');
const ICON_SERIAL = icon('serial');
const ICON_AMOUNT = icon('amount');

// The serial is what a person actually says out loud to mean this specific
// cheque ("چک ۴۸۲۹۱۰"), so it carries the card's strongest weight now;
// the beneficiary rides along underneath as context, not the headline.
// The national id rides along as a tooltip on the beneficiary instead of
// a permanent line — real, but not worth a whole row just in case.
// Set for exactly one renderTable() call, by applyStatus — see there.
let justChangedId = null;

function checkCardHtml(c) {
  const st = statusById(c.status || 'pending');
  const urgency = dueUrgencyClass(c);
  const nidTip = c.nid ? `ذینفع: ${c.benef} — کد ملی: ${toFa(c.nid)}` : `ذینفع: ${c.benef}`;
  const justChanged = c.id === justChangedId ? ' just-changed' : '';
  // No role="button"/tabindex here: the card has no click or key handler —
  // it announced as a control that does nothing, and wrapping the real
  // buttons inside a role="button" hid them from assistive tech
  // (axe: nested-interactive). Dragging is a pointer enhancement; the
  // keyboard path to the same change is the status button inside.
  return `<div class="check-card ${st.cls}${justChanged}" data-id="${c.id}">
    <div class="chk-row">
      <span class="chk-due${urgency}" data-tip="تاریخ سررسید">${ICON_CALENDAR}${faDate(c.dueDate)}</span>
      <span class="chk-serial">${ICON_SERIAL}<b>${toFa(c.serial)}</b></span>
    </div>
    <div class="chk-row chk-row-mid">
      <span class="chk-benef" data-tip="${escapeHtml(nidTip)}">${ICON_PERSON}<span>${escapeHtml(c.benef)}</span></span>
      <span class="chk-amount">${ICON_AMOUNT}${faAmountRial(c.amount)}</span>
    </div>
    <div class="chk-row chk-row-bottom">
      <span class="row-actions">${eyeButtonHtml(c)}</span>
      <div class="chk-icon-group">
        ${receiptButtonHtml(c)}
        ${statusDotTriggerHtml(c, st)}
      </div>
    </div>
  </div>`;
}

// One icon per state, chosen for what the state means rather than for
// decoration: waiting, done, needs attention — so the badge reads before
// the label text even registers.
const BOARD_COL_ICON = {
  pending: ICON_PATH.clock,
  done: ICON_PATH.check,
  problem: ICON_PATH.alert,
};

function boardColumnHtml(st) {
  return `<div class="board-column" data-status="${st.id}">
    <div class="board-col-head">
      <span class="board-col-badge">
        <svg class="board-col-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BOARD_COL_ICON[st.id] || ''}</svg>
        ${st.name}
        <b class="board-col-count" id="boardColCount-${st.id}">۰</b>
      </span>
    </div>
    <div class="board-col-list" id="boardColList-${st.id}"></div>
  </div>`;
}

// Below 860px only one column is on screen at a time and these tabs are what
// switches between them, so the board scrolls vertically like the rest of the
// page instead of trapping a sideways swipe inside the main content.
let mobileBoardStatus = STATUSES[0].id;

// Matches the 860px breakpoint the stylesheet switches the board at. Read live
// rather than cached so a desktop window dragged narrow behaves correctly.
const singleColumnBoardQuery = window.matchMedia('(max-width: 860px)');
function isSingleColumnBoard() { return singleColumnBoardQuery.matches; }
// Touch screens synthesise a mouseover on tap, which left the card tooltips
// stuck on screen after a finger press with no pointer to move away.
const hoverPointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

function boardStatusTabHtml(st) {
  return `<button type="button" class="board-status-tab" data-status-tab="${st.id}" title="${st.name}"
    role="tab" aria-selected="${st.id === mobileBoardStatus}" aria-controls="boardColList-${st.id}">
    <span class="bst-dot" style="background:${st.color}"></span>
    <span class="bst-name">${st.name}</span>
    <b class="bst-count" id="boardTabCount-${st.id}">۰</b>
  </button>`;
}

function applyMobileBoardStatus() {
  document.querySelectorAll('.board-column').forEach((col) => {
    col.classList.toggle('is-mobile-active', col.dataset.status === mobileBoardStatus);
  });
  document.querySelectorAll('.board-status-tab').forEach((tab) => {
    const on = tab.dataset.statusTab === mobileBoardStatus;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
}

function ensureBoardStatusTabs() {
  if (boardStatusTabs.children.length) return;
  boardStatusTabs.innerHTML = STATUSES.map(boardStatusTabHtml).join('');
  boardStatusTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-status-tab]');
    if (!tab) return;
    mobileBoardStatus = tab.dataset.statusTab;
    applyMobileBoardStatus();
    updateBoardHeight();
  });
}

// Builds the three columns once; renderTable() below only ever touches
// their contents afterwards, so a card mid-drag never has its own column
// wrapper ripped out from under it.
function ensureBoardColumns() {
  if (boardColumns.children.length) return;
  boardColumns.innerHTML = STATUSES.map(boardColumnHtml).join('');
  ensureBoardStatusTabs();
  applyMobileBoardStatus();
  wireCardTooltips();
}

// A real floating tooltip — positioned off the hovered element's own
// rect, the same way the telegram button's does — instead of the native
// title attribute, which every card was leaning on for the beneficiary's
// national id and the status dot's problem reason.
const appTooltip = document.getElementById('appTooltip');
function wireCardTooltips() {
  if (!hoverPointerQuery.matches) return;
  boardColumns.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el || el.dataset.tip === '') return;
    appTooltip.textContent = el.dataset.tip;
    appTooltip.classList.add('show');
    const r = el.getBoundingClientRect();
    const w = appTooltip.offsetWidth;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    appTooltip.style.left = left + 'px';
    appTooltip.style.top = (r.bottom + 8) + 'px';
  });
  boardColumns.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && !el.contains(e.relatedTarget)) appTooltip.classList.remove('show');
  });
  boardColumns.addEventListener('scroll', () => appTooltip.classList.remove('show'), true);
}

// Ascending string compare — ISO timestamps sort correctly as plain text,
// so this is all three column orders need underneath.
function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// Each column answers a different question, so each sorts by a different
// clock. Pending is a queue: the cheque that has been waiting longest sits
// on top, oldest registration first. Done and problem are activity, not a
// queue — what just happened is what the user is here to check, so the most
// recent status change sits on top; a cheque flagged five minutes ago
// shouldn't be buried under nine that were flagged weeks ago.
function sortColumnChecks(list, statusId) {
  const out = list.slice();
  if (statusId === 'pending') {
    out.sort((a, b) => cmpStr(a.createdAtIso || '', b.createdAtIso || '') || (a.id - b.id));
  } else {
    out.sort((a, b) => cmpStr(b.statusChangedAtIso || '', a.statusChangedAtIso || '') || (b.id - a.id));
  }
  return out;
}

function renderTable() {
  ensureBoardColumns();
  const all = getFilteredCheques();
  // "No checks at all" and "no checks match this filter" are different
  // situations and need different screens. The big centered "ثبت اولین
  // چک" empty state is only true when the company has never registered
  // anything — checking that against the unfiltered cache, not the
  // filtered list, is what stops a search/date/amount/people filter that
  // simply has no matches from taking the whole board down with it. A
  // filter emptying a column is exactly what each column's own "چکی در
  // این وضعیت نیست" already says.
  const nothingRegistered = loadCheques().length === 0;

  updateBoardCountBadge(all);
  // First render means the data is in — the loading skeleton can go.
  boardWrap.classList.remove('is-loading');
  tableEmpty.style.display = nothingRegistered ? 'flex' : 'none';
  boardColumns.style.display = nothingRegistered ? 'none' : '';

  STATUSES.forEach((st) => {
    const colChecks = sortColumnChecks(all.filter((c) => (c.status || 'pending') === st.id), st.id);
    document.getElementById(`boardColCount-${st.id}`).textContent = toFa(colChecks.length);
    const tabCountEl = document.getElementById(`boardTabCount-${st.id}`);
    if (tabCountEl) tabCountEl.textContent = toFa(colChecks.length);
    const listEl = document.getElementById(`boardColList-${st.id}`);
    listEl.innerHTML = colChecks.length
      ? colChecks.map(checkCardHtml).join('')
      : `<div class="board-col-empty">چکی در این وضعیت نیست</div>`;
  });

  document.querySelectorAll('[data-status-for]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStatusMenu(btn, parseInt(btn.dataset.statusFor, 10));
    });
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openViewEdit(parseInt(btn.dataset.view, 10));
    });
  });

  document.querySelectorAll('[data-receipt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyReceiptMessage(parseInt(btn.dataset.receipt, 10), btn);
    });
  });

  updateBoardHeight();
}

// Sizes each column's own scroll area to the viewport, the same idea the
// table used: one card short of a full screen, so the eye catches that
// there's more below instead of the whole page growing underneath a
// hundred-card pending pile.
//
// This has to account for .main's own bottom padding too, not just the
// 16px gap below the column itself — that padding sits below the whole
// board in the page's flow, so leaving it out of "available" let a long
// column stop exactly at the viewport's edge while .main's padding then
// pushed the actual page another ~80px past the fold, leaving a sliver of
// outer scroll on a page that otherwise looked like it should fit.
function updateBoardHeight() {
  const mainEl = document.querySelector('.main');
  const mainPad = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
  document.querySelectorAll('.board-col-list').forEach((list) => {
    if (window.innerWidth <= 860) { list.style.maxHeight = ''; return; }
    const top = list.getBoundingClientRect().top;
    const available = window.innerHeight - top - mainPad - 16;
    list.style.maxHeight = Math.max(160, available) + 'px';
  });
}
window.addEventListener('resize', updateBoardHeight);

// ---- Drag a card between columns to change its status ----
// Pointer Events rather than the native HTML5 drag API: the native API has
// no touch support at all, and this has to work the same with a mouse or a
// finger. A small movement threshold before a drag "starts" is what keeps
// a plain tap on the card — which does nothing, same as before — from
// being swallowed as an accidental one-pixel drag.
(function setupBoardDrag() {
  const DRAG_THRESHOLD = 6;
  let activeReasonPrompt = null;
  let pointerId = null;
  let startX = 0, startY = 0;
  let sourceCard = null;
  let ghost = null;
  let dragging = false;
  let overColumn = null;
  let offsetX = 0, offsetY = 0;
  let baseLeft = 0, baseTop = 0;

  // The pointer fires far more often than the screen repaints — writing to
  // style and calling elementFromPoint on every single event is what made
  // this feel heavy. Only the latest coordinates are recorded synchronously;
  // the actual work happens once per animation frame, and the ghost moves
  // on transform (compositor-only) instead of left/top (which forces a
  // layout pass on every move).
  let pendingX = 0, pendingY = 0;
  let rafId = null;
  const GHOST_TILT = 'rotate(-1.5deg) scale(1.02)';   // the card's own tilt, held constant under the translate

  function cardUnderPointer(target) {
    return target.closest && target.closest('.check-card');
  }
  // A drag must start from plain card surface — a button inside the card
  // (status, eye, receipt) keeps its own click behaviour untouched.
  function isInteractiveChild(target) {
    return !!(target.closest && target.closest('button, a, input, textarea, select'));
  }

  function beginDrag(e) {
    dragging = true;
    sourceCard.classList.add('dragging');
    const r = sourceCard.getBoundingClientRect();
    offsetX = startX - r.left;
    offsetY = startY - r.top;
    baseLeft = r.left;
    baseTop = r.top;
    ghost = sourceCard.cloneNode(true);
    ghost.className = 'check-card check-card-ghost';
    ghost.style.width = r.width + 'px';
    ghost.style.left = baseLeft + 'px';
    ghost.style.top = baseTop + 'px';
    ghost.style.transform = GHOST_TILT;
    document.body.appendChild(ghost);
    scheduleFrame(e.clientX, e.clientY);
  }

  function scheduleFrame(x, y) {
    pendingX = x; pendingY = y;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(applyFrame);
  }

  function applyFrame() {
    rafId = null;
    if (!dragging || !ghost) return;
    const dx = pendingX - offsetX - baseLeft;
    const dy = pendingY - offsetY - baseTop;
    ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) ${GHOST_TILT}`;
    updateOverColumn(pendingX, pendingY);
  }

  function updateOverColumn(x, y) {
    const el = document.elementFromPoint(x, y);
    const col = el && el.closest ? el.closest('.board-column') : null;
    if (col === overColumn) return;
    if (overColumn) overColumn.classList.remove('drag-over');
    overColumn = col;
    if (overColumn) overColumn.classList.add('drag-over');
  }

  function cleanup() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (sourceCard) sourceCard.classList.remove('dragging');
    if (ghost) { ghost.remove(); ghost = null; }
    if (overColumn) { overColumn.classList.remove('drag-over'); overColumn = null; }
    sourceCard = null;
    pointerId = null;
    dragging = false;
  }

  boardColumns.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return; // left click / primary touch only
    // Below 860px the board shows one status at a time, so there is no second
    // column to drop onto — dragging there only fought the page scroll. The
    // status button on the card is the way to move a cheque on a phone.
    if (isSingleColumnBoard()) return;
    const card = cardUnderPointer(e.target);
    if (!card || isInteractiveChild(e.target)) return;
    // A prompt is waiting on an answer: this press abandons it (the card
    // returns to where it came from) and does not also begin a drag —
    // cancelling re-renders the board, so the element under the pointer is
    // gone by the time a drag would start. Press again to drag.
    if (activeReasonPrompt) { dismissReasonPrompt(); return; }
    pointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY;
    sourceCard = card;
  });

  boardColumns.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId || !sourceCard) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD && Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
      sourceCard.setPointerCapture(pointerId);
      beginDrag(e);
      return;
    }
    scheduleFrame(e.clientX, e.clientY);
  }, { passive: true });

  function onPointerUp(e) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const card = sourceCard, dropColumn = overColumn, wasDragging = dragging;
    cleanup();
    if (!wasDragging || !card || !dropColumn) return;
    const id = parseInt(card.dataset.id, 10);
    const targetStatus = dropColumn.dataset.status;
    handleDrop(id, targetStatus, card);
  }
  boardColumns.addEventListener('pointerup', onPointerUp);
  boardColumns.addEventListener('pointercancel', () => cleanup());

  function currentStatusOf(id) {
    const c = loadCheques().find((x) => x.id === id);
    return c ? (c.status || 'pending') : 'pending';
  }

  // Only one reason prompt can be open, and it must not outlive the card it
  // belongs to. Starting another drag or another drop abandons it — the card
  // goes back where it came from first, so the board never shows a prompt
  // pointing at a card that has since moved somewhere else.
  function dismissReasonPrompt() {
    if (activeReasonPrompt) activeReasonPrompt.cancel();
  }

  function handleDrop(id, targetStatus, cardEl) {
    dismissReasonPrompt();
    const current = currentStatusOf(id);
    if (targetStatus === current) return;   // dropped back where it started

    if (targetStatus === 'problem') {
      promptDropReason(id, current);
      return;
    }
    if (targetStatus === 'pending' && current !== 'pending') {
      askConfirm({
        title: 'بازگشت به «منتظر ثبت»',
        body: 'این چک قبلاً به وضعیت دیگری تغییر کرده. مطمئنید می‌خواید به «منتظر ثبت» برگرده؟',
        confirmLabel: 'بله، بازگردد',
        cancelLabel: 'انصراف',
      }).then((ok) => { if (ok) applyStatus(id, 'pending', ''); });
      return;
    }
    applyStatus(id, targetStatus, '');
  }

  // "مشکل در ثبت" always carries a reason, drag or dropdown alike — a small
  // floating box at the card's own position, built from the same reason-box
  // markup/styles the status dropdown already uses.
  // Dropping onto «مشکل در ثبت» used to leave the card sitting in its old
  // column while a small box appeared over where it had been — you watched
  // the card you dragged never arrive, looked away, and only later found it
  // still there waiting on a reason. Worse, any stray click dismissed the
  // box and threw away what had been typed, changing nothing.
  //
  // Now the card lands where it was dropped straight away, like every other
  // drop, and the reason is asked for on the card in its new home: it is
  // marked as waiting, scrolled into view, and the prompt is anchored to it.
  // Cancelling (or Escape) puts the card back where it came from; nothing
  // but Save or Cancel closes the prompt.
  function promptDropReason(id, prevStatus) {
    dismissReasonPrompt();
    const rec = loadCheques().find((x) => x.id === id);
    const before = rec ? { status: rec.status, statusReason: rec.statusReason, statusChangedAtIso: rec.statusChangedAtIso } : null;
    // Landing in "problem" straight away is the whole point of this flow —
    // set the sort clock right along with the status, or the card would
    // land in the column without rising to the top of it until the reason
    // is saved and applyStatus finally sets a real one.
    if (rec) { rec.status = 'problem'; rec.statusReason = ''; rec.statusChangedAtIso = new Date().toISOString(); }
    closeStatusMenu();
    renderTable();

    const cardEl = boardColumns.querySelector(`.check-card[data-id="${id}"]`);
    if (!cardEl) { if (rec && before) Object.assign(rec, before); renderTable(); return; }
    cardEl.classList.add('awaiting-reason');
    cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    const box = document.createElement('div');
    box.className = 'status-menu show reason-prompt';
    box.innerHTML = `
      <div class="status-reason">
        <div class="sr-title">${icon('alert')}<span>چرا ثبت نشد؟</span></div>
        <textarea id="dropReasonText" placeholder="دلیل مشکل در ثبت را بنویسید"></textarea>
        <div class="status-reason-actions">
          <button type="button" class="sr-save">ثبت وضعیت</button>
          <button type="button" class="sr-cancel">انصراف</button>
        </div>
      </div>`;
    document.body.appendChild(box);

    const place = () => {
      const r = cardEl.getBoundingClientRect();
      const w = box.offsetWidth || 260;
      const h = box.offsetHeight || 170;
      let left = r.left + r.width / 2 - w / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
      box.style.left = left + 'px';
      box.style.top = top + 'px';
    };
    box.style.position = 'fixed';
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    const ta = box.querySelector('textarea');
    ta.focus();

    function cleanup() {
      activeReasonPrompt = null;
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('keydown', onKey, true);
      cardEl.classList.remove('awaiting-reason');
      box.remove();
    }
    function cancel() {
      cleanup();
      if (rec && before) Object.assign(rec, before);
      renderTable();
      showToast('چک به وضعیت قبلی برگشت');
    }
    function save() {
      const reason = ta.value.trim();
      cleanup();
      applyStatus(id, 'problem', reason);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
      // Ctrl/⌘+Enter saves, the usual shortcut for a textarea whose Enter
      // has to stay available for line breaks.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    }
    activeReasonPrompt = { cancel };
    box.querySelector('.sr-save').addEventListener('click', save);
    box.querySelector('.sr-cancel').addEventListener('click', cancel);
    box.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', onKey, true);
  }
})();

function closeStatusMenu() {
  if (openStatusMenu) { openStatusMenu.remove(); openStatusMenu = null; }
  window.removeEventListener('scroll', repositionStatusMenu, true);
  window.removeEventListener('resize', repositionStatusMenu);
}

function repositionStatusMenu() {
  if (!openStatusMenu || !openStatusMenu._anchorBtn) return;
  const r = openStatusMenu._anchorBtn.getBoundingClientRect();
  const w = openStatusMenu.offsetWidth || 190;
  const h = openStatusMenu.offsetHeight || 120;
  let left = r.right - w;                                    // RTL: align right edges
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);  // flip above if no room below
  openStatusMenu.style.left = left + 'px';
  openStatusMenu.style.top = top + 'px';
}

function toggleStatusMenu(btn, id) {
  if (openStatusMenu && openStatusMenu.dataset.for === String(id)) { closeStatusMenu(); return; }
  closeStatusMenu();

  const cheque = loadCheques().find(c => c.id === id);
  if (!cheque) return;
  const current = cheque.status || 'pending';

  const menu = document.createElement('div');
  menu.className = 'status-menu show';
  menu.dataset.for = String(id);
  menu.innerHTML = STATUSES.filter(s => s.id !== current).map(s =>
    `<div class="status-opt" data-set="${s.id}"><span class="st-dot" style="background:${s.color}"></span>${s.name}</div>`).join('');

  menu.addEventListener('click', (e) => e.stopPropagation());
  document.body.appendChild(menu);
  menu._anchorBtn = btn;
  openStatusMenu = menu;
  pushBackGuard();
  repositionStatusMenu();
  window.addEventListener('scroll', repositionStatusMenu, true);
  window.addEventListener('resize', repositionStatusMenu);

  menu.querySelectorAll('[data-set]').forEach(opt => {
    opt.addEventListener('click', () => {
      const next = opt.dataset.set;
      if (opt.classList.contains('confirming-revert')) {
        applyStatus(id, 'pending', '');
        return;
      }
      if (next === 'problem') showReasonBox(menu, id);
      else if (next === 'pending') showRevertConfirm(opt);
      else applyStatus(id, next, '');
    });
  });
}

// Going back to "منتظر ثبت" from an already-recorded/failed state is worth a
// second thought, so this option morphs in place — the same slide-in
// mechanic as the "بله، حذف شود" / "ذخیره تغییرات" confirmations elsewhere,
// just scaled down to fit inside this small dropdown row.
function showRevertConfirm(optEl) {
  const pendingSt = statusById('pending');
  optEl.classList.add('confirming-revert');
  optEl.innerHTML = `
    <span class="status-revert-text">بله، بازگردد</span>
    <button type="button" class="status-revert-cancel">انصراف</button>`;
  repositionStatusMenu();
  requestAnimationFrame(() => {
    optEl.querySelector('.status-revert-cancel').classList.add('show');
  });
  optEl.querySelector('.status-revert-cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    optEl.classList.remove('confirming-revert');
    optEl.innerHTML = `<span class="st-dot" style="background:${pendingSt.color}"></span>${pendingSt.name}`;
    repositionStatusMenu();
  });
}

// "مشکل در ثبت" needs a reason, so the menu turns into a small note box
function showReasonBox(menu, id) {
  menu.innerHTML = `
    <div class="status-reason">
      <textarea id="srText" placeholder="دلیل مشکل در ثبت را بنویسید"></textarea>
      <div class="status-reason-actions">
        <button type="button" class="sr-save">ثبت وضعیت</button>
        <button type="button" class="sr-cancel">انصراف</button>
      </div>
    </div>`;
  repositionStatusMenu();   // the box is taller than the plain option list
  const ta = menu.querySelector('#srText');
  ta.focus();
  menu.querySelector('.sr-save').addEventListener('click', () => applyStatus(id, 'problem', ta.value.trim()));
  menu.querySelector('.sr-cancel').addEventListener('click', closeStatusMenu);
}

// Optimistic: the card moves the instant it is asked to, and the write
// goes out behind it. At this server's round-trip time the old order —
// wait for the PUT, then wait for a full re-fetch of every cheque, then
// render — left a dragged card sitting in its old column for a couple of
// seconds, which reads as a failed drop. If the write is rejected the
// card goes back where it was and the error is shown.
async function applyStatus(id, status, reason) {
  const rec = loadCheques().find((x) => x.id === id);
  const before = rec
    ? { status: rec.status, statusReason: rec.statusReason, statusChangedAt: rec.statusChangedAt, statusChangedAtIso: rec.statusChangedAtIso }
    : null;

  if (rec) {
    const now = new Date();
    const [jy, jm, jd] = todayJalali();
    rec.status = status;
    rec.statusReason = reason || '';
    rec.statusChangedAt = `${jy}/${pad2(jm)}/${pad2(jd)}`;
    // The done/problem columns sort by this — without it the optimistic
    // render (the one the user actually sees; the reconciled one lands a
    // beat later) would place a cheque that just changed status wherever
    // its old timestamp happened to fall, instead of at the top.
    rec.statusChangedAtIso = now.toISOString();
  }
  closeStatusMenu();
  // One-shot: only the card that actually just moved plays the settle-in
  // animation on this render, and only on this one — checkCardHtml reads it
  // once and it's cleared immediately after, so neither the background
  // reconcile fetch nor a later, unrelated re-render can replay it.
  justChangedId = id;
  renderTable();
  justChangedId = null;

  try {
    await apiJson(`/checks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, status_reason: reason || '' }),
    });
    // Reconcile in the background — the server owns the status history
    // and the exact timestamp, neither of which the guess above fills in.
    loadChecksFromApi().then(renderTable).catch(() => {});
  } catch (e) {
    if (rec && before) Object.assign(rec, before);
    renderTable();
    showToast(e.message || 'تغییر وضعیت در سرور ناموفق بود');
  }
}

document.addEventListener('click', closeStatusMenu);

// ---- Telegram floating button ----
const toTopBtn = document.getElementById('toTopBtn');
const veReceiptBtn = document.getElementById('veReceiptBtn');
veReceiptBtn.addEventListener('click', (e) => {
  if (editingChequeId != null) copyReceiptMessage(editingChequeId, e.currentTarget);
});
const tgBtn = document.getElementById('tgBtn');

tgBtn.addEventListener('click', () => {
  window.open('https://t.me/ehsanrafie', '_blank');
});
const tgTooltip = document.getElementById('tgTooltip');
tgBtn.addEventListener('mouseenter', () => tgTooltip.classList.add('show'));
tgBtn.addEventListener('mouseleave', () => tgTooltip.classList.remove('show'));
document.getElementById('headerSupportBtn').addEventListener('click', () => {
  window.open('https://t.me/ehsanrafie', '_blank');
});

window.addEventListener('scroll', () => {
  toTopBtn.classList.toggle('show', window.scrollY > 400);
});
toTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


// =========================================================
// ---- Photo editor: crop + rotate, redesigned flow ----
// =========================================================
let peCurrentFile = null;
let peOriginalCanvas = null;   // pristine — never mutated after first load
let peWorkingCanvas = null;    // current baked state (post rotate/crop)
let peCrop = { x: 0, y: 0, w: 1, h: 1 };
let peDrag = null;
const peSourceImg = new Image();
const peShadeT = document.querySelector('.pe-shade-t');
const peShadeB = document.querySelector('.pe-shade-b');
const peShadeL = document.querySelector('.pe-shade-l');
const peShadeR = document.querySelector('.pe-shade-r');
const peShades = [peShadeT, peShadeB, peShadeL, peShadeR];
const peRotateBtn = document.getElementById('peRotateBtn');
const PE_MIN_CROP = 0.12;

function peClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function imageToCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}
function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
function rotateCanvas90(src) {
  const c = document.createElement('canvas');
  c.width = src.height;
  c.height = src.width;
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}
function resizeCanvasIfNeeded(src, maxDim) {
  if (src.width <= maxDim && src.height <= maxDim) return src;
  const scale = maxDim / Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function openNextInQueue() {
  if (peQueue.length === 0) return;
  openPhotoEditor(peQueue.shift());
}

function openPhotoEditor(file) {
  peCurrentFile = file;
  const url = URL.createObjectURL(file);
  peSourceImg.onload = () => {
    URL.revokeObjectURL(url);
    peOriginalCanvas = imageToCanvas(peSourceImg);
    peWorkingCanvas = cloneCanvas(peOriginalCanvas);
    // Show the overlay BEFORE measuring the stage — measuring while it's still
    // display:none would read 0×0 and place the crop handles on top of each other.
    photoEditorOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    updatePeView();
    // The editor opens programmatically (not from a click inside it), so
    // nothing has focus yet — without this, Enter would still hit whatever
    // had focus before (usually the "افزودن عکس" button), reopening the
    // file picker instead of doing anything in the editor. Focusing the
    // primary action means Enter does the standard thing: confirm/submit.
    peSendBtn.focus();
  };
  peSourceImg.src = url;
}

function closePhotoEditor() {
  photoEditorOverlay.classList.remove('show');
  document.body.style.overflow = modalOverlay.classList.contains('show') ? 'hidden' : '';
}

function fitStageToImage(w, h) {
  const cardW = window.innerWidth <= 600 ? window.innerWidth : Math.min(window.innerWidth * 0.86, 620);
  const maxW = Math.min(cardW - 32, 560);
  const maxH = Math.min(window.innerHeight * 0.55, 460);
  const scale = Math.min(maxW / w, maxH / h, 1);
  peStage.style.width = Math.round(w * scale) + 'px';
  peStage.style.height = Math.round(h * scale) + 'px';
}

function updatePeView() {
  peImg.src = peWorkingCanvas.toDataURL('image/jpeg', 0.92);
  fitStageToImage(peWorkingCanvas.width, peWorkingCanvas.height);

  // The crop box is available the instant an image loads — no extra step
  // to turn it on first.
  peCropBox.classList.add('active');
  peShades.forEach(s => s.classList.add('active'));
  peCrop = { x: 0, y: 0, w: 1, h: 1 };
  renderCropBox();
}

function renderCropBox() {
  const sw = peStage.offsetWidth, sh = peStage.offsetHeight;
  peCropBox.style.left = (peCrop.x * sw) + 'px';
  peCropBox.style.top = (peCrop.y * sh) + 'px';
  peCropBox.style.width = (peCrop.w * sw) + 'px';
  peCropBox.style.height = (peCrop.h * sh) + 'px';
  peShadeT.style.cssText = `left:0; top:0; width:100%; height:${peCrop.y * sh}px;`;
  peShadeB.style.cssText = `left:0; top:${(peCrop.y + peCrop.h) * sh}px; width:100%; height:${sh - (peCrop.y + peCrop.h) * sh}px;`;
  peShadeL.style.cssText = `left:0; top:${peCrop.y * sh}px; width:${peCrop.x * sw}px; height:${peCrop.h * sh}px;`;
  peShadeR.style.cssText = `left:${(peCrop.x + peCrop.w) * sw}px; top:${peCrop.y * sh}px; width:${sw - (peCrop.x + peCrop.w) * sw}px; height:${peCrop.h * sh}px;`;
}

function pePointerDown(e, mode) {
  e.preventDefault();
  e.stopPropagation();
  peDrag = { mode, startX: e.clientX, startY: e.clientY, startCrop: { ...peCrop } };
  document.addEventListener('pointermove', pePointerMove);
  document.addEventListener('pointerup', pePointerUp);
}
function pePointerMove(e) {
  if (!peDrag) return;
  const sw = peStage.offsetWidth, sh = peStage.offsetHeight;
  const dx = (e.clientX - peDrag.startX) / sw;
  const dy = (e.clientY - peDrag.startY) / sh;
  let { x, y, w, h } = peDrag.startCrop;
  if (peDrag.mode === 'move') {
    x = peClamp(x + dx, 0, 1 - w);
    y = peClamp(y + dy, 0, 1 - h);
  } else {
    if (peDrag.mode.includes('l')) { const nx = peClamp(x + dx, 0, x + w - PE_MIN_CROP); w = x + w - nx; x = nx; }
    if (peDrag.mode.includes('r')) { w = peClamp(w + dx, PE_MIN_CROP, 1 - x); }
    if (peDrag.mode.includes('t')) { const ny = peClamp(y + dy, 0, y + h - PE_MIN_CROP); h = y + h - ny; y = ny; }
    if (peDrag.mode.includes('b')) { h = peClamp(h + dy, PE_MIN_CROP, 1 - y); }
  }
  peCrop = { x, y, w, h };
  renderCropBox();
}
function pePointerUp() {
  peDrag = null;
  document.removeEventListener('pointermove', pePointerMove);
  document.removeEventListener('pointerup', pePointerUp);
}
peCropBox.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.pe-handle')) return;
  pePointerDown(e, 'move');
});
document.querySelectorAll('.pe-handle').forEach(h => {
  h.addEventListener('pointerdown', (e) => pePointerDown(e, h.dataset.h));
});

// Bakes the current crop selection into the working canvas.
function applyPendingCrop() {
  const sw = peWorkingCanvas.width, sh = peWorkingCanvas.height;
  const sx = peCrop.x * sw, sy = peCrop.y * sh, cw = peCrop.w * sw, ch = peCrop.h * sh;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw));
  out.height = Math.max(1, Math.round(ch));
  out.getContext('2d').drawImage(peWorkingCanvas, sx, sy, cw, ch, 0, 0, out.width, out.height);
  peWorkingCanvas = out;
}

peRotateBtn.addEventListener('click', () => {
  applyPendingCrop();   // whatever crop is currently drawn is baked in before rotating
  peWorkingCanvas = rotateCanvas90(peWorkingCanvas);
  updatePeView();
});

peCancelBtn.addEventListener('click', () => { closePhotoEditor(); openNextInQueue(); });

peSendBtn.addEventListener('click', () => {
  applyPendingCrop();   // the crop box is always live, so it's always applied on send
  // A phone photo can be several thousand pixels wide — re-encoding it at
  // full resolution is what was blowing past the size limit even for a
  // "only 5MB" original. Capping the longest side first keeps the actual
  // stored file small regardless of how big the source photo was.
  const exportCanvas = resizeCanvasIfNeeded(peWorkingCanvas, 1600);
  let quality = 0.85;
  let dataUrl = exportCanvas.toDataURL('image/jpeg', quality);
  let approxSize = Math.round(dataUrl.length * 0.75);
  while (approxSize > MAX_FILE_BYTES && quality > 0.35) {
    quality -= 0.15;
    dataUrl = exportCanvas.toDataURL('image/jpeg', quality);
    approxSize = Math.round(dataUrl.length * 0.75);
  }
  if (approxSize > MAX_FILE_BYTES) {
    fileField.classList.add('error');
    fileMsg.textContent = `اضافه نشد: ${peCurrentFile.name} (حتی پس از فشرده‌سازی، حجمش بیش از حد مجاز است)`;
    closePhotoEditor();
    openNextInQueue();
    return;
  }
  const duplicate = attachedFiles.some(x => x.name === peCurrentFile.name && x.size === approxSize);
  if (!duplicate) {
    attachedFiles.push({ name: peCurrentFile.name, type: 'image/jpeg', size: approxSize, dataUrl });
    renderFileChips();
  }
  closePhotoEditor();
  openNextInQueue();
});
// ---- Image lightbox wiring ----
lightboxCloseBtn.addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightbox(); });
function mimeOfDataUrl(dataUrl) {
  const m = /^data:([^;,]+)/.exec(dataUrl || '');
  return (m && m[1]) || 'image/jpeg';
}
// Some Android share targets (and at least one WebView build seen in the
// wild) pick the share-sheet's file type from the *name*'s extension rather
// than trusting the File's real MIME type, so a name with no extension can
// make canShare()/share() itself fail there even though the type is correct
// — which looks from the outside exactly like "share silently does nothing
// and falls back to download". Every file handed to share() or download()
// goes through this so that class of failure can't happen regardless of what
// name a caller passes in.
function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';   // every receipt is saved via canvas.toDataURL('image/jpeg', …)
}
function withExtension(name, mime) {
  const base = (name || 'cheque-photo').trim();
  return /\.[a-z0-9]{2,4}$/i.test(base) ? base : `${base}.${extensionForMime(mime)}`;
}

// data: URL -> Blob, decoded synchronously (atob, no fetch/await). The image
// is already sitting fully-decoded in lightboxImg.src, so this costs nothing
// async — which matters, because navigator.share() only counts as triggered
// by the tap if nothing awaited runs between the click and the call. The
// previous version did `await fetch(...)` then `await res.blob()` first, so
// on a real phone the click's "user activation" had already expired by the
// time share() ran; every browser throws for that, the catch block quietly
// ran lightboxDownloadBtn.click(), and the share button downloaded instead —
// exactly the bug reported.
function dataUrlToBlobSync(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeOfDataUrl(dataUrl) });
}

lightboxDownloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = lightboxImg.src;
  a.download = withExtension(lightboxImg.dataset.filename, mimeOfDataUrl(lightboxImg.src));
  document.body.appendChild(a);
  a.click();
  a.remove();
});
lightboxShareBtn.addEventListener('click', async () => {
  if (!navigator.share) { lightboxDownloadBtn.click(); return; }   // no share sheet at all (typical on desktop)
  try {
    const blob = dataUrlToBlobSync(lightboxImg.src);
    const file = new File([blob], withExtension(lightboxImg.dataset.filename, blob.type), { type: blob.type });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      lightboxDownloadBtn.click();
      return;
    }
    await navigator.share({ files: [file] });
  } catch (e) {
    // The user backing out of the OS share sheet also rejects this promise
    // (AbortError) — that is a deliberate "never mind", not a failure, and
    // must not silently start a download on the way out.
    if (e && e.name === 'AbortError') return;
    lightboxDownloadBtn.click();
  }
});

// ---- One Escape handler for everything, topmost layer first ----
// Each of these used to be its own scattered listener, which meant more than
// one could react to the same keypress (e.g. closing a photo viewer would
// also close the cheque form behind it). This single handler checks layers
// in stacking order and stops at the first one that's actually open.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (confirmIsOpen()) { closeConfirm(false); return; }
  if (photoEditorOverlay.classList.contains('show')) { closePhotoEditor(); openNextInQueue(); return; }
  if (lightboxOverlay.classList.contains('show')) { closeLightbox(); return; }
  if (dueDateCal.classList.contains('show')) { closeCalendar(); return; }
  if (channelList.classList.contains('show')) { closeChannelList(); return; }
  if (activePopover) { closePopover(); return; }
  if (exportCluster.classList.contains('open')) { closeExportMenu(); return; }
  if (submitCheckBtn.classList.contains('pending-confirm')) { cancelPendingSave(); return; }
  if (modalOverlay.classList.contains('show')) { closeModal(false); return; }
  if (peopleModalOverlay.classList.contains('show')) { closePeopleModal(); return; }
});

// ---- Mobile back-button handling ----
// On a phone, the hardware/gesture back action fires a popstate event just
// like clicking the browser's own back button would. Without this, it just
// closes the whole page/app immediately, regardless of what's open — a
// history entry is pushed whenever a top-level layer opens (see
// pushBackGuard, called from openModal/openModalForView/openPeopleModal,
// the status menu, and the filter popovers), so the first back press lands
// here instead and closes only the topmost open layer, in the same
// stacking order as Escape above. Only once nothing is left open does a
// back press fall through to actually leaving the page.
function closeTopmostLayer() {
  // Closing via a mouse click on the × naturally blurs whatever field was
  // focused first (the click lands outside it), settling the keyboard and
  // viewport before the modal itself closes. A hardware/gesture back press
  // doesn't do that on its own — the field can still be focused, keyboard
  // still up, when the modal closes underneath it — so it's done here
  // explicitly to match what a normal close already does.
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (confirmIsOpen()) { closeConfirm(false); return true; }
  if (photoEditorOverlay.classList.contains('show')) { closePhotoEditor(); openNextInQueue(); return true; }
  if (lightboxOverlay.classList.contains('show')) { closeLightbox(); return true; }
  if (dueDateCal.classList.contains('show')) { closeCalendar(); return true; }
  if (channelList.classList.contains('show')) { closeChannelList(); return true; }
  if (activePopover) { closePopover(); return true; }
  if (exportCluster.classList.contains('open')) { closeExportMenu(); return true; }
  if (openStatusMenu) { closeStatusMenu(); return true; }
  if (modalOverlay.classList.contains('show')) { closeModal(false); return true; }
  if (peopleModalOverlay.classList.contains('show')) { closePeopleModal(); return true; }
  return false;
}
let backGuardPushed = false;
function pushBackGuard() {
  if (!backGuardPushed) {
    history.pushState({ chekinoLayer: true }, '');
    backGuardPushed = true;
  }
}
window.addEventListener('popstate', () => {
  if (closeTopmostLayer()) {
    // Something was open and just got closed — if anything is still open
    // underneath it (e.g. a calendar closed but the form behind it is
    // still up), keep the guard active so the next back press is caught
    // too, the same way a second Escape press would reach the next layer.
    history.pushState({ chekinoLayer: true }, '');
  } else {
    backGuardPushed = false;
  }
});

// ---- Load people + cheques from the API before the first render ----
(async function bootstrap() {
  await Promise.all([fetchPeopleCache(), loadChecksFromApi()]);
  renderTable();
  // ---- Restore any unsaved draft (e.g. after switching desktop/mobile view) ----
  restoreDraftIfAny();
})();

// ==========================================================
// Command palette registration (⌘K)
// ==========================================================
// Commands drive the existing controls rather than calling internals: a
// command is "press this button for me", so the palette can never diverge
// from what clicking actually does, and nothing here has to be kept in
// step when a handler changes.
(function registerCommands() {
  if (!window.ChekinoPalette) return;
  const click = (id) => () => { const el = document.getElementById(id); if (el) el.click(); };
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  window.ChekinoPalette.register([
    {
      title: 'افزودن چک جدید', group: 'چک‌ها', key: 'n', shortcut: 'N', order: 1,
      keywords: 'ثبت چک جدید add new cheque',
      icon: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
      run: click('addCheckBtn'),
    },
    {
      title: 'جستجوی چک', hint: 'سریال یا شناسه صیادی', group: 'چک‌ها', key: '/', shortcut: '/', order: 2,
      keywords: 'search serial sayad جستجو',
      icon: icon('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
      run: () => {
        const el = document.getElementById('searchInput');
        if (el) { el.focus(); el.select(); }
      },
    },
    {
      title: 'پاک کردن فیلترها', group: 'چک‌ها', order: 3,
      keywords: 'clear filters پاک کردن فیلتر',
      icon: icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'),
      run: click('filterClearBtn'),
    },
    {
      title: 'مدیریت اشخاص', group: 'اشخاص', key: 'p', shortcut: 'P', order: 4,
      keywords: 'people owners parties beneficiaries صاحب طرف حساب ذینفع',
      icon: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>'),
      run: click('peopleMgmtBtn'),
    },
    {
      title: 'دریافت گزارش', hint: 'PDF یا اکسل', group: 'گزارش', key: 'e', shortcut: 'E', order: 5,
      keywords: 'report export excel pdf خروجی',
      icon: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),
      run: click('reportBtn'),
    },
    {
      title: 'تغییر تم روشن و تاریک', group: 'نمایش', key: 't', shortcut: 'T', order: 6,
      keywords: 'theme dark light تم تیره روشن',
      icon: icon('<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'),
      run: click('themeToggleBtn'),
    },
    {
      title: 'برو به بالای صفحه', group: 'نمایش', order: 7,
      keywords: 'scroll top بالا',
      icon: icon('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
      run: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    },
    {
      title: 'پشتیبانی تلگرام', group: 'حساب', order: 8,
      keywords: 'support telegram پشتیبانی',
      icon: icon('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'),
      run: click('tgBtn'),
    },
    {
      title: 'خروج از حساب', group: 'حساب', order: 9,
      keywords: 'logout signout خروج',
      icon: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
      run: click('logoutBtn'),
    },
  ]);
})();

// =========================================================
// ---- Focus containment for dialogs ----
// Every overlay in this app is a modal: the page behind it is inert while
// it is up. Tabbing was still walking straight out of the dialog into that
// page, which loses a keyboard user entirely — they end up typing into a
// form they cannot see. One capture-phase Tab handler keeps focus inside
// whichever overlay is currently open, and Shift+Tab wraps the other way.
// =========================================================
(function trapDialogFocus() {
  const OVERLAYS = ['modalOverlay', 'peopleModalOverlay', 'confirmOverlay', 'lightboxOverlay', 'personEditOverlay'];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openDialog() {
    for (const id of OVERLAYS) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show')) return el;
    }
    return null;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const dialog = openDialog();
    if (!dialog) return;
    const items = [...dialog.querySelectorAll(FOCUSABLE)]
      .filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    // Focus sitting outside the dialog (or on the overlay itself) gets
    // pulled back to the appropriate end rather than escaping.
    if (!dialog.contains(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  }, true);
})();
