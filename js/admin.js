
const TOKEN_KEY = 'chekino_admin_token';

// ---- Theme: the same three modes as the dashboard (light / dark / by the
// sun), applied by js/boot.js; js/theme-reveal.js holds the menu ----

function getToken() { return localStorage.getItem(TOKEN_KEY); }

// Company/plan names come from admin-entered text, not from a fixed list —
// escape before interpolating into innerHTML so a name like `<script>...`
// can't execute in the table it's rendered into.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function adminFetch(path, opts) {
  const token = getToken();
  const res = await fetch(API_BASE_URL + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts && opts.headers ? opts.headers : {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    throw new Error('نشست ادمین منقضی شده — دوباره وارد شوید');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || 'خطای سرور'), { status: res.status, data });
  return data;
}

// ---- Confirmation dialog ----
// Resolves true/false, so a caller reads the same as the confirm() it
// replaced. Escape and a backdrop click both count as "no", and focus lands
// on the confirm button so the keyboard path is one Enter away.
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitleEl = document.getElementById('confirmTitle');
const confirmBodyEl = document.getElementById('confirmBody');
const confirmOkBtn = document.getElementById('confirmOk');
const confirmCancelBtn = document.getElementById('confirmCancel');
let confirmResolve = null;

function closeConfirm(answer) {
  if (!confirmResolve) return;
  confirmOverlay.classList.remove('show');
  confirmOkBtn.classList.remove('danger');
  const resolve = confirmResolve;
  confirmResolve = null;
  resolve(answer);
}
function askConfirm({ title, body, confirmLabel, danger }) {
  confirmTitleEl.textContent = title;
  confirmBodyEl.textContent = body || '';
  confirmBodyEl.style.display = body ? '' : 'none';
  confirmOkBtn.textContent = confirmLabel || 'تأیید';
  confirmOkBtn.classList.toggle('danger', !!danger);
  confirmOverlay.classList.add('show');
  confirmOkBtn.focus();
  return new Promise((resolve) => { confirmResolve = resolve; });
}
confirmOkBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) closeConfirm(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && confirmResolve) { e.preventDefault(); closeConfirm(false); }
});

// ---- Async button guard ----
// Every one of these handlers posts to the API; without this a second click
// while the first is still in flight creates a duplicate company, plan or
// password change.
async function withBusy(btn, label, fn) {
  if (btn.disabled) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2500);
}

function showAlert(id, msg, kind) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'alert show' + (kind === 'success' ? ' success' : '');
}
function hideAlert(id) {
  document.getElementById(id).className = 'alert';
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('panel').style.display = 'none';
}
// Reads the admin username straight off the JWT payload (put there at
// login) — no extra request needed just to show who's signed in.
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  } catch (e) {
    return null;
  }
}

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  const payload = decodeJwtPayload(getToken());
  document.getElementById('adminNameLabel').textContent = payload && payload.username ? payload.username : '';
  document.getElementById('accountNewUsername').value = payload && payload.username ? payload.username : '';
  loadPlans();
  loadCompanies();
}

