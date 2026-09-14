// Shared across chekino_login.html, chekino_dashboard.html, chekino_admin.html.
// Relative on purpose: each page's own origin (mychekino.ir for the app,
// admin.mychekino.ir for the admin panel) proxies /api/ to the same backend,
// so this always resolves same-origin no matter which domain served the page.
const API_BASE_URL = '/api';
