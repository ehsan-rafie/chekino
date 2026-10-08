
// The theme is already resolved by the inline script in the page head, which
// runs before the stylesheet paints. This file used to overwrite it from the
// clock on load — which also meant a user who chose dark inside the app was
// handed a light login page every morning, because the saved choice was
// never read here at all.

// Same fix as the dashboard: focusing a filled field (especially via Tab)
// lands the cursor at the end instead of selecting everything. A deliberate
// select() call (e.g. highlighting a wrong password so retyping is easy)
// sets el._skipCaretFix first so this doesn't immediately undo it.
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (!el) return;
  if (el._skipCaretFix) { el._skipCaretFix = false; return; }
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    if (!['text', 'tel', 'password', 'search', 'number', 'email'].includes(type)) return;
  }
  const len = el.value.length;
  setTimeout(() => { try { el.setSelectionRange(len, len); } catch (err) {} }, 0);
});
function focusAndSelect(el) {
  el._skipCaretFix = true;
  el.focus();
  el.select();
}

const loginForm = document.getElementById('loginForm');
const usernameField = document.getElementById('usernameField');
const username = document.getElementById('username');
const passField = document.getElementById('passField');
const password = document.getElementById('password');
const alertBox = document.getElementById('alertBox');
const alertText = document.getElementById('alertText');
const alertIcon = document.getElementById('alertIcon');
const eyeToggle = document.getElementById('eyeToggle');
const eyeIcon = document.getElementById('eyeIcon');

const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-3.22 4.53M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

eyeToggle.addEventListener('click', () => {
  const isPassword = password.type === 'password';
  password.type = isPassword ? 'text' : 'password';
  eyeIcon.innerHTML = isPassword ? eyeClosed : eyeOpen;
  eyeToggle.setAttribute('aria-pressed', String(isPassword));
  eyeToggle.setAttribute('aria-label', isPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
});

const iconWarning = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="7" x2="12" y2="13" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1.1" fill="currentColor" stroke="none"/>`;
const iconCheck = `<circle cx="12" cy="12" r="10"/><polyline points="8 12.5 10.8 15.5 16 9.5"/>`;

function showError(message) {
  alertBox.classList.remove('success', 'info');
  alertIcon.innerHTML = iconWarning;
  alertText.textContent = message;
  alertBox.classList.add('show');
}
function showSuccess(message) {
  alertBox.classList.remove('info');
  alertBox.classList.add('success');
  alertIcon.innerHTML = iconCheck;
  alertText.textContent = message;
  alertBox.classList.add('show');
}
function hideAlert() { alertBox.classList.remove('show', 'success', 'info'); }
// Sent here because the session ran out: say so, quietly, once (the query
// only picks between two fixed lines and is cleared from the address)
(function sessionNote() {
  const why = new URLSearchParams(window.location.search).get('expired');
  if (!why) return;
  alertBox.classList.remove('success');
  alertBox.classList.add('info');
  alertIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="17" stroke-linecap="round"/><circle cx="12" cy="7.7" r="1.1" fill="currentColor" stroke="none"/>';
  alertText.textContent = why === '2'
    ? 'نشستت تمام شد. دوباره وارد شو تا کار نیمه‌کاره‌ات همان‌جا باز شود.'
    : 'نشستت تمام شد؛ برای ادامه دوباره وارد شو.';
  alertBox.classList.add('show');
  try { history.replaceState(null, '', '/login'); } catch (e) {}
})();


// What went wrong is the field's description while it is wrong, and the
// focus goes to it (WCAG 3.3.1)
function markBad(field, input) {
  field.classList.add('error');
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', [input === password ? 'passHint' : '', 'alertText'].filter(Boolean).join(' '));
}
function markOk(field, input) {
  field.classList.remove('error');
  input.removeAttribute('aria-invalid');
  if (input === password) input.setAttribute('aria-describedby', 'passHint'); else input.removeAttribute('aria-describedby');
}
username.addEventListener('input', () => { markOk(usernameField, username); showLayoutHint(); });
password.addEventListener('input', () => markOk(passField, password));

// A username is Latin. Typed on a Persian keyboard, its letters are where
// the Latin ones are — «زمشعیفثسف» is «claudtest» — so it is read back.
const FA_KEYS = { 'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'چ': ']',
  'ش': 'a', 'س': 's', 'ی': 'd', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ک': ';', 'ك': ';', 'گ': "'",
  'ظ': 'z', 'ط': 'x', 'ز': 'c', 'ر': 'v', 'ذ': 'b', 'د': 'n', 'پ': 'm', 'و': ',', '.': '.', '/': '/' };