// Same eye-toggle behavior as the company login page, for the same reason.
(function wireEyeToggle() {
  const toggle = document.getElementById('adminEyeToggle');
  const icon = document.getElementById('adminEyeIcon');
  const passwordInput = document.getElementById('adminPassword');
  const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  const eyeClosed = `<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-3.22 4.53M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  toggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    icon.innerHTML = isPassword ? eyeClosed : eyeOpen;
  });
})();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert('loginAlert');
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  if (!username || !password) {
    showAlert('loginAlert', 'نام کاربری و رمز عبور را وارد کنید');
    return;
  }
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  try {
    const res = await fetch(API_BASE_URL + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      showAlert('loginAlert', data.error || 'ورود ناموفق بود');
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    showPanel();
  } catch (err) {
    showAlert('loginAlert', 'خطا در اتصال به سرور');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
});

document.getElementById('accountSaveBtn').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال ذخیره…', async () => {
  hideAlert('accountAlert');
  const currentPassword = document.getElementById('accountCurrentPassword').value;
  const newUsername = document.getElementById('accountNewUsername').value.trim();
  const newPassword = document.getElementById('accountNewPassword').value;

  if (!currentPassword) {
    showAlert('accountAlert', 'رمز عبور فعلی برای تأیید هویت الزامی است');
    return;
  }
  const currentUsername = document.getElementById('adminNameLabel').textContent;
  const body = { current_password: currentPassword };
  if (newUsername && newUsername !== currentUsername) body.new_username = newUsername;
  if (newPassword) body.new_password = newPassword;
  if (!body.new_username && !body.new_password) {
    showAlert('accountAlert', 'حداقل یکی از یوزرنیم یا رمز عبور جدید را وارد کنید');
    return;
  }

  try {
    const data = await adminFetch('/admin/account', { method: 'PUT', body: JSON.stringify(body) });
    localStorage.setItem(TOKEN_KEY, data.token);
    document.getElementById('adminNameLabel').textContent = data.username;
    document.getElementById('accountCurrentPassword').value = '';
    document.getElementById('accountNewPassword').value = '';
    showToast('اطلاعات حساب به‌روزرسانی شد');
  } catch (e) {
    showAlert('accountAlert', e.message);
  }
}));

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)).classList.add('active');
  });
});

// ==================== PLANS ====================
let plansCache = [];

function featuresLabel(features) {
  const map = { export: 'خروجی', reports: 'گزارش', multi_user: 'چندکاربره' };
  const on = Object.keys(map).filter(k => features && features[k]);
  return on.length ? on.map(k => map[k]).join('، ') : '—';
}

async function loadPlans() {
  try {
    plansCache = await adminFetch('/admin/plans');
  } catch (e) {
    showToast(e.message);
    return;
  }
  const select = document.getElementById('newCompanyPlan');
  select.innerHTML = plansCache.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${Number(p.price).toLocaleString('fa-IR')} تومان)</option>`).join('');

  const body = document.getElementById('plansBody');
  body.innerHTML = plansCache.map(p => `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.name)}</td>
      <td>${p.max_people ?? 'نامحدود'}</td>
      <td>${p.max_checks ?? 'نامحدود'}</td>
      <td>${Number(p.price).toLocaleString('fa-IR')}</td>
      <td>${featuresLabel(p.features)}</td>
      <td class="row-actions">
        <button class="edit-plan-btn">ویرایش</button>
        <button class="danger delete-plan-btn">حذف</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">هنوز پلنی ثبت نشده</td></tr>';

  body.querySelectorAll('.edit-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditPlan(Number(btn.closest('tr').dataset.id)));
  });
  body.querySelectorAll('.delete-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePlan(Number(btn.closest('tr').dataset.id)));
  });
}

document.getElementById('addPlanBtn').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال افزودن…', async () => {
  hideAlert('newPlanAlert');
  const name = document.getElementById('newPlanName').value.trim();
  if (!name) { showAlert('newPlanAlert', 'نام پلن الزامی است'); return; }
  const maxPeopleRaw = document.getElementById('newPlanMaxPeople').value;
  const maxChecksRaw = document.getElementById('newPlanMaxChecks').value;
  try {
    await adminFetch('/admin/plans', {
      method: 'POST',
      body: JSON.stringify({
        name,
        max_people: maxPeopleRaw === '' ? null : Number(maxPeopleRaw),
        max_checks: maxChecksRaw === '' ? null : Number(maxChecksRaw),
        price: Number(document.getElementById('newPlanPrice').value || 0),
        features: {
          export: document.getElementById('newPlanExport').checked,
          reports: document.getElementById('newPlanReports').checked,
          multi_user: document.getElementById('newPlanMultiUser').checked,
        },
      }),
    });
    document.getElementById('newPlanName').value = '';
    document.getElementById('newPlanMaxPeople').value = '';
    document.getElementById('newPlanMaxChecks').value = '';
    document.getElementById('newPlanPrice').value = '';
    document.getElementById('newPlanExport').checked = false;
    document.getElementById('newPlanReports').checked = false;
    document.getElementById('newPlanMultiUser').checked = false;
    showToast('پلن ساخته شد');
    loadPlans();
  } catch (e) {
    showAlert('newPlanAlert', e.message);
  }
}));

function openEditPlan(id) {
  const plan = plansCache.find(p => p.id === id);
  if (!plan) return;
  document.getElementById('editPlanOverlay').dataset.id = id;
  document.getElementById('editPlanName').value = plan.name;
  document.getElementById('editPlanMaxPeople').value = plan.max_people ?? '';
  document.getElementById('editPlanMaxChecks').value = plan.max_checks ?? '';
  document.getElementById('editPlanPrice').value = plan.price;
  document.getElementById('editPlanExport').checked = !!(plan.features && plan.features.export);
  document.getElementById('editPlanReports').checked = !!(plan.features && plan.features.reports);
  document.getElementById('editPlanMultiUser').checked = !!(plan.features && plan.features.multi_user);
  hideAlert('editPlanAlert');
  document.getElementById('editPlanOverlay').classList.add('show');
}
document.getElementById('editPlanCancel').addEventListener('click', () => {
  document.getElementById('editPlanOverlay').classList.remove('show');
});
document.getElementById('editPlanSave').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال ذخیره…', async () => {
  const id = document.getElementById('editPlanOverlay').dataset.id;
  const maxPeopleRaw = document.getElementById('editPlanMaxPeople').value;
  const maxChecksRaw = document.getElementById('editPlanMaxChecks').value;
  try {
    await adminFetch(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: document.getElementById('editPlanName').value.trim(),
        max_people: maxPeopleRaw === '' ? null : Number(maxPeopleRaw),
        max_checks: maxChecksRaw === '' ? null : Number(maxChecksRaw),
        price: Number(document.getElementById('editPlanPrice').value || 0),
        features: {
          export: document.getElementById('editPlanExport').checked,
          reports: document.getElementById('editPlanReports').checked,
          multi_user: document.getElementById('editPlanMultiUser').checked,
        },
      }),
    });
    document.getElementById('editPlanOverlay').classList.remove('show');
    showToast('پلن ذخیره شد');
    loadPlans();
    loadCompanies();
  } catch (e) {
    showAlert('editPlanAlert', e.message);
  }
}));

async function deletePlan(id) {
  // This used to delete on the first click with nothing asked — an
  // irreversible action one stray tap away.
  const p = plansCache.find(x => x.id === id);
  const ok = await askConfirm({
    title: `حذف پلن ${p ? p.name : ''}؟`.replace('  ', ' '),
    body: 'شرکت‌هایی که روی این پلن هستند بدون پلن می‌مانند.',
    confirmLabel: 'حذف پلن',
    danger: true,
  });
  if (!ok) return;
  try {
    await adminFetch(`/admin/plans/${id}`, { method: 'DELETE' });
    showToast('پلن حذف شد');
    loadPlans();
  } catch (e) {
    showToast(e.message);
  }
}

// ==================== COMPANIES ====================
let companiesCache = [];

async function loadCompanies() {
  try {
    companiesCache = await adminFetch('/admin/companies');
  } catch (e) {
    showToast(e.message);
    return;
  }
  const body = document.getElementById('companiesBody');
  body.innerHTML = companiesCache.map(c => `
    <tr data-id="${c.id}">
      <td>${escapeHtml(c.name)}</td>
      <td dir="ltr" style="text-align:left">${escapeHtml(c.username)}</td>
      <td>${escapeHtml(c.plan_name || '—')}</td>
      <td>${c.people_count}${c.max_people != null ? ' / ' + c.max_people : ''}</td>
      <td>${c.checks_count}${c.max_checks != null ? ' / ' + c.max_checks : ''}</td>
      <td><span class="badge ${c.status}">${c.status === 'active' ? 'فعال' : 'غیرفعال'}</span></td>
      <td>${new Date(c.created_at).toLocaleDateString('fa-IR')}</td>
      <td class="row-actions">
        <button class="edit-company-btn">ویرایش</button>
        <button class="change-password-btn">تغییر رمز عبور</button>
        <button class="toggle-status-btn">${c.status === 'active' ? 'غیرفعال کن' : 'فعال کن'}</button>
        <button class="danger delete-company-btn">حذف</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8">هنوز شرکتی ثبت نشده</td></tr>';

  body.querySelectorAll('.change-password-btn').forEach(btn => {
    btn.addEventListener('click', () => openChangePassword(Number(btn.closest('tr').dataset.id)));
  });
  body.querySelectorAll('.edit-company-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditCompany(Number(btn.closest('tr').dataset.id)));
  });
  body.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCompanyStatus(Number(btn.closest('tr').dataset.id), btn));
  });
  body.querySelectorAll('.delete-company-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCompany(Number(btn.closest('tr').dataset.id)));
  });
}

