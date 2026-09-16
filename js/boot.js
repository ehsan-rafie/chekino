// Runs before anything paints, on all three pages. It used to be an inline
// <script> in each page's <head>; it lives here so the Content-Security-Policy
// can be a plain `script-src 'self'` with no per-page hashes to keep in sync
// (a hash-based policy breaks the page silently the moment someone edits the
// script it covers).
//
// Which of the three jobs below run is driven by the tag's data-mode:
//   <script src="/js/boot.js" data-mode="login|dashboard|admin"></script>
(function () {
  var script = document.currentScript;
  var mode = (script && script.getAttribute('data-mode')) || '';

  // ---- 1 · theme, before first paint ----
  // Set here rather than after the stylesheet loads, so the page never
  // flashes the wrong theme on its way to the right one.
  try {
    var t = localStorage.getItem('chekino_theme_v1');
    document.documentElement.setAttribute('data-theme', t || 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  if (mode === 'login') return;

  // ---- 2 · auth guard ----
  function decodeJwtPayload(token) {
    try {
      var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (e) { return null; }
  }

  var key = mode === 'admin' ? 'chekino_admin_token' : 'chekino_token';
  var token = null;
  try { token = localStorage.getItem(key); } catch (e) {}
  var payload = token ? decodeJwtPayload(token) : null;
  var valid = !!(payload && payload.exp && payload.exp * 1000 > Date.now());

  if (mode === 'dashboard') {
    if (valid) {
      window.__chekinoAuthOK = true;
    } else {
      try { localStorage.removeItem(key); } catch (e) {}
      window.location.replace('/login');
      return;   // nothing below matters; we're leaving the page
    }
  } else if (mode === 'admin' && !valid) {
    // The admin panel shows its own login screen rather than redirecting,
    // so an expired token is cleared and the page carries on.
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // ---- 3 · reveal the body ----
  // body starts at display:none (.chekino-auth-pending) so protected markup
  // is never painted before the check above has had its say.
  function reveal() {
    if (document.body) document.body.classList.remove('chekino-auth-pending');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal);
  } else {
    reveal();
  }
})();
