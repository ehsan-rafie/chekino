
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

const weekdayNames = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];

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

// ---- Header date, Jalali ----
// Just today's date — a business tool built around due dates earns its
// header space with the calendar it actually manages checks by, not with
// a ticking analog clock face nobody here needs second-level precision from.
function updateClock() {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const weekday = weekdayNames[now.getDay()];
  const dateStr = `${weekday}، ${jy}/${pad2(jm)}/${pad2(jd)}`;
  document.getElementById('clockDate').textContent = toFa(dateStr);
}
updateClock();
setInterval(updateClock, 60000);

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
const veFieldsWrapB = document.getElementById('veFieldsWrapB');
function lockFormFields(locked) {
  modalBody.classList.toggle('ve-locked', locked);
  [veFieldsWrapA, veFieldsWrapB].forEach(w => {
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
    // On desktop, clicking straight into the due-date field opens the
    // calendar too — not just the little calendar-icon button next to it.
    // Other date fields still only open via their own button. Guarded on
    // the modal actually being open: a native confirm() dialog (e.g. the
    // "close without saving?" prompt) hands focus back to whatever field
    // had it once dismissed, which would otherwise reopen the calendar
    // as a "ghost" floating over the page after the modal already closed.
    if (window.innerWidth > 720 && api.calBtn && cfg.autoOpen && modalOverlay.classList.contains('show')) openCalendarFor(api);
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

  api.input.addEventListener('paste', (e) => e.preventDefault());

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
  calBtn: dueDateCalBtn, required: true, autoOpen: true
});
const spendDate = createDateField({
  input: spendDateInput, field: spendDateField, msg: spendDateMsg,
  calBtn: spendDateCalBtn, required: false
});
const sendDate = createDateField({
  input: sendDateInput, field: sendDateField, msg: sendDateMsg,
  calBtn: sendDateCalBtn, required: true, prefillToday: true, nextEl: channelBox
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
// (or null if the name was blank / the request failed).
async function ensurePerson(name, nid) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return null;
  const cleanNid = nid ? toEnDigits(nid).replace(/[^0-9]/g, '') : null;
  const existing = findPersonByName(trimmedName);
  if (existing) {
    if (cleanNid && existing.national_id !== cleanNid) {
      try {
        await apiJson(`/people/${existing.id}`, { method: 'PUT', body: JSON.stringify({ national_id: cleanNid }) });
        await fetchPeopleCache();
      } catch (e) {}
      const updated = findPersonByName(trimmedName);
      return updated ? updated.id : existing.id;
    }
    return existing.id;
  }
  try {
    const created = await apiJson('/people', {
      method: 'POST',
      body: JSON.stringify({ full_name: trimmedName, national_id: cleanNid }),
    });
    await fetchPeopleCache();
    return created.id;
  } catch (e) {
    return null;
  }
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

// Owners, parties and beneficiaries are no longer three separate lists —
// they're the same shared /api/people table (see fetchPeopleCache above).
// Which "role" a person plays is decided per-cheque (who was picked into
// which field), not something fixed on the person record itself.
function allOwners() { return peopleCache.map(p => p.full_name); }
function allParties() { return peopleCache.map(p => p.full_name); }

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
// Beneficiary suggestions used to be scoped to the selected party; the
// shared list drops that scoping and offers every known person.
function beneficiariesForParty() {
  return peopleCache.map(p => ({ name: p.full_name, nid: p.national_id || '' }));
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

// How many cheques currently use this person in a given role — shown next
// to each entry so deleting one isn't a total guess.
function countChequesUsing(idField, personId) {
  return loadCheques().filter(c => c[idField] === personId).length;
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

function renderOwnersList() {
  ownersListBox.innerHTML = peopleCache.length
    ? peopleCache.map(p => peopleItemHtml(p, countChequesUsing('ownerId', p.id), false)).join('')
    : '<div class="people-empty">هنوز هیچ شخصی ثبت نشده</div>';
  ownersListBox.querySelectorAll('.people-item').forEach(item => wirePeopleItem(item, { rerender: renderOwnersList }));
}

function renderPartiesList() {
  partiesListBox.innerHTML = peopleCache.length
    ? peopleCache.map(p => peopleItemHtml(p, countChequesUsing('partyId', p.id), false)).join('')
    : '<div class="people-empty">هنوز هیچ شخصی ثبت نشده</div>';
  partiesListBox.querySelectorAll('.people-item').forEach(item => wirePeopleItem(item, { rerender: renderPartiesList }));
}

function renderBenefList() {
  benefListBox.innerHTML = peopleCache.length
    ? peopleCache.map(p => peopleItemHtml(p, countChequesUsing('benefId', p.id), true)).join('')
    : '<div class="people-empty">هنوز هیچ شخصی ثبت نشده</div>';
  benefListBox.querySelectorAll('.people-item').forEach(item => wirePeopleItem(item, { rerender: renderBenefList }));
}

// Every tab renders the same shared list, so any add/edit/delete refreshes
// all three at once (plus the cheque table, since names may be shown there).
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

document.getElementById('addOwnerBtn').addEventListener('click', async () => {
  const name = newOwnerInput.value.trim();
  if (!name) return;
  await ensurePerson(name);
  newOwnerInput.value = '';
  renderAllPeopleLists();
});
document.getElementById('addPartyBtn').addEventListener('click', async () => {
  const name = newPartyInput.value.trim();
  if (!name) return;
  await ensurePerson(name);
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
  await ensurePerson(name, nid);
  newBenefNameInput.value = '';
  newBenefNidInput.value = '';
  renderAllPeopleLists();
});

document.querySelectorAll('.people-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.people-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
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

  function render() {
    const query = cfg.input.value;
    if (query.trim() === '') { close(); return; }
    matches = cfg.search(query).slice(0, 8);
    activeIdx = -1;

    let html = '';
    matches.forEach((item, i) => {
      const main = `<span class="ac-main">${highlightMatch(cfg.primary(item), query)}</span>`;
      const sub = cfg.secondary ? `<span class="ac-tag">${escapeHtml(cfg.secondary(item))}</span>` : '';
      html += `<div class="ac-item" data-idx="${i}">${main}${sub}</div>`;
    });
    if (cfg.allowNew && !cfg.hasExact(query)) {
      html += `<div class="ac-item ac-new" data-new="1"><span class="ac-main">${escapeHtml(query.trim())}</span><span class="ac-tag">${cfg.newLabel || 'مورد جدید'}</span></div>`;
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

  return { close, render };
}

// ---- صاحب چک ----
const ownerAC = createAutocomplete({
  input: ownerInput, list: ownerList, field: ownerField,
  search: q => allOwners().filter(x => normalizeName(x).includes(normalizeName(q))),
  primary: x => x,
  allowNew: true, newLabel: 'شخص جدید',
  hasExact: q => allOwners().some(x => normalizeName(x) === normalizeName(q)),
  pick: x => { ownerInput.value = x; },
  onBlur: () => {
    const typed = ownerInput.value.trim();
    if (!typed) return;
    const hit = allOwners().find(x => normalizeName(x) === normalizeName(typed));
    if (hit) ownerInput.value = hit;           // fold onto the spelling already saved
    validateOwner();
  }
});

// ---- طرف حساب ----
const partyAC = createAutocomplete({
  input: partyInput, list: partyList, field: partyField,
  search: q => allParties().filter(x => normalizeName(x).includes(normalizeName(q))),
  primary: x => x,
  allowNew: true, newLabel: 'طرف حساب جدید',
  hasExact: q => allParties().some(x => normalizeName(x) === normalizeName(q)),
  pick: x => { partyInput.value = x; clearBeneficiaryPair(); },
  onType: () => clearBeneficiaryPair(),        // beneficiaries belong to a party
  onBlur: () => {
    const typed = partyInput.value.trim();
    if (!typed) return;
    const hit = allParties().find(x => normalizeName(x) === normalizeName(typed));
    if (hit) partyInput.value = hit;
    validateParty();
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
const benefAC = createAutocomplete({
  input: benefInput, list: benefList, field: benefField,
  search: q => beneficiariesForParty().filter(p => normalizeName(p.name).includes(normalizeName(q))),
  primary: p => p.name,
  secondary: p => p.nid,
  allowNew: true, newLabel: 'شخص جدید',
  hasExact: q => beneficiariesForParty().some(p => normalizeName(p.name) === normalizeName(q)),
  emptyText: 'برای این طرف حساب شخصی ثبت نشده',
  pick: p => { benefInput.value = p.name; nidInput.value = p.nid; nidField.classList.remove('error'); updateNidKind(); },
  onBlur: () => {
    const typed = benefInput.value.trim();
    if (!typed) return;
    const hit = beneficiariesForParty().find(p => normalizeName(p.name) === normalizeName(typed));
    if (hit) {                                  // already known under this party — reuse it
      benefInput.value = hit.name;
      if (!nidInput.value.trim()) { nidInput.value = hit.nid; updateNidKind(); }
    }
    validateBenef();
  }
});

const nidAC = createAutocomplete({
  input: nidInput, list: nidList, field: nidField,
  sanitize: v => toFa(toEnDigits(v).replace(/[^0-9]/g, '').slice(0, 11)),
  onType: () => updateNidKind(),
  search: q => beneficiariesForParty().filter(p => toEnDigits(p.nid).includes(toEnDigits(q))),
  primary: p => p.nid,
  secondary: p => p.name,
  allowNew: false,
  hasExact: q => beneficiariesForParty().some(p => toEnDigits(p.nid) === toEnDigits(q)),
  hideWhenEmpty: true,
  pick: p => { nidInput.value = p.nid; benefInput.value = p.name; benefField.classList.remove('error'); updateNidKind(); },
  onBlur: () => {
    const typed = toEnDigits(nidInput.value).trim();
    if (!typed) return;
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
  if (n === 10) nidKind.textContent = 'شخص حقیقی';
  else if (n === 11) nidKind.textContent = 'شرکت حقوقی';
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
// Mobile "Next" traversal only considers text-enterable fields, so from
// sendDateInput it jumps straight past channelBox (a <button>, not a text
// input) to notesInput — tracking the previously-focused field lets that
// specific jump be caught and redirected back to the channels field.
let lastFocusedField = null;
document.addEventListener('focusin', (e) => { lastFocusedField = e.target; });
notesInput.addEventListener('focus', () => {
  if (lastFocusedField === sendDateInput && !selectedChannels.length) {
    channelBox.focus();
  }
});
function updateNotesCount() {
  const n = notesInput.value.length;
  notesCount.textContent = n === 0 ? '' : `${toFa(n)} / ${toFa(500)}`;
}
// Enter here moves on to the next field instead of inserting a newline —
// matching the "next"-labeled key the enterkeyhint above asks mobile
// keyboards to show, rather than the multi-line "return" a plain textarea
// normally gets.
notesInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); fileAddBtn.focus(); }
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
    <div class="ms-option${selectedChannels.includes(c.id) ? ' checked' : ''}" data-id="${c.id}">
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
  positionChannelList();
  window.addEventListener('scroll', positionChannelList, true);
  window.addEventListener('resize', positionChannelList);
}
function closeChannelList() {
  channelList.classList.remove('show');
  channelField.classList.remove('open');
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
  calendarAnchorEl = target.input;
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

  let html = '';
  for (let i = 0; i < startOffset; i++) html += `<button class="cal-day" disabled></button>`;
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
    statusReason: last ? (last.reason || '') : '',
    createdAt: isoToJalaliStr(c.created_at),
    spendDate: c.spend_date ? isoToJalaliStr(c.spend_date) : '',
    sendDate: isoToJalaliStr(c.send_date),
    channels: Array.isArray(c.channels) ? c.channels : [],
    notes: c.notes || '',
    receiptImage: c.receipt_image || '',
    files: c.receipt_image ? [{ name: 'رسید', type: 'image/jpeg', dataUrl: c.receipt_image }] : [],
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
  try {
    const ownerId = await ensurePerson(rec.owner);
    const partyId = await ensurePerson(rec.party);
    const benefId = await ensurePerson(rec.benef, rec.nid);

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
    await loadChecksFromApi();

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

  try {
    const ownerId = await ensurePerson(rec.owner);
    const partyId = await ensurePerson(rec.party);
    const benefId = await ensurePerson(rec.benef, rec.nid);

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
    await loadChecksFromApi();
    renderTable();
    closeModal(true);
  } catch (e) {
    showFormAlert('error', e.message || 'ذخیره در سرور ناموفق بود');
  }
}

let clearConfirmPending = false;
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
    // second click — the button now reads "بله، حذف شود"
    try {
      await apiJson(`/checks/${editingChequeId}`, { method: 'DELETE' });
      await loadChecksFromApi();
      renderTable();
      closeModal(true);
    } catch (e) {
      showFormAlert('error', e.message || 'حذف در سرور ناموفق بود');
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
const popStatus = document.getElementById('popStatus');
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
const statusFilterRow = document.getElementById('statusFilterRow');
const showArchivedCheckbox = document.getElementById('showArchivedCheckbox');
const filterClearBtn = document.getElementById('filterClearBtn');
const boardColumns = document.getElementById('boardColumns');
const boardWrap = document.getElementById('boardWrap');
const tableEmpty = document.getElementById('tableEmpty');

const STATUSES = [
  { id: 'pending', name: 'منتظر ثبت',   color: '#2D8CFF', cls: 'st-pending' },
  { id: 'done',    name: 'ثبت شد',      color: '#1A7A4C', cls: 'st-done' },
  { id: 'problem', name: 'مشکل در ثبت', color: '#E8833A', cls: 'st-problem' }
];
const STATUSES_IDS = new Set(STATUSES.map(s => s.id));
let openStatusMenu = null;

function statusById(id) { return STATUSES.find(s => s.id === id) || STATUSES[0]; }

function faDate(str) { return str ? toFa(str) : '—'; }
function faAmount(raw) { return raw ? toFa(groupDigits(raw)) : '—'; }


function statusButtonHtml(c, st) {
  return `<button type="button" class="status-btn" data-status-for="${c.id}">
    <span class="st-dot" style="background:${st.color}"></span>${st.name}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>`;
}
function eyeButtonHtml(c) {
  return `<button type="button" class="eye-btn" data-view="${c.id}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  </button>`;
}

// The message a person copies to send the other party once a cheque is
// confirmed registered in Sayad — only meaningful once status is "done".
function buildReceiptMessage(c) {
  const amountFa = toFa(groupDigits(c.amount || '0'));
  return `چک به شماره سریال ${toFa(c.serial)}، به شناسه صیادی ${toFa(c.sayad)}، به مبلغ ${amountFa} ریال و تاریخ سررسید ${faDate(c.dueDate)} در وجه ${c.benef} با کد ملی ${toFa(c.nid)} در سامانه صیاد ثبت گردید.
${faDate(c.statusChangedAt)}`;
}
// Rows without a receipt still render an empty slot of the same width, so the
// eye button lands in the same spot on every row instead of sliding around.
// The slot is placed inboard of the eye (see rowActionsHtml) so the gap falls
// between the two columns rather than along the table's outer edge.
function receiptButtonHtml(c) {
  if (c.status !== 'done') return '<span class="row-actions-slot" aria-hidden="true"></span>';
  return `<button type="button" class="receipt-btn" data-receipt="${c.id}" title="کپی پیام رسید ثبت">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  </button>`;
}
// Receipt first, eye last: the eye is on every row, so putting it at the outer
// end keeps that edge straight, and the slot a receipt-less row leaves behind
// falls inboard where it reads as spacing rather than a ragged column.
function rowActionsHtml(c) {
  return `<span class="row-actions">${receiptButtonHtml(c)}${eyeButtonHtml(c)}</span>`;
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
let statusFilterSet = new Set();

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

  // status — any number of the three may be picked
  if (statusFilterSet.size > 0) {
    list = list.filter(c => statusFilterSet.has(c.status || 'pending'));
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
  const statusOn = statusFilterSet.size > 0;

  pillBtn('popDate').classList.toggle('active', dateOn);
  pillBtn('popAmount').classList.toggle('active', amountOn);
  pillBtn('popPeople').classList.toggle('active', peopleOn);
  pillBtn('popStatus').classList.toggle('active', statusOn);

  filterClearBtn.classList.toggle('show', dateOn || amountOn || peopleOn || statusOn);

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
  if (statusOn) {
    const namesHtml = [...statusFilterSet].map(id => {
      const st = statusById(id);
      return `<span style="color:${st.color}">${escapeHtml(st.name)}</span>`;
    }).join('، ');
    chips.push({ key: 'status', html: `وضعیت: ${namesHtml}` });
  }

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
  else if (key === 'status') { statusFilterSet.clear(); renderStatusFilterChips(); }
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
const filterPopovers = { popDate, popAmount, popPeople, popStatus };
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
  if (activePopoverBtn) activePopoverBtn.classList.remove('open');
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
  input.addEventListener('input', () => {
    const q = normalizeName(input.value);
    if (!q) { list.classList.remove('show'); onSelect(''); refreshTable(); return; }
    const matches = source().filter(x => normalizeName(typeof x === 'string' ? x : x.name).includes(q)).slice(0, 6);
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
    // no refreshTable() here — typing a partial name only updates the
    // suggestion list, it doesn't filter the table until one is picked
  });
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 120));
}
wireFilterAutocomplete(filterOwnerInput, filterOwnerList, allOwners, (name) => { filterOwnerSelected = name; });
wireFilterAutocomplete(filterPartyInput, filterPartyList, allParties, (name) => { filterPartySelected = name; });
wireFilterAutocomplete(filterBenefInput, filterBenefList, beneficiariesForParty, (name) => { filterBenefSelected = name; });

// ---- status filter chips ----
function renderStatusFilterChips() {
  statusFilterRow.innerHTML = STATUSES.map(s => `
    <button type="button" class="status-filter-chip${statusFilterSet.has(s.id) ? ' active' : ''}" data-id="${s.id}">
      <span class="st-dot" style="background:${s.color}"></span>${s.name}
    </button>`).join('');
  statusFilterRow.querySelectorAll('.status-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (statusFilterSet.has(id)) statusFilterSet.delete(id);
      else statusFilterSet.add(id);
      renderStatusFilterChips();
      refreshTable();
    });
  });
}

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
  statusFilterSet.clear();
  renderStatusFilterChips();
  showArchivedCheckbox.checked = false;
  refreshTable();
});

renderStatusFilterChips();

// Builds the printable report from whatever the current filters show (the
// full matching set, not just the page currently visible in the table),
// then hands off to the browser's own print dialog — "Save as PDF" there
// is what actually produces the file, with no extra library needed.
const reportBtn = document.getElementById('reportBtn');
function generateReport() {
  const all = getFilteredCheques().slice().reverse();
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
<title>گزارش چک‌ها — چکینو</title>
<style>
  @font-face {
    font-family: 'IRANYekanX';
    src: url(data:font/woff2;base64,d09GMgABAAAAAWDYABAAAAAD10wAAWBwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGoGAchuB3QgcsVYGYD9TVEFUgVQAimAvgVIKgrRkgf9bMIjrfAE2AiQDlBQLigwABCAFkHQHvRJboLZzBx0iKsMampn51znEJJ+CUioCniEL0sbwE84CWtlm1dk1PHk8aaut6BF02xZ6w0hvVrciboE2Zf////9LjomM2SV4adIWLCAIqur05x4URiW5RS4FOdXE3kqCiYHC2CGOJgNearMBDeM0xxxD8TjmxADbKYePtkTNOTvXc8Z2msZcM1vaZ/OAt3ouOWBwWPbLFU3ejhjvsub7Yxf9I9QrD5b08lQutPOGcUf/et20+tO0AJU3XOMHSTkVcZf51Sa86gyHy3BTN6qXkpMkbEjK2wtTPFMRn4dhwijfxIkYkAw3Lm7GZthXWJ09iZ3OO5VEVDu1RMd9aQ5yE+eFlPdhy3WERUTp+xC7Nptpi5m2mXXd7r6KhpvZZV7Wdq39E1lc3PrKioh/aL/C/YxxEO7Y0cuvSvyRcjC1MEhJSQoqFJQn8BDLzOP1gS0eyGbCpFH8UvwR/DmrZcJAWUUBRSV+/IgA2USZaohPhiUTQWE3cSEasuhBQ8GZODIRPcJoY6rZF34xqW9t3g0rO+bvwcy10fNJjAku3GCriURhk1iJZSsqK3oKmiEl2hq03CNFl4/ykuzOg0+fPCRD+9jw/9p+vx/VrPOe1ES9775f9K9K8vDaM0SRS2s4IKSbltnhMCezyEVukkdf+rF+EsXzK7V63t8DkthArChnOhMESOaAAkR7IUDFYSJpn/88399+7XOvh2d6ISFJMs2pL3zJlO/7vjlJkjSZQ5OQKeaSJpGhSbOkYdIwo8JHMqdx+P2afW94fm69vwEiRmEleoeXiFfxsRKv9FI9vbICsX8smr/6S8ZYBSvoBS0tGQcWYcfwNFX/nYDvdEw6MduSCWIH27QpEI0a6Zb8EfHvGDtqOyyvDZCTGFDD87r5f9iyJCgj3Jt7k00ISchYkEH2JIMEAlsIiIypFhArrjlR268W222HHdO6ql3L+vTrD7hp/0LRQlsquppM5c4r28n/v2e6fztRo/zdF7W5dtIpVbRFPBADT0iIcTyt6c/TFbs9MTgBDwGiwh6W1qkYVUu/57ffd/eA9DsVv6qmqagkFYs74Y6zhf9qv/937e6ZOfgI7ScISjohFB7YqNt/Hgkf5eIBy8dFoSMeH/6bq/9fMDNtSjvWaIAEDyHEdmmkohUzGybX5M9V3jsiwqOxhEUI7cVlrid5ra4l0eR+EgCHUzPjdKe3b8jOtOWdRD83/hYNgkt4AcFF/O/L1b4qQauSRTzwfYRl+HZ1O5GkR1iyHkQkgVs3chK1L+bpBJ8H802OOq+uPpf/EUMV7NL1qfKy5yBVSXkAmMVZGkKzbEmWbVm2DDi0r2mO7ZAB5NWhghek/v/rLO/TF6AlI8gy4IDHA7hE0O2GuExTpEzR56SiqqQuJxXwpSd/Uas/IZdA98wad8ZiJM4eQniUwCLYN5CbFaZWc6iI0ylToC1UoILonqi+1kRGvSIGBBF2hyJPMAos8VASC0MOZNDwc9b3EPIC5ZkFmv2M6pDcCXvC72wOHaAw6489AQxgIW0DL9e7ve3yEP0SZSPKm5yJlxXR+s6j3RFTiENcSmtPZfi8+v+CSiGFhi4fyN3fzXg53s2S6pun1QBYflBXaFd1l5JKcogjnZmUVNltLWOAZBmSB6TKZz9B0X9N1B0Y+EBm0JHsJxPszD5BUf5mzmqO6e0jSgn2VVoAVh2l0cSWc7bTbnbm4P8/W+lbJP47I+CMoESQsc23Sn0cxcoiR0DUK6CBgdMJjOnd37/CAccR5q/5/tdl/sZQtG8EDqAlcrXpN0cL56CysxsoJYW0fMcKCB2gIwvI7vTpt/aFf/889O4X751J8mh3P0EBQbHQ5CpUdWVyUpCy1pADpoDfj7VvwBOERKMEsURWOzELud6PBv7/46Dd82YW/lIUxVECwVJqAcMGZEMCfIcPAUTYHaIThJZwoOMAJM6bORd6nDNuKvNfqlbXKoCkSIcewrTH7ExOpCZKE+6fkixzQkzvvu/V/1UIVR8gWQApsQDSYoGSmwBEGwWIEosQbWSBYBGmaFqj6CTbI3dykrzdtrsXBYgSQEptgJDaotjeFq0J9uTodie5gyfkfNqkCSGe+rjHPRwnnPd4D/G4x2u2f5fN0oVTCLNtctSy1CvK7J9Mco0qfH8e43BYcJ6HVUsOnq9VNUurihVmW+I65QhbjVs3Qq6RXdlD1uR2LMVxJWevgrs4bvVz1P+jplCP+w8qxzXCgdBIhXDA82VqmS77zRBF4M7jR1c4x+jOSwySLUZKYiWR0N3E1uKju+u2gZnaxfZ6yEEeK2cjauQZqTaIFMrHVwIpY0wkH4TKVPd/a6nN378/sClNwrK472SFuy3qRrjUnXC7c3P4d0I02QKQDk54i+jqUEgg20oVXwpi6XRmabY0DYpBCFPq5+hFoSJjTMbjsBL4//97TVPvXqFuAQkG8BA+/KAprVNrlsx0wzEdC2fNP8MvLMpnooqRGJlet+X7AmodjwKhZ1Fp1R3G4eD59BR+hHWrXr4tGVwGVK7xDIrLYMCONNXNzgJ7wXW3cf+/tVf7jYzw8dETAimWQqyghParlndm37u7/5yZpwpsazwAyErZ2jo1s0FZGxfhG2Fc+ef9i+STbKGCNynIQ6/IeGWwKRVwsY4fP451ceOFbi6VNnEEU4jt96cbggxLGQt9i4qCu3lPlj750bEAKaLlBZTtRqABJFKptdPNNkDr6667x2GAgeeaT6+qrpTTJKXRqZQnpH94onO5/TGlDVsyTQAkXUjKBXQFKPMCkPYdwbT/KdkH0rUhpZW59f9FF4By7gDShUylUtqyta0tY6Y94x543k7kf79Vf5cUKlCzS+NNaWR3y+AVlhRoMKChzv//td/n4SKZ2O7wzj7gJRMqF3x4EbJJsgTpjSIiUVcX00YMRPx7a9/RTiJBUEYQ7++qYJODJib3fPsbU5SqFOdtNloUMlDxDG5apaRTvE4YfgjqUv2KJ7jir9oqVpCG31NAzjhAAUmnTNhCkRrzxi5ovTwmioCn7evz55ST5Gu7ecsqobgUIo2IiIhI0TSd5Wv+7cV/e44s/tyO+PpC6bLQBTkTEREREQkiEkIR19+ZW/7/o728sz1vfb9dFJEiRUQkhCEMIQhlJWrTgOvf2CVFyZScxPc4FXEaGPAJyYpKjnue//1kbAtlYDAtyIIYH2N8LoeH0WByCM9vWPmfQnbbZnqFQYpIcMNHRNw7Ow2pva8sM8g2jSHvQCQWTSixMfr/kUs/L+mx3TK7fOv6e6MURZGEJI7uuH9kTd9HULvZduG7/uqcVRRb6aEk4RTCJUcC4rH+yJw9z/lbvUHHLa83FuU7ARE5iRghkkfyCJGriWxVA0PWembfFzHW7eDIUCLc1vhCLASD08AMBr09hImzZuUDekAFHLbaugCwroCDoi8P5p3AO1AgDxuuCJ7WIWTwgnBKP8LTrERkkWGMKVUHHHNiDhDzDv6n82EzdJEspoth3aYVINUr2VgBIDDAAmAZgyTTVgulo4qYXiUwZloZ7WRYVJ40m1ItMmxGdTAWQcAmV6SSlapsFVAOCQFu40M2YNO2803Ayj9tKz4gDAhAbwO+YazgCriCgsivN+qB+acKFJzOycXN022cxZdumigFEBQ/m5JultUxRh06yEiHSzLSkVfOSMeiCgZEBHTi+wUeZUKLaseaj2+vU2yDYoVTG8tJ7RCI+6VLWekGqE0EAqsgXFxqA0IwJAOJ6pg/gHvwO9IGttRg++QR7Ug/omolGb8PBqBxZO/SZXJS64IEM+5T5Mba/nTJGifQJW8u/OBT1gmtQeKA29q6rKrfSiBzSconba5t7ANCBrx2MOLPII80gS02260uUXdyjGt9PS2rXkr5pHdE7HrMyugsllKbLZ/ppM2nvEkKN7UmXxa5eePFylXH4TEXDZKF9IAMjryg7HDokNkbswcnO9jslFPRLEG6ZB1TCp60qFu3uezrEwA3g5B8FGGydSmXA0vGi9u+5HVJtDNGsSa5RTwXGt4/U8MWnuQzj7rkMVxTKr8qqir3JMDblRb5kwH0uKuact0oqarOzv6TH4aOVGX8mhyQUIB3sQP6+MxRE4s6Q1JZWfBFCMLYMq+bJgntu6dJ25urmIQEMW1nOyfETLkkjcweniTM/8EDQevisCKNe5C5Q0ol4bBWH4YitrI2kWyy/Ex5JIJJVRhO+pvehvvtMPGwiTnFwxnmNpmlbKb43Gcoq2qKwzDRpLR4HymUAjwJozdoyFD5r9LT8BBNqLoVWzlRYRcHRqgDslNVg7xCPLpKUsz6tC3pF/B80FxSCfuN82r64J4zkhXCIhN0M9Ng15H76RuZx7ogISyz+Z4385pCzCcRulJLjvxRzmTIHIlSoUO0JMdJKa9fzE2y5rFXGX2oNrlhjryRYY9R8UakUIbUJP0m9uXIo8xLpuQxokRtGOJ5psom2pOyK9VVpJUexxwdzSjdtllJIUpbVt6vlerowRFt7KucIc9FpaGk5B5Jp2J4gnlaZXsoWjgkKRN9iFbKupfEpxqrn7BKLPhIhB6XuQhote31bqO771IObtdV+i175h8Ju6a3z7Vhy69mqLiwh2iXLpqMsma5iOyZQpSvp1VTNq0SMQDZR2Sv9rfVjypFQ0Gk6MFetJ5D4IbIHmaA3CTuqpyMGJe5JiNGYnDeeyCU8XsPFvwy4TQQ8lKrWW8w9PqHy02maKY2f0dF/N4L4CBaWWXHouGlMJg064NZQl3xmGoQj8BVm0lkvhBuNVypci6TJ3QCDxHWg0LW9+thYp66IqAiMmQPiXnJWh06RhTnXs/btXkCZCBb8gxiVfpCJEX9Pb2LgqdheaXQM1v/FX69uZ6/rJT6gsMdITbddNQ29usXy2yUwUPKvWi3Uhiob+zy3cwfEq2QyRrEjhrerZBMGGYoh8fumOfWcoWuumU4EvT5xshSf8k9w4uNe/YKbeaqznSbVwUr2D28QP1hyoY1xUXRJp5AKJzdco6DHMImwmbyJNWtpK4wwaFA4b3rcK7PxiMJ110Yldz8KPyCDibv28AGPhHlsKxHokyZeZYj55UQJd5E+powU5cpJk75FjKSupI2UchHP3zFWaU0kB8J7lXrh9ol2wxWo4354gx51geTiedZO5y2/sVEGPLg5EHorrcLQv7tXVUiK9TrMbRU8DCUX7nWTwlZ5SJh25BbYUxuPu2umrezlqk73zOvDRxwuFKdvm9CQDc47zhnlLZJYXZ2nSfMEbI0jFKYWukLIkzcy5zFXY6fqmJp9oTGLF/aHXlUVswoyfXUTQlOqPCTlzq7SG+6ID1lW906r+raXk8hBfWkdml0DrlgLzN0E+631+saGzMBDToI7HadGkw3COyKAk3cs7mCA5TWPDLJO8L6MaZDOtaQ6tmZcUHONARZsBTu28jJP+8ZjtypN/lNP7p5FQnMCDd6Xk2dnx7nG4WbLtN6ptMO2ignrRQpM6Vh4dgQtCPtApV/Sioobm0afk/uB2AvcN9/Y1MOBrjhYb//NPZAPC1/y23DSiQL4YhWZLlF32KYCPgv1GFNoeVSq+IWtcAhRmDwrWn83tp2Fdy0QSUJNAxBHrJpkrPYakWJHpayVVcfGJ2WMIoeaxrb8zxRSVKOPYDYXOIQB8QNTOeBqHtAQYfzyY/Gy3UJyrd1SrvP7wf8PXhEgXqeUlhyGatLXBZ3M4RZfVDXN646UyLmGcIAkmGiz4tvvQpP0E1h2x39W/Q0p0qW1NQyDlUbl3rKfe601Do1SmyTzjvXDWlfyJOpZwUJHsLYiLzzS+bRhJk9m1MmpvC4wLO0SMAAsWzwodbPY1H/JdbIAC+fJGKn5hKrdbm9SBrJ0WmvFuWymEgpbKol3Dxky1RHJWBAPDmn5Q8XlEc+BzQx78yZ+mz63Q/SbTiYChxyLLfNWzHGckEtnHLG0/YMufIha3mQ7UvKSHePVr8+uyL8bJIJfr6eltPEnGfROL3J1hvkyu0IT+1N+VjCesy2ed7gCDkaRajgyk6Dj2UYK2I6ZrNEuY3N+/xx9NQdyiMKiHrq6TAzdue+xiQ3rPrStCUavHNNEQBdsY8t4JCoZXvI4ZQ2rKcSKqbQM42GJDvyl9iyxNOS/keuANid/rv1SIdQZbD8HjnZosA2L7pwZAWoxUs6eaw/maBNNyNRXUvVFbog5/JoUa6eO0WfHjHosg26aK5NAy2WvKRE8FGRa2N+DJH3oDXiAM0ECV1QIs8pKP5eeav0BCwJWaTNyCp1mK3NlmEt55mkhjD5hyIbSR/ZQ+FxERiHFVRRAN3TCHZ957WMvtyee0YoMKf104HYolDQVrpop5fvTmBnHtbtvtEVpAPWeB0PVwYdUWXHEdJdcsgKwyI9C/dJS3gOk8R1tIWCzmCfnnVdD7W4OiOpRAyhW4zLC0TuTEPfdkfvNKw2ImkI3VbyLUyEyBJNqERQpK00geN6g3P2jdxjjUcX20SFgQ5ZVKG/wxp4iploL0Ea5FIsKd0wgobzjj0xrT3DokeBcwFhQH3NzZw3tGo7qAnEIR9Ex9SdD4xRpYSj0pjbGeSjvFZcokgluJ6TGDWYiVkMFpSGFwjYXScAUb8TqGjLch40ADnVTAcdKNzarESwhELjadSq26Zw20bJjmaaywxWAbDG8t6XdJ4a81RgaEZz6zClAdG4eK9l890MhUDJuMBLaCSGaSxXiyWoM2Dj9lmFh2kmVtl65Lq6eg6hW0mFpwUvWy5ATDHBWvdZoAcn7hiHgHipMrM6OX4C6K7rbazbU7K9ZBuznei2s6iYstGh70KREOwH1B9lmPFclw+yirA8qv4/521cF+0MraAhjiy29TRJaLSCIkJ2VN2haj5/8PR6ZsHatIUZZeYkTG3Tzgk1/FHvlnCwjyhJbde4hmN9GxM90rDQ12+wTiIxRHdJl8gITY7pp0iMNWxYqsmkHOBLHv1foaFvuMXNU2Yvb7O2AmB1eliClrTxbBOjjt3Vy3oARehnRSU3zGdwakssURE/q7F5rrnrWcQZFl2HBwk2OGhiBKDBpUyXFlGl82CXlLSFoRTtfHhqsy4t4H828gU5UanfuEZq6DyB/bYJM/Utev7I3Uh3+s+4EYDXRMy83D/+HptYbiY72mSVFTq+yUBA5nbWpWrbI4qVzrWFesHgiJR4JCh9Zt9CSwyuq8qeQJH/xXkQAoUai4bNNOLxfo9Vsy0VHYILagMniZYDVOHEtjHnvd894mimLuv9tYuWO/O0qh5aTGzC45BCLgrH5KTusU2oK7OsmRcVYjcKys+XrIKS9Ey3H66ojfV1Zd+s8pywrTF5nFVts1mhmQATuhseaxYQo3ip/692hDpiw7q+RM82iWhyQ/FJlDU62S+d176pUr1LHr1r/qyNghw52BQTEUC3rsR2c2jpDIaBS1aPS9Y4EbbhBNZRKQ+lNtNzwVASMi1jq+4OyNAh9rFH58ZarHPw5hycCc8m+4KSNFQc4uVhdOcyMWGzrywpfvagIoEEbXoF9ZiLuiLwyPDnKYlCE8oq/WE1YmudDln43bRd82yr+0PWwecwjMwRQrfIynv7HbmV+RuUcBKphfqeumwFy9teutzqgD+g4BHKqvJbJYxe/k9EcllqqBjA7waAg8WTfUk348uuEKR7Zy+bVl22ldKSWBvYVSudHKGK8+s/qKl93VMAIKUCusdUb8jJxuTceH2+R9Pxw0AXc7G0RbpkFLX0SEgmoJ2JcZTornf7WLV4kVCRdL5ndRIFa32jUNGTAyOzaSUAZetBLSplzOe2fchjQWytP3FWd7HLQRKRDmMDQh56r70AaywOuo50YdiXJQ/SbqOtyRIqlZmtQjy7ineWowowJasJNxctIVuc6JHOfxv0qqFe8QipZ68tP7DUVusJgzCtRK6iKPwTksTXKWf/gcorAWbN00E7xDS2PJY0kfhhftEaKqxvHv5jL7m5ALKoBgdigBdHFV8fCQC0+HYbsAisklPEgwPQKcXzTrq5wOSaZ26dNw3X92Nbnt5+dZ1XbdB8kKNc5Vb2zVypl/c4RIWXtJTFmW7/UryMmroldus2i0dwbIJozvh98fu+cVgV3GLDQMDEUauj9eCa/naJJSGnMLHUQVu3kwxF1bycd0ekVB5hQkrQ+yerXwjamB7estnHKkwHu382nLEv2Y7rZ0+rYjjWiQTRp3WWZ9TipV0LANvm08yx8J7HEXn2x3Q3S/6M8+6yl/H8Cfq6hKj+WEV6D/lVsBEGvXV32a9w5i3wYP9+vxbC7dDE4Lx8bVlH0obJru9MusPwWIWnEGCDlMGQfWZuq/zSzXKXcEfV5x49Or9tR5WHQ5EiwP2jwOZTtUtyU23ibDbUfMXGFA1wz6i6f8xd2E4t593/gSt6Mmz0YQBq/l7cDqeMNEydyahLDqo7x8RxXmga9xsNgnY+IkI3fqNLl/zEM1I1yKr2bQAayrOEKGwRUSZ3tr63Scc+4KIJXj16XUUuhlakREE4xqFjyXkFGhAmjNytrvkJrClTd36zK1SdK0xcFLucEc4FS+rlWdM7bLRISk/HtB1BipfcLSHgRBO0esgo8wXvUXc02t3aEQpQD0MLeKpHg0eqCVTvYhZK8UlgkW06TIJK2FX5N4Yce1pqXIEGFZEJ6rtYJLrEHD+Tok4sFGdWWc0w1e8C01RDNnSdPbVYwCu0jbrNAZzF0co3/ikQ3cUBfhdsVG+13l2hrWwdoBozYU+Bt+fxczqYflpDcaP78YcooJRSe5HewEAqw8q8fEZk/OqeisNtiPW2Rd3rE2M91N66y285NBQEzeW7bh6kVqsIgRCDozHrTrHBwqezi5WsVsDMUGpS6bvNCDKhcX2o8a4ePSvGT4B1tbLJRVOPsIM2fq4qISY0QgQ8VL3QMfpdDgfw9G3QVm0UzfuJ45IZyM3tHAsrT1Q88M79DgQsLQQDLRIM9rQImeWIzmrymhMklGluYkuHDwkYKx4yNs2K9XpYvAHEn2rCOzjamqqfirCzIze7PHlTh63erIyRKvk6VHZLUgqXGGSt7vrYMjxQ497DgEd9jKfhsCO0GSiRhQaNSnRcrpjnQDOuGI+UsC3kIHLZHKvCrjrrwI7o3oe1gGDhBF6xNXtL7yiGUu3Xsk7MDa0Pxchg2d4FoMP7XgqmWDGLu4B0vWFno93GyqmGxfy2ZMll6It1HaMCmx4XwCf/yXoLsvMFJ27ffntKvCzFGgP2yjz/v5ZvBMiVZVnG5DAvUYtyQegpl3RpRIAdLGtkDafFeopt+pEKANcMLXbuUbML42/1Op7APLt7VPQUAMUjALrZRXYV5J1gyJT5hFlfMgc3H78+3ELLpc7yCd4VbFoaVKa60bqtpN9Rtw4YYz7sZ8ydHElIQUQ7xzZU8dzgD0Xvk/qf2+5+8b/cYUfuc3f4wx0PvvzLSjtK/0mR42EQ4hOCFhcwD1tOvMVLG1UIG4qWWRNkwFFnFuKJL8GEEk4kWHCEcT3RpJ9B1NnFIgFJBxrUCEU7zCINZRpkoA5aOsCQDhTkxCvbAagC2uhWDSN42zLQAjc0Saut1XnzukRcGGgN/U36BR7MJKVZ9OsCWZPgO8BsOsAcaGfwvEns7eJFtxSfITbvxzNv+Fmtf66xl61B++CaAnEeXOuPt/6nD2jqHVoRBNQcS6aDp5A8BvZy4GhDUA9kwMcdqylcHLRoI6sDHh5GjDMYBQvOTgUJmAHmW3jDJTUEwkI6wOKiXatdh9e7QwfwzXEHQHAqeG9pyjgU5g7yUi210KIcyss66hp1NWtmvezzije1kCs3ve3ixtvSh6lESSBo4CGAOoePHyKMkFNoTFcAgoMgIaOi252NqQQXn4DIxmKd8nHPVdZlXgfS1oA6APmbXOWLHrx+Pf2yz9g9Gez50wwKIxaiFPOsA5hjyEjsHxZrXP8zcMJ0aUu9mFfapxZUeD2nLZsRHZMUmYtZ/ZcnrdX1kaOmRD9V+AQPyFsJpKeFe2boFqD8O6MCVHcaZ4lSYVoAzQ12Wr9aXsrSLUpMlBYF5Z4l1E2XTTSONG3H/qsxudUpiH05ZxBBZ6f31xmcfaFTSV79BKGWnxfaBeLPi8kyn6Npf2HAEIQcsbpKadmnVr5QvmiXr+gWd2WQdim8qys8l3SapfvUYjmgpl7EIJ0Rc9Nk7sRjDe6aVf7cMJCvNgj0aCGyXdAtnbJF1w5cN4D81RRm+2Fg/mEiLnfrMC2AlS9AhBC9B0xaUNBGx5hZrYOF18n56IB8R7vkljvA99zlBx7x794TwqcyXvVbSBQeVDIkIQXZU4iwNmXD614zhpRLff+ORSAwZZEkzwP0AGx8AYDNhbdSKoqsQYhsew7ANuxU9HgSJVrkgn90nnabHgB7ERJoSF5MA5BSbj8SAGsM2mwHVgHOu+bSqR27P/JNPWZeGG9ys623TiADE0Lbnu3Pp5aXZymFO/nlbGIRMd8N4D0Ic1bi/RUAJDMMryvjyQGvs0Q3uH0TSjxLACCdPQCwoNnZjVIo+3rvVjel2Hbd+Q0YQH7LAICQ7NyDfWRKj6fFbHAvPtSdgLvJX/pwIx903dwGvSMdojxTj+qfevZpxqM53c/oy/36XMs+TeVPa9zpAgB/QX/ZyAwXmue393tn/udV6vbCSmuxMJPxy/Opw/kvHi550X/NJKKT/7HCNAmLAUQbQOQiA9AT6YEg49yKAIA0OyUV+leD0c3s1atN9169F/5hzSjf8K3587Xlj9eR19eN3B3j1fWkZ31tDJ4vZr4rTYfY9DTubuj6kvzNRpDaSKY2nh5+3ilrYU3Iw8ZeSFo4+a1NoSC37iIABDvOdkuyy0ygFDI8o4qvdiB23nvDW5MX3QDYC/t6w7bTLXKwItaPob0BznAEdjfq547EKMp7GQkW/gYA/vNeoji7sS2qPXVvt+/t6A7EtMF0ZDTYDn1jSAN61usNS4k7/ocbD/cnAFDeIdwMOZXO//HUHzM1YqqcNjM0v5MZAKTHJsV/W/l4WsG5remRqgvcZTEXP7VYYgpii5mTUEpElG8zXUntm6Z/GzEN7Q3JmZHl2yzvCkvc4gvanoqrKSm/EePi6+iRqbscjlJW17IUrRAYtUais1qGXnDHbOW9DTYbbI3TL3baa2X86UI3wBrYj4lWM2pRDPHGcpEk+kKXRa3zjPbDsWZArJ2RwwxBlahErSBNFUu1GMro3GtuWaigkFOvfI1YuDBQ2RytslC91Bg2LsMmUawXX0tboRYKdVjdhYL6E+y6E8UGJ+BBRAVElqMaa/eSKCItYELzjFCsalUqOStXvXZ2iOXEztnUTuk4q6RvlXz443L+afdqzNl/XAvvCIqMdQgK3bPFPfcd4CzhGZjMe+w5MwsrGzsHkZOLm4eUj19AUEhYRFRcQlJKWkZWXsG6krKKqqKamAV1rwkaZPYcYrS1dDR19Rg9dUyjT481NDK2aOLUkalNb9t3yWvgHW9d5poigLPzATpJkTYebsScyb2DqvH3lWCEMAEAY5wXR19uIFXJTFUpV1lF5wCLntnS4lvvjdhSOZomDn/X9sdkj9vjQXFQz7bPbgLSwQb3TY9f1gZSiQjGmA472MMBM+DIiTOXE8rPPWuskwGDo6FjYGJhc3DKV6DEDbc1uadVm/ZYhBtJGVgEDZptTkQWlKFMO2pDWVs5jBW58qKv6xtOob2dAJjgsgkgZvIwMifY3YWzU4v1RsUu+98euPxTOw2dwhdFlFJGRadBQ6cDuE+39Q7CAmqN4iNA7hgA8sL1GAiARorx/KzXEKyp27VPW0WXCx1XFwI4qdccWMG9rkagCTKdb+R9mJn7KZm5AWAp7/8AFI4BoGgMcHASIfxamZkAwPZmJQ4At+UtgGLCAcD4t4qmunpSiraUTrIWWWMBOgBw/dMeUvr0rUtfTWx+sYWtbGM7ZeygnEqq2NW4HNr6FawgV7nBTWsq2t6lkdUFL2NAAJ+uVvBxI657VM2ADdYdkukQW+J6JZmqrKgTksfVuR4A2/zGKAkLoEU1naoSztMD47e+7WNAgsB+wRjdJkd6MFnTA5ToAUIWwNYxAGQvfVvGAH/u1ZUO6UFiMqqWcP3VynJsmftiG6ATYCeV/lgGEoJ6lkBmuqFKKXpgM8EBUOkGoxsBo9Gklx6YS8C3vmkMAJtpQdqQQgXSA6AKXWVjgPZMP2iq1hvpq3oM0GWF4W17Q+q0VWPmB8iXo2JM9YadaZkHX4GINXqz/n7HGGCs3o/A7tZj3HUA6EB/JfpM+W/0/TL9iq3MdE9L9bwrfqhwStVTqEh+7xbPLJ2NTscoq3zqAFRJBaYA2OKJz9zOCbJH7p7xt0aytVKkSpOHfWgeGDiskYbwdqPwh6H5b7x82NNIhWnUZrLu0Zy2mZLIHa0CMus0tmcLwBgt7HfTVO3Rau0x7eDoaE1gmmbhbkvk9dAOdxeIdLdw9wp3fyIvuXa4h0GkRzK121lPNQdMtYi8N5P3FgreflLwDuXkfFjVUh+HqT4BoQ5PEV4hbvJ5jDD3LhlfVrf4uob6Nk71GERwGTcyh+8X78euUviFyxR+g6PCX9iUeYLSk8r8k9K/GPyXwdPUntPgPqPHqv3E6BdGvyP8AfUXzD+8VmCeQD2FesZvW8HLbxAwcDK7lLCEMgGe4htiKtDHdOiiwLcgQgSuEQkxfSlTTZOufpayOmaoSjvZOl7I5VFMn4q69A+ZGqQywy5F0ZA11Ge9rAZCzYRmEGpDMbvJ1R+Fc9BQXc5FoRyXXEuWRcfvtFDDbEdYMdtoyUiTgXSmnU1mmj3+NdhOkSOyYSuQZ9nq8OF7edkgQ+dlwdQvidoddz3w0FPPvPSqaqmqlc7+yUTd2TNHiXjEIz4Qf/8In0EElTGmqQiczbd8vpxMSvFs1lUKlZl2VK5eQ5U5tjKv7hseirosWpc/dSqVymQym43GxsxZnTPVGo2mJltqQK/X00CDoSFDilpR5OUVuVEhP4Y7j6QAEwHII7pmcClIqIZQLbB7ikwY58Bi9tPU5j3tqHz35TKeWMxsJTntpcxZbZXW7+7L8puukpnNuxpwy737xPjImzg5O7E0UNUWb2O8O7AguhXfd8gJnAalrOv+adkZ0GxOc0Q5chx5iugkxVCUVFpacKg2uCFxzYFOVHbQQ+LiQ+UJoBhNCZdICcEEkxgH4G8J6iNXqfpRncEfVIRkzhUcVOAsss5EBmm2+SMcveQhihGYoHt4NX2WNfKBwvmfV1/5ifzPBQ7AF99h+57AzfadI6C0apRLHeDZrImXTWXD3TSVjXgThbJBb2rfRE/0hOiJXhRFQVAqJZISHAoFz/M8b+A4DgxgMDYGrMmHVqedbVu2woAxUFTkzdwcNovZ1Jw0ixm1QKlt1oTXyXWyJi7a2vi1ZM9Ct7iRMay+LIpNdJTKbQ9T10IcTL1q6SHk2BAA4hBxyeKTpos0SypJBbjghjfYIQ4txN2ZGzZUFd5kSgJGsQU+ToLtzeEkuzPbouh8DYod1OFDfK4IFkQdCmv2KPCCs5mMYhEBIYFOhMZ8fqnA7szVxYFmyHfXf7M0m9E/MoXNU5czZ4FmLwBlTdz5feQOnfM1TvjOwYW2JkcFnFCt4KQzcLrEyYzryNbKEweOFEQ6nRZKBhYcVzuYiGKx/MkWPtmSh80WO9miRlXVOCxvGZaXLWq1urpZKKh5hULB8Vy+QSgUi5HjJh+K0jQdlSHF+uqSSo9DbHbQhMSlMkJyU6j5MgQt1wWIrGtNRbGlx6HuYqq4mMqNpVTXSuRYSnyrpjy+g+LRCzzGlP/Y5AT5wUaKBChlroXmVT6Km7Xj3vl88nwc4O4YK/BOdH/0PmHQl+JRvDFMpiSmaZoct5cxjuMhU7IGAw4MhDBmAggQgvZp4KOVvw+3bYDfa8DmNx70GGx+xTYGjsxeUrV+XIn/Vyjh0JZXIYctZ3AGJCNFKd4Jz3pJd8eIthggajenRoda58DQ0Cnns+cJ+AIUwtyl8CSQkTnRDbnY8NDuc5ar3NmZnN81OsctMUcTGziDAma4RzV6sRj76OCScjKpQYukUUPXo//9Qj4vFt7+u/CmShlZRxKRTmHxCzT4TGiWVtHmUsoip9zMvarVUa0KL/nGrKNVsmYudYO7/FgoSM2EaeqVr33Cd1qDz9uOn7zcZ/igb+6mfpGtVbrI7dXUvva+Ghq+leHzUjdyvqvcl5zy3Fd+6sXPtuR0I91Bj5FLkykiG8gx8i45T/6kPdjhu/gJHs+zeRNdSboT9E17lCb0V/qmc7olz0RusYVpz0/lFm7/2p5fscHx3dnG+VzPJOFX7rRoItpprJ2enpeSSlaJSU12iSKVnKXGJNnF1IgqsSLda0yHdJcmqsjX7E7vatB8rVJDczM2Wc2mjDPP5qY0t5WbanFQ0U4pKTP9hfXoDAib2kG/u9Tft6czf7jEgA/3Z/fhJ7AHHZgBCnwO5iADSR9dH1SXWmPvwgPUcIRGzMJa2B40sBufiBAWholPeAGfGtzwxnyER2X8SFr8P63Hz5NKdH8lEmNEUUBLilKNBhQgmnWyNvOfIyeY4YjXHOcGjzjEBZGpLWVRFWpOJCnkKAeiyULiIuoeGpdjGqL3qaWD+rWgfV2IreHo35RMzeTUKifs8yZjjjW2tz3r2MxQ4z3BWmyL3eOGd373nOs+53EXoyw2IxOdc48+cZgTnfWJn8YZzRouxtW4XVOZ3pzP7anPXdS51kruVBXvINnixha1grVc/lVYB+QaToKz4wZx9fLQrCDdIf1rZJBJZAnZTq4nD0KfQ7/CiTAEc2A9HIY74XF4G3wGfhu+A/8rZuBIAKyvEHIHeWLY5JnzPJ8vyF+T/zSnUFCKgGKmhCgduH24y7iPcI9wL6QchIEokQokhowiG5BjyA3kS+R3ORnF6RYoDzUuhy4nLRfs+7J937Xvp0aeFvt3pX300TigMXCu5Oz3ot479+vZ732fUetQK6WhJdLsmfGgbaN107poLdLcYz6lOcds0Vkyo/0jcPjQWUKIAOwaA8DuMcDhRSqU7X5mD3sfCumhDf4sgINxya0RA4fPO+KEfdRKVF1nPwdkYT3kGPWS0h0cpU7iK8rx4w3l7OsATkhyU3CSUyk9G6c5I9ntN85yrnhN+uF8uFBk/QGNXJTVk2tc4rKsryBXuGqivykuOeBa47jOjek6NqQbANyMU6qB2zSV4F6o0Fy13N9KuMNdLc62HxZwTwral7SatlOpqAN1CAH8E7ZkfUJMA9D+UnZ0kEAnXbrTsBYBuK+YjhH8exTdPHioKGc2TAcA9CDLejh95/U7GGAwrbAxxENZn3aGedRL43H9pO7kaXhWUaXo06QBacuBmq8lwuSLB8U1Z0668cQwIB2j9xxkdf94reqzX1Lb1lowmGZ34jmatwPIcFhV7D4ZDci4LPjfoWCCqagWilkwt9WNWGApapWOFVPEaQrDmqm3puTg0R+vghisHnHBQI36ucgRNGjK1IvbTIeZImsWs2HOVm9mvt5Vl7DAogy9eIzd7Okp7GWf1Iiy7yCAwGhQ6gCHmB1ll0CmIMKcVTdRCA5zpUYIqefV9wgN8221hzCz4EG8IpyFpyn2n6NYQoAWxYvqMLC4twSKWfogGlk2iyz6/v4vojQ6SH8pEUNsr484jUekmQnLSUgfIVGTFHlXjaxgpXwW+1hlVo9Ipd5hjSaTenKydpYi9zcVUkMak8A6TSdNhgwyS/nkzGSm7NhDlsltaeL4st7kXEKFbUP9PwCUZxClqqNACxURVYTiYxuO2FD/AEAb4/KhaoJfG12bFErN5hGNywq2+h+dLIUTggizpSUNm5UroDKucYtHL6jRXYoETieo6qoWdps9mbrkHQBob7xIloF959feFgG0uaGWuhvJQXNoxcVNyQoXTGPL3h3MRS6ZiufQykCX04CBq1wrZT0Drrst2bIgm2UJuhUkYuJy2+3KFfeognBAl+gWb8d3gLjOMd+ec9eRKdBwqwOId3KUX59Dm9+NGsadIwDtzvQvdJzfeScHIFIfjkzdMHE/DOhBalik9ND7/YYrz2IIATL0Xt4V/xQsVb2V3bj/LO9N4WvpOwYOd48Ge04OGzLiuHnDzihw4jep7Dnew4Rpc21nMTNjXnLoXMgpzNXn9J4BAFr0blJRqzLsOxBAoCeBoPS2/QmGyGOOP0Nh8tDOp+GIJPYyEpUe3R6b+s8BAPgV8ozjbRhj2wDODA4/LBwf+ChH8OcAOEKKhd9QaJn2KLjZ7qZDKhN7P116smcV5zgvB+1R7qnuvd+G3Bfub1f4CDzAg/J26D081PWwjUcOe5THIAfGkbUgMyeM8wiHyoOLuoZ0HNyY1WyvCnA3f4woccrEgz/FtGrw5K9pcc53yJkAcy1DGWZ8gP0+BsAcdLPhjQkANgNHZiZBeXhZse2sz+Ftuc6hyYavZTuHhrIfcj6EAAvIJlndRWCYPSR1gCDmTH3YGHsxwILjYlzzDcw1ISuIvUCYp6GKHKgA80NYeZMusKAr3MZCE9HQ/InIbAm6lOZgVUikiWqZRN0s6lqcTLSJucREtm9K51gAtiwbsRoXmtY+IcTrconTF1RmCWgi6cHBJLFCtGsDK3UV41+XOFJYbdY0GD5vZpaMWdtSaU5SSBXV2kMa67bZT35OCAAsPV7I0+pR5lxgY6cb/qaQ1ZVtY713KmnTweRqXpANlU8+BWlxoJCimObgMivGuZiWphxvuQJWwojptm5LASu11b+xLMG2gMHaG9hWxpt96r9ZgpW9143P9i0AtuNc4sD8TXkqOoYKtoliX85OrVRi9Nkmsyqojh5kVgO74iLflNluvOuJBh5lyrgKti/cn38t9wLbb7PcC+wgliXYYWKY68zsCF1HFeqr4/ePvdSFY8uvdtDACWmolZzUU6RVgdOckYo6zlnOyRexifNckK6M0BgubriwAJe8N4tTXEhmV8RfapTPox+DW3pbkXc5QRPNzfBkSmnRO8THLjKzu4R7tvoIHXS+cisH3UX1AOsynNIn5roIAfYgfqzNXL5helY0qVsy0EtfurAn6WdABvpJBhmSnmJKcqhHSkJzxTCMKp6MGcd6gnz9/x8yDpMqJvuXqc6k+ff/ppg5efqP5lA4b7QKDtvTUFKVH9pFoHYOaRXM2jocyNjR6qM17Kgc0y7uqpoPgONZHB0zxXMb3iRNGWdeWnmzU3kNAq/5ZLj6/zcPOGsOAwDO2tfqB31eciFK4KwzUL/bcKTQSNPZH/z/9k0iAMCp9+xNz2ih9dSv/39vJar0GABn22GpP01H6GxTuCzQQ+/01TQHXV3dNvrol4P2VYYYljH7AiOMyiq7kzHG40eLNDsHOGyQCTM5yknutO2POI7j5XyCnMCJWO9UAHXxMwwI54A65VMA1JYUzGZZQp0cxCsWtnLdWD7CWd0U51saJ72sKiqVxO1zVKqkxoux3AvqKptlDnXJUlLiy8WBajwyczMFfyyvqbbArbx7Sa/GgVq5p5bCbb0jSe66uD13kBdLwbKEuhON+f/Ocme9C4LIh7hr191s3P2we3BP7pXkx7PMqfLvuHIap0sFHrISzkqeHMQZXWcGzuacNLuONIa8Wb4SAwWmcIRrk2aKKJZTjrHBX3+UvkktjoorfSJwwLU4N/ZsCVtz1kfYxnbpnTRQ5h1E6RKHZQmugnjKyWRuJ1RKo7NUeccQN7ZghmqpiV8uAjK3C3anS5PCHn8rUh4kEvaF2t01qYv9XQdsHOSQXJ9c4vBhRzhKXbrWM45pPXI8VzhOQ/NRrHCCk1JPlafVyql02ik+DMz9NPsxECxOCY7cRntepmEug/cpF7Y4+BH7f91Gz4mCFrQz8W0RZDyrpGlXGTj5QdwtPFAsHVDcdgHdkCkKKIl0Z+GJATmVJw26WRRURGqxoe53wIUTcm5nOXbu4D3Jr0HzyPArDd6GTz1H53ZeOi5wd2scA9q9ULp0ML9hkx4VyXS1Jf0Grf4+JlltXNr5Z6ope8p38XdI6buBG9x85izxIVEqX9FfcfMnbX7+11Epen33yQRxtPOBBxrSAY2GFV2otvnc/5ULV+u6E3bJzq5kUvVFqgGGMsorXk+DsDiVjAS87/ZuVo5AcbLC5TICSaTG5/vbg+bIl2eWeM4YROZc2gFR/HuIXGxzxx8X+XRAZNf/x9SJIwTqtmV4uZZSbZkbvIIJFumeDUu3f1u86qqlKOvZC9uEqW4LX8Iwe2O20T3sqZ8faFw6oPFFVvy8ggSCyE602lpRtfjIy+YmHRBKX32BjKt7hXu9HOT8VMXbV1raqFr0O2Pl5qLgeuHeLjc3mBULbw1zc6frDxse/NkLwJO/5GDq8PIXLWnN8Y6qlT0px1G1p/eUtMrjZu0OY32i9DfTMSvL2cpJYBWrU72Chg3XG+aVR3LX2lpI6Uqtm7SwTiaQTkaaG8issyzvnAYte4Qn2cg5nmtYi6C2Y9bfoaKEp839Jp7sor5ffblfG9Yi8DtFfysx7C5LnTVO8IcKFZVUYHN8mb/wdgVlwJsbEiergr9Z3tlwIAfgH45xtonNyUn+jQOZZu+XtQXEJd42JT9Y/1OigMx6SZ77B+nkauCrcH/foq4QzeKfRd5ZUWBMqr4lRnEmUu7PM5SCcsc/RicKmUDOLuVwlQdHFX1m2A+BqMY+95qjBuopfz36zZWqb9TQOD4hWGy4lwhtlqVoYW+r3HrLySf+d6mas4NUbnh2lOhlQIpaGnvrx07npVack/h1OOwcy4rzYvtwnJQ6m4OsuKXsAA6SaMNrIA11//iIBtLSfRtnOCttdZRzXef9BWO6FPc8Sqossk78eyOY8bXNzyQzNqis2Jnu5nFeqvGifm1g3P+K2hiYARzIQ6gEObTyNXsZBWkklxmqp7m0IWfTkUSpmVY1ah9rZ+O1uxqru+QWbak2wUW5sVaLCibb2paiMXsCCGAWHEj2/Mf1FCDO8cPZc+DAYNAcINHfLJbLBOWw/hHiVBms53kQCHaq+wnERrH3v0GfNn/PHqmPhZ/G/P0hIHb6bc9tCA783Q5CfWjNyOG/NHwhC/6Tg7HBRRxre6L+zPRTW3P2VHiOYI2LexdBveH6R3v3M0+pEhDZdNaJf6VqkuEPUZ5M1wmE12S5BgjtZLvyIJy29Z6SnxF2ktPoO/AX5LpXEJaS59SC4BVlKbyvq6hxKZ+OBDZYKggSPwRs35/dhAODsmtIfnF3ffKsq++vCFF7nke8Xd4GIesSlgj3c+wk15pepUdtEhLPdQb2i4nX2KCcrdxwobqGj+9FYNjNlHusL+Qu4Z9a8zaeZEiONKOSCD9LCiTUJAsmDIQK9iYDPxTW0ubrZHtR+Qc+TAdKyMLYtdbUXsFn8CbDW1BgS4jF1HG0uy5KJATahWAs3BT99ur3aK/HQEEILdN44ij/UrbfngzaU5vBKzzTN1Jyux9e8FKSapC3Xe+yS5qY5L2/cS1pbALLXNvoserqWRtVi+kXito4qX3JLrW9mK/+KrFprEIdVUsbyncM2i/JaVaMhP95yttiWqkkO6NG/JohsTb5mxAYJIrZPdgfBINBshyuLgUoUcomo8ASl9cDn6SyLy047p3QDdII9caPFN5ZDMMZ5ZTM3kCIaBhehhuruz8onDSIStZbVgtjjitmtKCEbCqxodwln52xtUpQF83l9mIYPMuKjtaQFTVVD7pmBCyMl+z6yYTDNHvHmIhqqs+Llr+njhXjpQMnDRrZmewvYtfy0GE7AM9PwXFVXdAfdPuD3oq7UCcU9I1By8ptGKoRcryVYRxMzuoTwVTNKGpVBPNgUe9TjgJFS6p4Dssuq3akhmdMV1vkdnuGKVjHnLvKPEyFabHmBjAPv/GH24yBAYoMOPAXKR3JgcqvTsTO2I/4ZPYxv3+gwxho3Pof5c3DDAXHWDfdeZiJcWrY1rNmHpzBRerbUlyN2zWSFo8ns7wHLxJMDf54XY90gCmI0N8GIR6yIFoMRQRiM0HgwcGxXiaYP9+wqT5NIMnXW6UYtBCkmFLJb81y/LYs36/aNUSqOZvuQsVavQVLbPaDpz+FlvPpwFENr6Y/+ShdAw3F/0fP8Pbn0bPCJ298OYTA4Btvu0o8aIgufLeWGPzVdWb21xXpCKx5/P670xYh1t23oams1ssE1LuUURIMDh7pc0Dmf3Qgh3HQvsIgAAYNGExgsIfBExhCgCEaGDKBoQwY6oDhEjB0wfAUhp8wEv5GnQU3IRLk/XWV2Wx4iZCkgJJNvip3qs/rrOiDpWKCR0zN2ziU3PLVI/LBxSG2HjeWxzKboHKzqhTmELycyI7+EHgBxzZqVdvn5875EJm3SsOAn1fi2r8xobKmFdfz6zHCZHlbwwKJqj7CF7PrVNHnF2b0ytPhVTj634D6JKsGTMSAX3RxaR60YfGxj3LbCpbsp7QtbUNYWvappa0jgENC/dA2nC5T1/HNN1MRE3lXdL0oIaGMuZyDVoc411oTldl15eyMer+1W4OK6Bb/zPgN+OiU2RMCiPlRITVnxl4UEAJDbDpA4mPnaiA+sdrjg64SH5/CXxfTEQ5JsH2mL5QR2Ne3w7hQFEhRnVmUXOOfD3UAA2fbFvs4CMHBsF86ir5qRTpU+tzwHve9ELiurd+LgxRUmeEQc3LyDk4IDC2hWHh9TAeoBq/X7hD3WfHax9NP1sDgUs1gYEy7WpCGO+PPEsDRTHAO16IUic0IdLlPodPStjEmIKyEFl3EF9BSCvvf5AgIjSDcRRiAVgoMAvrvvkXEgHYJRKqIzKC1uiLiEPGPRESSIwWR8kh95FZkIPLp/tFS0OZITRwmXqGbQot3fHKlrs9d/nLuys4dAFxkpLgtN3prDrvJrd5ybqcoA9zlXpp93uub4ToCi/AcQ5kq0GfMp1flNJC5dhguzRt9rqPlOm1wJfaAhlKKSe6HbkeufMCIZ+4B7CTorC09JT4nFejyydxE51TKQgHXT6vPMcBgcjFpbViC3CBl6OQhwxKS13k0e5xEZ+R9SvACRDxKMny50xdeA1/bDXhLPYr6PYh2ls/BXwAv6yYjOw4qPgafBmV+DZJ8tXRyLQAz/oJUEzPKAAdfyacmiEv9c/Ap+NR9PXr1E38nB2vxX/VoGkbty7+ZXwfd6cm2JOjUxZ/xq2v/Hgy9hgkAqAMwAuAICAREA1Jw0C/61wC4FWbS5tMyrnJNVvVammjWhMnu0MKdEt498RLatuELIHHnn09mEEADHCJ8TgaZ6nQmY4Es0SB7/QSCPPbWsaDSMYauzpZaJc3+gbvfwuUqgINHGuR1RzE2rhF1mkdWcDEAhn4t2bcgCAIymqKxX4qiM+PrLgYhsC/v+hYWDEVE0VrfO+qvp6KucStQPrBdHBl06iZ1FoTkjBRNg/BubHSwNGdMDEFsNwsySMpBTD5IW5cyUgXZGiMKCm45ONc2KOm30q6l20BawbUQl69VZ/vSejycq/DCQi90VYBe66oIvXNICfroLADgaJ6xObhgnBTFpY8vcuIlSJScfQsyrQTbCBK3LCESlItj+S+6pEob9JYAcK7jAKD7RQAgJcA/kzapTamnldSluZzdzL/UBD5HNq3ceRSi3lOvPyW233QViPKH2zsN9975oOKvlQ59IfIvI/DgCz6L8UR1wExgrxNH/Dtznx/wXY9uffS5wKuP3xTYF7hS+/faE7VtxeyQRI0dQ5clZmDmUVja33yqXYdObl4V+gwY6iT4j2+yFGky4OiYdd4rhgutteYVrdYxd6Z2CLJ0xz1t7mrV7on39VcfyrO3PjEvDpUi3T0jdhJoxJOAhGz+4h6id93Syy5PpqCsqq5pyAFePn4BQSERcQlfSyAFQUhETEKKxPL0ShTTQ0OnNcISDt0hSnXhxZufALPNMdc88y2wsH/iyVhjrVTrZKJhYEtBEHJycfPIki2vTzwu5vgW/6raQxExcRgCJWvZijUbNm0blHsUcSRB0iRL8iQKFTZ8lGhJJZdSKqmlkXYmyEBGspKN7OQgF3nJR+tTlh0pT0V2pjJVqU5NOqux+BJrhGlZSxzNUgrEPvJQTsvCLV+hW9p1G/Ccf4vyM5jkSTlizCRSSCtjZgK9FKZ6ilFvKc9uMTCftanP2VzJtcxlIaHgyWQ85bl68kzIRIUtQtGKWaIykhmn7smxqhAS1Sim01yLiixdZVR+lVdHDdVrDPat6y/oHtzNwsGbl7/wCOTPr9piCKiZMcyuWfEIEWxOuWKYW54Y5pUvHuHCzK/eGBZUfwwLazAOSyy2CIcokZb19nXEiulBIWXMhS4OMiRajsNqqyji/EZpscV4uMKwCSGlLsRhKwnx7SveDnIyVFRSU6FiF600VOxjoEfFQRZmYTjKwV5r4nGcm6swYTglk6/Wx+OCfHm1PQ6XBQWE4YbrrmnGo8ltt7Tg0OaeOwerrktnfa8eD9QHDejH4ZFhD29zf+WFZzh8xAfvcfiKL/gMhu8sOIafLOTDhC/bl1aGpGFkWWiMPAuLowSHxtQwqEB118ao7/p4WmQiPZjADCbuxphJuzkyOaEjwhKNGAZGksFC4Rh30ZgIsSRsx3dY32xdvIzAEQNfsvgOKY4a+tLFyxGOGfmyxSsIHTf25YvvJHLCxFcsXknspKmv7KwiiUQIi1eTOuUSN3sNUrJ31L4iFBaZxJ8RHqZz48mXv0BBgoUIFSZchKWixYi3Qh4OARGSkqZ9fDJsMnjl8ityU7N/dOsz5Kl3/vMNCutpN5EzK5AyBkcgklrK3yfoDDFxi0ROaRlZOXkFRSVlsLWzgpJHJEUy/GTq8RYuSQ45G7+6aEHgmS3GppCALBSp0qRT8RbB9FGMmVUMYxZlYcyydXA0dhgEkGUmGDOvJMas3pCCQ6dKmhjU6oNlhFvrVgWwAYBVrR5Y0xpr69NJQkSFBm0GzFhbjrUNYlMj2EwzNteGLTRgSyVs5Say3qWDIENnTX0UNkNjc/I9C1Ws5mGzf1lwtJCMVA8C52OjZA8SnhS7eZgQiP+EQNQpLa1UPAGgIIQ2DgRFNDTNE8Ch1JZdewsGLpNkXcUht4wdpRywBB68BQoRbokocZ1Vpy8mJKWQKp2RlfM4+LYuEFKqSZv7eg165JWP+EpypJSCEHSS3l+03HnxFyzMYpFiJVqlCEFCTk3LwMLBLVO+oBK33dOF7tBjwLAXPvgShRTDREbQTYCuIKFRj6b4TbaIkZ4oWOjYYm0nJebgx7O+jvaRmWO+RZaJsdzKI39esXGlEJNRSaNnZufikyNPQLFb7uj0QL+HyD4Dz3uffD4gQwBLH45PR4yR+GG/AcIs0w/uiO6GObKjSvqRsjn7mLNvuPlfHnpk6/1yPdETO6zX4CGd5g5PKH+fIfb9QmD0PDmhIq2USUCp0POU45PRyKSCwKMZBxs2K3iHuPdEUgwOtiW2yBPvQmIrJLaD5T/IxkEKyjR9JrFFous5niV7TyA+IGXE1viCfyW+1Jnw+j6GDGwYS4ZQrn1wHkKo0mGWCIHhrWxi2fG4RFfGUPYouyh4LsmUVpabnHwKwScqUiBRRg7yvQ3hyY6dnDicOqOcIYURg+wN6d7mNMm3a+cUwcSySaqckwSkhfgf6aoTJHAyAkOIdXiQMRxRoHu8BRN8weB90WPBNmhaJNBV60r3bNXmqngYXws2ETdVIcubDNnF4y04ONx3GPPG0KOQBBIQ0eTupCAIPM0YungY9uwY+XZOAYN9yhhmpIphZkoxOEeKwZWkzWlL2opWoi1jiePpjS9U/QfZkM0RD3moMjFt8kzBYO9BtzzZ42yxZc07krQ4vCp+N+qbTgBpCKBIR5gEVefQ/Qk6SFJraj4sV69E0hum5gr+u/tVdn8BAs32wsco5TU7biJlk8qg6WxBx4LDW/TeNiRIwVtIp3XPfY9Q2aOnnS3YEngEghBF+NWAv4SUnKKmMZDKIy89EmFcz/bpdkqllc7AyMI6aArVEcywKf/bBgx65YdVBCnrWrT1hD0l9xAI06mGQ84Cekuk4a0JIXug78jBSqAFGA6q4jDbHMHmHloo6zvY8jUF8pCHHgeBluNgtQRMNtLYW7ITBcGSjVpEHkgsBexQ4KFp+4st6YwfNiRRedyRKcvrKMOEG/VljEkUDMewR9VczQcfPQSisY4enRDq7IVIto1bhSGfQv0ljJB+hIr2vGQ9IxX6SLFgtnl+JxPOG4VG3DwrJcJOEajHzRO0L6QLRxo3j/2usBiPEDcPaU/wwuG2Xkn7uW0bDDY+TxadKxZBP5cqImiFpb8EvPgnvSB5uBL4W0AySDVKTFvAE8viaaRAGbD6nSI5MGhpaoDNOwVvQFVOWggTzGQrXchgduHiyNNUpLheeOnD5BgxWphgWc6ynFX41mbixejWyoQbVsBvm4FoEbWXlNuzNq5xwUa4o5qi7Yu5z0t21icnuclLfgpSmCIUcORGRiCe5PtYcut2yGljtTaW5taKpYUX996HdMeMgYHHVU3gl0InhRd7StP4SJY6AGQQDWjxNzAxawndcz7EySurZhKm04AMi9Fupg6zdI6fOLiRRSyCDHz5ZWKUknseV1CzFDOFM2Mubh7e3n6D9OrTb6DDH93IgGcr7ea2jrQY3t42OjEhlcIiqlSLqlGrTr0GjZo0m8GpVc+TJQZ5BFkIlR8rO2H2uJ4TJzQRdaSWW7Sz8k33zU/qCZI8NMOEpx05Gr1iqmVUXC3jEmuZ1K1jYWq9Qx58Ewk+nCDwJpDV4aT2v5i1nUVD13Ov8kZQzaJbgdVsT02LdOQk0oYX4McKVgKH7jg4UH1u+MnGYEaZnb/5tLHQBCdb0g5B2DqjG01Y4jhqAE9vel3kLzCP2pJa66KYRoDFOhcb+AWPWcANwZXgIeAxgNcAdgA+B74DdkKEQEwgDpBQIElAyoCcBtIDeY4B0ZBkJ0DDRLA7rUU7KRAaJtE2mfbRNYJYaaud8CsaAhkLd5bwzL4C8AtmGQxjHfLzbhm8AfA2WzU6q80B1/hu+Nafnzqy2aFDV7tnDFjy7b4lYNPNzr+2i1EqPx9vBgyeNQKWlti5ri4CTNk48TP/6LUj0cUzIZUIJ7CCCgJc8rxZQmHl+4TfAvbP4cJmAG52ideKK+RG+/rJJB5u1pQAzjpYBMjB1bz/xQ99Tp77RrKAo7FVS3KtOQC3uXurORcHWpYUL83lYXXE4S3Yc+cvTLTVshFXKvuEISLDXio8mtbXF5CJTZlk9lZJ0WfEQrcYOF+WNZ4vz2mdL2qvPV+xfadGuR1LZD1Puwpwx8GB2Nx5CU/AByAiYE8O5qZzFGy+ZGlqvHtShUlppXqze8KBG4MbFFDpPvp3AogYEkijiSGW2OESWShEKcoxHQ1oQxdmYT4GsQRP8Ayb2MYRVtiHqZUqq82pq5ZaVBvqGKGDMEBYWLimO/RQz+iUzuuyntSnSFFSwzOXoDZzLCaVxsgqW55Om3j2Z9LI+Zd8BwTX5YaWUfnVbmctx4ezK4LGFxbWzI5pMd0fVciMmi0LDp535eOWruPj4xt+V0uqWFNQ6+d1E4Ybp9XrnzlVaDRoIf6t3sDMTrbpytJtmq/nsf8TkFMA+E3AL4PsJ3vFBCDnAciVeALIoeJ99m6vHc9jCoB/fhb451csGk+f87ReVNerSUUlllACtbKRgmBjc+PejUc2XgQAgI3XNn5qY+Im/YX1w1cQvv/sQ+3am19qfvDf//uyGMiNTeMK8Abg4dfTOgMG2Jk2JA7C/zRLej30tQFgagEwmgRDfnsHdR4EeB/gW+An8EV6Lb9aw4zfX/dnqYPosXciBiuj82rWZLZoLWZtdT/GI85vHvUdnGjJFpon+GeA2H74z84XSCBAggA0Vmtl65tuxZL/gimS9Mz8wNiZgYbm1kiM1Ca0Z0jbxfSArLS7C/RkF9GXJXSc11Wv04F7r884cfA/x2RhOk/fQFDLUgiEeuHgDx+zPgI/lgbsVf0rrIfZVQtJHp2RsxkkFU1yc7q0ubiqGQl5fhCj8A/7s372n2Q8V3M2jTmfC//CxRGoCkKCuR9AiGs4IiyiE446LkKAfo6gQFsh2tDRBmICyKMJfg/3uc89A2QuociiiimuxEDEIEZANKHSdxw7l47x/98oRzOBSDYiuOnsefqLsfh/812QOUTFEWo+Q3EstYyWOOItZyM1K6w0mDUajJEdHFxKUiOQ4hAR92pIsholVY1GWo2OvsbEXGNjx7kfB558fgEW4mjQCSscffo5R82QhwhyIJ/tl5EwEpAUSTON/dmknlLKqeShEetHd1AYDBBl/FeFoZQF/TFsk6+NZuCb2TNQ+I6W09MlDVFQ356JDAVFu1+mAdQhUQdTNlC8Dpm1geJ1yLwNFK9DFm2guB2BsKHudcg6G4rXIRsMdvaQTX92Ppq6lrfmfl7npg7/E8CWa6CWXkXN6WbHyhkjqP8FAVD32FIleQ5yrL2uz1yfvI/Skn5mZC2ZvRu9A8al0NAybqAGxmSQzA/8UmYFZTsQDJDNxQruFZTOmBDeghppDEgysla0Xt7OSVeJnelv2CtyMZ/n4x3ybq4AECEKrR7KBdvA96tWviTHA2f2V9irueZh3Eoa/nvHjRqoBxTqDLsNRBGDYaZd1S2KlBUi4RhbMdU+Cd+NhB6Mk6/CEclT1eVhThimUR3LMVrFmUe3bClXGhOMZeoaQyzEOEuAwXQvHYu0M0z1gZtRtIVdehNyBVPmdx44gEh8Y2rjfB4EuXlODKwlG7J/20oNbyf00j53mD6nyr+oT/lappXEbD/yBlhZ4HxTlmtNLdzvNlTwNqsAvMzipDlTARKkTvOgrnhYNf87/S5JnEwTdFjSY0q3gLzv2040U46nePVyHw8JfMp/tUaAGdJt64d1L1DLcxqohlTzPd9wz+n5LSm3VrSPDmvhdkCh7144nbSuNkaW2uNRrmYQOSbtnnrmxzZWAvr4VyY6nn9cXhYuKP1GD6va3O2cQPAuJi1N+ZJ0zCIpl3oDq5adoVCt9jur4hCif+Bt8pjCgyiJCkSFM+CBgzXwlLb3FgLqF4H+3O7r/Lf6D80f/i+/5ROBXwddQhfiWQgiEBIInwzP8Dvfmoihqif0TQidLyV+LJF5OJG4g4JyDsNXAU4FTvcWhrOVJgmHrKKYWLRvsTeUm3ROsikPfR8fSVnzs4RenU6Z3tAWPcOdpaAcfC5RWRzf961eY4OEScYUnkS+5VJHtRywAsDmX4CPzEQNjjE6IoMvfbMKyK6hQ4y5R+q2klJzkmQGEoFlxb3mJBzR4C343YYoKw4pDFXUgwMbLPZq/B1GzMaJE+BfFAkZDl1LDdvkHmQis8HnGo3IHNcmz7IRJQeIkDu7qNv1kACBJ02BlKE5kSYbQEGyJzcZN4gjo6QBBPFmdKDB4w36iXOk/XhEkj1zwhvtH/A9ogIUfG3wWH2wcST3QTGuuXKoPh1lNKTXXBb7UXVmYeETyHdl8J9iYT+w+MJC2WV01yIEPi033PQOT/xq98Rb3Xia4LtThFWu1LhcoWqZwu5HsdOge2ltZMNEG6z7yJlj6S6R7AZmWQwWXBBavieeKhq+KSa85ABYY0WoBBtn847BtAs4nRhleQqad8Ea+NkV1M9oGx6jzhAvIeqCWGR8VUZprhWxT+wNQsZ0l2z2kwPhrBAGMdI46S6KQSyDy2p1XeQekjJ8EGgOsrBaGmTKz1Su1rqfqQNU7Qi2SWK3qVRx7Ek6lv6PhTeB4wS7XVR1AccRMLCyyIKhGUpE4jl2XvxBSj/Nc3T5DEwozwgVcmmfDYMiP4jEyhlqcI1ZwSdvZNdOZnJgUlsSclbKM6NIX94NrPh9Hd8gxTuMv7sQIZCGosuF9ap0nJ1uSK+UScjIeT0o6rFSLNsHDFi1Z86w4YxyQUXjxn+4vRpXxG+Gqu+WqVZlT1yO+X2XdGqoVaVq3fRN4MqwZN/hm4465N6wapKdxIOqRLwQ1ZRlszHVIpLFY2C7lnc7FlPczKtF1YrbXR0yDxkc/A48c9GITx7OzieXbCuOsVfRgsqErGgPMkRAAHMX6rDSqh2/po3+ELVuiJAVR47M4LBaY4wJZZcDvIsxdHD9MapvafSRcL4h6S9L/MQslvMFKQp5Oi5+y1C0nxjj8LF4xJXhk94rcpT126hFNUckloRF2IP9Y7HzMFJJZKxktOiZTbMkqjPcr3UMGYpI8uiyfX9dx05xvypfePdjZupVYDu9iQMyJ87uS+qUX/Q0vDKvViAeHIOVJW541ZnfJJtLysp0lVOf9uOf0Thg+K1DVYqWJY+nW/hth42wI66zXrIYGLuYo06She/0Zo5DLvPzIkgs2KQsMKtxMbLnQm/xp43TliKUCnfnuiV1kvzeLd4Ttyi/wGdDhHA4tPV01RM9mmtObofutSlQXLOuqt13yAK65QzuKuHD5RzGXF8DbuohlyY3afRQzp2XI0fa9gejPyxiEaH1gO/t/7FfptGEg4sCfUTrTUQFGarKstv2/DSbgkCzpSxtAO9ZJDm4KTFPIYOxEq7zx49vAXdM9SQdsJa/xzD3Cd+2IJuMrOXZWP6npH4I4Y0JisbYpMRrQn97OHCWaUW2nmcPfJmnlounghr2eyt2ozbyUOwnJ6zBr4o/bAyHrV6/9AJnVkvT84wRR/dPCEnWMe1shCw3i87iMW9zUmezFkfcNWAmXAVmqHk+Q++7T5RszNUvJYaszRMlFjo7Z+PRvJtWh/XO4/PM2RbaiSLD/jZ/3M92cQWPenS1YNy8RwAsmYEK8K6/squWwwibU93Ux1nA6H+zHPFQI3Y28ZZwZQNDF2HLNVvoHDAvlBFFc9d9vicArDisfCOy5sagzAgXc+bGilPN2ojJoIUDdGin9LA8vF6KaB7jk9tR53CwGyb6Wf8mF8/q6bzUW9Bqp+SEd31TWr1voBXg3SRKWEw6wjwCIZUW07M1o++TtKRFz4Wd8m1ZwnJEyTEcJXYyagRuEZPDZBS5vqFSfDc6Q60R4xU1ObVmt5+a3kIi/YOmskR4lLqPcWBHUKRDhhgISBi6vToW4r8+M7xDw7WgCsSMnXaO2mS8pdGt0C2sYbi1p/5CpCL5bBGyYEqCMLyoIwxQ9xhkll64ewhCV8BdXsQ86da2wfVRihxVu5T5jndqw7h2YeSOdGWteUYonwg0AyfaTjpxXSYV/gnTXtOdDRMa8j9XanYc6YduwmXjGu4eybncH7hAJxVV6i1eYLkCO7hHQ1eNnHI9ImGXwwvQ7/Jqef+qYqX8Er+P7mO9pbkycwKIFIaGjZ71MMecPWPQHmUtlDUvQHhXHRuSzgfwCUQiyLimehle4m3eTZozcgdZTn2/zWBmEC5yDZN5lRpOEqxqgOSn7yVd3ififdch2ND8Xv3HEibvzt2xx/2SGOJpnUQDnVsRcL6snm8JWY3vEaX7E3Dvk7nwPOsaLDHzINUteFJMj8Jg90POWBwqV2AyErZ7Uz51OszmzFeHyB0x+cHTLzTvVrMxMzPx/Z3aw3Vef7YkpKrXN0XixhySJGiL8eyHUFTvj8aSaGAWfijME6qrHMaldzEoeiLvUhnvAmKqHfRT4pR76Q1/ImVG9oNKWoG2mLSDS+zHOT8c3tJ9VdTiWRcv/cjxWnKhzSo505B0OqIxISmAnajksjpv3m0R8D/G4TYq25eWoaXt9FmZHWSAmzsCkF0ATYAoS1W+wdFfeWKrUZFCIcERkSnjdJBcnogokOHhmccMnmBMmKBsNrNk/WY7gYD1tXXX8fUkF2DJdbAQlwRm6BrKO6eDlg8aOKtK63awGp/c6EVk30sr+yhbtogTUm+HJ7zUTGAlKxuFAeUw7QqHAGeDmY5xL2Uv97o5YSIBfmHuI8pvYFm3nsNbNTbtfrtWe9Cp0k/J3mPdMWKrjau+NSJhrpJDX8yPlybIBMP3g8bEj3vFz2aQHUOLoCBvoAefaIL7ply/qgU1wrlOEKDcomChpihXeL+C9Yu/GtEWSZyyHKFShKk0YS6CWLe/auTpptq+yOMKU/LfRU66TXLQHAwKoaM5Mc5TpYYEwQOij0rMCjKkjl8kJzegenz/jqQWYzb3VuIul3ZSW6ZgF5iWwbVOJzS6R3bVde6Uo7/sm4xtVpRsut5CPEdWcvmoJ1+OZTNbA8ekjMIrBXV/z7lyo+DIMGgX2slQWkmMy4dUdYuCQofU/JGeYFeMcL2c7xYEIb+eye6ZQGeQgG/TTOGFFBJym4W2xm5RQMU/aWPIwaIX/wF85Ac5fAn1YiBJvoQFdxZi5YfDXXmOGVaCyKs1OVd5SZe4oHJsxks674eP36NDM84Rkhmh76bv9zKAMzNEe8xEddgpYf4b2nHwehqw7Re3XlSkmA8k5n+3BEMv1FEIK89FcB2WiiYAXwHkFgQ7rmFlCN9Hvs2hmwZEwn/OsxUFKiD4v3wNJ0zsu2599kK6Pu084N+R/5clWZSznGJzRcliaz6ftSgKKXRuZdiVAFohDPiLkVw5nZmswPyru6pdqrheQDqcEQlYqXjR0mGUIsRqsCKZsRC12KDdQ8B9orfnL5UAMsgviI08lZMcOfJskP8606XnAp96/dqfr8LY99p3Jnt7DF6PNyEdW7RBk/WTnRtyxEhzvwyGgBgCcaA0oLfUqiAmCd0WtvrF+IT4BX99M6LLzJNl5M4pLvnXxXiCDfIJiAi5Xv+M1ZDe/ioDkqNjPL5kJa/aAhb1Zs9kw8RI1Gu4DeLGsGZPMVldhQzrZkiptaGurD4/VusvgChk4GNFXuHyvVf4JU80LyLz7pzjh389wEoVHBDpF1f+IjQWXsd2WIbOnDdyA8J2bINWrB3Uc7MOYE62zOHSnA8O+2qXKp/l2ISk9oA2Sn0zKV2EyMpu0zavesRI07Jb/2dHnslUzuhfV8XtRPyG42xW2lkIFfMdhHTFgMu0rEcvIDKVJFHmtkOiyvN3rzFtWVcGOgGa1Xs0RmaotveM13MZrl4jhnpbvTZvhwuBziYKu1fA8aKV7T2rhBysNrb7p1ZDE3suo+IZoU93kDNYy6uqTXesYqgt6abkFxYutY7cYlR29EjZrEp7u19fOSIz5scKjx49pOpYcETIZ8gphMN0QPmlscUzV7v/vkdgWiwOS4OQfNdzrt8mMxGvxHfkViSzJiuxCoSNr9xkZ6X3H45lCNWmndhqZT2OGjJcGl054fKhElAlydy6fnBkCU27FpvsXRUHy9aw9pMosDJDuHD7zZ9mDSfKShvCMb3lSVn9egl91/K6AMjRByON1noP/uieb2Qu2w5l4FSsH+eu/zbovHDgwIbPZdx+fn/b5vyTMwMVLEL2v5Kgx6zaEbbmxTzm6vol+e2BpUr18RdORX8H/+5ekI/xKXJOD2/sD5mDhUHmmcXBNBUfPGFS2iJjgFRDW2sIeUkAwLvUaXTszFIpU1GWl/iz/qJAWeqn/T2BgsqYNyrA4M8ZFdxLOqj4WL6BL+1/IwDLEPS/PfxcDjwnf+y8DE+fPH0wZafsJzdoniSkTeY6Pg7bP0au/Lr7/HzpAM9MTnT2hIMqpffSWQOHbmZU9jQ3P1AVNAYdTKbeQxd9rntfURW12K21lrq4/aVDoDa1h+9f2NdepVzSbbWaY/zyhiQjlKISB6qZGl2zXjLsn1FROtys02qri8XBZDX0m6u8ISYwi5n9Dcl8YdPSIWe1bcmYxXnzqWVIGJzbWMkvmtPT2JR47J2H0tVOQOt49VC9YR104ughvwBtE8TgWBUEoNTZBsui6KBHsbDP6dG3cFShNjjD2xmsNsS00jmeWf7ykZlao36APueDL+C/VxhTYU2uEN8bsk5aoZvQ8wGpgUD3JHwTBmt1M1rqoLJCh4MuFTjYLH/a385vWl5DWCxHzb+5u5NWSJMpfAvIup5ZzZlQhAs+GoMWfHZQKdsna+FN+ORvtO25lM2PziQIb23YyLLAtzZugsFzf8+mXlbdVK1ZMmCxO/qt3VbVGpjaBMV0ZSPBZl/ZcJvOZIppN5KA9JU2rYHCt9+3xkaOMKJSCkL1JcabTEiub6n0VLREozcab4ClqRznnqpqi3qJWqNtvYE8OpewaCz98e0OBxqDZSMxrZnCKh3e/t1TNXnP0MyVVJabgjFdxpVsCu5yyb85mGN2M1kOnmdmdc1k7R3wp6632FhlhCqGa1rlNTSRloUaJicdiCYnumb2Fwwth19mby3WKVu55VUqSCDwVLPl8mqqQMUgjK7+1Ioc/9CCe1hAVDNINHdLeTVAjiRABCjhKA8S/HdIpK2me/D3KkF1DV+t2gUIoqo70N2ZI690AMwk8uvIl18mLZI6WQCQSWQ1Fd894n4qsu/rmAjdq6i4q5PocSfWnG8+6URAQcs/lcT7hgcG4lfvixbCb75KSwBwZvpjxj8fW/uHxt/HCAw+ubz+NPTZ9Dc2fgr9D1TpTORCFYNTZowVGufZ1B6TvcRGvERZweDrA3RRqYfKMiY8928l4pUc/J+3ibWmghbVkTlDlaMaLdemloKHuiruIQ/0K6Q4XSmUyYPlJf2+VBdnIKCSuSD/yFBn8BWXOqzLUf1pCMs04IYuqhT0u7Kdgt6oUiXxM3mePChBH64wl3lLma2WbBOrxSspM1VaE1XQNL7VXyRCzxtQlQx6Q+zBoFwhCwnPlPP6su09EuFIlVC41P+EOX+BI9Af34WZFRx2gtu6FqWy156nF/fXG1XSkITXpMEtQbTi1iqZSGAmf4J7288o2y1PFhUH7UI+380XhkNg6O8wHLYBk8GpIt2UYOJ7UKFUo7AugZf80wI+clSw0oj/TRVy3KFaEHQd5muVBdU5/hRPSX+wXC6tFJ6Owik6Tl1QIC97EJFJfk+OL/AEhmfrfmKB5xcouLVeL5eYGWQvUAbhkE/rNGvqq7NtbggEs2AMHLfpTHrGWTN9cH597TDSn/QXBLDiUqXUATmMRps6xdORBqnl+/efv/9B/eNZcAfpL9Gq+orGTzV/gX+FgT0LmnO8Vi/XuqWZyuZmjVpiYVB8yiDk9+vcZhCNE5meFYIoVAecWovFL7Kg6+wQ8GRBQ9KdyNu6GbLyHne+UdjXbDAam3XCXmO+Q9rbpFIfCsv4bYYsJS8WVsqlEcXbq1CHUXJjkXIFcGdBVScvh08VWYRzCIHQr4JDoDsD3B0adqvD2hzlE11EqgYb+yIlZfJAkU4RKFdIw8KdVdBXENKpLOV8eaqwRukKDIHeNHBXcOQ2fRbUHqyQK/PuF17L1b6+jE61hyDwmi5A4SoZkCgot7GNyDyU61K6MKpMKzWpkPaugyiQ+ChsDRsWhfQGrVOKpK656/Tejyqnuw1yxq8eohjs06FAN1gD1yyHl/fD/X2lHgb2tKTz2jTwhs7KpPqB0gv5gMfsM1gj+gxtV9ml880OcTUgJwt35cHkQt7LggA9C23txc3a+AheX1qRWS29+I1Z0OgSbFVB1fASCHxTeQF0HXi8/zHxArhYSTz15OBqFzB9olZNyZnGcIrwFR9mINcfFp37Gvmp9fL74r8lsObJ76zwzPzQt/3QFsAW6igqCzGFolYXFuUl/eAFT90+l8tXqjBYicqHnoPzJUv7rZkUBMfRhSgIstES9PfwV4fwRLXwD/mP9JiYmc5mp5+cvx5dX/hb4wQ1DUJGbuvyo0TOdt5BAU/JYOOX3K7bLcC/dpF1MPXFWi7XlAh3o7slOiYVy2ZjUSNCJpgJvOUA74uYouBBKn838v4mPcx2oA7kThS8TCJ4IO/cRrTxG7qtWcliIdnRr2+/Pa2BQNyqLBI1A9uC3dIXXBL7/7y8/JcVjqHvjvT0sGM/Qsff4+fei0fReJCWpOeqOSsLjzqYu+G7qN2ts118PMIHS1WYuCGT6Mylv5QXCh5bcUzVMcp6Nkj24Oi7lXkshaJMEJFhC+zpwq/+95x4gnCA/MztnGXEqv25nc7If43LkDPLy/bKIdJnH51/hhbj1onni5J9NLmO1esNjuwaYigqsyS9XtjxJ1bZd4o9laemsf2ZfdQNnOqPmc33+7bnvn4y4S+3FRNjupz/HvvEZWrd4W7qrq5pum8FvrzCn5gqb9rC98fEjXnmijKO6h6e/HHStbyKP5v7DSH+FphXJqh2KP/h1SkUdXak3baM32cKlWeDSz+SbCotwPyWDHpAsVjy4HaRJ6B8xb5B5G4Hc5D+BRfqpFFzepI8xdUmiCkS2/Cq/3gcJZYroq8p+KTKEVwqD28HwwME4+ELtlR7xywrXMyXOAgqoaZcmVfCL7xdPGWORLOqiD7xKp3rNBExbDamSMkRB1DdBFhJZbjF7S0iWzlabgizWFELA8A8wzRDZZbms+EkfFIqj3zZ3Ii0+UnDzr/InwZWyu1aUm+pktUcUWhajf7CQpfSjJpbZ8Z6W60tnV92nZw8B697enZExJIqzd2tiTUsqmIqs6Y9tix9LCRqCRi8kcghfkVXCrAMi/jyBxOJWvhGiIctVReXMHU8Hm30YyrZbOl2pkJNidxQwjLwzARCtgFfWGggYMD/dWPYDfhsU9tlQA1GOFrid4RVgm3owkH0YCY4ikbMT3TbHsRIAJx2FXRevD2OiR35xWqfsoxr4NN8XHGxw0bnTcGe/YKf39Z9C2SKymo2aHRBGSn4x8VOjbJ2e0Ftuctkmq8eCrE5fNi30phPS0HRFPDxOCFqc3diNbr6/n9U7v+oh6km1MQ38Xho7SilrQByOPH2xx3s3fhkwQePd6rDl8Y/fLKCs97pkO/cVca81MxjXSh304Mhz7YmmsskDQqZvOHqln8Sh66BohBX4BeKOX4+FyiePzmvvUTk4hYV6XVFDMrad6Wf9nRvchGFeoOgmK2LFhmwYOxeOL2m5cHgk4cPeY5iTeaO6wDfy4gkOOi7u/L50jMiDKB2aQvAXA6WVV2//ltPiuumLlcULGEFnzy7S1pgnJbTZHatfEpYCEpNdsXz9gjXfAI9AUbZwRnYYPXg8+ewgqlPtKQdm5N/teBT5hibPcY3IV9v6UKi7MpXrz/+vBvjQkg333TfgfN+9JvD+cpe6gxkZ2PMufVEwC26OCG3dr53zO5kq4OE0ykaJXI9v0RlFPG/5I+io3QVyVHEoBlUmyh6DCQbGI06qrea4XcD21rkbdZ+OFM445htsu0WWH3GSYizkin5lOmmVf8HTPD3uNQiYDEs5mJmsbGYYWEJpGajJSuUxWZnSdoyfxmZkb7VObdIxHcLp7YmFcQIWg2/zGQVl5qtZXyd5jp4PitkyTJQu/3f2zMlWUQ7XlyL55fLwI/I19AGla2wNsiztJoDDKpLccOjC6lkhiqHRq9QrEBXGENORxk9bBKU8My8wkr5DS2rukHgaR2aOTpXT2jDqSQTNPbx4jQTm/3tdXzl33xx4KwueVfwsOHzikxhMyTGOk89HJu9b6J716FvuarUeVd51co7mUga1y/x1qoC9zmvlNpdlTZuURr471+6dz28Ux8//6qI52v0a4PTnBj7+rfHhOHpJs5NSJgguOLnijdCbL0d3Yx75c2HkKORa5IvPh7r2DnRvPXW25vDketYoxPKxWD96Ehs2/pJ+uOpiva1coVNfze7tr8/1r0rskxY28Q4lbH414CW04g10cotYAxmUsiYx7SsbVWlqcm2qyO+AMb99eJbPL3FHQ+vYmYdffIIeSeDzCQX7yK/APiJJYhfD+OgTZ725lSK1AivwCNpYEdGetqpF3dEvTsfRxmHSm6hqA7wkdB/2JiDa4psNRVEWX2MMs45R9GjzyIHoM/mYKySZw6jRdJ7nDGYxxapqOXJaLLgrU9Q7K9nLgrgchW1aNyrDjbfm/qAsCiWqmNKUn+KBD71R9rKbLXdKmHreFS/SEl01RPxzYR66h+flI/ejkSiZB8EFfF0HpM6WMr+9X/2leA/t8G/1++St+XZSUfSigj5egmOn1JBlO5nTXHItdn4zmlqu62UrRVQAgIlyVVHIBtwPsbRL/as9TK0MJ7O17mNqkpJya/p+M7m5DcIR8mkUR1Ivh0PV3EzMJGjKWhCz534kUwlN1OMFAZb56Cz2c79v0g6RiHRoLiz0PPd1c++IQjdOrncpReg/19RLfP79R4w/g+MvlYqy8EjOZpe/XQXbX/h/puijClzeK2hyKsT0A3A7f1sTy2nmjYRoYaZ1W9cgWoff1VbcIx/aeduMHo8564W3t/ShberGAytNuC/pip0NRRV1haTDcoihgyPyAQyvaTh7YYuPrvacE1JC5s5Qq5TQK9elOHotASOg1HFcMwJbhNrzZvwyCajWDtzEb3aKeAKzRxaWDmsqPxUG9AyVAy8vStNUyV3eoZ3bX2MSdNwntmwB2w5s/7H/9B9baYHZvs2s2tC5R1VOfNQ5TWVm9k+A2pwLqVX2ITdU4etTHD7LKU7i3S5Y68rW/+jTjtYji6XuzUZOalXiIQQpsW/lbfs18J3c1CgHVQ+cPIMPJKh6zJMd5HXZOimiRtydFPO+/4eHFarbersp9Hd4PO9hsFBo+ksyNWxckVMhSJbG9dr7+50Ht34DyEHzYFYaYx08LGsmVBj2G6B16z5/SdCXb15hZayTeI2Ja51rALegKXfsRf1Iu/VxWlGNvub659/Oi4ShxLjOpzmKpm6Q2tB6Jr3K1c2/KzIdlD6BqbXUvj5DfVzLhHZPvy3OYSqdNWyZaXYIt9YjXGqhmMPUs0d5phe0hunTyGPoaoJ4BaC1Aqm/B1DZSzIbDCf+2lfdZozIUHuRNEdj2Bt36KFFQRDhwrh4N4fHo/YwnAbacW81t6PRxOnIuacOTYvMEvbrmmdO7Td1E3fsJrC+xC0x18haazv20N5tqJVHT5biipZ9k8nKaKidWWqb6FAnplnK1zY7nFo8IhaHSmntmWqnkd9FPMaXVR5il1ndkMr0FiDzttu4ZFbEmPuh0figYTYI5ZvnW4fQuz7EB//YUQdHfoQu7c5b82e8VQ8MhVDEpScFAV6Cleh6japzTrTu7JX3iJf1uF4bVCXT0O/YuybiaKZL8O4jvYcK2p1ZqRIWYLOOYQeehCyfijj5e3Oml6Xx0N5eZ5pub25U18p/zTREElD0xmYt7cc+RKD/T3K6y3eiG4Ev3U+gvVbRw+Gjhh/IQDYWWCD7FhwYui6nEqVX6dQHgZ8e5jJvMRiXzpzTLBB2AOvnrJigRR3Ra6XHgscKcv4lZu2gqHlh2d9FyKekj3QSTNqqCSJTYIx9qzXcUsQ2cVA9oAbJwyTnRXrpBj/IQqt0kzdqwfvsKCMg5dmxZ5ipg64UeNeUonBMsW1O7X3Dq1YoJw7dcBTueubgHR+5jxnYm56mOvXZfvV6ebFD/ZKs8+VvPcd2aePD7kHnxtLhohuPaODtIdsFqYzFlZtMrk8LT3RW0AAjURdDGYVqLftTZv/pjO6vXGaeIrhOnmHknVpaa2Qw9oOBlH1lgVH6t1i0L8gXOlsYusuKiLD6/8L/+QhS+NpqYm4vqjWdhKroH8+Ajsh+9Nzn/SrTdEOkWfvrJT6lJVvTnCq7oJPxyUTkiX8tvYJYYd4XHiIsWMia7qDvBBX9+gLooMZWb31ZcMpWiicYJ7FA7w6xR636kcmkUnMK7XpSqOiV9FXlWa1TkB0/FzEfExwiK/ErfBa05W3k/NPX/FP8ZcDb3YElxT4PEP437UhiUDI6jeUkQDrh+T2E+h34oKqUHEVQFqH2MZXzpzZAT0jimq8svcYf+hxaP4nVNz9Cwywbn6fv4Zn0MbsRZ3U88HqNJF0n9EL/5qnkkbqLc9+Li814/Wwnnml5tPIpa+LmEyrlcVim7kMLxcGFI4SVf65+0Ln08JS/G0ILr7Y99G2tYPfuI1YW82I5nzbvuE7QRsWNLr/9QPsNUfxdQQ/C2+/5QZD1/EJeMIHi75f/V/xku7COgb2b8tgdqr1TjdQwwK2w1nM55uL6U5RkWPFmae8aiiB4q9tsnbbi435WLMKmz8AvJY50Bw4UX4d46L411t1G4+rBzbN7NnSvrUKbLk6Bi1kvXiHsJ7yNrysp6h3eWbDI+wXb+SXU27C5Jsn0Qn75zn2i2+mXwD7SWTa6kQciK8+gB6Abc1boa3AN25tD/XoZFo5QX50aAeC7zls2B5NnrbJPVPDs0ll+8FRdTi1jbq8tcBgTOtY0QEtfmMxeDENcbTwlhJDQgpGvfrPte2ItaRJXjjjGl9M0OR62ey8LBDUYt61whkK0IuddYiaTcm9BYm9HhiYd+693yRyLhbFOu4fpbYIDxZgr8B43OWCxdLWkeWpgjJmvawIG8ybyM1z0by+Vm+ePJZpcb6wEcZDTcI8QQtycr54pMIvPYvBEIRO4Q7z6QHjrEtXt1ZzdZuJZJEYTWBp2WXZmoAGo2GRmI3zqiPbbzPHUzVDFQy2LT+PhZ+Fv4svBh23moXfRzBLE+dikp1SyqsC8vijC30tLqTQhwXqFa+OitdXUr89VkLl0AgNF+FiZmRUcn5UFAviY3KfthB0lc3LUEGnxRF6T5dlYzTE7GxNw3BpznSasEZ4zYQheu1PC7tQQ876/UsV6ummgjs5GYP3JIPerN1V3r1v1tK42qYi63iB+8LpXnCalIisGtY1cgOBfaQ2KZJrk9Cnt9heoKa5/9uFnyx+YZEhj9YbPWGi/x1Yb3V0zcixE4ahm81eI058PpJrCXHHFCC0VQbK+Pfz65P0yR5xf0ghLfyNNj1Jgp9BUDuHE2Op1/2PTnaeGqh/I74tPlZyYdvoerA0mHvrrfhoLnsn2P1j4Y13Ffm7pf2j10f6Zx9t9N5IHnfY2P12NZ+qLrAnKqc9GZCIo3owtTtJhfEVFPM8NkhTAHadpnoYLKpWTWHSXy+gEVn62xbZD8nnhEoB3KUMhJuJFt9LrSpRVRfzXBKessZr6OqtYYV+SrMoFSGWrt7n7UqguCxeDbMMYV3kiNVaMRBP2XZNeH9d3aauVVVV2+1jq+Zs1pfQfKVUcaFPV8LWWZ3GgvLfysr0QQvVeOQuk11VQmarQxccXhn0bYpEmupWvx/Wa2u8P4QBUvMRaG23QVcqJavsT/+MQ2LpFFwuHaQJrGZWG9TAXknnFJXWJJA8n1AF5Gr6f9698Ank+OprKJno+24KIyXD/3/c8yPuRw/uGnh28IEDjy9/sCsfKL602u8T9k6j0X6PFcZTadNpoHMebIGBZ95MaOYXUCcEDqs62qKQvzUa4TkLmTpGXvfclfb3S6e/3UjyeS2Opqg3vhKqDCbWtFXD3kidyx71arA9c1a2f7uF54R9JXSdxF5f7U0Mw2GAr/gJ+ulf27/PQd+fucDDbeuh9SD7vR8dPUk6eqJMpKuUiavEiSuXroDyXT8U/DDl5IA5fEM9E2edCvD0nzfivt+wgIAj3raoVT+3D1oQPfIIejK/8K12zii0qsC/4OCWWQdw688XrL+AAIu2ez+y4QJ2pceB3PF3oXfvwnc/hz4/rZdbnMh1z8Rqwu97eS/3XMkxls/rorAnCGrP6/ixMc70TauJt0hd3O35w881JaPziLg6leu4kjBvjA2q1Xjt2ULKkS9Knn57/cp0rkgph9l4zV465ZvPCU9+/V8K44pUsh1g/Dy8thmaBy6cnr7Yj6yshVZhKLira1BL+m2govSVeo3COTJAm9nIUOffBS5lnUY8128v7a9XK1zD/bSOoq45PU5TwcBcUntOnlHXGpDwSgPlnG6rkh0LqGSMgJzTprXzuvxysW1gDnFmTp5Z3+IX80DXHEOFBr4wg0CYp84Ql5r0CywGp5q8XwLiv/GNLIFUo1gAasdg3gIeZL0Mvgvh5j1ZhMslLeehyAPQ18h84Ou/tR333STUJZdBDhDLUoOwudrkrwgkV+shTAGobfQLVWJbiRWFviol9svETf6iWYzcQkpHU2WlJlZmTIiJ1lXbtMVPTjV+fMdJ4NnaQ2Un5zKrZcvb7PrHNWbhAv+0U8sDRRJpRMxvUGFIhPqQ2/ne8uN0e2oAk4AMANe91MXXBquTpTkTQuduHq1V0Tc8Z2cWsN2f/PN08KrBaVe9Nj6XVhWean3Ty/DeyXTh5rqD26+C+JSMcQ82r33wlh8WHCE8W2Lom2JXryBA4bUP9rzYwbmrVPA55l78ltsfg9+abo8i/S4fKd6fRHbVvM5otq99vn/ffZj9b0saKP9nF+oLP/i+Lb94ugCq/nk2+U4LWY5BvwAvXP3l9ujmiGnwsN0/ZcKN7Mmnvlv/7hZ5PWgA/tJPOm/+9prHf73j1lMf8B13dj9i6rUhhT939Zv2/1NiF7/13NFv+lcn5L2WS7/nmrPnjt/p/uSrQH12avNKYj/TroOg+6WKEwkG3vrrcMeXRvUjDZwDm5h8uoX5Ypj9OzV/9j4M//TwLXgotfodSTkID1Vcs8Cqa5ym8ce2P66++49ZsPTxhqbEPZKCHFqzCHfc2/S0aqFcmzgR/V+dBuggEvteM2C+umni/5bc8eqbwfLhoUS98oTIv/yc+IT8GMWWHvhErNTV2Nr12+Swk7aeb8tAunMlZmtp6YOQrJ4BcYPVogbw4TfTtKjhoSzvBb8Gd4r1bxTWIda/QdUZNkTHL/gzln5fCWf0NWQ22AIWOfS+zXH4a1K6If+T3kyfwnSQLxD14MaXPnmzHhRNW/3C+nzenLc3mH2VOIltUmGSta36AQdWKoqe87mcHBwFZlQGOImVW0PQcVd/RVXi7Ku/4OqS94ZA76Td2mz/aPNPefw4xL2jouUanon/LWgdh1s3+ptQqh+B0oOkH4HqB6kkIt6nj6JngVgv7fxaSIQhUwvFArfmLCDOCbi7Cx3VpUx8pVD6DSEUKq4q0RC/UZ9QWrtNJ145Aoi/jJNso24V99V19kiocuWiC4aE6/Urx9UoAvFG2/LJq8pqMyUxdDTVBYyy9IDWiAOJoOSkJ5LxqLLROx/2J5TsY/U6jRiwSWeQDCqJRwnDD/32vuiV3p9Bd2SmuFNxX8NawyHc6BZ01vfeUKG445VbNBgHuhh0YelW5XZAZnCzu6Wz8p0PbnXLO7PfnWAF7cTFwUp3d6ev5EZ7RKte2is+4SjtE332uyc6C3JMn6R9D4evkY/9u1VDsC94euu4WKtfegal2n2cSAcGCq4Yhut75eGy0dasOD8phb2wC97hezfawKT727o2w9CRhP9snZG3PNCdFt91uxp1dHy6jRx998oSOU4vvYdaAlpzdu6Pon9EjazBGUOVBd8YJHj/vApaVoYf6C+qnr2/MKMOph8fKFkAfTruukVvac5PxVPGZBf/6vsXP8U9x2Uz+ai6evWD4MVjUYjTryJAFD/L0r/3yX7xc6/69vIXpxWKdu4bb7ZzX73Zrnz3+yWCxSWZikvec0qVrukdTr9bgncQPzl00RrgbLxRhAkK6heYYRGtGOt7SDo60n+7wlspv/1N1Nf/+MN8YXmTbRnvv+YrkIG4NtmS7a3ouxep+4uVyciLbP3jCsuWB134oM4FvIixXm3DrYXa6Pt1k5KjYgYwVBfRsVnCdSOHBvN/Jzf8ctXiote5XuT9f3xpYTeQtzQT8sSpX2R7L48JNH9LbCoqj18ud6CpuMuvsX8F6t9gAA9ZcSatQHvLRwJlxWm6wTjtHnVoQjNaPOf3nutnzx171mOe5pCn9Tzd157zW8/1k+eue6a/PPM/z1uaoOwjWFEcnehajbueBUvDIIawEsMYwSqsxijWfL0WQF+KU2Pp542JaUXzjrTUTHoykJFMZEZLZkrdj4qBTKANtJFKaBOV0mbaQltxmyszWXnf8f82dOfj18jjTD/HsfYozVk1m1JwzgfmP5Vtd1dLGOLrsA6ssw6ssw6ssw6ssw6ssw6ssw6ssw6ssw6sO70uQjYHNf8SeL389ldoaR0KvxhG6GbuX5p99fPb/lCShv8H7Bm/O9bVTD98UP/bNcBPrvsAAyfGConnfZwvSUldRb2EbxvcNHXel3m0z5m+1uNh3jT/Bs+o5fZ4c1mzqNCP4BWoxeEXhL6kj1Tr4B2xcx2K6vaUlFZyw2FeQ/fTmvX8h66fcexy60t72yteM5f/xYF4vYJgOnhppOPJd5/UOGDiGE++a7USaPRC59Em9f/MYlGNXfMUfpegoSVtP4fmqp/ufAMz6kaqfh+3hXFGVZrfu03J4Tuan7vsmAdicOS3f6RqZrXxwz3/i8N6lzmB+CYr5GZDUerifWkO7Do2G4vyfXpVXHcW7nBg23i+bK++vYO+HpK4nMPOscEJ29xy0jkKOMbNWI8lSezIT1L2KcMj0Tyj88MSRuLr0wrr9b6uHIboDa7gnZl1rTYxK34CNMPV7B9ovd0BewAG5q9qoubGHTADtEZXB9Zvd8AdgIFZTRCvMu6AGRBXOP+AbyCkbqgIXU3VpW/muEvtpfZSs3Q2beM3E8xSyltd9saMu8xdBsvm8SBqzd1l7jJ3mbsMls1fImprm8tmnvI+NbJVtUPtn/GTu7o+kl731zvv2v0e/mLrCxhXKR0i5QmrMNA1CH23QOLNLxl26z/V60zaCawggEmvevZrNnv1q8t/3v/DlB0AMgAGmwVNAGKyrdOTv7tV+aaNnifGv7sTAJJitS7wKqC9jem8Vl4xFw95GA8a3t5ig92FD5CZg/YUn8mDctboSQrNG2CT4dTocfsmI1GaagM0VYDJpApwne1SqqmU7yvbe2YtP29CdZd/Lv/bsjQ1MDQ97bBj+c9oOG2TP4awNshGGYuV+Ht8YM8Uy3anYqanwOpqqhAWb4MVQLtq1xrmrIbym5Q3DzElu/xUsz/DnRGCIDpGzZEwDc3+fmJKiQxTFMLqCRLPnVHPKOf0Arj6+k7aWG+sRzbWeIjPtK0Jl2MaRdfgyC8uxHs6ZjkH54tMrIRK7fAeZo2rzsn+kEIP9RRRM1Nq1+0ShOWBwJCsxGWIk26II/oY5jTn/F4Xr8Ps6qKtoiH/JQBvVmFLRCLTzjWC03N6lJhaC6nJagnEUWTbSJt2vI454kchxEt6yhw3RxbCZ6YACyEvAfbPpbhNYwmwv90K/VLZhcl/5xpNhqpmAtC/OZcVzC/l7NrU0mJoDR/v8JTRGiFXfopSjpTPLe8qP17OpLx5S7ES5Tla0xkpIn212Oi3HxJn9m/YiEHQ2rNq8VmlbqspdMUxXWRLUs7ysvK/y7eW15cNbNkqrWEqfYDTK2X6o+fLd5S4J6Y08Re9zeSrlrnKMow/KALU0VRMFfuT4kCo56bNjMDPwl4P9LAOmko2xyZ+7nH/cTbzqdFvctJvppYAv76tS1Ms5lcWiwWQWYScRclVzGXDeSD6laUaFMo9rOkjQEdQDxMv8ro2Wd8fp03yy6zIziQWBbhZJZYLsV7SB4BGLTlEHOJRU8hX5Gryjms6iD7DzixBfiW/JpYZS+69RE4JDWeN0MJcbImRSsWzTWJzknXR1H562dPqIk8XBx/t/oMqAK8scmVPzqYQUtc9WSxnWthAzIdRoRNEFsAYhR9nS8KtFImj9tpLRJUQXrWfsidnJ0xSPZMJTnFUqGfiYAcccnKQAv9p5HGrdlrHsa5WlpWQx8mYv91u1B9rnt9l4HG2s0LIT6mE3oWZ+j1H8NyEIaK/2pJ3MBcqSZNfp0/kFXaTct2EqLoqRkuihpT82n0JdrkMqPSXdzVTpqlq/wo1Kd9wrf7nyKPyT6GWLzhY28J8X3KydljeJV7nlHjITflXFMX5es+gXx92VbVNkNFsBOTAQ22NqL1uogcR1UcvGyBtA7v6v6i+R9nY3+m+h2H7N7SeJw8l7O03T4diu0x0nhJpOkI+qUtA5LF42lqMn9w+/3cX6cmt09WHqPI+WyVP5WTnvHZLL9+WXO8fxJ538I3K4nn/CBLqmTy9Mo3BzPlQvm53W1I/m21akiW+JVlPGzmtUk3upbviwfcqd+0YXwtYLQlpLeSsIaQllrRUk7SQ1src6rBaKWhLYmwRXgYB0BCAe7R2BDnzbx+oXV4GMADwFchPgFoAQP1qqhh4r2EeAiR6QOBYASDp3mOQsrreB9K+QZgUZNyCbA4gFxsUDKS0IHKbV2BMHqCo8XgZoCQAUF4JjC0FVGqBcfWA6ktQOwmMl5XZDhorgQmLnzIKoOkOTCwAtLyBSUmA9jZgci2g4wvoXgL0wlPfn84DBrHrrwCGd8HIBsDYXWypB0z0agLTSA39BDBzUtAtMOd5XisFLPYClj1g1QhMqQGs3aX3MNVWZi0wTVGw3b2H36ZJmzfARhbAoaQhmGFQPOC6ZT4M8JgA/Hmp5/QD8H1Zv4E5213bvwCCl+cjgHl/gvDBxfMZwLLvQMJa27xk/ylIehCw4m3AqgWA1evF5V6x/w2sOR5IPhdY+yEgZUbc0Av6GaTeZ/4FIO0bsG5v272hvwCkb/Wwa5+CjAWArBmA9ftDznuAvMPFvXofkF/XLobC06D4McDG20HJ72DTyeJh1z8Dpeth856w5V6w9XOw7WuwfU+x3Rv2fwN2PA6o+BlU3hiqrhSv6E9QvaWHwd4FV87XAQeeB9Tf5/GPwfG1cHY9nPsFXPgXcPERwKX3AVeeBK7dRQ5/Xp9hvQ1N34DmBaDlaTI/A3cegrtPmZ+C1ovRdsvnPA+0fwY6boPOJ4CuG+P+u0B3AQ++Bz2HAr1PkPkN6PsC9G/e3xADl2LwJWDoMeDh/uIu3rHcCTB8Ph49Djxxd8+mgOe3wVv6D8CLlf3jwMuH4NXn4M2hwNsdcu1P8P554ONqwCc9wH/f4bObKFm3wJd2+PoevtmLgnU3/MgDfuUA/0eKvX2CUXsFs0e1DII2otXdQEwkxIE+Ic5W9roVSewECX4iqWCx5Rif0lJImu1I6AZSqOs7Ep3tSX0Djdnb7bytnUjxDt+fQErTd6r/QmrH4069CqS+1l36GdK6eP03NOlakPbNQZPXSx9DOvfqAyDdOTf2kr6D9Na6+f49IP37gQy2ADK8GGR0uXhFv0PGJ3tIn0ImSy7vZSCLx/U1ZLmn2833gawOBTRl6kh7gvV7QNO2ArJZD2j600C230B2X0P2mwH9fjwgh7W42KPWHwI5lgNyUgVyDhHldSEXeV421Ipc5XkrqR25iXgrOcJzloiDxR8mQB5GQH8KebwWkGcjIC8HIG91IJ8yQL4DyK8P+WsCBdiIBEd6jgK1BNtSK5otxUmK030EBRmJUFUPmqPIU44r/QQFW4t1oMdoroZAJbWgEJ69JEd6juZpCVLy0fQr95yhNoh3oGE0X52/IjcaAYVZi+4KWiArvbsonGcvSV0v0UItQUpqQhFgI96BHqNFGvwVufHeEdBia9Eve/dP0ZJhtNQEaNkRQJFGUg+KUmkvoGhtkRrmCCjmAKA4wTwPKN4btNzMSg29Rwk2UpyeH0GJz1GStpUa+g5a4a60HrRSszDQqrQaAa0OnXsBrQGSov0ZAlqSf0Hr74QKfoM23g9tuh3afAe0dQG0bVZQ2VNAO84AlR+K7V62/gWqOBG08yeockXmY0BVR4KqF7olqtnoYf0G7TrWfebv0J7L0d7t+2tB+3YH1f4E7f8OOnCi7D+HDp6LDs2ADj8EHb2LrD8EqvsdOv4E0MlDZb8dnf0f6NyF6OJt0PUp+XElavoLqNndtdwF3ZnBNjtuf3m9+7F2gu6dYXyEZ+uA8z1ufg6obQqo/UR3eHsH6J83vHZ8op2gzmUP8ap+BdS1f9vR/SPnR4C6t6AHdbvlP+jZivrfAXp4NHqyJ3qxHr25FvThDaD/dgd9/g+gr2eAfuwP+vm1Gf3aCBrZCej/LaDRt4HEQMx8vQPlJxz8mQTGN2FH203j+i8X37AHcIbvw0v27sFX5DMdeBgvOtjBj4wcqtSETfABYb+KWCJqipk0VnBb5QjLpEpFMMMV+FzSl5bp7MQFaV+3nkfm80S0cBE+sYVjPY4o8cjbTMYqv9daAKj9DIA6+teDzc+Dfu86zvaC8aRXxyZnFQAILgCoOpzaz0aG57CBauW2uTwBwK+8C31/12HUgSNA9DkAQBzUKs7moex9ga7HZDmUN6ux+sxQ94tLrVP4lCy0GDdRWF+KmtnKq5k//XQhAdu27Es7wFbgh7N698JKFMyyKz+zAozeRjHdOm7sIsAVOye/RNCwgtUE5Kk5wHMrULDdrsZsrwWncQZvK5txuypzvihFCykRk4L4AN5K8mYn1pegg96OhGipxAISd3SS06EeTCSJuv51kl8spuK/rqigq/HO9HSHYjc6mrJTkbzxAK+Q4uFvfP9PKkyobkhf33FCH6x5hl8ACdyo4xyv2GQlPYKQ43/1AndunqW1Vwtb0M9n5CT5Vr8N914Bmyzu03WkQtZcK9j6OZsKtAuk21n0dFPcpAkKXVhl8WzAkvpDT9y6H7AqY6yHUEZJbUqZTLYnX/cttuKlD7x7YgzBxgF6n7C0PFW3fNiJI5zFebzVjvwRpnEzUYtiJMP+3RGRfVyqGspOCd9EaOBoorGgCAQ7XJBgzjCVsYjA0DQpzUC6sWS1kCiIIphP5Hi4KTDlQ0Hn6lRoJJ//2COlSZWyu4o6ty56d134X1rcxvEDL4jYEYJC7OnjxaXeIUug6NROaUhvJ9WdXCwJfccMU4pCQ3bk9QV0tBfxdbtpYMgR5f883FxbOshBTwPtlTZ3nWJ/+69mBQIZDO+Ug+uJCEsujT5xttzbbNKfe1p3X71Ag2C1fjClB4kPJCdSOHf4xN6mEE9YwiJOs1zMLDJ8EpZVU5F3dGWmzjbQM0ungYIbMe/Lh1EPcpSMekY4rtmytabXFe2Yg6lNsUhOevKO+JWhb4tTcO+G9KcAF274fXuyVYBdxZWkVl6gV/+PJPfdaYYPNt7Bgfz50hqpQabu8+W1L/wLU5mvhrvow61RwGJGpIdqHRfZp6L6iZ8TdcfYVEYWH7dYJhbYQoVhDANb8hYibFjce8E13/mB0j3/puXYuh4nXHz/4rvfsDb58/SpVy/h3wRC/KeQDf/V/Lnf/EY3enPAG9tAGGHAT/MUdMMOrL+wfin5a8o3lf8xhR+9cPfiv3vxNeXPzWcdkNDThPhHIV24443f/MZpOxx3cQEX4CYKWNU8N/OoAUFuQ8rk90/IsrmTQcFKEMBvHR/PdFsgTPeBz8bitGD/k0b3yfGamwOZiODNWrpbTT7L6fOdKuZFwy2EZ2He5VggBV0xIx+8uwORdxVwsGnJv+UvEsnjlb6IhLoqIDhFwFXf3/1ZSiDFhXEZpL3K05nbl/92bOQ/H97UCAl4WDqe70xPWZxiepEGAgs0/er24c5pDsJvaavRjoiNiucnfs/lzmp55bCXPOdBi7BUX5m83bC3XYRwews6f2EDatPNt+eMg56N/4EVMPqt9NMxVZHelsyJzZ/5RPMT65f0h2EWMJhojm9r/8vF36DDEA9UxCqF7cPwzKpC/XkrjpTgBQ96MPrRf2bY+QP3zwPRF2EMy8O/3hr6Myx95qgQb9fvRnH7O5AcSVpMYGL3risZslTmrS3EcGgs0JubqzeP+VChxAAKAiWWbKHNYMmEjzlxe1CMk4+6kX3kwMRbRuMnJU7xCGjYUZgAkdq7T4LF7ZCDkQof1vGA8hDCN6qp/muWfmkYreSAe/WDU9TmfDYNxXDx6myQAw/dXxGxfipI9nASbykOUEL1ekXrJRKvL3m+6RhffLy5VFoCLhyogO1BOOhqdHv4lRfS0o8cswJFl/HGeXfm72YFO5DNeAlhoD+soIPhF9FBWaJZ0KPwHsn/CphTVToBsApZ5N+GmmPwvd1dO+1ZvY37NHE2u17syssEX5PM5JYaDsNyiH3t7y2HYR89KmE2ACkcsfyNCkah3gSg8ZYbn7bL//ai3WeXhTNmJMBvAdm/q5X/n/9oaF5ArGOyi2790hOBz3wPjWNTamGeCh4tV4GgxyPc5/Qtcxo69dszKse0k1QyVBRM0g+hSvcBljXEJpm78Y65hK/tSnpdOga1aIAUMrvrWakuGK//i7WW+LP/+lQtHA/AOR1z5flvuHlJ33suus3f4XmAmL4K99Ujh4o6VE8DLOjt9395vSVfF76NbcfWrAaceUfceJnntilXWsVQ/EuZrAqYnCjj8GAlLskwWWazTSdNByEMYaBq8Fmq6LLThNFBehxzQ0L4YQTtlhLbwlSHlS2X7SZkdxjJYqzKZ6qyjAjvHdfJgncMiYMtx7sFQ9QhAh1i/xnIEIdxbUAOuV7znKr/tOyUIM7ozLfULy0WZzU1p/1IFtdl5moTWc16AL51sWEmZLicg4kmGmTyngNwOabY0A0+TF26hSi+Pewq7vmWOAQf/Ll+a2Lr5WLqcvGBmd1dNASjnAhzmIMpGjBxsxxNa8Ykas/oyuP4KuVSiQMy7qgzls0laEKYInnefKgxPd0q2hFHtVjoxDzmghlJf7IHfaD2aT4EhVWp3SjwTF8uhbLRte4MScMPV9n4wqY9LGjoKImr8aiLkFUuME8y/8ETtzJBR1hEeag4dxjo5/VdMFru2TwzjpGANqOhwb24F+9m4lkNLTNVrEoR8SgBUaDGKmSg8WJ4+OFut0V5TibFrQm4F8K4SX5kJOfW8ElzES8zBV9xQ0KkXwzaxoNtJjMpXwntiRgySta4TG2ecSf9vqH0Ob0sdKcifrDt+LYRiDpHoEL8P6NMcD6i9cRSxuQXL77mkev/texI+guttaG+2q2+nux4cLZ6ABo2GtFPR42p4KrAa67EJ4rjw3l3sctbNJickk6EQ5nh4gbJzNZLNyKZxxpWcJESngjKoCo3acLa+9jGyoVA91p0Al49eQk6A4sAV1lZu13a13bGJIkpKB9vTk93aXbNvJ6N51CPs3cn3vLFS9l/HDyWht5d0WE/BuTIhp0VGEjfg76aNI3OlDewg9+x4UfrbXJ5szjmvzxlOUQDgiH0lPcjiuzub/wHwv+S+/kJxnhwE1L2EPn3SY7eKuuhjyZOJyDFTV6fHp6LgODD+Ah+jNsoIp4ffeo1Bp5670xO7bDhX7qrK0gfPwgT7jLi8Q6oGll+NJzx6RErvD42y3581rAJ+ttnImk43yklRIwKOtThsTIaDCU7SEwUG1hjokwhJzvPOnXtjFPjuYQQWsEIlaxbA8DNh4CBPXwreeHUbXDSPQUdOb+g+vfFDybVG7lC4eP3Bu+h2Wun4bQLUe4Ud5ZqE/HBPUFgYM8oj0hS48ZEt+8Svj1h95zl/Nn8Ym88Vx2LFfMM4//MwbaddWjBx+mJVKk+qjaJ1cx2InBV5eHvFU39cG/kxZ//UxxLTpEX5k9WsLUUNVYnmVHShmmYX3imq61TMiCLXjRdB3VU4kPow+zFbfRvKHg0XHewBLB0EZbQJXc5WaAiUgTplWeZEwwaS1oB33wc5q1dm06ZpJKmN+1p8oh9+nhjf7xQbU1osJHCyBPCoyVRrEphEIOAnurO/35opUx7uuT4HGoj7GjJgd/XctwMZIDXT4FDTmsCy979zYf4BGYwgyMm/SRVzqWXS0juPNmfiGmakDwkA4UA3+uBfmOVpz9UdQEtaSicj0jEXiNsSzvhj0WxGF98B+SwKTBRcUR0w0I+XOtrn4MwbJiiNtozPoISSktL447nzVHyK6BwFN63A/YinFXmlPRIrcanWKgicRPlep6r1ahVqQmpGMNGS96+43H/ks8tS2/AAA4+l4x+Odz+EIKNr2hfPfEufw1gnG5ZzHJ+gIcfYrg056M/mWHkiA2ApWT0Dj33KOKayzy1io0XpbyGfS3ZNy1LQe946irlPpIf/de0JJun4u4bwyUHzno4ez+Z4VfueX5YWv9UyrhWNl25sMvq0WFPfW8rlTn990BXkO7U6aF7oGb35KBc3NZ2uPHh8i03h5x/AINIWCk5fNVg9o+Wv7foch2E8gbs8LN58dwSMmKd0E9ddk/uqRYxUlHxwtOtYHt72jHpqAdP0E27a8rjxt3zkAReBHx6127oFHp50yAYhf7J/vvS3xYaBN+WYenssd+gE9Up9M7aQdzWwd9xQhOPsOj7Z6zgsY5BOJ6gpN9dI+i2rD7uASNevdAJmmI0+p615t81GMazEOZJ5isS8RR9lh4ErSN/cMYTgT/EfOBewAHkd4ruyBbuaN8vdLNQNfX6D8AyBkXodd/NB1k5Iq0ilcJlYKisn4nw8pl92skbiE77I9Q91IP7y9VUa1Z1YJAkRPu+AQreX4VbT1252z8BTXTo6gSBPAdmvyPQDg/wBrwBX2XlGxDRBKPCLwGsIdcm+LeYaAQZQUK+mvZ8NBQIlBj3Vp+vmpsO/zgCUOzJKlkNsFziK2ivA3/OiyVxjCWLHBKmDjmOTghTVJbiHoupFXRubk0rZgkSGJ6916dVqextNN79Ml0Khc1UuJlS6atP2y2e3uKhQ/9h3Gy9H5t9DZweUGrViEoi8ZPT/zf9vWnZlx1jJ2lPknDiKNBGrb5j77riiPHS5cGZBh7DkiA5/iXX3dgEDRTz8MsdH1GZHisSIBbHoMCk2fww4LR5SQX28wPuyFp6GQUf95jwPfZsTcRMDC92/PHxcbKBNZD0eJThXoJshewlLzamTDBG17GxCtUwGqfA6NGyAse9jGjugvTObDaxlF1byKsUy4tE4mnqjN/OVOvyMzqidqASG9olBUhB9hlgqyWAqOnUgJimPUKBKoWCnbrl8rDn3wZeyiao3UweJTKJp3dYnfDuGfLh7V4ChYE2o2YoWzyCwWXJpNp3wT8/qPqqYqx1fWoG54Sf6lyydD84UiE8IB5wDVU5oLCpg/We5AccnHB7xQ0M3EuEdLtTBm4HI3dbTZA1TMEBPlr1NRwkUzHGK1hwDo6dlSOhH+TGuhScPRovOIYTeI1tlOEqDlAE/ZSgKC+igl8utFHEvIStx3CHIpAYQHEpEPDsIVnP0GNdyEDekfANWYHkFTRx2F6UJVGPE7xMG9HIpx/tVUcubbdaTc+Gd/0u45IBgwqAhhMG4WWOHwvxKYxe+XPI3EHEFZtI1WtEkfYPy7IdF46OrW1dMaHAgpGee5aSey0HM7W0G1OyKRzPrUhAh5liETW4l7DCaKlnK/NZxdG/XGUjUWB01Wc+8yyY1ypdj5WDfetLB+a8OIqjcFkZaCk2py8niWnN52sVXwgGc2Ux8F0O1WrZApF0AmDYYVCBl4UxxEzZaCGTUWYrsDQUlb2BVRcN+vENRtDJPRbL8nXfXemrR4nDSMEJOddnF5+FB2YYEKW0VS7iFNe37dTq+TixWyoGj6YVUwHvqopzcF49edrpTMAf1/T5VRsf8L7+Xqq+/VXMDylSsdhfrQOvRESo6WJ7dxRoMZNxpZKqS/ItpfZkjNkh/f5N7iXS1+OCl325pmjlerEhCWpIlHo7yrByEQ8x1KzRyBq/FyuFakpjHGZhhwOuygnymJ5I6Q5HCuZNh5fPoD5HgrMK2s08oSKzNWSeJjg1aZSa5ggQymfsvaGN8iG6qGmI36b2Mh/IcOaV4yli3SPAMPgjdrvPkoFTr3wndd2AGXJehzJSPzh+B9Wv7NbYks4NjQ21S6p6aOTJlvl7BSjjq67jXrNR04UMc7PZP9fhq2qXdGjoFbnULfphwnyxen4ynMr6pmXH1jgsf58tlnwYpVzIYUrP8Mo3XBS4mQfjzEt6FeF6i12I2DNJYhhawxEsw7CCGi+XzvObXIZO0FWna5XOChdm56ZZHEhMhdkeux6Pz8+7uAgfSSRT5eZsAl3TbvIfwYegJx6l7qbGxNTfcDO4y9Y31zxfPewjIhUTvMNYWOTY+o7qR42/QAGLUTLDJVP+/1M7Mt3v58AXXOn+vdKrVyOK6jucAWgFz2nye1OxX/augl8qGAAHmdkZWSOiWiqNxSOTZAeRCdHuv4J5nVlPUDNIAG8bieQP50NbjOj+V/CaGFFGUYnrVi/RoEbdU2JA/1SwzyN5pIhD7AjfAMNq96sgGNqOK2LAIoTHR/pT4Oj85cFek3STPvvP7srWkQIitQgEh0VS+pYvFcgu2KeIsXAwynJs6fBRLfR8+o64m12kxMFQqC1loYh4y/G5vpjOvLA/I6NgpNx1MGoE5Jlvz8TR3BV/PaE3b5igD3yv/eZTfdujNMpoRn8NwT6is7aFrZUaa/e9D/FyG9bkiqXSTFQ+JEgttvinliSfAYNw9D768JvYn9duKZQtjuwBpsBUk1Ergv5/Tb4sYxhK4Pjf7DaUM9iJ/Rwo9XiD9T4GY+pwWBuTF7wVhV3PuAiRZvKVcvmL8rp082Xx+D9g0mqVZVvVSZbmtstT2ciSI9D7FII0MAdC/hYD5mfm7FDnd/S5veRaGpkLVts9OM9J8mQjyIPRqPNM63HD2TKibXRDFRLUQQOsSbCdtYXzqnqVoMJV9UrxGg4iZKnferGcS3fj6syMeZL/pey/83tUUGpDwVfTamCc7JhnPkUFlUW6zWhjrxMH7U+gfITyj0XLrG3dxQJVyomgahwTadLewCXZbOv6nBPR25/O66QzKbOsDzYa7fcesUxJ8e0WBs+aT7fHdQsirZeN9mnFOoCnimxA9BGkago2qQyY3QYrupoPAjNet3HPsZZahdK6Ko1aAWXsCOBX387t0e/3kJ7t7c6AyGJSLpb5dRwjGKS9ijJG3sI/02RhYgCymjQNWDkBbRV7P7U8ggOLxolg0LpwLm03DV0d1r0+qGZfxsya4cb5dGvy5lOdYzvPteXzIbvPNOUqbwQb3H4xo/zF872pne0PZ93Cv2IDVI6wRGTl46/ael9MO2rC1od7gmAjYQCneN0D3JdiXnHNTYIIPj9+1kMv/rhdc48yCg99gFLESqyGO1Le/gFp/N4yw0zcgw/5xp6tLpY1yge8LJ/kucPGjhDlDo3CUnVPOF0RJllrFrXZRO6IbRqUGHOYEC7xyNodU9OzMD7LHW1frNW6Wi8d8YWeyWTt9KFmxuAKz7LF4vBVhUbcfd9b5bmhQrH4uUesjcV5V1WKxf9Cj3v9JUY0Wlp8Lbzp9YfX/6tK7UVQvyOsTuS/iT2IfgQ6nv56/i3moAbTRI0CCmKjkSwDOmlEz8+bG2hPC2Ppnw9cJQ3yJ5evsDMeZeD8hmRBFfZPOAuyxSlkQPc0x/QIpCXwGMGtsnpi2rnDz2U/F6rRniA/sesv47m++0tLntTxm1+eLUp9qhvN064w/2g4wp5Xy8XL6ZbLmZIG/UVGHDClgb1r/YM9seZ8Nvn6EUORAWOSTyJruPOHuvKdN9HIo2Qm6e8AixeuIRes/ETuC6vswVmcxetFh3lVUypJErUAkWEhqRQekOGixJZGqI5PeT8EscORmloqIZdBqrTSiRxzlRbEJSbUTcQwU1YGUtms3cRlsymfTBZZMCQhmYC6tx8Wk94bqsihYY8NbLpBxVHxZQQhpxmFeYQ5XPN57vG6QP2fJTtPCHdolOXYMnM1ZUxCtOp8hVF+1IHOM6Ii9LZjG4bG5FzHwU03beZxuwLciamKZquZrjciImiTpQThZhk4oc8VkrLybKS8a19HPT1CA6u+4QRO4u2mES9tsrRJmhMMAU+TarFQWCIVlCeK/rrPALZOO5CMtCmAGEIu2gibxhk5lzcFO6V3R6JG0ODbGg/pEulcHjfNpRLdZDb7b707zGZTO2LJPgNbkFYMVvUZ4AE60b/qduzSTeTJiLGr2eTQ6NdD35PIIherxVK1Wk+dJhMMMLzyTr6/n3L1MbdX3lgDGrBLa5AtTqDa/Cx+aOGsUs0yLvmbJipgC45x7Li4dTir7qUnumx467GDoylXMF/nqmIhh/kFUc4FQbRV/LdX+AXHJ4UiBeCZFKCA2/fCwZh5d6pjiBm39fuGb2mOYlzyCuCMrr1fotGwgDTIF4ig1qO+UInROnxk58u6WVW/MZvNKcJgACOsOo8gbkd0y9ZvPa+TVi0xY++oA+K+1Hhrl26bhIY/KQpnLh7JEfnF4ZknI088wcjiVzOfHt5cKqCIB9Dmw75OJF0sVWYrJZWqJNzV3h25xiAvOze8zpNS/gYM6kpi7W1y7P+VuRwLcdrEsKKuIJBI0vg+T13UGE5NJ46Y3q3xGCNJ5/NZqXEtAyHfz6Bh+vBmtE3alPrrjbEj0PFKEajuxwlBGnZM6CyzrXQj1AnLnKA6yejj/T+byttu9+Z+8BrwGvCwWq6wXCzeVNNhtIs19/KCDxctsCQ1H8Vx//IwmlJvtobbRR4JycnBYzD4safoY5JkZVOQgQe9CYpiJJkuukGBzuXC3bgiiZwQVMUUQJEYzIanlhI+31a/1L1nYid1lSgZ8xUY5yhmZjKfeqC3LHN5OBJPZnJpVhboBx50x700UcOo7qm0ZI3YsLam7P4AzuLFZyjPuY+62hitE2lwHGUJ7zBhr5BuCKkotr8rhb8/Tl0XPPx2mD/VXNhVp4CDp48vKQo3Cos9aWhR/mALZJmFB870aZKVgltgMH3ejd4mAyXNiF1+gn+9nmPykt4UWl3CVii80zNBlYmk50XRYbdYrcq8E0miAQtNZqyHTWWyRt3qnCDkporwOAaTagkwNhUtXnbvZE3SxaukA0ZScuHhaL45qjV/aNdui2qH1KI2llOWo1QYala2kiWZpvWAgbr4D+4Wo/qlb9BhgYzxd5TIqDmNSe/HkosdCxoU4N5B4SJaavn8b7yx+1Yez6aunpPnQvSHdVDTL8cZwaocJiXJfgCJwyCh42w63F+kZaQG2IzNVo096bSHUrxoUwCn+2JZIZkv/IIZ3U9un+bzLLjdz6eSSuKFfQ7Hp5see9ZT5oNJuOB18NTqWqTKMZRF8+ntYaj9X4oEj8gTaUvhp47Hv5mYGIJnjixfmLKiSmCJG0gEur5yTfzgDlpRwbt3YneX6GZabwmigHzygO/Nza6PtewZiMAB2z4S17989Nm5j/8p3saBKc/BrQX1uvS/ZzJd8rTGIxCU3zF5TIkRP+AQj/+tZ3rotjes4+Nq7Pl8VS+egufhQNwrL1HnKxvf+E/79smRZ5bgD9ufuvQ9iuirO/LVjb+E/kAT4NjIQC94XdG7zbI/GU5hYEGGubz/6QjcsPkjGQhM/7y/MNyByu7ATrHAPiz3Az/HLAqvy+5Otb0dQcO9bEx6eqH3m9YY+2dd9zOgJsRLvPTuRNSdjntz+/tPvtd7L+oXwh++F0twwc+PwHAKfYkNok1XvdcpWXiIXS9tI2jvFOH0B0UXZ5U6e/rSHuSdtj5HlWeOiclhEzydivYnjMKCTTjDjDYO9TMohQTxAZ9RrRQSptNBfYVLgjGDZDiyQiVImFUpc5b4/Lb+6ML7XQ69Mgdi2JEQWuP4jDZK10wZASqCCpMFPCy3rYUTosDI1HZmEC12if9fXdDAdQYZwGeRDGCVBmWLqWyBn8LvuuH2oLSeqK0NQy3eO8Rzu4596R5eID4iry//HEIfMZHZG35Xx1+g7f4eOdy+v9iBTtyIa8m3QfCtVXj8zFWyfRh+Lyl4VOwFx547/wcjJZ2eWOAl88+8ZvL5HKfwUV3llYCHBEOyJCGIOPRI1oBqpFXUIrhscmYilU5l85tSUT3xUIKeStbr7oWlTcRO8tYxLFYIJxO5+qiMFGK59m6bRZnIloF++wmwwGD+/ERgxEFEiqTUWZx4lxgKz3PFMXuJAoIWqGsImjkOZc1cz04ck9rmrINp2bpbmRJTNHAocR+1i35svrUMOiDY9K6SHhyBz52t1qtNu+6tWM6r33vm8mPuLx99aZQbD76mJPCBWYpqol4N6v3taspDkK89+eOr3r8H87lezwIZNz4egEhQACRmY0nvnV5E48jLPoynw6KJB2/ibYKyvIwbMX/2Oqh6JHa6VOsrriKwkllYhOUkReIAHxtTU80eLyhUWzaQjvgw2xaIx0vUS9VJk34VVGFz/pi4ouxJMaAl3gDSukjFAoQTI4rufUjyzMLC0P+na1k3ljO6G9+m6qvb4SElgn8invCBI5WzSHIJMiC8g0/lL/ja8u3yfSAGlJvInXx28kA5NnwQbFwIzBY5WVeDQ1vsy+AGx9wxHhYAJ94BHsaCLg04l99nOjlII+/q8sEQeUM3gORU1wSFhLRq/MDSOhkAUVH1SMduzAhrgzu6A8MuHGJ4s2UTtHMp7Juw9rLi7zgEHsu2y04DzEwUMryx/oKimACQ0fjwAiUt1oIBlORpUcCzZbW9/iriwh3dWl3pZLFRVdnyletVq0V5mYsicGCHCU2FcUUiE0/mWoYkn07Gq+UqboEjgslVKRdc13RoYFDoOuzxm/4uFofGIX7R1M8AS5dHv3V4G2lupkBX1q7Qla/Pj5jU70Vu46GgZk0rnOBHWc2dghp19sHL9y2mqJlGvPieOHbEvNle6JnQtw+zdGnuAyzTsJH2YRoOl3Gi1SeATixRS2jY7Vj1GcQrjuWjLYVKzuy/PrwhNjr2mc4lbs5ssoejYbvVYdYbXCdFa5JIpEgqWURvKDxyqg4x//dNPVTUsNCy5nQySTn70cqjeVTD85oJvUw1u81GvVctNvtOHI+XIc0jqJqzTXryDq/1+Aino6i3+YwrL2kfhoG+yq6MODgLx2on1PUpoYnVsbQkw2TZiBiIsCDkTfX72+Njgo4vMBvsAvtZsz1VtqPECMxVTKlYZZVeLDocVbVWAwweKdmkPiM2ZZGg12Vx1S3bZrmLPnQQgeA9cxdlm48Iv8PR+8i1Qe3hUE+yyjNGfVbVYPpTkvQIwsxsHpFthYlM8C8He/kIF5z3Yl0eucaCMBx25hQOeKS/m4DIgfp+vy/MVxNihg9qdgduAOJEQHLGf3S0lzur6jG2aK0AKHxLEU2jvejLoElhwXF3o3v0QsThKWtkc0yCZVgDBT3ZLrGJbKqfPdokLPv7oiXY4dgNZDwvyAXZB0bAOJgr8vA6Yox04jGikaJZPsy4A1PQdoON1pYLYiIFQ6E9I/5Syn5+PFB09bahjv33EM+DBj4ufPSEfHbNoYQoyPGj9vh95w+5nkDph90+6/tkYg9OEqiATDRYNeHrGXCxByvO/DlaI4gl9ObTAp3LMj2ablqc14XFowpLQ6VxnbaYDFbXW/0xO4gVjAW5d+8NBdJszBz12LIDh+/RYK95pVQPjoGxFAEDYChZqJQnbyCut0ElRSAP5tvmvKJry4FPeB4nLnF4MAScpMDgwSLgNAd2xJ8cmOlGsgWTOC9f7uzeG2Ol9x7BUxis21GQ3vvQugO1yRMQHyZzF05WWyxCkeB9CXwfZg3KHJMLWTBMJhhFggM3GVkwjCaIQIFFLLYBgRFeiXEebcGL9F5XFjQUEIa6AJFBwAIkR9B7OXkCi+MmsuDdyitM+49nB47xg2typ2vySte5x669lJDr2Jq3KGiofjO0/8yOzn9j7ovmuy87pKHjHgD0pu2K+zXZfVSBRbszC62+GiTdo+1DWG+P3QZQ3SZula0uNOduhvY/WCdOQHcPg8gtsM0PgN6s68bcFxdTcNfdosEmtDa9GwySeBinAn/y7ROnQ7IoKPOqtUYrKyGRhDbo9MxjdxpYusGWUQPg2++DU7pj+IISw9Pp1XUCyGjFdJCr0LQSDGrpOrocMdgXiBJPx3jfNyrLoSaOeg/j+4sK34zp5c0bh+rXFnAZeso3uPd8QwraRejaxW3aTEoA/M8jsiVeZBdmHoLsvD78vX1qIbgZQqK/m/ibHMn1oFXhbryWSdLykPfrudQZUTuQfFpQ5uqh3z2ecedgQc7UfhhG4cHUYu71Kp5zvarzgpueAWLN7JIAdNhMrWgc7yKnuoWnHzznM7G+QoKGrxOwLQ3DpeaJxsYGn6gBWGS2mxNUQHUYIcosjbSyCC1zRjP0bbDOIA5uODYmzcOpl28BrCppA2Vlgm8FmCe/IrO0A10eU+98Q9lG6ISNj49P2wPz5uxwoxmJhGMDj9FxPBQXxUC0qsVHliB62MWRhSrp6UAD7Tm3HLwHJpykFG5DDTsqXP3/1jRsjr3W16NhtGVfnRuvVyhqdRiE3n4bvNHSdf/GexxXGI+aTvzfrqqfex57q4R5qQQHdRu6QCLoCBAWX+SnlhvEYdB4AoaHuuVFUPRpAYMuh76XJblJs0isdOrEKLJxaCEnrFEAa4NkNjiAjyanbmIVGkQFGkd+p4PBVKjgeKmi+lpq61OSJnF0A868INKN6ZlwRnANCVcNOyBQ+ON6J03BBTGEOCul9EkGqS5d7EwglvpNbf6T5JjgEcW1wCmqY1zA23UYvaCEKNMX/onnfEwcl3qObWEEq0gb60iDYBVW83nifIJ5IyUYfWD1AkTgQikZbq3bbESrqYPXZo+mI+bAdohNrnDzojYM5/wgxXFPRRUxFROnJd3KkoSY8lAmsOaNrmMq0f1a8zCgGQkhtynmYZHVfikaIEkTWE0IgbS81Dx1RjIcwHqBUhj9l1ZgojZOv/YnTtvD5ztzo42cIgZzOYbm+HBUk31UqYRIpIUAWRcAZbrD/UhlYFxB/3auvs7ewo4mG0OgSeK64Y6Dze9PvYrO5KZCy8WTOuUThZ5lToeQojqgl1nr5hiDgffJRYxRIvASGfvbXPHS3tP+S1yx2AhdyEacnvzYDtuP++ek9q9chNow11KlM0bXKqWh7gpsNpCcIISP6STMJQQpAfwiiMS8gmJYMbcIpNR52mKcpwwWTR9wMoi2nGI8T61rKSnc492O5s9pNAp0tXH4Rd/kgabdU5luZlTs4jgJdHS/3h7OKShAlnbSQ/NR3Lc8ahk4b8mBkTfoietPd/Ov42Mg3BjGooJyess27g5BgPGHZawdwQLDy8FgHUxKbCnKAyYYFunnYP5hpmJJ3o89ubPv4a/cwx7fzBGOcIQj7vBUj/Bac9gjfNRNTO42ZDyVnEf4rofAHPEIf6XuA6hdAOLQNcb5WuCc2h0oxfjirZfAhLzlHTam2C4bxBPYxVYyGTjpuAAcBVgqI4ngdQy8aFZuplS+yZeuKwOzz/lmbHYyjAtAjnja2nDA3OskL/PkIOJwPMJsCv4a6DLpeSReueuqoXEEMZF4XY6kXRdMb0BIRpDiU35rn1xsdmuTA0+gqddziGm+z4SRJ41bz/3SuSu7K//qTbn8p+vClYxg7deEX8oLrdY/Fh6h1M6fD1eGFvVB+JolY3t3ztCPCqXGY45fnBu3HN+RcnbJl1Odu3AgAO4sYMlM0PFNfWKB4DKACbNGf1CdC9fNWUUdQ+wCuYHBdV5GMSYqEVoPSCoUHcdVSyNklWZAUwouGpAWL6wzo6h3K6uorlo8DdsujMqwxi/ixbPawUFLR46zdI3lvraCdO+6Xqu2SjGVprdfFG8WnKQq4a08xjrfYjNeQV0SHWDqMMu9vd1oaA4Q378ylXyHbljBcpOuNSdqKRXHkXQ3USEcqcdyZRK27a7YRKvwRsTOuUCDYfMP1ckGV0MzEjHVsTAcdJBmCpmpapcAuOkxlkGIiNKxMJLhBheFsokt8LARuFEkYm7lWjx4qtQ1XSHq1A4qLEDXbBePezs0F86ewcCljKDouGM+dQFfDsYMnm3NHAT+oDQnECOMYSTtnR7ekbbmKHXzQR+5MyJoxlPpCVcmcZMtw/XcAPSYjxLD2WRpCucSH5Cq5kUgNANJyxmG9R/q1IhQbn6CYYnOZxXvrFHK2PVm2dHaGBWNIBhBGUrrPO85o4Qb2zEBqhs7GObzek8KCQTWNp2r0GAeftHQDI5FSVFk0YozPIuUymAaj0asWNxJa2oI14ILIxUpptTNIqPsCY3umh2tXuM7Kx+Owmxzv3/4/+6+kelmXzS9bGx0b8N9EyldGZ4ebZdTEShqHOQkkq7gZMy9JccazSNu5/XUFMyx9odqIzmNJoraMyC94iQZngqVyj3hW7qcuSHfVmG1u61WJfB1nlBVX82HAKol7rkc+OqSnBW8dOlotr814Mp6Ju4cD65ejGd+LduaoRQJMYwu5iMKBR1HRVoFOZBPijORgiSq9gzLEGB+5gecwNiXtlJAgfGLpSDkJ3mLfOtr4T7SmWuGBpwDfFcSdRQKdJ7tM0wrJvhNml6+TZKAowB30JJWQKE/ZC/ZdtGYF/frJXzrLh10Ob25H67q7pQnDjL9VnvpSleChwv6ZqdJWLUsDB+1c7WHEuvjCpdqK2ZoAhfrdRPn/G+mK03OndLcxvpF954GY4z9r+GnPrtRnrfs2ZqVevlYhn4qzGfXjT8W863eXIZDo9AoRECjEAGNQgQ0ChAQAY2CowQ/9FfQKE0MjhJM8tvAUYIfehs0SibAUWe+cgPMow4lDcHTVoZma+mhMr4SwdBWBOuT3FHvMaRw2xbrBHPnB72wdsQ4A/8BziLvl9/SXm/X5Zl0do70eh32OEyJNJzW35lwQwWbdHYtUXD3Rq+coa5oBs/N/IytN77DMeFS2moFCEJ94ZQj8/W1Ljrnq/+4ZT223lppQ5uQBOISq2pMxVN4+d7otSio7qRYuGYUfa3Nhyr3Dq+aKu/e7vFsNe5p4Trv9drzyBpQXzSQgoI9PY9QHCVJHYdkEeAmpSPKYceI3DOs6YZsoFle+4Aj+NjMws02+ST3qv8AmxVdu++666wzCec48tT1GvmP6cQTPhVefPzGJ5AtxVaq/gGcEBAkcFeJx9+OkxrLZhMtuM5+qKZqzopoJmacgAzi4fsbZMpr2Ib6oJpXrC0io2NsuFTWMoK6I1PEkooxtWY3Ui18L4ux0wZXDEPbZQSPUJd1yl7qMWMB8WwjyrAqYf7+UM3mjsm3rXVaDHf2cuO4VhtSuh1vVodgFbX9G0a91k4zjGtZp6VIEFwdo7EkMTvI3sJdQBsuRR1ZemhuzmoZ0YmZXvPaSDWqUbXF1FuTBYIgWS/a9ioU6wO9Vvue+THsLuQC2gF/0DtTB0E48SSltMbkA0o352lMah0ONSv/ifMxyNMYHmeYUM2x7q7aXNAw6NIzfjGLKH8l3NeYqLyO4W4hF7iIYqPSEJ46U4qNDASLRwwjgYBcQ3ohLZ8pZT6PsG16I1mL81yaph9RuKJozQdZp7m0yNyaiUkLZ93jde3lNl6KZqJIuBScRd7mwwjCsSBKPENTJMNzKx97CergCvUXj2CuxdP1vRGihikhuZ2lsm2qxgzLcCxsL2H/i1zgesoD0tKINAGc4TSY6abUnuANJ8DatrbBDzNfViydTSWOUpU+r2a4c8iFP8P1HzI3OQUeMsdCGgLvwZmN1nSW5C8d1BBJci/pYZmaydDY7kucsknQBn1hUF/h/ALN2xd5HQ/dwi3pGe0FP/xotzeYq8vIL6awfzvhn8qZamemXbD8NacbjGdU8aEuin07FKwhpyrhbdgYsNJ+er4Wz0EaUSvdTp4+6c8QEzzl+p5lBUc9LQsTOWP4I6dsn4Ej1bXVNF/Tc+3ZqoHi+/XNIYpQsO+b7v7+57u0kOmOVlSCm0rqoMLexVzrgOCcNazG3Ln4IRJboJNJorsL9+huU0lIZKskQ+IorPdFHi+1sRbXsA5Y5kRSiNVwP+AMqaPb6uNSlkBah9gzBLTHUtDcrnYt+b7XwsN80A4C+N8PEVdpEseoUYpmeWWUSxkoqkMLeEdzzGqBmeFZ6fFSm5rSWN1+BGGcEs7P1y6evzw5TPcKqX6AO1PFUEG7tkijaQO9Lwpa8taJvVzoYCKBZj1MhdwrrmbduNUUZmfrJOHixZ2cEsvn47co+JSllDq9T74qD5T2f+TyTw1SBn+o3lX7mBD4imyGTjIN1A+batkxOcLfd+bFwsLCwsLCRCYWFhamp4UIJBamJ4CIhYlMLExuPPMCWFz0Xbkide6mJSeWzg2xc+Jvt6TOWkltzE1zbCmU7xbxlC2Xi+d7wR3Fxtx+J6k17EkwGoorR0ym2p/W/m5r3U8D9Ji/Dfdu8DYngUkmmbSP+zoJDnFiJ/HKZ0zeah1ndRL+OK1O51xesPOv6HBfDpXDpiydZjisfv33J9dmoJJNFtJxXSf8QcVoZHOsiTnMbudxeTgiisgEshyjLlc2MFr6yiS1Z/wPxYWgHG2FwHXecrZ4UYPbLSUJzoNgYPQ7x2xTJDviCX04f6zpEeXhmnhl9HSh2SuG1Inhq3sMCCqugZgB58RK3BQ8IscyeYsgTtlSFynp9esmrUx6zcrfFVqEOXsbLLn11IzuXPV9pqVri7PkZI66j724tvJyMjlKW+O9yXuetc4HzQZLvjry9RmYeOhJc+DsLgFlroaDrIEXlHb09TZ1OAeHVq5Yx96kIKTYpzIpORE/a3JqgPkvR6QaD/yIz8P06K7QdmbSbXrwud/SjVNhcY2EdYbsyjGByqdPz2CmLGesGhE+RSeQR1AIJ1gnqhDWZYN4l3hbgxBU++ATIAKgOsZasMV25Qi5bZHqYoPMJBPfUCOoooxXB024jq+rMWwJLuCvcN2Hs0lbZh9MhMAzfCWqB/bWrgm5DfZ4lYA75jiEC3kLcnLbgeHqBuEFVE77EMHe/b9RCuOZelDwAbl8SOkc0fFFkOqs+4FoIr+4y3Njwtlw1hpBbd0uvG9g84sUwmw9QpxIpRUl+IEx0/rGsj8yMsYO3iirtSISrehIM/HlfOaPfLd/VFdXV5dRl1SXVVdS59daDsMlENhA16YGzisu8LKYg5ujweGh1NpoRS/zG21x3ssg9W1r3TxbURVBHEZ0ngY81LoZ7MtvxVk38JkQ/3bQvtGEPdN1Bz/0OJKp5OFAtjxysqvRLQRV8aFsSsOOXb86udRSFE1LqcnKpA/VUXukKzgxYMyX79iofgjrPcfHqY26yiEG9GnrxYJ1u+T2Ha5LdGdRZm5NE6o0GCAEVOEizy4wnhxmBEpirOpW64oxAR0NEoGHRRxjQx4czj8JGVFR3kIhoyFgiQdP3P3axkyRAps4P5fYqkOzejUV/w/eehULlEEjPsQhzwS1qjiRYyFVrlDiL4+Sx0/i3I50IjmdPadtH0LBefxmz2mLzMSYf07TEyemLm/2nEYIRLuxum9VLgI6v8B3RV1Uh8/y5IVL1TXVIrfM2IYoT+2YbTVeI/KZijLwSHU+axR0MVOSt+3RFh52IHjn/+tbzoPlS7jW1szFhz7FtadBHl26leazEBwTH3E0owfhUxbXsgef36pvYa7DcZ/PnLPbaqyFcm4j3X0Cr/MbZw1jAlto5OuC1taXBv7rsAYZIE0LLqU4RX5Vd1FrQNO00NIGWEGPUfNEpyM5XzGwQREfaZprD+MzrYKUcJeV2rl9hjl3BDH9EqCu0yDuhu40uNKyTEoHrwM/f2E9HiIhh/QcDSNFB5VDIVJ6GAk8WKoPLp/CSP5BeMxugxBNwTjZjEQ9LoIGnKI7pFowDszKinN/j1KNAjDMQAgz1ts65CoHrigcFcxM2m13M9/p3JOyM0t9n8eT8Rj5i3YaV7RWEMkfVTQABjRGu8cYO1tQczfFlz8EBEmYvzAnOsPbU+VJQsAm3C6m5Vv/3YTTFRM0gINZ2GN9gsyWkpyIcShyRiWXFFiiJ9PnUnFjK+F8/IO63/P9PwROfDl76+DHKXj1/se7+1zRair6+x/42LfHb8WuUz35r7tYEH7KSeZup4DVCb4MDzBwHPnz1c5LCIh3RP7eOY3iZlKTRBqu/ppzrPbMX0GQFYvMR/uw92i2XnccZ3DDZfGGT5nqL+esLp7e8cpk3qrZmAXRQ92ASWcPDNitns5k0FOP9XgwEhcip1xWpbG+822a+MRROIxfnrWWICeJd9tgH0X4tNZgdxkjKzoEaG9TenzWDjkfWgFieK06UBKtOSDEtLgE9/CcobVCBOsmcwZDbDyBK5+qRMAYwqhtiwRxnCDX5iflMSe+LC0+N2f1WDYXoWlHpIGxFGMNINyXeqrnIVm70QDWVbNYO2UM8+Doak7zhOYkA+MMtqdtsDI28Cf0GLOhB5P5SiVGEFsaR0MGQrKZkE77eEQp+baUM6f+//bh5SbNm5Mg6/1J3yl65oqskxguhb1hPde8c4UC6XsUdCrp0x2bmW6mdCCZJ60EnJuQED+zgZcxrh14QRDxAIzaJG7IcjzqjTzVaUEY3ejLVgu0cpNhcO0PtvpBRkNP5knJ7wN1CHO2A9s3bgnrSfRVq90ZThQwMEjZ1ojf6Yg9iEJa6+RE0FSJnH918aKanNDVHTpvD/g6qjBh3pG8FI0nKs3hsU7MJDl/qieWZFQtzN74RJRdnx/vKRcCRoYqxSTBBxtaYx+Sc6KkJ9vas+0B2PvSSG87PQZGICSMKbzUqVbGuDlPNybs3PlQGwUI5WMjcKSShuI8j1ocGVoImRc/vQY64BW6+5kgN3wlSTYbILFFMYjE2QY44VIJztGmJi7jVaR7I2uiGYiEMloqT8qG5LaaeTIMxWllr2dKYXDt95adbBX1nJW0ent1xcL3d7AmO/2vhzdHbLaCsF7CkasY80DuFdgKzKENgWHCjDbpWinNyxMhM9GhQ18wFfVrsWHaTITMhEsV1cVKNYYYqkLChNSGAc2heWd2LMiGhDnJQBtECCUIjOiNZcBix2BX2ehoauhMyOuLoLlsY9UcLywwBOteuAg6VgzBiGsPijpJnbXKtIIy6dHJhL/XWiV+zAoC6mmzJKOg5E6UGG4fg30jr6uxM+f7G6BgYZPvP2yS/xAcBAfBQXAw8QxkiYPgEk9p84mDBBOb2CkZxJp4MlNwMLGJcuIg7sQmxDvbtQl8RuF0BXJMd3z7Vg6rPQbHGHBN+Lrs+0oF8AYV1lBOQs06iQGlf85al+dxBdg0wDo9t0jHcuIiVFUhJLIyhAfOgNp2maLxQ0tokLkcc3PP1mXNjRG30+uO2SJqV5HLC7o/hry9+eauRO7zxGyOarhoecRmDXcIkOdDvXjElnEzuN7sjpd79X4zdZbQDe1O6/ppcZ1Ivs0CEZRITd4Ou4BNnlOjZqBxvMgs0skI9q7U/3QPf+JmI9GKIFz0WEdqEt0i15HTmxZ5O9z5N8+zH2KCbEE8XuOJZ58Q98ySuqLIjPFNzOghb85sm6UnGL4Ty0iM6oIOLcF+b0BAfyQWPganvwmNIbAjM2Kux4KKAO3sDkwqAR6vdQTzHUZAgwx+xxWy0XKwziX2WRhl7MCHC1n9qFosrbH9PVQG7PWMX61KQ0kPjtekGELs2hyC+rd5dehOAnyL1Co6H9A/t9sINk/rLlTnv+mBLMz1N4ObSE1uIkQE6EJhrITGT+B3QoKuJtMds8/P6KFP9rlJHJoKpxaAyuQCqLF1HChRerCOkMLo8wURMwUBGhRWNlTau8OJZJ6Cg/XCeWMOA5w57MIMkUEOPmgXxAii3MvKJSgWFp2lnLlYQxg5BacUQfSqiTcCUqo8FcJrpTC8g8ihYoYgKn6dVRm/BArWXhahq9F0qZwQBC+uD9J5XDJ41rwgujyBEYSiu9FhgqRrSJkTJOlnEM5RWbUpb+PRmSP1ZAjRNJu8TntYQ3JqRSE0tdgYRe1oFPhxv8l9KzqDyqAHYtSbW9rog+7OXGuoKGVS6BQW1GsO7DJqRBIyEkSikMdM2MGeoPQGCWWjoWl+YvwwT/7ehUd5wrmQUlFY5pQi4qWMpOggXGOMbCvgBBZ8kRicY58a0zmjhOAmZkJp6wTqtKBBtSX1zK4EG0JFtgRCGdY2IONMrPVWMgycFi5RIsOCFDm1Jwzt1/axt3lH8KxRZnMM+qEoj1CBe1BNrYiJ29+LquBzOxmXktHpCYbEtZJwinl7hg3b6jJOFPV0n9W6yh0Xychcy1Dtc8VnjDBvdeCA0a/xbIz2a+quJIZsuqnr5LhEBABDVlohBj0B+3ngZxvp8w52cLkYQ6KGzkzPBzLKhdBFLyuE7dkbOsLiRB0Dw0M8Xm4MjQ5HDYL1BS3e61EmveZwXv295/2cwhhzkzK0rsIMKDKPp96G8C73RwIWtp+oUIicfO/Vzzo5jLjkEvc02OKCS6nP0/R4dwC4LIXf0heKvfNQf772yys6zc1091L+em0TOY1oJFot2H4UyqWyPuBo2CvAq4jwUGVeAr9R5SQXC8pQGXzg1nBDgxWJCE9SEqSsVLFRkXivXHtjtNMpAj2tbEPqQ+xcZ/cgiiyL7khWHDrdiqocAbNKL8KOHYmWQJ8MdBHLgPeDbhHTBvHIHwJDREut1DuXnDoySJcv7pDk4qf2CmVwveTljNVH3MA9K5zp2GamPRErV64rEIqTglWWqunAMJxYS8EJd01HOMgxWHPKbEMpJtvbo5FTM/S9YZ6cHuKWDdCWyeoz41uAVVMEy0/QCpLU5lgDCK6ClLVMOaBnhIpS+PxgALwDfAj8TOorWYhxSjUE9S1vn0on3KTZgqdVSuBvv57ip3ceSnZJMQfvSEGEXbtqlxXRJy7HUuJ25CROuSVkjXueCDDGHLcD94M3gQ8co9sCskG596FsO8/38UF/39C+/3qzqKZTW43iUYSrCuSzp4J5z/aZq7TdJEsaQe5lP0ni+GAlNA2ZXTQys2go9enS6rRqF24aEQ+SkclmCZIcjXvvBZGzr67DhT+8FIPNcDjeHv3H3hKtyINWLo7LaEjw/IT+mG4dZIA51OYthRoHXvN5zzv3xf24dVyottBHBuZNAEcrNyz+5DfUrpIrN1FA0LJoVNMB5zFofTReCEYH5xTJLTMIJf68x5Bvi7i2ENEN50u6098ZgvL2s6DJLKjYdYjeaZocxDHWPB1d8hoQb96nh0qllr3Hdf+rL89PO9BviKrEIrcWPGE0aau8KoFAwFGlrS01cSLFRpKUX0mAqORBJ8owPRQGTOjB549gdA/WAVsn++A3LNe/Dfwba3R7DDx8Bp1IyB6lFpAK3KGHiV+boVFjhVxAxmuPyAsa3U1lKZsPmA/IDLwPCDgVdFpKQUmx8wDPV0n26LoRjRkiWXvX5QWuVZoICmxWZT5CVugBSoS0XDYTJ2Ca9QHIzFJVDNFnXBxDgvAUO9ltTwVKuYCD3k3KHqgtNSppU9xKx+Npae8T+A84ZaA3Z8sj5eAsIrGTt7PEInJlpZGYy0xGlULqHpgtkUrORS86UMVIenPS56VfgSRVkQJHneLOAq/7D29B3i2B0ase3ac8NazZss/bCJ+cRpVqDQKHuBoBwJNEIE6D7xc1B+JgN3gV+G95e2kDrxqmwnH13poEVIOAP/OIZTZPFwo5pkvjKbI2ejcZqHBvMwA0hJ7NRjJKwXQoDJ3XaFqOrJqNERhKYW0swLljEfoEofkTdnu1U4xmkn6L3DQFD5Rmi9knK7aUeBJRIo6TT4Wt6mK5US7q3oPUNnxMNxUGTnX59lUki4iRSQiup43B4g5G2ybDp6lyLnlb/ZCaxXpPkPHErbMlN/8Hy29VQ9E+BuJbEy4XeQVKk4LVpc2Gqngs30TlnEYgZaFAj9CUgNHig6wad1lwdLhIYLZ5INFiZdUxOHCJmWsx0tIMuCrFWYoWe6VU4PSx88qvIHgFts9j/PRZAu30YDoyUJJfdjLBaC0BOzKD3lBJWb3X0CGBJL/QsUAWeYot2SEIW25genn0ZchPtNnk4Yrq5XZJSyJjtBrynzLl+MWzrVKwAWxppaxuwpflCZ82HbwJQkjSfpcX0rAUkZEstTQ8oWx+4Dx3KzAPUjAr7WlAiQcElU3P0dC0bPOdC/9cFD6FD9Q8Gw5Lb2mGdQIY4Yl8GZAFJsDEQIX3sxbL0IxVIJBic0IkXWo0m0eUihfwZemwN5zgfwt/YGP50EMMuDewZQ2pK2Zp3zq7a1VLCPH9pg0TUHv0gBaEJpskpCjZYFcIKmoY1oP+c5klb2DuLwnDcaOL8Vbl1FKVhzs3eHIavvxtq0P/f3LuCbJkSBSUF8VtmGuNCYN8F3HTfo94hyhxWdZKJYljKMFicRfm8bc1M6ufQmpIqDN0b5og7sB4gJvuwdwnhc5kEB98EXiIe/CZ8+jJwd9HaGEaUBkNsMbZLJlgARAJ95HCXVPMsQYjo2xUR8jmWyGLXl6yW6xDAmzmt6fpbVOG+qc0TP4OYCs+ToksCH4PvB58SwgNJuRnS2I8RWHu/HmYvaBuUBTC3FYIpNsErEAnLMYghHw7BTdlGbpb1YwIn1lTHAELfiEsynIHkOJL6gXZyLfwvRZNGdGTlJ1AR2TTpMriCFe1W23BbXbG67b0pTJGSIl63Q5NtNu28S4I1BJx3ifx1Oy0Uncf67ei2DlKdd3lcj7q8UiFC2hoPhTbGlp3n62HAsbTOK3Ch5PJp/AH7FgnJVt3SSu0LzF//yDHNodHk9FW4RF3um5U1byKATL0HFPRjqHw9vQneB8n89IYkc27XLM+rpu2gTSpcQ0nZcTJgrbMN11VhKQOyq6jFvoIK1iQtEEt8nXNw3LOs6wO89ImmxHLxq+VFM7V8qhPboHjVdX8UJlYym5+mG7JHZSWH97T4OFz/6q9SomueCORumEeZwvV9nirURZq5WiovvgjkTEPy/yt6xC04SoGvr8+PqRYl2Dn35L3oODPwPtG+x7biQ7VEIkTQUo70gROptGYBqzFEXUf0cE62zmRJFmGBuWk625pBE5Tv4zLdsbi2FQ2W9Nl806An1KfaGpk8Z6T+hhwkQ2v2U90FBfmaMceknwqcia6fvK4nwwEDojVI9ame5SuDXS6JEo5o/sOo3GZB2hbsOHWGEm7OhpNwFlrxDbUs8DIRBmszo89NBBzue9TeaSPknnnQIiD5pfr8oATQzq97ZySflrzcHu7vc2h457HPgyt9k3ANZcmVUwNjZkMBr1uRK8BOvuwpKtZP+kS3XXdLguzS8BpHUXwfJU5+1gQcg4k4mEPv4CVTmTFALwFPAweyeO7DQ2EoObk2/tYLqgfelTqDxYWZTAl1h7I4vfEV1nn8NuRoameem66U0oalFdeHiBfEKLo3TxbgBgcE8vzqJBhQYUN0Pa+9P/bNF1UQq4Pvwz89l26A2f9tyH23vftHexghG3GWVRWNNgcIF4QwoU7/Nr+8JCXNjB02f8IuDuXunB8C2PoBNv76oO/NHGvljhd/wfxqJZZ+uF/iGdS8ayO9ZDVZz5lCYmsV9YGFC4IvEguJESHJw1iowmwFEMfvAq8E3xk9eGX2JwR5w6JUvJN+XQ3HBmOvlHP51iSFW3SUwm0KdcDycgPfM/0CeMkvD+MaHbRiHuA/N6M9x//D8nIa4s7HeH4afLq+IdTIwynTM44Csh2Ucijp+m1FazG8sfIy74qDGJD/g4PrJlt8IMMxO5+smn5g8SpGV77fjz+7BMvvfnbe7W8nmXbi3A+nxJ2xKizDZzAqqu6fQnGoJH6pIFBUQH8fRXyI6F0Y5Xb5FNpycb4NAsX1Ze2nkLgDSCT9RblJkISJvFJYh7WMJQHSC/RDPEx5PHEEB+uwirzKfRyENYU/uCrwBS+IQWSb8+uBvZz8gbtExhV8h/OQUFQJVpES3C0JW74Mo+GhUIhLUCk0ygVEow88tWcGE3HJvd8kMYINcp83du9mawZ4zKNebNBqCnLKQPdMRo+xD3AK0C5LmkHDxhE3YBfPVIqQwcaI8S6eJ4zPiD3VETC1LQdXmO6GzPxDgGthhsvwSz0YFHm6157PNfjoFmLusLbVH+JKPaM9Z6cWvp5ng+Salkzb5n1cguTuKqkNJ+ZcnA40vQe9Oa4oC8mk0Ogj9deI7uTf9jTDN3YYsGn5+biTD/a1UuDHBwCFiYglakCZfVi57hv00Zp9+lzzQ1VoSXd9Ps0QweP3qgUMrLBELPBP4CPjnYLv3AjgdKbAq9GpaIlSjmGK1QLHEiPNJQZwYxfelIC6CPRodElE5KPcA5EOkYnQF57DZzTjJJ6P5Ys9UphHOAgyowonUOjq0Mxc1gZA0645iqviyIQBI+7/fCvqlsN/qhe4LnUSMMic/xs0HSLJaK5CZzMJB2r58wsglrWmfe1RQL6wX+Bi/dtafSvTEkZDCbL30yozIL0M6XdDflpPpF6/SxRoC80oa6syS8/5TMhqhAhNsR6ntqCeiTHIUaVfhklzTyIpMc1FEdKlh2KdmTAolhOwuLjtm7IbgbJ+lMuYlndTkZ/0ZqD0aTStNfKfcBSHSQyYcMrTrmPFrkZUdkad3BnYByJ9iLX7hGUluZDo7UVwmbkZDdlXBDswlCarKKbxLoBFswTdpDy7gySJ0unT3LCdJ51G74jX58qoLlry01ocHGwrkLPMy1D4YWNa7Ofu1asd5FCGPEenYZ+t7EIABY2mFid/gC5wTFR4Rm5KmaPxXVzPqpHom1yaA8LXJr6/440bIsAFjvLmMxuPVBwWn1/JouPSy4Q5yypNJR190DI35BXJaXH/NmI+wuZw3B5jO3ob3k7KUdmlhlNVEY7fhaM28pOjS/3zjkdee5Uyg5l3br3iNWTxTV1rNkxDQ42ZoGca1zqM8SGla8zYKUzJH7ZpLoErCA/xGcSqNkzgCsPJRC2XNc0ZcFa8PXla9EdQz25DJ/wHewFwBhnC2E5lpNN2jhyW/lFMF1JacuEw04B/tGTMj05SZn7/BzFrifpihoO8x4UqRbBls7VMIuILdxTQACxaE/T4FSaMKfpK8EzlWs9JyrlkcP/zPnpcl2ukQNk0ZX6P95j/XOwPKLccsuOjTHvt4tqfSKULmNmdgq7qV22XD+XYYmuxfTHoa/IMnE65QGtaw742td3+ynYS48dqdh2k5mEwm7V9pE1uCOjvUc0wIvA310F+0USvIaSPiwXCI9z1TS2Bg3kINXgw/No2gkzGDrPMf0ZitUa7h2NgkgaweCXLhBdBXuytcmEhUL5ARetCsKvVhWotcKuakcwuKTWTU7SxyDMjaaNoUNMJYEchtqeaE9+aIkh5/o0mpfVtPDr0x8FsZIQsSh+Mwy57+c9tjcYi9QKDqbHEc/M0w9lwg+y+VGbptIxk7Dx9IBfAV72Ktgp4v2JhnkQh4z/rh1okcuoO4F15D6W8oFQ2XKaacaChgX9y7eWaQMBAX5visB8Wl87ftDyaJ/wO5n2CBqfgA4lf+FDVIjI4x63DWkydfB4K9s+vCSlyyITiAUISpQupsTqBex6uUnrGReNKaIIeEwBGghBySo24Z96MSyZBW+/GpKsQp1FysW8T+AEY7/ujPxZYqEOsL5AzY/QRDFTpoFp0ke91pPuMVb2LZfarI7b0/5VTTcy5V3lPkzUoGkDCy4lpbue1qat6zp9qlTXN7Vz12qJirhJ016izcFtSaQIdh5vzJUpnaN5OUmPk7zoc/rQQb9Xn2Yhb4CydPXtUca/e9Fln0t0dRyJ+ng7nYiWhw7R/0qRwawWS9rt+BmZ/nxi5i3emEyNGoZtpTz4uqmFThp/jCFrx7rrWnpI1bqDpDf0adtyLchlSMSsxRoDlszX4W8ZAv4SfBXc+SB2lRs+RMYVULjUQLGQilu1cXWxLtOIkbKuL2oWheBZKZ9NplMJyzKjpifhxjBw2TvzMZdUIZe03M2ZjAVk2O1wUdZrTVXiQ9DCi1sBpi0qZ1lPJkEQ9y5JZXO1Qikzckql70P4ObMyLbxgAkadlfR0HVE7bEzF7GmH2q1Gs/3AxEiQ1bbfuOrMlV+aBuGbOrthRFe5SmZkfacA2TMEyYlw8dCSR2qsve7qyjfyriWpRIcy83KlQXuavUqEOkxsHiJmtc+FjdmjAMZdlSobQZclaSa17O2vdSWWEjlL+x7IFj6wjBIttDo81jsvq1z7Udj0iMvkfRlKMdh448c/3nAOjG3HQ/fos9SQzZ56l87EnAdGAo0JG5gxSF1Uq9Uj3eFxZPjlgI21LNhMrU2z/qW49eqJ5b/htjM80nPxBYNDfGM18fTqFYkXZfI5MX7O8beMMl9yE3n+256JsmfX4RzV7RP7Ih8ooIDIrcm7NW43Ds0yrOWrr4OnZhr1UuCzf+zhLBQJu4ZGZMOak7/EKkdNFvXMVgtV51w/gwJ5qmzq21ObERu3RLbtdoq1TjmJV1dysGQG2Jt17zjhn09nhcqOCsWCtdOKLOsHKqkQI1Q1qduculookitukBXKlw2x3pVR3XxnEtBf9nrtNi4hNE8Vn9LFMVUcSaQMuLzgZ2sLoxZsB/rox3AfDyte6G93JRut3DUMTDiwghy/sh43GMVkiMh+UF+jnbP5TbF3fOw+A/Tww3s9ljnIrH3mekEJPPWGrPfOyUaPUxLSV5t9RlUmXMTemBiRrPs5yf/XN3Bv9099iq11tFySjXCQMcAtBglg2B71WFRTmqxFS4DLPRBqT2G8BWkORfUHYCGjNEsJVhsxSEZRrQWorFtzCwdD2+7M2pyHPAJ72YIzxlv5wIWh0I0OTGFIDTbA3eA+p30gpE4RQ0IXy9yMn7hbL8kU1bj2EBkuOuYd0MJytNjAt1Iq+EWB1v0U5Ehx6cAsUImWHXZ8W7kqMV4kYuILaCyeLVTnIuhBd43NSUhPfjskrT0b4YEeBUKYCAahJLIUiZd3xWjd2U8MsJ7au+//eDo3q0EdqUx6Enf8YTVudEvlctIgL6+CpsE9zurBOXdO9dDSznNNJQfJQN+sVqv+uv/lQwZiQlaTwjENliYha8lPWWpgFCztLHAwTLy9KmqG8ViuMUImcvkfHOvCmBWBRl9vO4I9Z8TRqXN2cruWBDjnASxi+ZNzDuHe1DVdBPmMhM+5BlQs/jzX3G0ZrOcMnk/8QbiiXtQ9SQzVuFJCaaAkorWvlLB6KImhWlZKRG2UxFANrQkIppNyB+PDEOO4Vha9tppizDYOhHFrhXyu60TaCWHPWoWfuMukmY2rJ10Zicuqnb0/OpHF3CeXPr2EyzTjt7JcHc6lnddlmewtKO8bbwEpzdNKssz4+/XXwh7TFSRQsy/E+/mEavgbHJiFHZGxZm1aLX+uZiNj0mLr1a1DN7a5MnQ+Ms6Rc9JCpIaMRJo88hiUAFI1eWpLTXTC0cnVS3U5F52VShcATu15mlUDkozM4qzCIcbvRwXri9xrGhYUJCMyi4rLRrWz7/93L3pweS/X9WgaLrmFwkQbjzhxPjYJqnHFvfOpgRjVIrgfedye02h229WhmiTHOBBDZLjS34R8BgX0JdJfkipFstxRRIAB0WdE+pq1Vb7HcKfDC7sqNRGOycq4NFLnLTdC+qDF/THhNOsiJG2BHl2GHaBv6a2gV/IBV5RNp8U55COVctmIQbViF/BHnP6ZY2KJO5OHL7leJ5PmQcDNUu1GzGzmsh6u/RkTqBH8u73i2NSEh8IlAt4MdwgH7fNR/ZV5JA+H9BK1F0nRq/wzZrHomT0zQV4kt9XJV+bh8LtpbRXeTTW0bfsZ8yBN2CPpurZlbg5PvxJjjAgqmY1Ij/Ow7ZuuORA+Y5YioI1TuOUxRTzV/2nBWKmKxTiakDMQhRgifA9KHnWwPpD7wvYq8ATBNp8xqcwH4wIgzxRS67PS6lqIe75hukB6rRVHWVRwJ9NK/ToMNv1IR5pZHplxGgUqEqcc57Y+9mGdDZj9RgwHNuPq5hFQ1BgqabWdcIdfPrGKxsXjPEYNZ+2hXKiJjoO+evIVErJO3orBbZavhPU0TpYD5Lim5+q6WoFPnVQwKna1AuJsAzOzWIFCKoelBpLgDvA14DtBFVRBdVlUkL6g6rKooLwsKiiB6s6IbcBfVKGMYzuuF4p5XK3EDAkWLOVrxMmGEh6s2UC8vl9jUxUGphaBXKrB3Dv8Sm2JMKYXWfXr+zXnw72FwpI/OupcjN3Gexoj2dWte3bcNLCMHp+qZ3Ct33fqIUhz6WC6G6HkkpqeYEXmrM9TZzGorYx3yoswa+S24bhneh2/Kr4wZvJyqJFvf3hBAd/AnpiiO8dOPKxza453+SzNWA9HPnmQeelN+x1nzQ3Ctn3wpdq/pPLIV/s5zHsUoBHgEeAR4BHgEeBRMzvD5c3+AP8BG3sUpms0v1nQr/fy6j5meFS/RMBjX5+NPIr91Qjw6MqU04ifHgVoBHg0e3UODm55vZ9hf1YgZVmtu2xuFhclQgzoEPACrzozixi9vLoHRZ2n4zDSmH0cPeJGqmpL8Okjv2o2LVx9+kg/Iikhws/HcIKoVflSvFVi4i7N/nNKkpy9zjwVDktkRwQno1SpYgZTZF7iiW4XVDiLf2p6hufdj087FexY2N0PnguSSTthJoiSaVqiUQ07IA3hBkRQDC17iDZ/vuJRKk3hvyVy18PjNIejYUSDanh1wVjQIEf/nvwf/jzUgD4ERaG9aQO/GH9dHO7lY2LwLbYjGsSWKV1kzIWIntkm6+W11rd2pl4J0UWGYheHCyEziZDmrANgSmnif/gmsKNrvihJGTSDKN/MNoJzj6AEpDWX6kcShC7nuueee3WgN1sipGhamQsIodMqLhiAMG5I728ZMdaBTny7nGk5CNJjrQtn+kzm9r060J93o3BwlbErgug9cJoxsedx/H2/DVfhVNCxNXGgj7J+Lgjt4ZkywyyjyWJ2gwW986w43K+DT/AFMbx1P5AMeoBrSryHEEEm8N1mUkzTgpCRWCFLcRPbtyNaUG7fxNGDxQznVowbWEvrM5qzirqoENb9m890NZpAiIM4XCJb/kWRF0ROhe+PGjaBitW/XJzsrULQ0+rZkUlK1tfRrsNgeXwF7kQcgBCWpeh1er3R7cWej4UN6xMrvodw01RJp2mKowkcCWQ4YMuE4FWcWHW0L97KN3gVHTm5Hagp5el/UNvp8WfPJMjyidlrI0Vo5SOfS7aXMGPCOOM4ppeCwle6iR7lEdQtSOJn1xvGNbAjeum07gJFsvDPF2/pK7wGXTUNjPNp3dcdHB5+EUyboeuOHauDtk+Eih5G9+uWUyQsdy5PRqOTyHXtbr48WVRC6BQV3dlORHj8btIxiTMEsapRoMM+JWo2kqKHHcBJg5G8FYPuPObW3SIT8N0G3a2ZmiLx7Gm6OWmW4+UnTWG0jHQuSgoNE9zLWEpVtO1EAU5LYjTagFpcafbC8nuoRZHrKkSNNOX3wINNHvvqilrJc4ThFYJ4iJC2isGBMDxKEG8RCsG8y4SOM34liP8IbSNZUU8So4VEMyZipxMaD8MRCk2ogzt7nQ3JjSVo8o5YW7zULgnajcWyacA/DCPqLtpTKHGVxxi1BE/cZVj0+KzN2L2leHYs5YVwLvHRE03uu6kcjet518bHSA/3iUy1qMVpaDVEDVbJxccy8TJVZehYvvxTC3Y5qj/34MzEY7I4F2c8ASTNnVeVtTPu5nhLjF8trP5dw341NDTI2YUIiBgbLWuGp9ivduchNOZeFeO6iJC1iT86ZLyDG1+EtYMxCAGcQUMF1x7052aZlHAn/mW9drC7Yhi5DBdnxss1DqbZaI1VDAO+DRc2VRrO0Zggfx6wZCqZjIucMRQjCPM0MQbW0p03crKb/u1gf+/7Dc6vJpXAsZfA8ew01xyaLlFUT32+hmaiga/LQzDOw8+HKw51Zissu4KnSwWGBsti8Wc3v45ptY+ncnFTstP7KC/PtWyWpnmGJMIpheJ4E1rHt0aQa5yz1U9zjqqKecwUxDVBYOJPVT7bKozWTYTRcbC4HKhW6Z0935lu9/fx516vlD4Wj6ZisZAmfLbYY+uOe3KtDy25AzrVyRjJd8Iekwb4YTN9MlvIppMxy7BiCdOKxmIyFVKSd8PzJU2mTQHHYDNQYhApmjJv/88BHtHS+0I7jA/+5Hjv8/75hoKDcoYGd5CBmZKtdWeHitGfc9qJiFK+PEGaNmGZ1R13NcKGgM5xZGcuGG4qbCgOkvshxAEgxKF1AWRa7EAhFgrlsE5yTJAqJnScUUM71/aPeVz0P+b6mO0jmfDwl1CG6ofV0w0hunZppHu/6DauKVulIQTN2wOORgNQxKmaiwTB8OPjrwfncBK6mXsz3FjPyw2zMDxfj+A7cL8O+LJnp4GmUNV2maRkpNba1bAI/zJfrs62497kzoiFSO2MdotuAAr+KIHRThhqdFgKDoP/A58dZ2ZvItTQN1v7EPMG7byjPWWNkcL+7bGegGHsYGxU3z+jzyilfQ0Vkq3S1FqyDiJ/XEZ4Ov0mzor/7csz3U+/tPXkULIYfBz8oEPVSzqb42axQ4XfADoEjBcnzeVa2Rx0mZX7xRNWi00WHzEqjJg9g7ROE/ZjZqX1ZK2j+zyhp0ulA+6K3CdITaRuDb0l9UI9qzOuXBbRs/WmzVNlIQIGWBYsC0inOelBaqRd4dCtfDowS8bSwW+NYmhZnPaAcFJ3RsbChX8p58fN37owQdPnKbPIHzlSciCiGLgiqx08Dnbp78zoYPx26sZVYZGJkXsMv9h2pCUybcRTDnP5sYzAmN93rNHKiBu0/63uYn/Wpp7+eYauE5vY1ejXAjImqpGBppuyKh1UJ5tkXf/ztkmZPu5UtLqyS5KZpNWLv7wnR8NVc3bMmdtwO0E0jtKy+B0wEmiCSVXlunb5aho4K/9Rf9khTygS7nOdSmM7yBRa1byO0HXUgUPFKxngf3VVa+WXR9tb/se7PdXt3M7J7TQFPZYTnXcuxK2N8sxaPqFzhL7VtFyI6qmBO66CMkoEjFRwAATeVnAVivvZhPzUrlVFeM51NYxFc2ljc0gYNuyWxcjratUu5gSMQks37O1tScKzG2gzOgZ16Xf1kqeCnMRtT+t4oFkb2yUznvjXqhfOYGlXzqNiuVZsndeuo1MyUV5xNx1WdicPDL7k6vZda1inDTjMY4sptPwgByNmNhF4p9F+NxvAeSWXdObyosOX9FFxc7APMc9K8w5eFYyUw/4+DDoQgxighmQjL+DJwdbM/1SOZvGDvaeexZ2tv/zRMmxcWuCbwMfsgYlMzRsViWVJX1YhRLU5qFIuHnI1hMkqidxRJFWWhV0GJbgT5IhU+bn6NUShQ/YdxF4uJ0jopVJlLZZGLa7JMhvIcqpslLIaiNtwNr2vBMNVAyzc3VhhlMEpq7PGGnUHz4SKWiNUFmHWwUuMoT6NTk74oXIoYqwQjSZm+T13A2X2a0qU+lTGJi0Yh99rkvK5QaurMOqzOukfUr9k1Qxfk7dG+wu2yYy9EatVVhCHs0lCXU9TTd3lKHuROrkkSFM1wuxUSzrEBCmBJmSxqfENHHcdbGGj2zqs8qyeiAm5Kyy/jpio0L67oTbzrR3v0W0mOzgyXkneaoWsbpmQw61ZYCY18ksEku0ZosIF6P4ce9R+a1D8l1YiNOBqPYp5dX7vYeybV0grZpetju1QvH+PBAaZLEzS/ZQlAEaN+pnMrFh65mD22Hzmx3vLfHVPqlukX8stRrSX8uEgjRw8jFnWakPOlJdaWq4r1Y/iF+uHr0lfWmOltDLiMLyebXXd5a7rFEWKOovS9ryxTmZJ2WWKJVvuSa2aNEYPQ+EFP84WbfTNX22/3ciVDZm6shRp3pUzkX4T/qZ9f6RxOCDmHHla2bJHzNndgUPxZrhckx2bX+niVAn/w6/gJt8kTpBeqSlHmTSdX1nUdLBF1VUwsjjsiUG7PfvgttR1XBB+qyll8I1yNfnLrwv/AkgkXCFL5leMKe8HQ8EXgC8Hl8FlcBlcTlwGOYnLQChxGRolbgA/iZvBUuLJRCtxs09c9onLMClxMyhK3AqcEk+AWBPadx+ApIdHy7L3njtt41Fz4GgJG/gl5y/sMkyPloxaBHLRBT3q+Syfd5+d7/rXT6Siy17gMokLDq7t4vgIiUQUL3mInN3w4j67s++6bdrjEkdpqPf8MJKcNnb666XtHPZIBgpN0kzYI+lHIEZ+rRolnjByz26JGH8g3IJzaS+e7O+OLmpawhw4xUsl9EmX+94YKWma7QmzQm9rm6yCD/xxW/e31QjPFMZuMDS5MkGPLAZhDGMIFyp/w/NE2b+ZfN8hE2GutiNtaT7uzGkPgXqbR5PkvCfAqXaIq3kWT9V5nZuG1jG8IlxDLQ8jbWU+Lml7vqZhSqlx+7e+7z0WEmAb7VhZPWD0zksEGZsLMODeBy5sLwnfTq1wfllOCYJ9oBBgHm4pjULnFKRAxvAtvQtBRvVOcOf5iJs/lu1oJjmFmNTT8pNSCuN4BExCE1AT9QiSRHF3pA+0mMmBMb8wEyqNaeJ1F6YKvCA6kz+8f8JN4H14PVl8cBvGzci1HN0hSTgLQ+hnwkokEFlVM9rDAephA/GD8dG6O5E2qEc0QyiY8pvYQr8FPATeDb5leLqLYT8gjBxjbj8dAeQReaoxrS16aYlR0kR4VqXMbwlKQLFndDasaPr52TPg7oerOO51Yb6XV+dm7VxB7lie1D4xM2L8IRj96IlZivM/U9sBa2fUnfQqD9yA0l8yJH4c1WtVb+l7XRD7Ohv7b2w8/dv5+RftN/avJkt9SPT8AM8f3GJLSIqN2B2xaXdf+eA5nxKqdRzH4p5f3b5Vddo+0jxNpSSkUmSGFx8hAaSd16RSQHeCYkvSf/+UpPKiewgS7PhA0wESfkUfDntyXErkfiAY1AolwsaBbZoBzZ3ym6BCyeTOcR4PP798kylIZT0Juuv61XmaPA3dg7y5iq+a40wC9ZyNLrLJIVc/1zR0gxeM+vIXNzy/DfkTUHr03f1rVVz1VrH1XttirXObwfgOPNXQaolOByWPZXq6FfKtb/suwvjezl6Chfe4X4lptTBlqxah308lhd0nBM8ZnnRqbxiBdxHFu7zEsEqkCGins8bsAdqhkb7vlN74xbP/fOCDl8FVXSho5AFMwfkwO0nvuIKjduUN1Mv/efR7gjxv1jtHoxDTxBY7EUQEI4F+f++op1VSfskTSc70fKpEIBoVe1ERejaa6R1JLOK2R+gDyVqSWPO4IzAwqPW2SNYdjszQa6qox0Re0oumQe+dfhPF1Ow+Ek+mve5bKunwOJmGO24VkU0P5oWUES2R8bxiqy/AmuVSHv/zzW943PT07oR/5uzLz594fbK2fW8FN8f+J+8hzSYPyjTdGkr5eLBSyRkXujK83jHXWchukn9NWDPsWmY51SqKy1w7wAUNlbd+vKMVM0EVUrKzXfTV8/9+6KNi4N9VrwXsk7ZYMugDD/7qNQJiIFE/fu5Fv/1gr/TJmHi+YEOLUV389yPfldHEfgYvvSkEsvkX++ihO4aBDj+DWNyX7wn+3CFY33fWJ8MlXbISHAId8P/PfVrTpfTFlEc4IdkPEAs6GVfUrDOI+bBpqOIIQ2/7RTMG0TZAhr6+ihN82aAFVrMvzF779qN93VbSFjknWG7IiJkhAXuLxiY+aaQwKh2Hlobt3+r2Q6aUh2N55VahRq4Nlpu6GokS2P2VtH5fN8ursEEy6IdMn060SXzHFuvNjeefMTljxsJfXbAyidtQDKxt2tu0/h/aX/MFlx635A5rocmGEKokcHQQ6BatOqSCAfa3HiwGvXIIBhIBhc2KvSFtqotX7ws5fYYytKqkVsp7SBgn8GNLTu4WBgramu0cAIfqLK5yCr9oWqx0RfJHULPwsw/Vow5O0qsJGrYTh0uqU3rzI+kXTWIDmJuVRqfKow2h2ur1s9u8C7oz/7jj3StuWwDhtF52WwMJg7UZwSatBIpWjXAZEEpmdOW1kx9fxr1oNUceP0ESBzGIa25RvTZDBGfiw+cqF6PVKHDFfhMi40b1YN7dLbOTxFS3vxo6hJupTBwNSLX8cMu7LvuuEVONLs8ANuHmIoMYDTYpuaKu4fBmzycUUwJWSxWjwfDQ/pP6mNB7bpyyWAR12PWuztVsRiUpydjrdbaFZr2ERUuSSK/nhyJddhQqth04ioVKbz3ZhUxf3DrmoGLX7klViRacgGX3ybz2SXE/vLM6n6u+6Oj83Uaa2yCfVVD8j2vz9Xy7SvZLewT8kA3NojO0XMDyy+zg1GHANgFp8NEMUnr0duJXB/fc/hModN2/F/7c+Zw1HKk4VigMcvUbrx1u8L3gvvJQi8yxBWiHFlAyynENLeod9Vxotc5IZOt/up1eb2A9q9iO0xlxj3Xg5yiKl/LNZks5Em0LR2L1Lyqq+7M9/WtsptLD2R9pLfFT64Suap8X7DUSVhjRkGr7lJQY8enoXqa5rArj9pIJXKkyDCEQhsKpcMpjpW3Br7eJYkL2Pip+VA8UjYT58mRqbrpuh6P4AW4H9PBzBQHYruQCBExbpFyff1VVCF78tVFnQ37JxA1lPOQYUoj1/9WdyuWK6zrARFM8SEwMN/cWjMUId8uFVcWayJ8XNkeVTGLK18tt2GV6BvdlTMXEJniv0xlcbfi+ymvCEarJOsPdWMgesaKcz5/Ch29pLPx/kCC1vIwIGQ7ComRqsgvDKVyy6RVlaDGu9w2rVSJzwcfKbumlVBgjqXwyGTG+SSzdPaqWTcZCzjiEHvwxfB85ThuVYhF2ZEM7eVQlGRSQ6CLqmXRhMbGwUWaHxy73YUfwj34GNtwoVbaNmroZeOWyri9gR1y3VmJeQQDCQQ7yQMcHDDkW2qMlh2UHc5X0UiLeGCHMjUBQexYVUKBxT9PP0F89NZOmgAHbj47ISjxGshzOX2UPyY8iA2br4N+368JnzAkUo2QdmHSD5rqLnaGwHI/SVuDRZKLUJjE91b4bj69S07YeRXIV+6O1Pnjk2A3d37CGk/YzROd9nOO68WxOYn2+Phg0XN8bHRPgNbejd7V4ZErEI9eLGsY3UAaUNKUQ4DUclnw4cv2Kv0YFEGOdGUZQDVUAIpwg8OmLhIZU6mz2DRSPYEtwEM0tr08bqVnv2kI7fPtGIBFn4+zRp+zmrE4+N35dhIcCy782+20uF/3ZYPbia0/aZSQp+ol+45XvPSCe4cgbGPDsxz8QIfWDi8DjnPZ9EplIKWcUExlALiKkM0PSRsSggQhaFkA928NGC7VFkpU16j8k0hE7JkUFvpme6wGOEwNQXqVSr8uearqla0BIjlklJKwosxeMTZkHdKMsYMmqyKZCZxFw+zA4bpY1aJEC8s+BwNCTy7UpLk8EKfwiS2GdYkRYwzSCLmujzPs5cBA1Mm7fiUg9A9gIdgaSTEpjeiKJXVFfYADJw+66EZWs8GEgQ+5zoydykXVaH3tAeXQ/bAWs2PbDd2bhZFTEjWa3Pz29sGxfvGQgj6x/e26Z1FTNAyidZNvhdipC0tgdCh5IPlefDSdQZrsoQES2uLMMib7ctLgXSaMFrPOkQMjqqBIjhFkvLRcBlpE/hkA3iiqR8wpsAE8H/+AfzwUXxquyULtFluT2jNljeAvrGm9msb5A5s1srgBMNNC8KIYC6fbahqRUCYciCsdEp2ollghBjw6mSrPU5kTZmDrhadCgu4XcnbIoSjOhQuHdgzeWcyOcLol1YG4hOaCASakR1NmAp0nN4UXv/sjE+V1lePSh+8ov4VsHBQrd5ujOzv79vgfe+EHOElWqdZsFJLee8+hqHiZ0NKlyprlMbRl/1KbPEDBbtCAq67NQytS8aXVvt/oGLlfd0HgiyWVQRqxePfl44c7/Xy+X0j0KGhaUhQVaT1Fr7U9PHO38XhCdGOgEl6fkEeKVBdPxDBNmCE3NpbXXAMCkMcPKtxv6mx2kF6ECA8V5dnh43LhESMjkIKseNpS+SKyV5Wgpay1u1jp4iXWqrj2a7hqbtEUb1Q6SwCPRfsDgfYklBI3sczBFlTv4IA8j+dqoiz+UtodMuxtS6XTxoP0dyqxNC2kGzGHKSSYARtFV3ZsKuZDup2Pu+nYLOfGFA3V3S/dYIg0ZAx+oAOs0Ia657F8gkzfUrtBf0XlHv3ZNtG9ernDHoQoHktV3iPrKWoWFWvUrGcYpmZTdCt6VwXn6jMJxigN1d4RFzA1bNaV89SFNIrDRvFdhoKdYlkaoo0M8ny8Jooml/C8RBqHTxJaxZC7xJYuFcleFUjKvVmu8yBCXqT7Fh+kwS5EOpmF6uzmZsVuvWCiYkO6aedtxKBcNhZsxP8Oli4P4Oqd0cnlojJYijp5fSKIv22xDlDKTLFT6ttMyTkWOrbEHdJyQXntkkfc74U4+8SYZj6Bpb12Um4qNFJZWHZaJh7BF6OEFx1ywsraHAdKtj3y34sKO4d1TOMrMnZW0cC3AEltbl/QI0HOo7j5RQfxB2/lqSxwpADsJH1pmuzjF0dRyFHHRDndpoh9nA6uTdMHdvOQf5tyjURvqte1e/r6eaQfsCiL1OjLrwDYll3MtscOdgoKpCzOYlYIR9vxTRu0hLnzHkNQdtf7aGqq5Pkl7FpVlb6mjIL0Hw6Suks/NyNbWWJVCcjWSkarDK0US2BIW2rmfTxfeBVK5U3zQakbUnTcsr9YVAmjLwWnqkhW8Ls+PXIy/kgiLdyN80rQIyTWwa5QnSY7X0Ihi4ct5VFLfSTox/CHPvZzHR1A719kUu8R1xsOBLUrOulwUe7oEmlTZqzSv6Aq/75DVQXGCqMmQLk0MGMaVkT0xWdjRkgTamnDxgBgtyYdkp/L5LrrzNKdTDIomoiGbmRzFAOJhkRj6SpqDL/BPdjmVKjrpG5dZzOtqRbRsbekFqHr3RSjjGgFlzVA40xGFPrWAqcSwEskUi6WArpu8kowyHEbh0JBMdGWGjTuLo4Koh61eFyXD+gLCCGM3lavdZbPLDkraF8Bj7giVPxqwsJGhgF7G/EY5UZvGXVue9pUCnKFrZD2erC6G26W5j26bCTtYRyUVcBAYJxzaDbVc8SKlGUsoyr7oE3RY5yZhlM7Nq6sWgJ/PqSAYjCiiOKP5O4AVHD3auUih+4jpmaC4kmZyEwYqGfx8LTPXMRSmbHlspE2evsaLRu6oNjxBUE9WJdbuCQ37D/DZVGTMJKzjwlzIEY2FXDomEyHBCUG5rBp1xUIyXUw3TT2Ye34qYMHkthOG18VhIiwXYYmw4ERgQjiaLlbrDYccuMKMaKHSrsR5WtJsC/JY0EJRxvWpuu3DJeb9QauUsCosbKCQjIAcP5iqtvsEnMMfILcobOfDSAD1t+Ikk+iJpLGnsHaaU8VRhIC8ltm8sT6kZSUeM7EgZL8YGR1QYJK2WNLGH++ZZRTwHJ5oNNt+6hCpsFu+wYRSQnJZ4XunxvQKYdkqj+rlJpKpQoai9V8nRPMeKZhHs1DaYSe9mLwt63yWGPYXKaA8e9k6N4j2J7np97PgkjPwyG4HCqQmNsmATcVFU2MpjXyIAUoQwT4o+eNJrGXIivBzKRO+t48NbUQrcbTkA96Rx371O5s3yY0zsg4JW7g6Lrh7fQyOU6s1UubxmI6vZJe0SFiPWebxWRNMLnNfQrOaNoSgq9FlOdEYJRu5JnVhpHydqpOwoFwCv5i8zgVH7DjR0HiZL2oijUNDXF2hH+8nsbvAW/kWAyR4cF2TWug6HNyQaEylmrWSbNMEa6o/VEuwsnjJ8z6VzArZSRbHBlEXZ4BTfCpZlL/60wVDaVaIDGiwtBeqeKw686gtn4natSSFiQ2NG1jhaE5IaxYgH3iIgJ7uZpHNkOOqkOtIxaCfcT6usXGQAZ2MCC/yPk3XfvoZm65DEQWkWWVUqS4I4DkkvnRpG646Kbxh3sMf9qJmtvCuG2UjlRgHnKdof58tw+FTfgH0gjc2WpnwLg1ksWorkU60KlOXTiNiRffeoL8RkapMocgV+63NIjU33IKlGIUtRvCxGoOm6lGY3+CDLkaF5Z6gRIM0zuMyQavKToIgftosUyLfdCBdaVNIQebMqEWpKvynvYW4X7hIhNbeG3x25iLineDlJbPDoWSHwp1lZ0JS5mhC0cKetFTX0cyl14DVW8RJK29G7KexdfYSJ1zv4JYWqIv2bVz5g9hNhN6O9ZFj0ZEeeeOlFesW1LQsaj1ymG/M9s9U99MQY03HeJ7JxnKDo5qZVZ5yfX2XY86VFGpm6LRNbf8XmXVpt6UtW0LyivD1KZUYRp2NL/Ir9Y+HNJSu3uIRlihnVYXSruTB0WWvyhhZ3JXx0H4fEhMtLqdA0kFlIqJK6oK3qkYTtMGoLWWF5SJTRt6rABo4qsizMDd1ICkwCPBSgAhkUFxgH6HhaZrleVBF2JC1SHe1FK6s1TJytJz9thEeRZ6BRZ0NuyoxpjLl2eJGWNOz/ayyr8qISlAOy/XJdXhzxpA7iNDJuYavSHdDThhnrpcrFsRwtlZjJiI15hl1tTWiAfsXtQwS9xTzHJgw3ftXtw4UWYi42BuIitujYThQraztndV91X4dT4EFVt4/kFb9ZRtHz5Z08AXulDArD7FCjiHmXnMafXJbbW/LRA15tt3daxIni9LuLXQ11g59J+MxnmiWzZSiNq4D6dxRdstVyVHGVWm6j3nzBR503oa4behFT5dl8VSXdwhncXHP7D9R1IPGUdp/4zx2mvTFjUyakumIAp8ax34vzQzdP24FQ0/tlHAFM7mLXNJrm52Ft1LO4FSy1aUPlCRJA2L95K6EGXLgq2DPTUFD95PrworbtWbKsDvCFczkbohq2DBK8HYKSvKwaeTGfQt5mfIatpIixIYJ2R4fR7DzXKct4/V4wEs++gRZRJGBjJWBptTdhdkkNLO1VrLFnRD1v2k+v3kZKaVxRNOgI2N6SpAdZEFzj8n3M7/WWrZ4/HhHBGR9jRuLEhNjTb3KvHI6VtKzUNWByQVNlfehtgDS2J6liiC9O6RHGa14Aj6dUAILQLCpGjvTe1nognGIUZAPoCRHkBI89UWNH1BVh7raat5Qo2okny15UBXK0eKiFd9ATZKuZ4eJrNO5Kh4uaZFEItNMROx+filwdPzxi4A3l8B6PA0CbAsN32BlVXy0RaFIMfGQhFMZLkIr4iSeqk5YG2lN66Y6ARYdoW05Hjh0JQRY2/hTRFv9bi5YZyCRyyWzCfEduXeSBuoxoVt0o0fDTvR3M6+iXHzfbbp1jnsrWH6QhfUVqy7jKDgBLeAx4GWu8Cswdh5h6ZB5Vm79BKLJyCJhoTzGk1ncDxbAyOlgMCH24wgUCPlpWYBVIRdgybQdvp6pHzeJJk7b7lL/uPjffFO4+6BYcMIknGUc9SPvsQFkuHsTHFyBS5xn5lCGEcjivtDJzhGhdjhBcEh4FMRUY8zLMZiYY/1/87F7ver60EWtCxsmDi3GXAcBWOIBnyWh2BiZCEqXZQtksDlfLyMhx/S133n2RT0fNYkBn4BeBFBim4FNOFAyad7AA3b/eW3hTsIGhwbFHY7Vncmnsa7NJT+vGCRM2DrvoCSo6jpKinidBBgy6cSO6hDTaH6EHXVjG7kRtsXNSQbvSD99KJrOGBwVQgyVbKAIBTgzKTM5IiDXK6GXggHnByzddKEJ3i6RSh5SB9YLCBVlD52IqvFLMjH69d5j8UIU0itljDQur+gbUQq9MFc18K1bHxm6glO0qQoNhSVYmQNmpR1YL0ykoKByPa5qUMyBdrhMT1bpU5nDlw351Omzd2HZlJGFs6Sv0dU+fN03HwuPmfygYWcvmlM0YPX/dX0fFOJFYHXBR8FX+LnF6e75WCOeb49SjOjlDJzXMXVp8nGD1W0FlmcBJodiJEF2qackhnJmPN/1zv0MVGCkl1ndDhEbZ1B6NlgYmsG47eGWk89jpc84A8sfBn9iKSjIDOUGZqm3aJCX8IIyU6KgnqFrzYrAxyaCY4Wu/0ETbsCSDrhoYGaAOxi74MlYGIoQ8qnX5ZpbgUPNYBsnExbkB+uuaI8aUdjCNqOSQDeu8c/Bq4PaMaIfwaYNN7rWXq2ntXsHzbGGALX/kEzvltvjOGVqGWFwRsk91EWihWVIPm+Hm5lSdFwNCjPEjbV9neqRVOmtFlu8DKFvDU+gT5t6xTwBh6e6pT2brG1r7ZcIE4hyoV/OQ55WPaoUMD4fieoC/oiLj5UWap2Kk9lu7hTLr2UlkSyhtnTpi6nzkWreoCmWuqoJXNerNgHavDlB8NukL9NMlr1SvUTMUlcIPEqmRrtWm1LeG5dqqeRq8u0KGilvVrNpy69Iu8GQPKCB5JVpUxmqLhvnZYqa9L9liCKGWXfoYzDcmvMnI1WbPK/kLE5ociQRoJFPgFD0UdpQVIwoir8OK9ZzPk2QdUFFj2ckCV1RuOC8dFHbNnXBPNR21Hb3q8Tzxbm+j9ham8n2X46LlvOQOhcEsS7pX7BxmZ+4ptDwOqT0zbmSBVLq8d6RarXZwnt9TGleyQPhktM+vbMFAjfEQcCqGr2uK0afiUvFfHJplQZkM28a6bqxoUrOMeUtCboQH0qZimJDjs689P52uKiwZQcnz1Cd6Y67N2TghvCOaWsVetDgj5BYJzf0g8hB+fITVhcDRI02NbFRr8aakbkcvmJFXlJWpNACBRdD2qKrB6cpgNrQVMjeGNvyJjE31luQ/pxnRbLTgvWVgaOUdS6TVkF+WmYmRRWOq+vVhL6WQH5ibgcLgfBI36ayRXEj6pMLuzQgCM0Z/VHcJvQQ0sOuH+RHvAx8HR4OQHPV7Za6PActwjXD6UCeXFJvHKYtcF9w5fKQ/1TYRijj0YB/AV/gphX1uKJMWGGXwTiwzk3UBDAT8JZEWSTkUjlL6VCV0CjR65ZdZt4MK4byuRQMKbFox4REo9jCn/dqSS5EUKlYjtGyoirK/2LRSIzIBrP1UrXcrGd0QQxlOTrEi6rmzc7zTyejNKcm3Hs91ikHhseIXAnxBxt1QcHNOW+mEm1A9ttEUxq3i+6YTUK0oqEqIH7hN9gMRdWnhu6R03XSsSdaNmHY/Kd8TIyWa41C/H+vhvw4p413e/3heNovBZgL1ubImlS6Wd40915PkLx++bTXpwNOjYF5IKDJApkiUt9faFPYYxNlxSaPT5MUb+UWVKqBkQyHGE2aLH6dqaucnV3nFzj37SBZaUccTzobrjaL81xt3hBtatRvKBj52zSrYn0SFXq49kqwU+V8oGNKK9wsVnXRiI2CynRq4Tq+KXeBeDFqvozgO6Z62r5IJfFM4Bq8NfgwNowhDzGE6P0cicyN/g92hq/NGG7WkoxOnadK7ZIYNCCKHQ0NYxhmqmYU1InzYmkbnzO9DE22JBLk0dSmN4aZ6hgeCbjnPIYpbbGY5D88gWCf8sWyOpJogVpsJaDDhdMg2m43nGuc2yhj3P1qkjXQ1LKpC/ooD0Sijy5NT4cOEXOjkAc91Z6kopIUWHyNTdOegl0We4Dh2Uyof4CiuJ0B7nSzsrE2LLZmijzsilhU/KSbL0HJZQIzhstcbj9ConfkhBJUVdKhghL828j1m/T86eWCYcfYiXTM23IlKCGMHOnDPDYIFdeNsX/JOyNAeWLINh9yKyFwnQOc+oYU4Zx/9Ueo0axmvN29bRM1kV+5UpxSZzADr38YI1zMjarSY2OumUFuRkkpZUOeNG9rNyxHuyZeu1NTs+vLkUGWCEen29783luABXz2hhlmb0mEuGyjfCYsQt7UfQQviGtS8KoOI+DNZJ9DwQ4DzXwVxm8thKzXplpu0bw3X39OOH42AFJAvevQKk6bvfU74deDodGNAN8FBPgWINC8MUMPzBxLTmQHjrHJRbnBPbV7TZhAaQqB0hQ6OttELUfvOfZGJBHc9+QSZhVLlTBRAFxHYfXbdBy9m6gwlLop7o4EXvx0Ap3wgwETLBkbG66iShNZz64Fl8MdfMRTsWIAs8UM1tdKl3lH99nSzIr/dDLddCrgO9VixpvIhFz+9YrQ1t5IJKZvpVzCM7WytHPP+V0RYgtUV+cFud+k4evdFJavFDd6crs/8O6164IFDZFueucXprtxIaqt7i/2jflTK3i36RLvEvNNcGUMgGBGiM8mQiQYjmO+WtUxUG2RoTOe4jN1hMosf3x6uL/f1KBtL2y82FPP4e/uNa1aaRajCkX13MUiEqLZD0jVC2zcwB21xa44c4HcRMZKWt7/RbO6Nc7DfbPYoKqN8WpSwTBFtpfqCI21xMVlZNhxe1ILraGb1oyv8A0fn7jwxnQJ+FYDLJFrOFwZA0AwwNLluyLIyRDijAlpMKP5+9fQTCdVQVmnaS5I1B+kARCh4Olsb0lOEMiqGy4BX4e073Nb3VvVmCOrivBurT4gIXdyZV1qS6kxcHAjpN/sVe8XeOlzTZaAW7N27duOzkrWIVjH2hlCQbEHtqZn108vZ4aRkD+az5krARGtkfb16oQRxyJHBXF+0ZorAd/Idn5msr42gmIEuNf3mg0yDK3iBNXSEsXQWAkId3WfFiKd0NYwbe1I+mAwN8RO5SY2fBtonFwF87Sth/BJ+WRPDp4R++d7KTpBf/U5Fk/mPPImsGm7+SqWfOHTIo9yeXhF6TysjdM7C3MuTw5+F6Pk5MEP5rBcCHPxxo/W/GCYOCbEoo7/7eGstbViTEDD54iPzBhGeEjv31wwAwBxTkqh1MWpyZuzBPt8NoF3cVcffx63ZmHZnUzshM2JDZkYDb+eOBRNnZ+HgNMw4hwUJxMPAoeNVcdwAmQqbojAEULkc/Y6kD1mNTrvY84AzvFWcEa/iBvTFPhtxMLqcPNJqEetUNCbbOhB3SezPfLup2wb8/RTQk6qE1qCsz95yXVke3V2jTNBErREcq7RvciVSpkhq6Y0OWKJFtj4knozYySfzxrptyvjYAJ8qXsccrxeZ5MCTYlyml1aEu278q1Ut/4U0xTRFys7mYBe3s7MGzDhVRYK+ieUg3JQDspBOSgH5YAclINyYM5XEvoLlKPdDeYiTJA/BOZ8JaEPQTlyDsw5WCI3AOVM/w1cfInfdpDzO2Tb+YOqX3SUiG0XAE6fR8NbkasEmaLUbCHJsoCFTbFtw61mjwJruVbrtSJ1S1oy49C0XHLpGF6NMAxWYiPuDTQUSOTAyeWVLY6I/Fbkr8Pw7VZA7NPIUimvYD6UstQ3CpX/deksPo5mjSDFIHW9HQ5AKTgLXFCqr8TTbUozNUbLl9OwBiocrE4Sh+UprTJ9K5R9rN2EdSdpcWBbdOpd4c91Tji8DPC18FL5FeNiqOKa8fhdOOGvK/abIJbGPE4nYlXtsgLCwb3FFC79WOoBJtbqQMZHKmcYiIeGLDfYseQ5NSiBfuA+EdCskhqlpiqBRKA4ocUy96qwVBvw8/IShM2jUwns7bOt1Bix8z9F7cH86inHVT0bS8Z4s1TLRSJACTT4dCYdT57axHyNMHk0JzcvIwUsCEz8oUtSR9lTDssbYVJzjMJvyLMhGITzjQ7jjdG0QVX/PTgrmdeVHj/2LmvNDrLzwXEz2D6fEZgPiduNldBoCIS9v1X8NS+wYiAZsOCdpnqsZOcnd481YTFGYqBU4qCWqsXyS1aVZibmnKlqaFQAIwR64FycVyYutXJgAusKCVUFv3Hcold62gXY7m5LRQgLmLPODJ1wvDEz8ds58dHgOR3UI4Xa/Y/YGCyhoeJn45OEbjwzkACaoBnIdxo4egfqeL7L8sRNIxdbsIGby/JEV1zbglZukgPWt5Ip1gEQ7WNPkBVjqnayMC2aqCm5CdWgBeXCxkg4i2HTM7ZtnqUuQIwcRM464emvIv8GVkpasGJNalBuJd1HHLMD1KlgU6Hv+3KMQOp+A2YVqwLc+whqZNwAWNIhRQghC22AOlMUqgwJVaJc8kYWeP09BeHF63eJNjt85zz15TuzyU/cvgCKPSEpAdpQSXEFE/B8eeQpGY9XY+vFw9D46xAJdiO2NKqq7OgISoTwyd1ry+Q1wixASFrJIXK2A/VsmVRKE8PLh/DOEsTQSDgN0CHehMwIPyK3/ws2QtVoDocoPQCLwCPBc4XsJIKDDMqwzWBF8EXyTgLYoAhxCmr0N6bzh39Qbg8CBG0fcQooQttKPAowmbGBINpAzdZfA0b0OaqUBBRipC91HGKArHXPaDk1bQcMngoRKPMhiSs2JN0pRrZFnqOmz9qC+lIGJvBoe0chS+Mg6+XrQmyu5TjhChVYE7AiDB0VwPL62EHCMiIKNIVga/lKIh/to6Mwhy38VR9/wHcxr4Q2BAmeq82iIH6DvwLGlzLIik/BOAVOmqB8U/Su3YLQS0hY0MtfUDFdyOkyZtMGL5ohFwZrc2uyKumSSvOyX2LuIgVLoyUrQxFjdbQiLVm1hmnqRKqYWDRhaKrGaslMOpnKJKPx6CqrKVvsaO9whgHyiUtsoOU5OBQYYDvcSiRVbbV68vf4nvQ0qJ3tUgcW2p85K1maTua9k+oEq9squ8DaJ6o2o95gNBPOZNBTwJEH0SgIRnioZyrNwVQ/raUOZRu9EQH/dijM3BUIuF857lbTjot41IerwqcUWNC1T9mljlhYywCDbW1EMkFfh6EP+mXOZbtHpBn16Bk59K3o43olGhPUNTq6aU01L7GQ1kBfFPK5fGGXw2FPpYEQuup2ITdlOj0rABY6GH7OteXudG4ib4HwAqTHN/wgBZzwVigq0Pu7KJkWrghlQF+dDQ4vDswX7anC4QsG4w9WxWKJ/T3ZGbrhNfgzavr/C+12jSey2A/9RLUOW55KnpAi+ITC1vrWU6nRP0qVSltxBhN+Swr5zUzrUT0Eth2DsecHs8sfRY6wgUHzBwKuOuG43dMp586E7q1/ZUbWTXNOvfVT8677vLtjrEMxlPOW7nBeIWLsxRz99Mz4SIu2BLjrMnGO7ZV3LjV6/VAW49XSdCWhz8lltCuOkj6mM8z0mznL9MXvhUg4EIlx1yERE/+seULK4rmLzfdptBq1qPstzdvaB+OVTMkoxAztGr10DSmzgCKPjDtPkh0qUu8IGIyhWI1nJf8MlYjY/u/LVL7/FSrZZV/sUn2aI9xXrHXoUiMZxzqNdEEwcxZzvQcHj5JfNqvd+BWzM4ark5vzlxiW6pAfluXGRv0sWcCXBcYyZKXk9iJPo6qKWe/MmQwOWZ5pmkS0toI7rAt7ubJy/WdhWeDoCqe/A6Wk/ghQIWhVlbLsgHsxiR8gbFXlnkSwtxDIgux+e0mfjptqD97Bvq5utiMRsYMxNXgu4QjCbWXqSUX29+j5TCDvMEibTDtJuBJwLv2PUaM+r4hACEXeaKAQSiTq9UQD2SEKnLfcHCiQlJM5AA2F3WhVS2kkeJVWeoP0qeiwNlGaz6W3nIJbqbGGWIrFKkkbw135UM+6jnPtc2ZoSskXi3awFhhajP4vg5Yk6dBCpoeZrUUKugksDgXH1XaXmAqcUx6QbseZMNYONRob6BOPq4n5Xr++dRA2qQCTYJJziwFTevoI8D0loZkwhqERkuAKBntHcnNhwnD5AkM9osQsLlA+NKiruHbdzIDBJkuiwZgQpHjc4adg+JLEPYgTLDnSh/MG9azYjNuMWHvicrAnipV0FCc0Opg4uWAz3lmRzsRlCtaE9hRPYa6yJMEKCG5RyaBYgwUmdlwseWNy1d796rhfzMKF3aDDqP3DBtqAmh4nhR7j0UuXwlgfMh6z8F8GfqNGRUwMdCSOMMY6acNiM749d8tCxN5CbfGg5KfkPSTbLyE7/GpKe1VHI63Lpue4k1rwZJCFpwsn7HvU5aM9TREmDQBt2L7Mu8WCSWJdrn2mqvBq325Ai41KriU0puR1kVXslZWFfD6tcRTMpqQkjvZ7IZ6WLy7sHwvK07IKRwEoB1pCVNNsd9KKXaV60ryEYZG6y0KZq3AjJkQSfryutyyZA6z8dt6/3+nEdfplByXDk6/udygL3edwwb3/VRoN3gX1vraew+e+2uH2baKszZAOrH35nMruwkHDtMV8nrMdwvbFL7Qdyj0h5KITZmH9WSfWEOOzccWEa07a0KKPHyAjIFeDzNGiizvZ3Exe0COK4PSvtvaKWjiy2eRnbR2l3jkSl4FSV3wr2yMKyLl3WXW+0lnXZFMu75Fhtk/jzr17oa4xqDz16Q6USetol+AXir6MkQVe+j8cdqqp1X16/ZtUKsGF3YxlExcrJ3INQe8SQ1eTuVY7uf1opagCZHGVPKKob03mghM1zWPH8jI8Ok9ldRbMl0lkgV8CyU6pDRV4Jtwxz2ejKwr1u2D57PF0VtbcrLquRvugIxqG+MN701+lglkORaFphyIUjrjgJo8Zv71qhX17HHK9tWcO5HBWg4YxrDS+a6vzIxqekCjgwLyAGnlftb55ufS5oGYnaYyoqlLSV9osBn166X56XtHnEgLb+SqlL9O2vHsqA3TRFBEbynM95yDweuvMQdOrwknPYrHTRJW4VHAfIa5gEPYyIxatrlx0gS8eXjnMZKM10z2e91qYC3G1+/Jd8uDht71O6FevD9bO32YnRyzzMRrRu54TPC7b11y2VKvLk5dKdMAX4Ocz/62r5ZtxX9K/qC9Wr6+394/9fo3foL6Q6T3gqtuHbyiXHq3FwsFLR2lWi8O2mCk9lVVMdzcLkip9ID6Mu4EPF+oV6feGdrx9r3wXVal3guNQepEdC1ad6njwonc+lzXUxtutSr3p58/YgPHHQI0GCoHc9IqahMjcn7fREsQw0SA7EWfpLKTWOU4fq3Ytav3Hu3vLB4fDccV+MW006OqxYIFj6BkLVkaDvuck7t/uu3OWIUbbB4kMLsXPmK6NAZMgcXgpSZt0aUhI7IdIsmTsSpH8OuFnN9QO0FMobJBAmBYg8dkvl2z4LAsfm92QqI97LUff2Lpm/4iRdluKhfDiNPkpWs8eIQWu2D/GdvcrZ3E3WmIOnfOV15cEPNipZFAR+OfjSf2JZmPvNtB1U0xANFqjXJDDdnq0AEaKPCeaiWIhZQTkNqCiZVeoCs9crl7QpNKKpF4oZNJMuZziVVkQTlIkRqVYhZCi8roZOcpUkjnxT0fad/wExXq1SQ8KW24PV4LCRruyUZY3iYFSMWhc8J+CJFo+mMkcJvF1ZYuoKmbn7wIvvPbRgpxMFIvlwv/3XK+9bYXJcZ2T/1Nzn4Baw+7o1rbWhxt7HeqOl6Di6iu1qG8sqZKSzXFPuzcZsqATXIHZtZIMq2NGCfyAXjFaXvkoWVjj3aLXXRfjhcTvim95+tXVlV2HP+D1fd+DDz604vmP1Wpr4eJTWSVkYDd4fBq8KSG9iCpuGc4umMiOJANaGupIJzKZ9ADSKNRgPknpyGglWHpgx8Hi4DOsCn1L8+5KkBA28FkMqSp7kYl8XHQI0oShiDwZkszcyd+r3oBHEJFl9+S1hsK+KfNqtN2UmnLxJnw2lU79diYgKB6exVBw9XrObZdAQg5fR2F5dofYAmcch9f1ZPPR1S5MeGelbl47+FRrRXIYM5luX5fp2kFf4MVyhPm1F7/M5qHGYNYhqKjgNNADY2wc/Io9MDVYadtuvAMWB56S4+2PEYCcyFVIrIIcCXEiqnhbrVD2QpnUfp7KCBWGFwDZWq5sOBGjmQlNPwsvZLJiKViZvhIF3Q2dYKe50HEtzIvoR8l2bWWOEAD9dzVjgKEjdKTW0HDAJl3dH2YDcYkPiF8KiJmqcquBlArWx8xcrEPfWJoFQjn28Ei1O52poz6md9N6sOWZJNLRpHlyhAzMah7aba/uxUPZrn1xW3nUPnKVAa/1e7+k68oM4Z/Z9wtXVh5jxMrzW8MEe1bYIFBfXoeexPtC3JqmYgo7cSpxILRLnmzJ3QxIQzboS2KALAxaW5sYwNFxwJPJVwYZCN52DdBs3+gjdZUNBukL7V1WD8hwWWhaTA1rwGng6dyTJj17Jiq60tEj7oUfC4blj9NvaL4Pgm1wxI8OIYkhVALMKnreKjrOmTTX9b2aBuTs7IBJgmJnjUYElaNKg7KllSV6H7ecKwvShxuau7kEqh93eOmrrcDf2RJzORTsrNnUIW9n+00e9I+bPzXZp5HEPmM9jcyr2QudTu+3JTPyhctTfgvx/9OcFC3X20EDDJa0GdIgHsF6/9cMwxq1Ihrk41avBWH9WxEN6mGY5lcx//kRGiGcdm40rQ1SsQm8uIEJnkyetUxcEmsvugKVTQh6nrG2JWb4TS/y3r9h4U0cODOaL7T7lqPuVwXuehzmp/1KU/qul3a0jjY4CymUVZLWxGqTUljhKSZ+2a8ITttvKIg/UfaZ1eOKwMil/HVoiLKamGaR5tvU7Z42z0XQ2HKwHzSzNTtSdzEl0EzXwssRBxZfoMxI66fZkOJfq95p1qY4OViuiPXBGW8vLQui7/frL8aX2AXgG/DbUgvA1x5qvIcbCF7G2kFquwcVoSdxIsHyz0HXW0ggASKP0Ltro6APzABgm359Kz3dO4A0UEdj/QlZtkQRYwdkM6AeQYIIGAVbk35Qtg4v+bqfg0lu9ZLArJInUDLIIyyCrzeShZmM5NCiqr58JNTbmgcuRmDKNmR03cqMz3R2evL3v3lCGh6zl8vYHo+sDTcf4gSa2831EJ/ieE5YpVtBXGBW6H0MVGh+a+AZ9fYZiIJsKiK3tqIDsH0F296hmh0YLNM4kBPlCEaXV+ctWTtJYhtgMDZrKVCisBAdtlVkumsclqOu04+owRKvyIcXClXcGhZsOhAGVSYYcPWYnZp9K1JJJsLK6np7dbHVYSt6heWfuJSinjBpwUNDhqgQqNZWrEG8x+n7i+yLMbM7DZFuN2CZBxzYC4n+KO1cY2WiR66eltPxhc7dTUbzIaXW4rdhxwVhA+IdPjR+PhgfsBiU7LRxQgk6wgY6eWGGSRswKOVsJAi9jBQG4IiRLCfm1GA+DMcUSI8WZMRIgrlMzTSMSAd9esqUrB2TECYjx9JpL6SY5jkRyYRLEupHG3Gn23EGikHiSx3PESx/id2k1bEG1UvczkM3oyDulA4U8niEspWLluJsXvUcCSm93JpJVEkKiy5fOBZPdHHJ1iIolWJciZRszec63QXwENOktsr8xi7LmbQtOX/IgS1xx9iooR1B4kp8eEZJ8eyicCJ1ZEU7GLJ6oJwQItgN7Raam4d04di461dtG7Oj/sml8gyaPPlkjvDz8eqanI151OcM5w6wsg0MidFQjwINJu7umvSgHnaPJhQK1tx8lllbKcx/diVyxb72FGKWWx1dfWioU9dWsMyYswZcCr2cTQctRLy4AiFyyKXoJiEPHEtbYjNkpapyZUJu4e85tvSdqv+13/bQQ6vOJgcPLdUafqb1SqtEDZWBA84JH5DAFyDij8h07SNZn+9wzmdtadyUmJjHbA6drS3t5EpMsNq4VUdapgTi6ERRESS+hSyyoD+ZR20Lz0LWUaBDdJWSdidoUZkgIFYgCaUwWYilzT+HlHphbIlukwCHvo5411zWg7vLjXEbV0VrHbhX2+afNh6lTJ+OJ979dby+MFkezauJv1qe+ChIFCl+nPpvTPlcY7Tb67EOIxjrwlsIJAcRgnkwGBRTYvEwYWka1uPK442rWsbj9PlHsdk4wGLGmJOO9qVBgunTqC7e4PSXLNS3r9ME4UA+pAEPQU5W7Ou1sGspBVyyPcNzQa3i1wN51CrBT+0ORwsPJTMLK1djNEuQRQneLcZsZSOZSlV8PlL90QuwF2lD4Z1TDU+cWVlrpu4XeZ7Y7nuT7uD+F7BYP9xJuAJJWQ9qIOp20mYK/gSlr3/MIBiWgTLW8QmW5G3E/ElHMrTmBzgWvfDbj9sQz9s+Zr/R84YKuIoRaOHmDqrWXl7PRnzZPRLBXizUpEKwFGQThiYEy7NCdCGHclpeK0OMOfyggqYPF1Rf+sKxXz5dN9GQnUwH6A/ADRgFTVleby5MvzCNxxwbRRat4NsHESiZVFo+80A90Z9ufg9gmWJUm7NQ+ExkIk1+4c7k4DfXAw6v9HKFKjs27bWnCRhBfOEeUy371yvVNWESO9z31rIBnSiZzOnNgNNKbC7ZjITBA7393hpmFC/EtrHOZ5SBSXHdQJNAVWCkdZGZ+HOKcUsLTzg4sfR+t3k7gp10K4EM31660ZVFhElNXtru1g2PmgP+d40+Y0KnVvb4nqmgBp++mTMEYpu4+udwBRT8bjicEtwIUIS5dKpYkOtl+X9lfHY6Gfd555aYWWbqotuQqOdYcBVdNDNZboPzyPDVUxPsVco9BbJkvNAdTGUjLOzeQiuevW0WZDtjUlUEGbOAVT4m506a1bsdjMTVVrBLruFye05Qeiq3OmmQNM/QuWr1f9UFlXKC4xh71whIQk3muiYdTjB7wq7aZdQlSxPSBNT50yRox9iXjbxRloBwwLLBozs0bdZw4NALlVoCZqeQru+UOg+eYef74zmq/vLM4rEIfc43axtgJc8EYbSPIFJ2KR1GlPZDqiBkkw28RRoqEE4i/WpyP4OPl/D7RtJisLFR41ehH0rwfrKF3dFHghvrVoRdggrIVrCK7YlMz3fJsv85SY3tS8ghcGFRGPUp5WZT+ix8CHlkqyN7IiXwYYD7Ys8hZn0BIQUdfjaguXqQvtk2+i78gX5tYnmOJDP6Y6vyz99b8CQQwWqTqoXYY89L+1eqFIidNkt3iCeTTdS2VCGkwBr0RbyJPpmO1KlgOxyqOv7U/A+poS7h/4haLcyui0mV9Fgsh7Ru6+fjYaiKJDd9ZKvAfn9tafaY9cScDX9Saya/fZXarYME+Kd7cOY/QdqZD59vTHy3dO3vzq+qJV/32KWqr/7m3Furf+o8POfW3v5Sdvvj/h946N1lHt6nburT+bedQqnHPv44ikfayjQk3ZG64yWJc9AO1Y/DJ0T/ywX06mkr4NsaLGf5gamRh+3cAgX78FGgUTLetpyGDgSwAIMVvB+g8DF6tXdAkLED45zGpMTaXxCAxu8gUNpbXD0NArVuQ6My378Y9GqUSLF2xpcMuNECF4aNeKKstTsbmmmRq3jkyjTvaE+lUJmfi+hJSTk1L7BXSOfksQg6P/wv4aCcjFRB6FooyFWz8ACgUHk0Svgd9iWTSAg5xr1YGcV8okQElKCSGp7YsNN37Ugk5CqBvB0BTG6Y1iNYXJanfMb1LQyoPVWViFOOvanTwSmecWHHeH8yqxOKQoXUsFQ9lNu20zcOKM7v6DHXe9cPJWO6APZiu/juR6r41QHIJFE1cWrDZnvMd8S4TFX70YdFnYiIFOoJS+WrUtezcU23DohuE6gcOt7FwF0DdIPVk38kypIB/QT01eo+HT1+Zm3B9eLRf4oGZjmL79+TOm/eddE33wfLArcEQZcO2jjfEXKEWBcVduC9kmAH6GQYRncg7ZZbn3aQcI9oW1R8SDu5RM7GFMmgbcvduB5wDnNQbs3OJAZ+ZQ7ufBInREO0RB2lIHuyMNXqlO56NoY/XWnq7dgYTfIMBBwHGcDcQHR9LToADiv5zNsGfBt8aCRrgsT8MvrqjQFRjjFTtpFsCTfPGRAttX0MFSHRw2AAsAw8FTxTTBdxKHdEmUPnCIDwCjPLuQmzyxepy8wflksls+XEmhAKck2IQ+nido9lzctg4qdiDSwzKP2eS14IC0M6OQzTD2dLDDDHQDjwdAvgIAClgBr6uemy/TOhAFSPofz1KVYbc/N4NUVCwcXvNauGDMGerxNrDR6GQ9+q03VR4rX0VEj/PFdDuav4o/yH4jTT3QsRfM6qj1dSoFmuPAW2CZIstv6PUIlWcGQnkU5JR++Tm8Rk8ugzp3MiaRTO5U5YcPyrU9oXIWQoh6LrAJI+gHliNdb33hkRAzMDsHwG4XYz5iNpijRw51NIoAfcAFOnwfyDsSJQ0JII4BLpY5LrG8KNpgcfabFa2OFKyDLj+RA2QwujYPy6xZxM60AS+KIBjCEqSMj4ZHkNIAqiIP4AeVvpcwnWAnwQ/rOhpUeEgsJL4fDNQIHAVq58fUTwpP+zz1Ob6HoMeuutrzkEHeBHTaCSptAsi/90Z6CFbimFq2MuMy9PFgxzpcvlYqGwqmqrYLKYx50HIR3pwk6z1FhTJUOqovj0YnnCGw5HIiLHa2ulQi5bvOY6keVIeTntRNzvoOlC4SV/ynCOLu1yMiR8z1Tr4GCZWfbvlIZOEx1zysn0RW2B1F2BBD0ByMvxzJhYoyzsL9Ir2osBl0OTpmEh2yaGtFCBQ85DxQ6fCXtD2m0Kx73NfJwlRyg8Bizx1Wa/tlsDjwZQLrTNJuLVsWJ9LB4PtQNVl5HaR/sEJvyF2M99OfdQRq3kFUQx3v6OzSwbIXFFIeR0F/1fhaLR8ruhQDRtG+JAP/t1e1Qqd85BO8hKmVpYE9+L1C4iRT47vnXu8F4BFtOXqpmDzOeaz3xX50K9emw7sPRh1RYh5/aTx08hQvRKb4gGGyje0oHb/Fc43GAIWZMvzGytWdXdQwZORZ+0aUTqdolg9hC2QXTf88g/Lre7sFzD5EIeUafn/jmZLdApA/5tRWAIb38BxglVOPjP/Fxe5tZHUS73GAE8CvlOeTZOrThzjm1XNVpvoT92ZbnO5Wa90g/jrKnjQfjPSiKSpgv8go5UL1mcdMElxnQEyD8kE5lA/G6Kt6068RLfP3RrT8801mndVVUbXPOuMz22oVBK+3v9U+KKkd5OQD26/e6XPslUDz773CtrW8HP8dV+vWC8cYBMT8a5U4CUO2fCSlq5kjjr1vqKadvfnXT2dO751+iFFzLvCStVVaRAc2ZFljzSAMw3QbWmaMHSqwu7S4T5YBxXD6vZtJSi2ajXu9Rhtla7rFktcS1onJsmYX5JFLVUrism8/lCMSKK5WwyHvP7QnzszcOXQkiMkTNl0TRxiBDUdlipRjLhTKVbZGNx2ULIi/HClD61hECOst7adN7DuB4U+RihKsTzlfaQaaTz9YXewrwi7/BHsutbuOMfnSHzT1SR6wFXPFGrhwrFWDLpN7GQn7atK95Dz4ct1zMdCgLg37itb8BFDk2WRPk6m8HrtKYdFhj/kJrt1knr7kec7FZmzaAMWWqulakIkMHy0/KyL+12gUvJIpauKit+FmSRRzVjQuUD+LkuddEKE5iEPcKo0ufKBNKPV6LMIDaO3Kb6NzWPWJxerOQAfolqZidRqGDdfUNAlHr1g2eOvANJb8adLe60d00RPuh+pENqkEl+Nofi9syE2uSChNqciIMKdHnnZG9ygpuRiky2EY2cKRF3LC2bLflF23W3voeuFSvchePZzro4qNMzl38kHd54og96pW/90ucVMLBzt23ZWV2SqWRfDT7M9Tkc0elXWnMXre/lz8ocEmWcaIFJmqRI+ExBXq65Hku+/clODCnpsxxLfWp75AD5LnEAutg0itUVFSN3s/L3tPTYz0eUJtRdRzVTb05hK9s6St6g1Au2NOKTPjy0yu5uBwXS3jb7RiDGgdZ4R6gN3dFWXqEqHALMC4XnbGIPiLr3d8rJhlngMbur9tihRpsZl+2yR86SX4lV9o8ddbA95LqnE3KTs6+JfLupdoha65dbr6PHhoca2QgZP1z87UrXhidctPErpuPRcAih0FK0i4nZZzZadXlWZ0RWHp7ye6+YfxfCwpZSllBrd3g9/9PDAm7rvO4S9exExP31p0cGXC6n01oyW3ifFo3G4mURRbFQK6XpBEaPJ71OY2E/ZAgMQ7Py3RrcciydIFrx3KnU2gVW1dziy0G7VKKAw1uH++WHfSBWQJOJW2nmdbkf0ScgjG0xbW6XzgF68gFSQB1v7rExuN4uvkA3sylxTlHQNTXNya3f75NRuD2Jdprk6CTEFkJNBmv15k8ApaQxodnuaEKEWrNhyb1VVQnbQf99gXaPegEaRNhTFAjcGgxZaUBAVK9PzBqA6HTphNq0X92CX0K9ztAC1FNNy+PY5T1sPUga2BDFP/LpMiBYf198KYuAl2S1ejTyarVSwVdavDstXQwH7rSy5l6ZDX4Fu3Lkueef/5Cu5bvlg+ULOE+6DLoCRfjUjhFHlU5QulFWXq8t2PU0zUYiOGwmTWKXSu+YjXUpIEQrOlks+seCwW/hIUo/JTj2tUaeJ67KuqVlUI47WLWM0DH4+LjpVql9KZKSmLV9JLqb/l3LU3QOpHOpcVGR0XB9uqpgJw+aITQelV6gRTp62RoMrU6lMlXjoNXGkpoN04tXEFOcxVbDkKarOMnIoVxxDA4lh/S0Ymu7nd5j8MWJWfLMVgJKuu3ScpVeHmse2amcnM3p7E+ARp3+1cnJfPLCGx7KarJlqqbxHE5zihVxZDmdmRzN8bWO07n4EsnAnb2GfsYsqkgxa/l8DZ4D7Njb2HsLkoLMzaIa1y9EzMFyAyVv7Xn6u55N63vlVdCDmmwxzV/NT31ihTL0W/teGqmgUGPMoSr/c40ULjlHTU5Cr+8aSThjnw/1PBrKwjszVdmvwL7ddPKn9sSfCox4pjMFnd3/ARqfZsaJyjnjOp3Sbrt+nJr61vxF89b8HEezQiytnNtYqYgNPGzVsZeUtR7TsvkUrk+INJrXNGQALXsph8B/arvPi/uwMKlhg+Upwg1SLHXtQSWEneXhvptNnHwVY5AG9TtUNLJ3s6wtNZOj0bR/EHz5gUZzHYcE38u/rUpTqWdteHp7ZfsBPAjZsT4ml0bli4OBPpZx2dsFzwlTffU/+t+5zvieyWU0zfk/8Ml3gA2V43FRXUxqfCZznDTeqS4gdk2gpeGHbSUmhtX9lWfZfKF4ayoR8gb584tyzY5c3jUZ7TQzElO0cKMxLA0ImFugVfid9uD028I+Hc4QyxJtGoItAnwlKSSS674OBE+M6NJYvTImOBz0bm1KsEfyPZ+YQ3igFv+C8yXVyFo8QlOG7ulGaMVXqfTpmffVSCUTshmEfhjL/b+6ywD5rnjLmwkPut2RLiW5WtUt0VQ7LPG+x4HQTyNG2qdRiHNn/zqNO8zpNfEy6P3JjoWGGbsunlzxYO6GGgYaRmYr9FbEWvsi1orK2KsH+xhKYY4alQWr7HZj6UebVMuc3y2uKT4Pb8+nDHphSU+lXV8dU3/1i7A/t33fm6vDuaa53pAj185bb+AgPXkAh9IPnOR0ItNTnJk4FeQ99LIyaoWgLuZ0eCP8fYXlaYJS+OdAiA/tkkM+V7UhZnt0eo/2vv8T1OGH9iNfQm+jb5D3ouDcqXPHOY3v/mnolw4z4jdvcrt7qdVbZ5KH3lEmgvZrmSyxkDSKsY+McQNnffE8YufFOjUobsz4LIfbG/ngI2ByucIN62bnoOSLr/ifMSPe8xSP72Oy3oE3Aru2TK0sulOe203txRqvrRQtTXrDnBR6HC7lpd1X82EhnEBa7AZD9tcTSpbOftwSzWXMfuo6YIhhu93tBBxbwELgRq7IW9okxTGE2tqUinYxCytP24vhaTkUtINCy1jifZtfWV6wDni0KfqFXRmewQkPjAR8HrefBfOSbinLWfGj5XNa65fKLUoJkSgR8+l+xQulFqoUZRKJmIbD41GURqOQmUwqimQ9hKTiLLa2oMcUmthotzscGpFYwicTCGSOxKZQb0XKlmhsTpi9j8vKTEMECekGHxstwsPTIx3VnnrRBfJeLYXVbGrGtKfJZClS7BylDRKJ0G6xT3CZaNTlUtNnNylK5q4MrWHAdrazc1LAyMD2wcVd0F6MGMhuE0G/N5QQjr5wl+spZ6VsFz4KFc3T8TrH1UsBTUJZ7Y64r1vK5oseuYUDS8PjjkgkHFYSbSRDBgqOh0D2eL0+X2rRKJXjIDk7CrUiyD1czfjVjWxxX55AsITLVmu9rBEj2fRV0xespvFA4FDw8KMQlMUem1HzsNGJAFPGyLula1jYecZIFsY/VfzGRClhq7RSYf1GippQSDHlcpnLL6lxpW5Ry7HOv4N8E7K5VpD51HJmci7C2rZ7PH6Xm4qvzGj6X1lkKc/DtM1lkx6mk6WWfNoZo3+TzwS8+bU5nJ2pcK8kNbGTnzUrj2bb8DyMiktXhARoQojAJIMWB0drFmLaeGZ8vMRNKDnJaqGk6wp5WkxWzHu+q3D3DpMjYp9tj3HVYDxxxXvDritswZY3/pGG7CZxNAOXTZHV/0zF1VKMhqeNt6VSe/Df32fyRz7Ppc+NT6wA+2uNOKsyXsnT1Yv0u/gBll3XmkB2mJR2bdr2b0mwpg36W3Wz98/9QEuv7TAk2XjTs9SWPbs2llbtvbOHy3PQfFG3p6tz6gNnNnDPaXgzFjppcs4tm9zolntuJYCNEtTErULn4Fb3oizxfFMLSSYSkxV72dLnX+xcx+P+F9M7r4Zm3nYlTvp3VdWBwAqKkWIj+JGFOBBRd1X1nI1++pKToeZT4l9+FL/BdYAifn+9A+TX3rLQNfHW1VMFnr/6wAGPB2yQNWQ3E6wVeo5W3nDEhgQPj38OZC6QqJzzw7bHr3lHQcjf/rdXbrv1E/NzicCh+4u77rpzLhXU73y2R3n6JSCLbItd02LUhvrM+T7l1aAySm57qE/A5/cEahY2z7QKxULB+T4p32J2XGIc5OYh6D3a92lsSIp/sbyhWsSacB7t+4RtV9+QTWyZ7kPdOdTvxWNpd8nY1h+IluQd55RJj/Z9mqQNeidalLftrtxx8O+5oEo+hJQNfqy44TXFjUIYcQFNn1PaVC4obPP5BsVqIx6NtNMbwijvgf/u18AgwyBBEGFcYSCPev2RFPOeuxWxVNwXh8o0GNtWfQQBXmSL5MIlHVJR5sfqW1qmXhIs/H5594GnVYFcBPjvyLnn5JWRsWahdcvmyw8YmsApOlfj8ZgWdZaXi2hWwT1VVp3Y+8iwY6t5/5uga5VvXMuXqiPWOnHSWS1a/Zwg0+ZByLXBw5Ha+X50dNpIemml0aobyOr7J3xlXXCXYLTEfhffcnqxG6fqXcv6Do8KG7GCrI10O626A+4X+TKyysXhePsaQVvrtWb2eFyrzyPKqou/jjGarEm+bJdK9vjWPV53WDDiCzaj6UL0bDz+3JPrDfF9pWqjLTzF+GSzaVCca3ssgvEqYeTLFct7kHbfjI1jey8mqMW7Wt2iQQbviq4CNOq5iCIjtR7XmjTIJlMz+WYt2XV9XnBcx7Jjo+FgSEB7hk34RKFaKWu5dl6ERikbZUOKTPX0Ejo3fSnd2b55PBomA6ccdDAAXgP+u2MBACcCGiShzox0Idno8HIOwPUUbzyVBkKX9zKL4LK607vyTn0ROfiYJTkAfXAD5WwmA+Bt0YI81hcsVVOga8mbZZUggqGHo/hCTtNndGD7tAj/km1lcja7uSoM1JzqnTQATDh/U2tA11PxK9XxQij1de/pn5q6uVmf/pk1UaaQJ1EWmbdEdsioRXcsIncOaFOrlHISODO9aEcCdMk3H2VcbT80vn5+Iv52itnPoGQPXcDmWSAB7XuerHx6tUbupFIfUIlvUN3JIyoaBNvN475ZcCdrk52MtSEKzhAYy1Gsb3232yFI3Tyzj5Mx154A9Fxz7uzDT1877Umburs3ulZfmRSuPuSjShndNR5BVy56/LJvntBwVHu2uSYOZAw0GpUrvP6KXr9EvYztq8IIT0sE5Rt7W7/af+Ep36nXPhWfuFFw1/fzstTfFz34KPaxbw1TvGd5iHKYEUbPDEJwjkxFiGhQOHe5awbTXs+oK+OmF5ZXVBtCaDQSif0MdAODLQEljxG8jyG6f9j7VcpERxu+qY717UlJ0846mVqeNWdLM4XIEHOjWFoF0pYsu8IxPCcrEtZXdls5baYPCoJgNcDfPATBSg3kwJlzIqQvS8CZb/tHEAM70svilOEGBvu3L2JuA6YK109RYDnGhZ+Kjs0oJF9n4W2p6Kzbd4QIxpvCe0QOAjbaAS4sAuXuRMK+DIYyhJ3ZzlAt0p4ONGdI3BL58lyh8MPw4/LMGJT5nclO9FkWd8r2dxDrfLH05LBPMtQFxe2Lk6AKEhEu9SIBVheE6DCctYYh2eg5cFK40M4G624kVSiF/eWB/koMBuzOPkz2LwNLjzUa0YRvwrelvK3ixH8QPUNHVwa8UXc1/w+j8UScDGRv/Qh0JVRr/SwIlWMkKvvgQjWydGOWNqE3hEO0ThREGzGKCd+q7QWEBZ/kXQtyiuW825Iim4VpLFmQaV+ozSkDYYNexX975qWpFxYqh+H8P52enJ6dHo28a04o+xkXrWvi0eYhe0vYVZamgns6pIvbl2ecX21Hzi4WDIStStqa5+kswQ6mzn1mJLjNR3l8Ilz0Vj0mBwAbRmAlD0hnZ1h6Mv1P0dIQppIy+Nq0Opm/nSuThsthx89cHH3kuFE+Q77b8Ssv5XanRHj6KiQjhD5YGR11j2bDfZC2L+el2KNoaB3QroGsDclGeM5DsMtp9pXpWt4JqBnMqiAZdZRimQQrOcYvRBFAd5ns8MtAvCzbbbQgHhL3BWmWaPcczBB9ulIJXeDONl+6sojQHBnDA18PqAC0QpuNhGyPhzt1RFU1yGGEf0qLblBl72vi4On4hVbggj9Z2O8ugmlg+/h803aGeDT8emvbfkhcfbW+sZ5KPQ9ztg64Xtrf/F/+ixVvi/cqD2tXKfhecBFh7+u1r8YOdosEDhxZpPsw+DY6SjdCIjV9LMoFTqAI2PSM6QFqOx6mZ0Bp0kAFhf4xaQ3hSmJJRNwMrD4qA3O4hhD2T3L04u8PyoxVmf4oJoAC+2zAjmEZv6vtwh+nnMvGo+Ku84nr4d7XP1fgc7GMx41kjKsFGfV6YJv9QeQc//VBlauZP9KrFaURnwQao9D8nGgBpfwrxkOmtc2dI9JvsoGue1F0TPcctI5D0D+OalRUEfSJjh3oeQN3VcBrPegqwMr3OFq/8FFe99i2tAxkWB5esCXeDOoTov2ZfwjbWO49CSy8NluECR3bUL64EhCBLj4Z/P8OgApw/QmgoFp8/i/aJ/CVSh49iKukYkG4uUlv5kPeTX7poFGrFZGKJhctXjyQ7fT6EuyvtrRWDAzTz/rj2TaBePYJm4SDKXQw7EW8YmyfNIWW7sANng63IleUjAWNCiF2ibgbuChg6evXJLpIHJUuoTkpUy29oRnaB0Vm8w+STH/c0yAHLxSpkD9w3923/ef6h1/4JVgTWJN2poTSavXLT24yDlVCsI3ZE6FyBhHjOew6591VEoaB3hIM0r0zHcfGNmvQzGIuRuJBTltfwjWLC155RXc0Z6zxfRbMfJHyyniRxl4K6zxMUWuiUkDnq+vWU6fFiY/S29t3L7/2n9cuH3KtPtrp3/rIBwELzMiZ7H6HN+j6uut+Ms4Ym96HFS+7FKx/OaCIrJNTvPHSbgNF/W3TYrgS3eXybFHtIiN8S4dlVHzhEU1SqBe3ctPEdA1QwrL1FN1vFoK3WB7QQjSnWzxKhvJJFE12gctS0fS45WXFywNu2nwSRq7mu4ndTY8dfGwOqmz9Fiof6fG0B3/18Pf/eJDnlJ/aduDHPQBacAQR2CMkCK+tBHhHe1zxvTpwNNclx73zYQzGlMRwJ6eC30R4o7/ck6fP6gxAnKtX10yahgA1Ajla83Myh5CeaasX/Iv9Ozfs3v6PrgzCWCyKxemWXhEtsk0gs9lOr5nxxbMd35GG/nGuuljvF1MH8R0Ws2IJGpe5zWVdO4HdWAG8wOpJTdquSdvxUhbXPZPmOVvrLWWCQloQZtXuiZQ3hFPjcjVyP8yIxfqLqSAtSC4TJ9zjmOzzE4VsoEZgPtg9IPGvG3+0vrXdFp8df/9NA5Xyi26hVhNPzcwkDPE4vOZcqAf+8ADb9/3Fr756nfvcn+Cofv7oiwtW7HXKLkw1c0Iq5f3sv8aaCBhlqFKJQcgVPbAlTl4ZtKX+M90Atto7HMH1/pJvx0Gwfw7nrXjleu6oF00Gde4HdgpCuUg+GFI4qjFTfVE04sBC2gGrI7CZUuA7qVtfyvZbYlBfyt48OyTD0+6NbL72Gezq5bYRN8AZ3wBcAq88/3OSpDjnl5eXxAcJ5VJunh0q3Wo+c/RHt/Bc1UvbRmo0LbmP/k3rn7kXN5LUof/a091nrxPZinItfN+Ke0giiRzl+1Ln9+MVAkT40fQV8Lpghy3+ubpTSyQUlHpl4XcTm7760jKz1VPdRLGJjarzh+facjVMUwrvvm3TI+eSwpYXzucEoXTgIQ+6nwlWIZ+UJ99ie1PoUIacX/e9p2dVv49W3CUSIRUBcMAWR7/l5o9W+zo7zzpAF0QExDT/PDIY9FR41YychVbeA01FBXw9+XyoGASqMTZd8BJiVw8yQw/HGwtaEJb5i9MjxZ9P1FrOGc4NeASRRo/B4GEPmYCvcP4v1b+8aVkfEk96t9axB+/ApYpcvfPXqz/81R9nZDtg23rvqf9fv0rf5QhkVXETb8e7i2AjOq+ihnYz3NzjdtJ+tihLBU4sEYIJqiJOepJJjIEXKCIhZel7sfp4zWLDeHGZmPQja7LA9Pq9EZFJPrTD64aYLrtcOPVuIRTdQGf1UbRbo2vsj2iS3sQQ8jychMyACbdfIofAJdfbGT5ilXV5keg4TrEkzXJhjFq7DXW9Y+dIkqAZCuYEvjQ03X+4L9XaDyIkQZngEmz+u9VP9Pb09K7XH1F2VLpgPieQSSRGwJpExPOM2ByFAycyaUTKEidrBuMXtZNxcl5ti+DiiZgyBN94pyVuNhsdT+DbmsCBOaeokFzKDV2VW2+6NkGn0RgFfuq86MUZnIH5CMAo8dCeNa3L62oGBkcty5aH1MLlcO3CtWl/Ihlxu3UgH3Wq8UQx9n16Y0YRSakYfYhTI5CN4zaBO9V7zAXVbAMesl3z0EFO4NGg3FCvPxvCGO/UejjD6cwqCBgFgkG4FAuVO7whr/xbKUu15RWr0Dgr05YuXxKPh+0UXR4wjN3Qz22gMdWjuWwqW5yrtf6zH1MJyIRPTGHiz03tEXAXwnYIxLUX4ezl4XCfHr7uBm2I3KppqrVKzpc73Woq8Mwwh7mqg6Ndj/OFvlVQqHM8ciNwfozQQTIeuhk4HyOd5lxzdW2AesGFgFH5bP5bn0tcyDcyzwH1zv//ukybHy89QeNFPvyMfzdodSLSZ8mnhD+Colx5PwwlDoWCRfaqMZULZX8v5Cl2gMHDTzvtNbhg9YsNDU+Uxq3ORAsl91sTjEmk806t1taCWftKMoQWbL72boOobaJlVA2yzZUWKxxXjCmpBx1ZuKeu9kWjQ0ruC8NjvI1PE710sMuNl0ARqyZL2ASy2ZuX2DZbtcLY7gGYU7erX07mTOSALRJDjfx/pwVjkV19/av+aDt1A9OnL61kUuCE+eFN3Vd2wJlveeNbXrAqkyfPOOHGR0sQrm3whM266sQmYNpi9vGl/682pVzU/ZJrx81NPLddJc4UHOvr0NaD89J7glE8FGbWSFvFccyeXCLBftpXqs4Nc3TzR5taCkfFuOPVZ555fWN9cS8L9pmWem7pPPnrX7r72A0737U623h7u13gHi1BB9JSWpaex5uLOUggPHdPKDwgNtMvQ+22etOeZMNB4LXsfmnu957XSA9u1WmXFXivVa3rvg3//O5c7whG4w5qJAq9lFT7x+MDUquFWDQaj8XjhoIUMVdLYRJNMbxqJBtZB8B78GLKeqMzOTlsJUG7cspmHZUV3ADGZlMe+4klSuKyeXaA5lhytclo57xaq7c7rppT4VNgoo8Bz7yWaJ/3vIZ75oSnUf3bnZPOdUtvrumwM4oQ15ymtWqrPW4W1v//w668Mk8gbuFBv1SuMyBLzrDdIhgJhLVk8q0C19TK1Tr94hn+CGwt+tb/j954y003vLat4XXeLjpU+zDZmB/K19y8zzSf+HNbDyo+BJ5HD7Lz6G70PSj/BIH/l4Ofwir/aILZfQgiqzCLrbX6vO2+wbnKcafHWzARAXgmB6FpgzkUX5gr2XDc4N8MmS0xtnqymSUI5TS2giEXpS5xlvtzE/7HHeIPMpyBFy/LfbboT92XE2rOBM/0gtC/g3r2xfhdN25xf9DM9V3jBx3VklLHK5XuN7+WBqWj2JuoewM5YPotG5d+7DgCbMFOWy9+iA/u/q0K5LkVIbqN+j6RgUB2Ic5aKQzC2uEClhsrx23wv7u509BlHN1xNFOv19TwYU+SbuGf10E+uFar19dEEOi5cr+ojziz8TUBb3iv4ejkd5kFHpzF4ubl8XfHQT8TAOt3pu/9sfh00iAGUx48mzu4P+OfAn525zW8/XlV+VLuUT+tv6ydYexHwDcTKxfhowdHi9bVNeNZ8yoVdvrp9VdPQuqwxZdv5l6231hJEPr+Gx/tm+OKl5sYA3xoBqE1zE5dJzbH9f2d8R5JcMmSIF8kJssIMVlc29vbmegGG2lmGIfrxlzAbbvSzL/GdVPtJzfS3j8dpdg18C0lippRsNiGEsmnhY18wY93I6dM3DYN1uwTa74litaW1Z0P39c3L7lF6n2fAOKWJj0ZiwePPn0u6/xwKbCxK8d+NU0QoJ6dWE7UuFpjgRQnzzz5w2E6/9617gLdINnPIiJ2TId6zS7tntAVv5VUuqsrbkjP2nTkGmqrzmBP/v+mG59Yrw9FKRHgeDo+dXFFWZt2vX4jlVvewPo9QisLAm6QpQzLgBl5yRmrcU1ppluyBwhYz+T+Oi2ZuvHuh9pVmkEiyyJoP4Z9KXx2NbvhgO7/YlfuVLrxotdMCgC3K2+5Ow4x+L6c5Q3ECYGlPQtLdvHV4q8FdnZ7vF6CdwFo+a3HYQD2wPK3GBQv+yrWbYlqE/mKFhTbJIgqHlZdgC+kRRCC0HHapkfErbRDgQ20/of31CkjNK5zTY6vHksROCPfSiRgHZslnSQVjd/CY+FyT1SVUF9GVBguvcplUmqqgJMsFT4vvZTiQFsqERBnoK/cM7L5zCc4CoOHDKYkfBTXpBEgHSoxNe6fHtEBgtuGoqQtqtkQxu1jgRIB+shERL9fb2SjyHikW7+xpUBQzjama6KkJasyY10e3KJM7T17dqTEue0JsjYfBcDWKURNr9C+Wt9oFUfMm0jLGWvlSJItoxtqiCKxyzh7/NdJN+iMkv2VnWiwvOnCAZjgvfbeTedzlcHxJmk19I8oInf2XUuc2njD+NjfeQYSDAwMDAwMHMR6jUn/9Qwc0clrTM68IJNKz8DhTyeVnoHB7l8d8uZvB9pdMO6cuL88i9APZM3/b/sj5Zx9fhRXpBR5FdXxkZbYVDjYpy2tTg6SR75c9u1dK0kt0zu66HyOsiZ/NBNW3RqdyZNMiCNrM3iuA86ET9TmWaBuUSoKzs1/pLBSyai5gZWgJaxh2wfH0jPiHYucwNJ9oAlwMYtBC2klBdZGfrW6qDvNeRYc/CSJEjISI6Ezoo/c4EZvI76u7fPz7bzOtD79zDo+wsWGnmkmt4o8Bp0sexOt3FTcxyNQFw43Mca+gQ/J3ZiikKc1porq2tGOdrRzjd3Kf+7kUbfy3LXBtLvLux7qBQbW3eYSd3oNd2Tg5+1Ovk//AW8TW9r9LWymaWB6OOYZeBu6ubwkBSk02aTYgPoxBbG2y4DFI+HKzvvTVwUkMJT7AyR9rHno0Nra7+K4/+3z8+rG/Liu45tKLMYCCxwruF0EuNhwEeBiw1oogReHabZTWZowDqVta6GcXRzbsq+tLCuIGMfg7UZpAQ3PZhTajMPDO/6cFoAbN+1bsQp5xuHn7SQUKYxjz3b+t2Di780qQRnHkG4ZYUXPbwfOdDewytg537xdsrMzwkmBvR76y2UhG8ABMUCRHGusscbaUNFq14S1a7VS152w8lKFsF0T1kiz9nA3IEudIieJDr017hquXLT7+Fo1U2H+wUM5vjKnBfljztObrjq9DFSBWv2e9Gjlkgv3wJ7Hc7k/pFFXTTpqRI2okZ4KrKuSPVXLhACfjophMxnIiOLyaUn7ELg+6Lf6RtVWXsywJ7fxGroZLUjfii5iHVOouhAPw/UI8QGosLIoGgb7Xa6gBtlnyBhHtLUrQvDA+eLCjdMfM81opygcHe9FRtxEMZU5EcStRUjFTkUylFHjJBzL5zo79lYmeCMoyE2x2VQOuHFpp+vZxJbJ5T3aGb8/NvkkN4QxAqt90GCq2yz7lFhT2tjYuooS3GX0X9mfVuj2uWdV6xn7flKIaiWHKhCfhbehYy0oqpGrYXIM+REo9i81QJQYRvrAvSltnfFzv6UVvLV0DyYZW+FhNMnjBhPORfYkpA9PU1VstI31QokVGM+xKYaMvONYoFupC4uIkfVZwzZZCnyPFuEH6KfcHgT/VDK96U+fWziamZulQjRQ36p2Upgredfq/1U1dbbvd1UUmoPRD0Cnax2LkmhZcKL+Fp1vzLiLLrroYs6rLvaSNoscMAwxUtA4YxBisKDFXUFjkVFdHCy0LrLLyKWH/MVQjwofIKqhmLLd7ppD+3aXVjbdNSitWw0K1IfCJyqRoT175mLm2Nk59iL4XtB2fJx0LXJ1y6UBFMmEH7Al4RXaKzU5bzGszwN655OZPmix0vDjN986dyCikCCRhYQNiSwkbEjYkLAhYUPCjnaBhA0JO5oJElm423WLIDGEvWKOMkFdHLigmjZAxGFBwoyW7DcrkgcCq1BvCogIIEjYkDBDwoaEHdUFCTP0CEojXJuCDHyV4k+iobogypupHN1UozYVTi37x8w0I7COkTf2EPz+atN+Iokh/rlZC7W2VFNLa1PkczFXU4Y5x0XDkQU/Raeq/y8Xg1E5GJW2NlK+uVkxIm5e3BpSENORT1SmjC76TvPuUUo5MKaf05l5bSWkv7olKIOpIq2yWSLn68PjIWAvZVz14wsI7RAIICRiEGy+JcyQsCFhhoSNPWCOMAALbgQkbCybm+yDybIsi8/js1iSs6wRlUiWrweCHLeEjYbZGlsiYnibmSv3fQZlTP4bAQkzXMw/DsLqbgkbIlnDRbz5uCAulpDEBRjKthvzDH+7zwaYMPmGQvw1/oKZSNCB0SasFrtiJlr/Nl14NeVdp0SyPblwbi6koblsU5Uct/GXT2MaHDVtqzqQyotIJgmMpukmkbjAEo+H6iZpWq2UVLx0Iq59Hs+AhPthgvGkXQA15eBiMEynWebwQFjho7WSxwQ8EGlOtlytlAwHBhcE8zNxvKhKjO2EbmAiDteiFqhLOonZOhoSxDmBhd4olBbXtlB806CzZpGmIN5d0xOx3S6Xrdp8I0FsJKzJoIQJpT7sDGr1d9UF9+IaqOpOVF97cV9W56tcrzZE4eL6GZ0ICNshQiOglQtdaqJG2yrqeK61mu5zIRF12rr253ECtYwRlAKzhFpxVSIYN2tGzIhHJfpilmhEbTsF7GppmUp8sldFCAnxdtXklfNiM5qKJOIq+ypoWWr/Pfj/j2u1i1TR42oyceME1VYn9ZCVtpSi1nxlbl4bH3ZI7Q92Nuu7U35VzScFqMC5F3B+/fDslNqf3jc3/Z0llt54OWb3MEGCI6jUP95TvhdfGR9UB2HYUJE0mwRck4Dzd6ZEtSe7vBy0Z7wOkuWPnp2tkKJ4B2tNatakZt2EzC2jUlkQYwogQa7JKsQ+uZXzh1pG3gNvGefsf0VshFIRFtb3y+i2zWhulC3kgbtx8YyDKtNGCYRqENORQFw1dJCj+MGxImtc6oYMvLx+RllaCFTo49FQJBHiSsM6sS3ONpDcjOiOQMp1Czk/FKJ9mC1tvVropcrG05XlKkBS4CqWcFSAPGQe4yK2rwogzzIXNBmePflMDGjWU7bec1XYEvVV9zxO3GBegXhBVbQiqqpaB+wSIP+dshHg3BoQRq4JxNKq5F/L6zbdYay50ea38E0M2eZUPdyXQnGV4Wbgi7v+L+B9zmftv+LVq4y2fONEMf2HyvQntvhv/Th1HZAqZG2GbqmsxPju73b9hDclB0QowAOZY2sx8FJCuZY871RcHSTWezsBSbhUBNUyilVwUHSX2Z5Nen/aywjW4VtGYVjA+BBMJ8/D8gwGE4yMy8OFkF9TmH3M6BK1QiiWWuwVIZ9bqSiVYCHap1wkVqjNbl/Q2dD67MtLETyhSKifl8RgMgi5U0bU+DQKRmAoLzUtRGRNJ5RJTEtHssGzrWJJMamo9P/kFcyj03gMlESTaewVLov8uwES4+LDxlELOVOgtrm8No1EeG3xtBWott00Z+95plzUSfdW2cFuPpmI6Fhc9BtXIFEyuVLG4AaKPGNF6cjIwWuqSQ10gS7htbg+TtwnB1HEqNLWF/JwtPiH2ZJvbcb8GjHI2CPWipg9e57JnOYCfvuolIi6Sll+CEnL/G6B+VTl7qLi6ViEwEL62K/aSqpASZGYoKMWJjyWKfOHRVm+TDpI5dJAi5syCivxmxHMBaVeKFQzqtLBMn/jRzLtE1wEFzmMFejAGEpodLyLyteppNYobRUTbI0Vd+d7e7lStmFVr1g/YWN0QhS6TnO9WIC4+oETx1Cmfllh+7VpgMjhFi7vhf0EDYO5xXG6nYE1gsBBUE4hwQ0AOpmkRVta0WweYjCbIIwH4ycvrwQZX6Z2ICtEXJfW1+MpQbZ7I8+xSeNutdJWy5kel8BJZBe7YLz6oAZiXM7LTNBxX+E6D1eXnRH7GvQeVpZVoimQubBeoktvWgEnAxbflbtAVpy831J0lmKSZaQXpb3mP1rCFKKYut3UsIhxS5stijmY0cXbChK1c3BiPjxWH0GYCos4R7Bb7MS38yVFCzfvcnIkskNFwTJY4YNNxyRg4Pg6J1HbajUXHhjbJ3nX7hLY8h3pbIDbxrQ2QLGI2R1sssxOwAk/EEcTY+mJI50FBxITot+xz3iBmFhkGqClCX+OBpLJty3hug4z+w/QiTlBwDqpubMmLD3ER9WKWjgkwHnCWqM9hlSLqIxbeRxZBSATMa6t0Qu57qa8feCN/6EoEFtewceJsDM1CGAYRBhe0oT1Oc8EW9vy+fMoDjtWB7cmQzUSR/3BxN3c0Qy8XfUHrBKWACQo5fEvi1FJimZqDdzWDguOw4of0qnGRNBWuTz3gfHG3v1uW3u9JvH0C56mN23Nn8rWatn24sJZ83X7yLS2Ljt4dPi+TjdSUolOK4slbxEjuOX/YfyyN0KYKuHuSku7LnWUAQeHrGCMB2JTIuBUsJeXCT62yuWhirimzrVq1nMVxi4v7V2A/K3eYnCNCy+Z9dKICDLSF+znimmg0xvgBBB39sD1pivXIXvSto8cvnEdBCEUyy/w4AZcYnIezWngg6gSHFm+26OiuGZB15lompa178r5JT1ZZ18S5NFa6vgXmTTcuQKgh6x/r5fflGFP0JgPNsAG2CjO3WaytfF+SoMxTjlTVoKGVeeTnNAya4tlQoSIhMIk5GtzivRyzBHJWWbli3AlCidYtm3mt0dxIcDclOcJZ7UrZD2biNKBINUkerFTPugXES5Wq5YkGnXUrllm7YSVDo3+0JvFPMbYOuYnEkcG1pOmkPVELMa4UKjt279/EcUwIt2uVxTCd3GEbLFl8MoLwZ3gJGkHXwXtoL1YfcAqUQAJdbMi3/4vZfhJVUtT1h3IWPKM1zDh2pbLcdRV+cLt5Hws/fSSf5ULg5ow91fHWkJAGmb6AJ/ygnp6ENOJZ7P5TfilebHWvnUx7072uhiTwekWXhfTMkF1MeeWkIAH9vvEWQ9B9CUKUZZ1QcFx/H2ufoNfKvFMyahxQYFtTh/R9JVZ1cW0iFQXvd2r5+dOwUMJZbrQDHl4lkkvRX1/P79slXL2JXmRgKfgza/ytEc9UcLwuph6lnurdeBDBVpBkoaiIhPFmB3Jck+MFYNht6NkL1F+sZj4LHoiBJLhjLHpXqqibgQ4YzOZjECEbEqjh851uB/pJD+vC5GSriwUvDWAAfN9F5H0sFmEjBUyFs25FTxh/Nwa9tiTLtatKwKC8dxmY0i1mVa69qYQt2tT3WK8qct7aKsnv92W4GOPRDfuK8bfoPRG95l+h24hTtfGRQuh4wR6G2+BCJvamvQF48pgVbe784ygf32yY6a5tDsPXjTRSdsY0UdPAu+TMFpLkkgmAul7ntXKEb36Enifwh59lTR/N4Gz32YpIiJ6mcvwGi8ZrkKJyyNYknyfizE6yWG6SxeDFId1p+58air5C3EdHOD7MKTRYX8D+nEnpbUtoGhZDK7W5LKaZU0OPTr4u9+znnGJl9nEW90ZHdeh1Wsw02eaS7+P0Qh6Gijq3YVm3HbeGW8yxwGnRpzsdnViXUz9lPALWbP3cZXgEL2TjuLitOrlTV+QWdOymwlUatAZ5Ylt5AYefjXr5Rna8HD6HfpxW1PaFgVaFoNFTY6qpdKZxVQTHFyRKDeaLg2sWEZD9GKxl08LoKIS7jjsk+5EIoWPZQfkSqmTeT5qmkRP2srsKpVgrajcpEhWVyYoPB5/f+l37kmiS11srP8kNUCzjBw6MkaJ1HlUNNjYSSuOT7CJ8lTKAIz0aoL+V1Ckg7NXXM2e0HkMS8Dx9/hvdB/gQN7bz8hImXXogGGzgB2O6axI9WDb6v+p9MWJeqK6R91Ts/T3irrTRDosjm3Fn5p45YZ2od/QO9prsri4QhMWRATuNiSs4PvgJBGi+GIlLqAQ2odHQn5KrtYxCnY+gnLDaYUjyutk97GyJCWO+f9iGQ78hFqRhOARGhcN2kn2UJFs8M0KPvOhkNQP1RcBO+6YsU8Tv/XMw06dt7m+bI1eE3crHPfQBPuPCMV+t2zxmMa4rEdfjMVm/sGr1IbHLMlo9i7+IIwTFWRXid0+8vln5xgS2jC5YvQZ1MRHFFvk17zmku1h7ibi6NDhPxR3YsGkiTA4jTjiY2AU8Xu0O9xjzVU3w4lkWIVrkOrIfBQE7GW2EItXcoBzhNaFQibLpSiwiQlxRFUR/9/LPua+GVzif4PeiMMFqFqKxzN6gfmzkgmFC6mzTZg3ThdBozwlUw5nlOrYQRttzBWhKSut3WsQ7wo3iYZmNBRKIwbTNTj/eJWRoa8FxJaGvWpwfH9BUFkP2PdcbKK9aoTu9GjcPxCLVRtj9gcU4mGYkzm2lyZxnNORRiPOOfD6kIdCoAgjhsYL3yqqHRqjHhxHjfCHkv41RXQAUb4Cfwddpc7k1DLOTwSfG6PwB5XjLylJCEQklGn6esGKzjfjE6VY+C+Et/q90cM+KS0ERUfeT9+p6L/z6sXGmsJSWHcKNRYs+VjLpiv0hp39j1t7ton+4NYMviXKDpQoO1Ci7DDfLpoOlCg7UKLsnC4Rz0O5G1wHXrm8L9s80jh53Mxz9XgkHFc8CBpLIPX/yZH8cPI/HF4kpl5dDg7tyB6d0CUoXpF9nYraO1HDMf6vjhQ/hRoDyo5od3/OuGL+M18tjsVisVgs3hohPJ0r4doX+kISEB9feVoG1RCU/CFXcEw4/oqet6NA5QnUX4l3gFiWVUD1gGnk5J8EGi/5Dz1c1MXPbD49vgL0p/XC2L0b0YPzKKNUO7B/upgweDf6jLvim4aKpUO4YgXiaoJsSHNk4cxlvmlSLhXpK4XV4AY9xkJoXdBNmsIZtBD0RDdElml6rHGK8RlcEcYmusYmyHLRPByFQ8ZrhP5+AJgdHpb3GqKg5gpbnk9QgHdO5YnmfU+sIg3oXVXJZ0Z779KV3R4vh0+OlzDZf8jt+4vcuvgr0E1TvsshbO1BBeGOPfOdk4pZQzuX4CwpOzbsWz635f5RYPIm/5OcI+fIOXKOnCPnnnDO+fNywH1ikPMstp1X7RcdS54lRy3trF8wEvDFur10CdE2oyXbTIq61ApPWNy0UhRrcEfb4kv3V3bPGf6c3sM3/lCUmTavrujz/qPUwJfWJTqplh+dxu3XvSHha61yejlowTsNHGVzxGhwfu5CHVm7crH7DXDVSuh8uNpdb9xL8wOpF8vtrCj+/jfnZ8Jhtqj4+/RPVnMa7Hx83hjURfW8ep6HgzsXJ9csgfPydncz4tOHvEyWhfuIRvC37sFHsQfWj4dxWB+Yn+U6qwrHOPH8xGMr5EzCjIT9du56EY03g12Oc+JTFcJyHvmIhePgojLLqJat5gnnAMNSuLiIQD0/SfB3VakW9u8UXNdvMXBymPExfRJjT04IYCt/q+TOSuB8YcRz4J0+tR5vcYhccC/36fGI3rF7WA8jcN1Ljvgh4JFv1MqmSZHXsv5pI3+D3+SsMf7P6Oi+9Mws+Q4Oevao4KkHwohcxDgvKIoiNPjs8rkLbXz23o52psLW0Kg54/tBsEb+2uC7RRx3vsEv6p3ntbutpcnc5oP4RPjgt480f/CQOR81t+c3MidH/s0nX3UHsL/gtho8PkEc+DGAR74BW0cY2+ZpbNVoIA6zELanM39XKuYC5IS0f5/q/e/5Lxsh8q/6HJEL9gnkztEnT/MM1MMgNh5pHbu5OskSpG6x+vXv4EewPvi362uLnAc0Rm0l+e+0KQue7fsfeffwjTnz9NH+wnduacC4Wz4md2EYwoKR0B2HSoeQvPejQdP3aWSf9pVxbi+fFLxrM+9v9wyB+JfXR70hFNa/m/4LAAUEgAfiDt39sluskf0TcPf32uMPl2591L32RNf/7nujubawXQYgiZInQMD9pdev4qWSJogqOkfw0zVsvTdHIlNxYsBPgAUkYpWF17g1tcyxpQMp6z3uu7pKJUlYUVQmbGjsSkR4C8LesH2bJFSQYpfZWY7MWUXj2Wa/lK8x3CLzBKvnzleRGcMwZWR+VYN5xhx1+6wxSpNWmezCbP5a/aW356fXu4PbsK0xZ9GYpNB6tV3wz5+mpkVJ5L751thaZui48R6iZpTvi3bJLzoGhOUbQgcZ6jVd6g/rVHR0J4RCXvWeepR5u95CuUks6FayjegLjZVfCrY53tdvaN9jn9iHxvgD854J+n35u+/xMrEIkZjj3fr5UP/p/tQuiCpM7Jkk907fZX3Nqpqs3OIPAPHB/fwd+Wh5lQ+7xY+qrNrn+gtXxJsh8XbVcJa8YilTK+1Vvl4c2K/akYYMeUQ9yaS6S5HTeIx5azHPj+cd09tLuVti94qvTxq9M2rIbuIdVVWybLJhx+QxlndC7OlJp0J3KLuOb9+eRpQ98kS7FFbE5/pF6gKt45DQNY1HhY2pQJX2rn+f+HqW1fwxwv7YyadgWba48sTJZ9ksxIsGED05wWR+mBfEUDio/k9sXmSgpfVhcX1RfL40xOJ66g8ssTyC3sNSlv/n5M0juVMsxA0XIWTMHtWS32gtpVIeqeSnQz+zA/lGcpJ8LXF7+Jj+4rAOowAYUEJY2fK5ehcUa9QwdmF9rh5CH17cNlj6yuH/i8wIjFSbni9IdElsPiO2bjYk5tJo5knsHE2qcm88NN1FdkoVnvyD3E5GEVOqeoQgqnCkKzmOVMO/50kRl/80qzcONaoH4HgJVP1PNa4q7fpJKIYnR+DAGyIumv+R+p4FLQT3+phzfW9y7hE93XAFnAbH5ZP0/ZY5L94tHJ9v+qhuFnZj8jC/M33iadg0AxyDE1Efm6vXzJzxfm5DWHaZwLyhltdgrGTTARsTo5kPL610uhg1VEy9th6/CSqR03o9mBRcqw0g9QsjmnKelet1nZzULjR8xGB4ivjqE2bux98FTm0Vm29a33b6vK6BTUuzb/mB3ntaXgNPtWaZqYhwS5Br/IvMrgp0qsG74mFRFRwZ7ujiYUMakNYnT68QTK4iy/q6LQWxz0e9N7SFAa0X/RNXNHZUKXDnHHUNtssgqGHSCkAL1ABqJlsdQBZACrj6h+YAhAAK48kXAUQAYoAHvq8EoGvbao5IQkuExU4Z6gAwAF51b2wAKnJi5sfF0yFYAgKAFWB+HA21k+nJD5PW4gY8DKRTBhjNQq4kFwMr+T2fy6wes8jrkwA8x2/wbu14sm0zSjPJ9rZsffntRht7BtQ/CdjcLSTlRucBbIXf/If1gUNgJUO5DaURyjH53zcf84d6//PGCsXu8CrGxGDQM7LG1ttTBhcwGiRQXuTWDbI6EgGfRtiZ8BDboh/tRA7EZs/80ba3KAhwytzQJlYmlcyQk+TW57cU/haGd6BskUu7rJU04gqBWmjfrSBwbaOKfVwhAhvKnwCFWHEw2FM5cEiHSxBgU+1AhHzIIcGWeqCVoawmUWBHfaioYhRVNNEI6FA3MwbsamHFJ0ajiinaJvzENkmAPe1LgqRTPkJsWqC/DJNPfVIzVnb7myeYAh8fLsJmrndxmiuw/5SLP04P0ToyLPDfJro2XFJFljihlXqXxnLNerOV/1fm369LQ5MVlqaJF36QPwk1lce4SpgUSzpnn4diw54scEgarXS+YZzCbTwGR94khAP9FN6bvhKyMJe6zevo0M4wCq3s9jdPeJoa+f34cBE2c72L01yBbQhVxPGCg7WjzZdXjUk92V8eE3VJAh9a63Dkj+HCgsAlVWSJa566UPUhCD82zP8SqCvmp3V4j8Y67hBIuwcE72sc+R4xNsW/HiYOXLJFxRjIUZlJ1ArJcDLIyX2HkMcDcsmSOGjQh/+43OId9zDK+MHOaVwoIPVAM/FAwUFakDZWTYhqYe1dsfVBTF4SEi/YDISeMkRFSVbWf6k7wnh3jEzU432nRssxYCCxB3cmxC3rmmJUjKgQt3sQ4I3UxLQXo0oIEY+C/bylgVGRYlhynJQM0DW+cTlOahHolH2vQKZGDbSQe5xUIyoIywjv01kRQmM9MBFou6P5o6oET7TmikrwrUiJJ7vuq2++++Fn01TZ/gqVVVTVFla2ppa2jq5e00PoWHvv48Wl5ZXVtfUNCO0QQ2rH8Ykrtv/5DWde5ol7PMUhIEkuZVLokSU5ktdZJrAABBKFBtJexeH1w2klbZpyWY8xTu9ng/NepaRlZOXkFRRRlaerqWtoamkbMmzF3J/GYHHo5dj4tl+Dezlrj0PkpC+PksN6h0kpO/EfNFXV1DU0tbR1dPX0DQyNjE1MvQ2FcVlHpjmPaGc+13Q6egZGJmYWVjZ2Dk4ZXNyazdl9MmXJliNXnkZz6X4BQSGF9h04VHPk2InTYq9Kb2hqaevo6ukbGBoZm4A4X16mUGn01rF8EcxCmseaARflYXwBLgTrRHIiaKzEB47mohmW859Hj0XwFt2/g7sP5gALhwQpMuQo4BFQYjgB18zSYdmUwguiJCuqphsmzoFWNBZPILPvKJ1xUE/EgYtnL5Ur1Vq9weZsbw/RwWdBoTFYnN41NsQjMLNIpA+3s1xHUri+W/2gh8srEtdkIXlJ9Xp4W+46vNv1tE0qSxva4cJMLahUKXtZuSNNTB3EYOWeoZS/JNr2zy4nazak7dLCZfUDACEYQYsp9bfO4DWYFTtf9jsGRJ22hz7Wgpa3MLzeudzc7k+V8I7x72/KFBnx5EXWHwKRRKZQaXQGk8XmcHl8gVAklkhlcoVSpdZodXqD0WS2WG12h9Pl9nh9/v2Dw9rR8cnpWb3RbLU73V5/MByNJ6IkK6qmA8OECFvEdlzqMT/gIUSYUMaFVNpY53kZhlXRzjJVXNgW6Nlxfe1Ta5w/Tuhm7z8xvHpGpnlC67Mq6arWamBkY6xW8GBSxX0RKybvzLd3Eb3qx2Hq+PPpO/lXomOI3vaBFRGMz/DVV98hYtLLIDcxcRQU5kRmISYiVVIoKbNJuZhg0qSZnTRz02OQKsXrmejDbdQoqrZCixO8O6lSnFAQXA7SsFnuHVOHDis9XBY5pSureAp2uzfQY23r2mq8d9Jgsh3qQPlFKdfWG6lJ5WbMwMZgYGTocYjjUFqdvuIJBcEVpCGUQICRkZHBycnJERQUFOjUqVPHoEGDBpKSMk0HE0rxhILgCVKlmziVABMTh8jum0Q3CocQSvGEglChNTMNJW11r2GegKSkpKy5HW3atGs+VdnlSy4HBPuMHbIHNIkiYiJHEQeuVcwzrDQCwaeRKN1p3Wk3CCUQGHBy8tR95jMJmwQiHO3NkxPEOmLemcQOERNZD46rzWp/6cWkOt7d4m6xlxCKz/WMMGdpxUM5Rjq8lEQBCC4gQq/wmdcgKDDCiG/ABsacXxoXWo4kDYYfN27Cr8jlE1jGJQN85ifVrJOnjlqv1a95wqzOk7JFlS2veqYheraoskWVKz+EUMzrDYuvS8u153z9uHFelTTEzaq4m1o/sHDUd7RrlfP2/4HmErfzvnl2p9j3vPju86fPVs3DmGhLallLJSedYDvfl4lc/bErkcdp0t7Jp2n2xdHi4qg+FYUGHi1QAAZHoO+MuhtgCBSAwRHotlt/O05//pz9bbh5qZ/ajZiElEBGTkF9YUT6/Pc7yu29DPvp8S1a8/3CF4YxGfp55XLlE4uv18vY5DYd0cyScnRzcThD/rwgTRP/mWLiSnwTExEEMRERQRBTU1EUNRUVRUOafvvd6NdpAjCQlaagBaSYFYPEVM73f9qaAAxkpSloASlmxSCB62HOVGu96bSDIVAABkeg74zDaCeVNgfEYiEQCARiO94Wx4uLxdqWjOBAXecoajZsUm7aPuT4wGD1inNT5S120bHWLI7qSy+zrzK0ZKJTMzwotQ+fimFfqs83ljNvNAA/+Y86gjLDPupweaaJc48PHErD0QLRWqewfTHatjhYYJDD1CkyXiJ7tH9f/a7hGy83A/gjr0uMpVvDHhRMzAw7jRO6YjAYjK37dG1BVurpnfME1Q1jWtl63Dk2z6JI5WIOToE34JkmpjVMghzozYdXsQObgksCR/hQXt3YJQ2uD6duroDMrovvm2PndtnLmm2Thlktw3HknE8HRU2wWjuzRpuv+SjKPBl9Zx/2svaQMs8yyFybS7pY2tYhr89LBxaLOT599e1299P/V7av/Cmelbbl4eD0TiF6Ax2161jwVlVyeE0qjbQ2e/QnXl2KDQlR+/TmQ7Li2b3i5LHq7wzSRB4kiffdlIY4fvUpyuTQXTjZSueX0ji8AZkvGnhtLk5+4kgYizs3M0IIXt+I8fXpTAc/fKg+vMQXrPzCX0GLzW8FRPyVrvx1j1pO/X1lvhJIXXehHxQL7xYrDZocKdahsY4UC++iKqJuJYmtxOmf/plu+meqedDo+KBTCjlIgXczlQZtYdxDD2eJ0AeXlA==) format('woff2-variations'),
         url(data:font/woff2;base64,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) format('woff2');
    font-weight: 100 1000;
    font-display: swap;
  }
  * { font-family: 'IRANYekanX', Tahoma, Arial, sans-serif; }
  body { padding: 28px 34px; color: #1a1f2b; font-size: 15px; }
  .report-brand { text-align: center; font-size: 27px; font-weight: 700; color: #0A4ED6; margin-bottom: 6px; }
  .report-titlebar { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #0A4ED6; padding-bottom: 12px; margin-bottom: 22px; flex-wrap: wrap; gap: 8px; }
  .report-titlebar h1 { font-size: 21px; margin: 0; color: #1a1f2b; }
  .print-meta { font-size: 14px; color: #667; }
  .report-actions { text-align: center; margin-bottom: 24px; }
  .report-print-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 26px;
    border: none;
    border-radius: 9px;
    background: #0B5CFF;
    color: #fff;
    font-family: inherit;
    font-size: 16px;
    cursor: pointer;
  }
  .report-print-btn:hover { background: #0A4ED6; }
  .print-summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  .ps-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 130px; padding: 12px 16px; border-radius: 8px; background: #EAF2FF; font-size: 13.5px; color: #0A4ED6; }
  .ps-item b { font-size: 20px; }
  .ps-item.ps-done { background: #CFF0DE; color: #1A7A4C; }
  .ps-item.ps-problem { background: #FDE9DA; color: #B8611E; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid #C7D6EF; padding: 9px 11px; text-align: center; }
  .print-nid { font-size: 11.5px; color: #778; margin-top: 2px; }
  th { background: #0A4ED6; color: #fff; font-weight: normal; }
  tbody tr:nth-child(even) { background: #F4F6FA; }
  .print-status-pill { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 13px; color: #fff; }
  .print-status-pill.st-pending { background: #2D8CFF; }
  .print-status-pill.st-done { background: #1A7A4C; }
  .print-status-pill.st-problem { background: #E8833A; }
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
    <h1>گزارش چک‌ها</h1>
    <div class="print-meta">تاریخ تهیه‌ی گزارش: ${toFa(jy)}/${toFa(pad2(jm))}/${toFa(pad2(jd))}</div>
  </div>
  <div class="report-actions">
    <button class="report-print-btn" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      دانلود / چاپ گزارش
    </button>
  </div>
  <div class="print-summary">
    <div class="ps-item"><b>${toFa(all.length)}</b>تعداد کل چک‌ها</div>
    <div class="ps-item"><b>${toFa(groupDigits(String(totalAmount)))} ریال</b>جمع مبلغ</div>
    <div class="ps-item"><b>${toFa(counts.pending)}</b>منتظر ثبت</div>
    <div class="ps-item ps-done"><b>${toFa(counts.done)}</b>ثبت شد</div>
    <div class="ps-item ps-problem"><b>${toFa(counts.problem)}</b>مشکل در ثبت</div>
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
function exportChecksToExcel() {
  const all = getFilteredCheques().slice().reverse();
  if (!all.length) return;
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
  XLSX.utils.book_append_sheet(wb, ws, 'چک‌ها');
  const [jy, jm, jd] = todayJalali();
  XLSX.writeFile(wb, `chekino-checks-${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}.xlsx`);
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

// One small badge per channel the cheque was actually sent through — the
// same icon set as the send-form's own channel picker, just smaller.
function channelBadgeHtml(chId) {
  const ch = CHANNELS.find(x => x.id === chId);
  if (!ch) return '';
  const plainCls = ch.mono ? '' : ' chk-platform-plain';
  const bg = ch.mono ? ch.color : 'transparent';
  return `<span class="chk-platform-badge${plainCls}" style="background:${bg}" title="${escapeHtml(ch.name)}">${ch.icon}</span>`;
}

// ---- Card builder — one check, one card ----
// A fixed two-column grid instead of a flowing list of fields: every card
// carries the same rows in the same spots, so scanning down a column reads
// like scanning a table — one glance at the top-right tells you the due
// date, one glance at the bottom-left tells you whether it has a receipt —
// instead of hunting for where a particular field landed on this card.
// A small round trigger in the status colour, not the full text pill —
// which column the card sits in already says the status; this is just the
// door into the same dropdown (problem still asks for a reason, reverting
// to pending still asks for confirmation — identical to before).
function statusDotTriggerHtml(c, st) {
  return `<button type="button" class="status-dot-btn" data-status-for="${c.id}" title="تغییر وضعیت" aria-label="تغییر وضعیت">
    <span class="st-dot" style="background:${st.color}"></span>
  </button>`;
}

function checkCardHtml(c) {
  const st = statusById(c.status || 'pending');
  const reason = c.status === 'problem' && c.statusReason
    ? `<div class="chk-reason">${escapeHtml(c.statusReason)}</div>` : '';
  const platformHtml = (Array.isArray(c.channels) ? c.channels : []).map(channelBadgeHtml).join('');
  const urgency = dueUrgencyClass(c);
  return `<div class="check-card ${st.cls}" data-id="${c.id}" tabindex="0" role="button" aria-roledescription="چک قابل جابه‌جایی">
    <div class="chk-row">
      <span class="chk-due${urgency}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${faDate(c.dueDate)}</span>
      <span class="chk-serial">چک <b>#${toFa(c.serial)}</b></span>
    </div>
    <div class="chk-row chk-row-mid">
      <div class="chk-benef-col">
        <span class="chk-benef">${escapeHtml(c.benef)}</span>
        ${c.nid ? `<span class="chk-nid">${toFa(c.nid)}</span>` : ''}
      </div>
      <span class="chk-amount">${faAmount(c.amount)}</span>
    </div>
    ${reason}
    <div class="chk-row chk-row-bottom">
      <div class="chk-sent">
        <span class="chk-sent-date">${faDate(c.sendDate)}</span>
        ${platformHtml}
      </div>
      <div class="chk-icon-group">
        ${statusDotTriggerHtml(c, st)}
        ${rowActionsHtml(c)}
      </div>
    </div>
  </div>`;
}

// One icon per state, chosen for what the state means rather than for
// decoration: waiting, done, needs attention — so the badge reads before
// the label text even registers.
const BOARD_COL_ICON = {
  pending: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  done: '<path d="M20 6 9 17l-5-5"/>',
  problem: '<path d="M12 9v4"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><circle cx="12" cy="16.3" r="0.1" fill="currentColor" stroke-width="2.4"/>',
};

function boardColumnHtml(st) {
  return `<div class="board-column" data-status="${st.id}">
    <div class="board-col-head">
      <span class="board-col-badge board-col-badge-${st.id}">
        <svg class="board-col-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BOARD_COL_ICON[st.id] || ''}</svg>
        ${st.name}
        <b class="board-col-count" id="boardColCount-${st.id}">۰</b>
      </span>
      <button type="button" class="board-col-add" data-add-status="${st.id}" title="افزودن چک جدید" aria-label="افزودن چک جدید">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
    <div class="board-col-list" id="boardColList-${st.id}"></div>
  </div>`;
}

// Builds the three columns once; renderTable() below only ever touches
// their contents afterwards, so a card mid-drag never has its own column
// wrapper ripped out from under it.
function ensureBoardColumns() {
  if (boardColumns.children.length) return;
  boardColumns.innerHTML = STATUSES.map(boardColumnHtml).join('');
  // A cheque always starts «منتظر ثبت» regardless of which column's "+" was
  // clicked — that's the real rule, so the button opens the one add form
  // rather than pretending it can drop a new cheque straight into "ثبت شد".
  boardColumns.addEventListener('click', (e) => {
    if (e.target.closest('[data-add-status]')) addCheckBtn.click();
  });
}

function renderTable() {
  ensureBoardColumns();
  const all = getFilteredCheques().slice().reverse();      // newest first

  updateBoardCountBadge(all);
  // First render means the data is in — the loading skeleton can go.
  boardWrap.classList.remove('is-loading');
  tableEmpty.style.display = all.length ? 'none' : 'flex';
  boardColumns.style.display = all.length ? '' : 'none';

  STATUSES.forEach((st) => {
    const colChecks = all.filter((c) => (c.status || 'pending') === st.id);
    document.getElementById(`boardColCount-${st.id}`).textContent = toFa(colChecks.length);
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
function updateBoardHeight() {
  document.querySelectorAll('.board-col-list').forEach((list) => {
    if (window.innerWidth <= 860) { list.style.maxHeight = ''; return; }
    const top = list.getBoundingClientRect().top;
    const available = window.innerHeight - top - 16;
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
    const card = cardUnderPointer(e.target);
    if (!card || isInteractiveChild(e.target)) return;
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

  function handleDrop(id, targetStatus, cardEl) {
    const current = currentStatusOf(id);
    if (targetStatus === current) return;   // dropped back where it started

    if (targetStatus === 'problem') {
      promptDropReason(id, cardEl);
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
  function promptDropReason(id, cardEl) {
    const r = cardEl.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'status-menu show';
    box.style.position = 'fixed';
    box.style.left = Math.min(r.left, window.innerWidth - 240) + 'px';
    box.style.top = Math.min(r.top, window.innerHeight - 140) + 'px';
    box.innerHTML = `
      <div class="status-reason">
        <textarea id="dropReasonText" placeholder="دلیل مشکل در ثبت را بنویسید"></textarea>
        <div class="status-reason-actions">
          <button type="button" class="sr-save">ثبت وضعیت</button>
          <button type="button" class="sr-cancel">انصراف</button>
        </div>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('textarea').focus();
    const remove = () => box.remove();
    box.querySelector('.sr-save').addEventListener('click', () => {
      const reason = box.querySelector('textarea').value.trim();
      remove();
      applyStatus(id, 'problem', reason);
    });
    box.querySelector('.sr-cancel').addEventListener('click', remove);
    box.addEventListener('click', (e) => e.stopPropagation());
    setTimeout(() => document.addEventListener('click', remove, { once: true }), 0);
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

async function applyStatus(id, status, reason) {
  try {
    await apiJson(`/checks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, status_reason: reason || '' }),
    });
    await loadChecksFromApi();
  } catch (e) {
    showToast(e.message || 'تغییر وضعیت در سرور ناموفق بود');
  }
  closeStatusMenu();
  renderTable();
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
lightboxDownloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = lightboxImg.src;
  a.download = lightboxImg.dataset.filename || 'cheque-photo.jpg';
  document.body.appendChild(a);
  a.click();
  a.remove();
});
lightboxShareBtn.addEventListener('click', async () => {
  try {
    const res = await fetch(lightboxImg.src);
    const blob = await res.blob();
    const file = new File([blob], lightboxImg.dataset.filename || 'cheque-photo.jpg', { type: blob.type });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      // no share sheet available (typical on desktop) — fall back to downloading it
      lightboxDownloadBtn.click();
    }
  } catch (e) {
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
      title: 'حذف همه‌ی فیلترها', group: 'چک‌ها', order: 3,
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