document.getElementById('addCompanyBtn').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال افزودن…', async () => {
  hideAlert('newCompanyAlert');
  const name = document.getElementById('newCompanyName').value.trim();
  const username = document.getElementById('newCompanyUsername').value.trim();
  const password = document.getElementById('newCompanyPassword').value;
  const plan_id = Number(document.getElementById('newCompanyPlan').value) || null;
  if (!name || !username || !password) {
    showAlert('newCompanyAlert', 'نام، نام کاربری و رمز عبور الزامی هستند');
    return;
  }
  try {
    await adminFetch('/admin/companies', {
      method: 'POST',
      body: JSON.stringify({ name, username, password, plan_id }),
    });
    document.getElementById('newCompanyName').value = '';
    document.getElementById('newCompanyUsername').value = '';
    document.getElementById('newCompanyPassword').value = '';
    showToast('شرکت ساخته شد');
    loadCompanies();
  } catch (e) {
    showAlert('newCompanyAlert', e.message);
  }
}));

function openEditCompany(id) {
  const c = companiesCache.find(x => x.id === id);
  if (!c) return;
  document.getElementById('editCompanyOverlay').dataset.id = id;
  document.getElementById('editCompanyName').value = c.name;
  const planSelect = document.getElementById('editCompanyPlan');
  planSelect.innerHTML = plansCache.map(p => `<option value="${p.id}" ${p.id === c.plan_id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');

  const perms = c.permissions || {};
  const setOverride = (selectId, key) => {
    const el = document.getElementById(selectId);
    el.value = perms[key] === true ? 'true' : perms[key] === false ? 'false' : 'inherit';
  };
  setOverride('editPermExport', 'export');
  setOverride('editPermReports', 'reports');
  setOverride('editPermMultiUser', 'multi_user');

  hideAlert('editCompanyAlert');
  document.getElementById('editCompanyOverlay').classList.add('show');
}
document.getElementById('editCompanyCancel').addEventListener('click', () => {
  document.getElementById('editCompanyOverlay').classList.remove('show');
});
document.getElementById('editCompanySave').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال ذخیره…', async () => {
  const id = document.getElementById('editCompanyOverlay').dataset.id;
  const readOverride = (selectId) => {
    const v = document.getElementById(selectId).value;
    return v === 'inherit' ? undefined : v === 'true';
  };
  const permissions = {};
  const exp = readOverride('editPermExport'); if (exp !== undefined) permissions.export = exp;
  const rep = readOverride('editPermReports'); if (rep !== undefined) permissions.reports = rep;
  const mu = readOverride('editPermMultiUser'); if (mu !== undefined) permissions.multi_user = mu;

  try {
    await adminFetch(`/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: document.getElementById('editCompanyName').value.trim(),
        plan_id: Number(document.getElementById('editCompanyPlan').value) || null,
        permissions,
      }),
    });
    document.getElementById('editCompanyOverlay').classList.remove('show');
    showToast('تغییرات ذخیره شد');
    loadCompanies();
  } catch (e) {
    showAlert('editCompanyAlert', e.message);
  }
}));

