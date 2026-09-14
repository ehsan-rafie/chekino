
const TOKEN_KEY = 'chekino_admin_token';

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

document.getElementById('accountSaveBtn').addEventListener('click', async () => {
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
});

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

document.getElementById('addPlanBtn').addEventListener('click', async () => {
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
});

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
document.getElementById('editPlanSave').addEventListener('click', async () => {
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
});

async function deletePlan(id) {
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

document.getElementById('addCompanyBtn').addEventListener('click', async () => {
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
});

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
document.getElementById('editCompanySave').addEventListener('click', async () => {
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
});

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
document.getElementById('changePasswordSave').addEventListener('click', async () => {
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
});
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
  if (!confirm(`${label} حذف شود؟`)) return;
  try {
    await adminFetch(`/admin/companies/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
    showToast('شرکت حذف شد');
    loadCompanies();
  } catch (e) {
    if (e.status === 409 && e.data && e.data.requires_confirm) {
      if (confirm(e.data.error + '\n\nبرای حذف قطعی (همراه با تمام اشخاص و چک‌های این شرکت) تأیید کنید.')) {
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
