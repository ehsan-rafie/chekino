
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
  alertBox.classList.remove('success');
  alertIcon.innerHTML = iconWarning;
  alertText.textContent = message;
  alertBox.classList.add('show');
}
function showSuccess(message) {
  alertBox.classList.add('success');
  alertIcon.innerHTML = iconCheck;
  alertText.textContent = message;
  alertBox.classList.add('show');
}
function hideAlert() { alertBox.classList.remove('show', 'success'); }


username.addEventListener('input', () => usernameField.classList.remove('error'));
password.addEventListener('input', () => passField.classList.remove('error'));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  const u = username.value.trim();
  if (!u) {
    usernameField.classList.add('error');
    showError('لطفاً نام کاربری خود را وارد کنید');
    return;
  }
  const p = password.value;
  if (!p) {
    passField.classList.add('error');
    showError('لطفاً رمز عبور را وارد کنید');
    return;
  }

  const submitBtn = loginForm.querySelector('button.submit');
  const submitLabel = submitBtn.textContent;
  let navigatingAway = false;
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.textContent = 'در حال ورود…';

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();

    if (!res.ok || !data.token) {
      usernameField.classList.add('error');
      passField.classList.add('error');
      showError(data.error || 'نام کاربری یا رمز عبور اشتباه است');
      focusAndSelect(password);
      return;
    }

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

const tgBtn = document.getElementById('tgBtn');
const tgTooltip = document.getElementById('tgTooltip');
tgBtn.addEventListener('click', () => { window.open('https://t.me/ehsanrafie', '_blank'); });
tgBtn.addEventListener('mouseenter', () => tgTooltip.classList.add('show'));
tgBtn.addEventListener('mouseleave', () => tgTooltip.classList.remove('show'));
