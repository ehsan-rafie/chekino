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
  // Three modes, saved as chekino_theme_v2: 'light', 'dark', or 'auto' — the
  // default — light from sunrise to sunset and dark after, by the sun over
  // Tehran on today's date (sunset moves from about 17:00 in winter to 20:30
  // in summer, so fixed hours would be wrong half the year). Set here, before
  // the stylesheets apply, so a page never flashes the wrong theme on its way
  // to the right one. The page scripts reach it through window.chekinoTheme
  // (js/theme-reveal.js draws the menu and switches live at sunrise/sunset).
  var THEME_KEY = 'chekino_theme_v2';
  var MODES = { light: 1, dark: 1, auto: 1 };

  // Sunrise and sunset — SunCalc's method (BSD-2-Clause, Vladimir Agafonkin),
  // trimmed to the two events and one place.
  var RAD = Math.PI / 180, DAY_MS = 86400000, J1970 = 2440588, J2000 = 2451545;
  var LAT = 35.6892, LNG = 51.389;   // Tehran
  function sunTimes(date) {
    var lw = RAD * -LNG, phi = RAD * LAT, e = RAD * 23.4397;
    var d = date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
    var n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    var ds = 0.0009 + lw / (2 * Math.PI) + n;
    var M = RAD * (357.5291 + 0.98560028 * ds);
    var C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    var L = M + C + RAD * 102.9372 + Math.PI;
    var dec = Math.asin(Math.sin(L) * Math.sin(e));
    var transit = function (j) { return J2000 + j + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); };
    var Jnoon = transit(ds);
    var w = Math.acos((Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    var Jset = transit(0.0009 + (w + lw) / (2 * Math.PI) + n);
    var toDate = function (j) { return new Date((j + 0.5 - J1970) * DAY_MS); };
    return { rise: toDate(Jnoon - (Jset - Jnoon)), set: toDate(Jset) };
  }
  // The next sunrise or sunset after `now`, and the theme it brings
  function nextSunEvent(now) {
    var events = [];
    for (var k = -1; k <= 1; k++) {
      var t = sunTimes(new Date(now.valueOf() + k * DAY_MS));
      events.push({ at: t.rise, theme: 'light' }, { at: t.set, theme: 'dark' });
    }
    events.sort(function (a, b) { return a.at - b.at; });
    for (var i = 0; i < events.length; i++) if (events[i].at > now) return events[i];
    return null;
  }
  function themeForMode(mode, now) {
    if (mode === 'light' || mode === 'dark') return mode;
    var next = nextSunEvent(now || new Date());
    // the theme in force now is the opposite of the one the next event brings
    return next && next.theme === 'light' ? 'dark' : 'light';
  }
  function savedMode() {
    try { var m = localStorage.getItem(THEME_KEY); return MODES[m] ? m : 'auto'; } catch (e) { return 'auto'; }
  }
  function applyMode(mode) {
    var root = document.documentElement;
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme', themeForMode(mode));
  }
  window.chekinoTheme = {
    mode: savedMode,
    themeFor: themeForMode,
    nextSunEvent: nextSunEvent,
    apply: function () { applyMode(savedMode()); },
    set: function (mode) {
      if (!MODES[mode]) return;
      try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
      applyMode(mode);
    },
  };
  applyMode(savedMode());

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