// ==================== CHANGE PASSWORD ====================
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function openChangePassword(id) {
  const c = companiesCache.find(x => x.id === id);
  if (!c) return;
  document.getElementById('changePasswordOverlay').dataset.id = id;
  document.getElementById('changePasswordCompanyLabel').textContent = c.name + ' (' + c.username + ')';
  document.getElementById('newPasswordInput').value = randomPassword();
  hideAlert('changePasswordAlert');
  document.getElementById('changePasswordForm').style.display = 'block';
  document.getElementById('changePasswordResult').style.display = 'none';
  document.getElementById('changePasswordOverlay').classList.add('show');
}
document.getElementById('changePasswordCancel').addEventListener('click', () => {
  document.getElementById('changePasswordOverlay').classList.remove('show');
});
document.getElementById('generateRandomPasswordBtn').addEventListener('click', () => {
  document.getElementById('newPasswordInput').value = randomPassword();
});
document.getElementById('changePasswordSave').addEventListener('click', (ev) =>
  withBusy(ev.currentTarget, 'در حال ذخیره…', async () => {
  const id = document.getElementById('changePasswordOverlay').dataset.id;
  const newPassword = document.getElementById('newPasswordInput').value;
  hideAlert('changePasswordAlert');
  if (!newPassword || newPassword.length < 4) {
    showAlert('changePasswordAlert', 'رمز عبور باید حداقل ۴ کاراکتر باشد');
    return;
  }
  try {
    await adminFetch(`/admin/companies/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword }),
    });
    document.getElementById('changePasswordForm').style.display = 'none';
    document.getElementById('changePasswordResult').style.display = 'block';
    document.getElementById('revealedPassword').value = newPassword;
    loadCompanies();
  } catch (e) {
    showAlert('changePasswordAlert', e.message);
  }
}));
document.getElementById('copyPasswordBtn').addEventListener('click', async () => {
  const input = document.getElementById('revealedPassword');
  input.select();
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('کپی شد');
  } catch (e) {
    showToast('کپی نشد — به‌صورت دستی انتخاب و کپی کنید');
  }
});
document.getElementById('changePasswordDone').addEventListener('click', () => {
  document.getElementById('changePasswordOverlay').classList.remove('show');
});

async function toggleCompanyStatus(id, btn) {
  const c = companiesCache.find(x => x.id === id);
  if (!c) return;
  const next = c.status === 'active' ? 'inactive' : 'active';
  if (btn) btn.disabled = true;
  try {
    await adminFetch(`/admin/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    showToast(next === 'active' ? 'شرکت فعال شد' : 'شرکت غیرفعال شد');
    await loadCompanies();
  } catch (e) {
    showToast(e.message);
    if (btn) btn.disabled = false;
  }
}

async function deleteCompany(id) {
  const c = companiesCache.find(x => x.id === id);
  const label = c ? c.name : 'این شرکت';
  const ok = await askConfirm({
    title: `حذف ${label}؟`,
    body: 'این شرکت از فهرست حذف می‌شود و دسترسی‌اش به سامانه قطع خواهد شد.',
    confirmLabel: 'حذف شرکت',
    danger: true,
  });
  if (!ok) return;
  try {
    await adminFetch(`/admin/companies/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
    showToast('شرکت حذف شد');
    loadCompanies();
  } catch (e) {
    if (e.status === 409 && e.data && e.data.requires_confirm) {
      const sure = await askConfirm({
        title: 'حذف قطعی همراه با تمام داده‌ها؟',
        body: `${e.data.error} با تأیید، تمام اشخاص و چک‌های این شرکت هم برای همیشه پاک می‌شوند. این کار قابل بازگشت نیست.`,
        confirmLabel: 'حذف قطعی',
        danger: true,
      });
      if (sure) {
        try {
          await adminFetch(`/admin/companies/${id}`, { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
          showToast('شرکت و تمام داده‌هایش حذف شد');
          loadCompanies();
        } catch (e2) {
          showToast(e2.message);
        }
      }
      return;
    }
    showToast(e.message);
  }
}

// ==================== bootstrap ====================
if (getToken()) {
  showPanel();
} else {
  showLogin();
}

// ==========================================================
// Command palette registration (⌘K)
// ==========================================================
// Every command is gated on the panel actually being visible: while the
// login screen is up there is nothing to command, and a stray keystroke
// shouldn't quietly switch tabs behind the login card.
(function registerCommands() {
  if (!window.ChekinoPalette) return;
  const panelUp = () => {
    const p = document.getElementById('panel');
    return !!p && getComputedStyle(p).display !== 'none';
  };
  const tab = (name) => () => {
    const btn = document.querySelector(`[data-tab="${name}"]`);
    if (btn) btn.click();
  };
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  window.ChekinoPalette.register([
    {
      title: 'شرکت‌ها', group: 'بخش‌ها', key: 'c', shortcut: 'C', order: 1, when: panelUp,
      keywords: 'companies لیست شرکت',
      icon: icon('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>'),
      run: tab('companies'),
    },
    {
      title: 'پلن‌ها', group: 'بخش‌ها', key: 'p', shortcut: 'P', order: 2, when: panelUp,
      keywords: 'plans پلن اشتراک',
      icon: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      run: tab('plans'),
    },
    {
      title: 'تنظیمات حساب من', group: 'بخش‌ها', key: 'a', shortcut: 'A', order: 3, when: panelUp,
      keywords: 'account settings password username حساب رمز',
      icon: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
      run: tab('account'),
    },
    {
      title: 'افزودن شرکت جدید', group: 'عملیات', key: 'n', shortcut: 'N', order: 4, when: panelUp,
      keywords: 'new company add ثبت شرکت',
      icon: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
      run: () => {
        tab('companies')();
        const el = document.getElementById('newCompanyName');
        if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      },
    },
    {
      title: 'افزودن پلن جدید', group: 'عملیات', order: 5, when: panelUp,
      keywords: 'new plan add ثبت پلن',
      icon: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
      run: () => {
        tab('plans')();
        const el = document.getElementById('newPlanName');
        if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      },
    },
    {
      title: 'تغییر تم روشن و تاریک', group: 'نمایش', key: 't', shortcut: 'T', order: 6,
      keywords: 'theme dark light تم تیره روشن',
      icon: icon('<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'),
      run: () => window.chekinoToggleTheme && window.chekinoToggleTheme(),
    },
    {
      title: 'خروج از حساب', group: 'حساب', order: 7, when: panelUp,
      keywords: 'logout signout خروج',
      icon: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
      run: () => { const el = document.getElementById('logoutBtn'); if (el) el.click(); },
    },
  ]);
})();