const FA_DIGITS = (s) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
const hasPersian = (s) => /[\u0600-\u06FF]/.test(s);
function fromPersianLayout(s) {
  const out = [...FA_DIGITS(s)].map((ch) => (/[\u0600-\u06FF]/.test(ch) ? FA_KEYS[ch] : ch));
  return out.every((x) => x !== undefined) ? out.join('') : null;
}
const userHint = document.getElementById('userHint');
const passHint = document.getElementById('passHint');
function showLayoutHint() {
  const v = username.value;
  const latin = hasPersian(v) ? fromPersianLayout(v) : null;
  userHint.textContent = hasPersian(v) ? (latin ? `صفحه‌کلید فارسی است؛ «${latin}» را می‌فرستم` : 'نام کاربری با حروف انگلیسی است؛ زبان صفحه‌کلید را عوض کن') : '';
}
// Caps Lock, said while it is on
function capsHint(e) {
  if (!e.getModifierState) return;
  passHint.textContent = e.getModifierState('CapsLock') ? 'Caps Lock روشن است' : '';
}
password.addEventListener('keydown', capsHint);
password.addEventListener('keyup', capsHint);
password.addEventListener('blur', () => { passHint.textContent = ''; });

// Signing in: the password as typed; if that fails and it had Persian
// digits, the same with Latin ones (the admin sets passwords in Latin)
async function signIn(u, p) {
  const send = (pw) => fetch(`${API_BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: pw }) })
    .then(async (res) => ({ res, data: await res.json().catch(() => ({})) }));
  let r = await send(p);
  const latin = FA_DIGITS(p);
  if (r.res.status === 401 && latin !== p) r = await send(latin);
  return r;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  let u = username.value.trim();
  if (!u) {
    showError('لطفاً نام کاربری خود را وارد کنید');
    markBad(usernameField, username);
    username.focus();
    return;
  }
  if (hasPersian(u)) {
    const latin = fromPersianLayout(u);
    if (!latin) {
      showError('نام کاربری با حروف انگلیسی است؛ زبان صفحه‌کلید را عوض کن');
      markBad(usernameField, username);
      username.focus();
      return;
    }
    u = latin;
  }
  const p = password.value;
  if (!p) {
    showError('لطفاً رمز عبور را وارد کنید');
    markBad(passField, password);
    password.focus();
    return;
  }

  const submitBtn = loginForm.querySelector('button.submit');
  const submitLabel = submitBtn.textContent;
  let navigatingAway = false;
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.textContent = 'در حال ورود…';

  try {
    const { res, data } = await signIn(u, p);

    if (!res.ok || !data.token) {
      showError(data.error || 'نام کاربری یا رمز عبور اشتباه است');
      markBad(usernameField, username);
      markBad(passField, password);
      focusAndSelect(password);
      return;
    }

    try { localStorage.removeItem('chekino_signed_out'); } catch (e) {}   // see dashboard.js SIGNED_OUT_KEY
    localStorage.setItem('chekino_token', data.token);
    showSuccess('ورود موفق');
    navigatingAway = true;
    setTimeout(() => { window.location.href = '/'; }, 500);
  } catch (err) {
    showError('خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید');
  } finally {
    // On success the page is already navigating away; restoring the idle label
    // would flash "ورود به سیستم" over a form the user has finished with.
    if (!navigatingAway) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = submitLabel;
    }
  }
});

// (the support button is a link now: no script opens it)
const tgBtn = document.getElementById('tgBtn');
const tgTooltip = document.getElementById('tgTooltip');
tgBtn.addEventListener('mouseenter', () => tgTooltip.classList.add('show'));
tgBtn.addEventListener('mouseleave', () => tgTooltip.classList.remove('show'));
tgBtn.addEventListener('focus', () => tgTooltip.classList.add('show'));
tgBtn.addEventListener('blur', () => tgTooltip.classList.remove('show'));

// The username field to type in at once, where there's a keyboard to type with
if (window.matchMedia && window.matchMedia('(pointer: fine)').matches && !username.value) username.focus();
