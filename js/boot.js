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
  // By the sun over Tehran on today's date: light from sunrise to sunset,
  // dark after (sunset moves from about 17:00 in winter to 20:30 in summer,
  // so fixed hours would be wrong half the year). A press of the theme
  // button wins over the sun until the sun next turns the other way — a
  // dark chosen by day lasts until sunrise, a light chosen at night until
  // the next sunset, so never more than a day — the way the scheduled dark
  // theme on phones behaves. That choice is saved as chekino_theme_v3,
  // {theme, until}. Set here, before the stylesheets apply, so a page never
  // flashes the wrong theme on its way to the right one; the page scripts
  // reach it through window.chekinoTheme (js/theme-reveal.js runs the
  // button and the change at sunrise/sunset while a page is open).
  var THEME_KEY = 'chekino_theme_v3';
  try { localStorage.removeItem('chekino_theme_v1'); localStorage.removeItem('chekino_theme_v2'); } catch (e) {}

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
  // The next sunrise or sunset after `now` (or the next one bringing
  // `theme`), and the theme it brings
  function nextSunEvent(now, theme) {
    var events = [];
    for (var k = -1; k <= 2; k++) {
      var t = sunTimes(new Date(now.valueOf() + k * DAY_MS));
      events.push({ at: t.rise, theme: 'light' }, { at: t.set, theme: 'dark' });
    }
    events.sort(function (a, b) { return a.at - b.at; });
    for (var i = 0; i < events.length; i++) {
      if (events[i].at > now && (!theme || events[i].theme === theme)) return events[i];
    }
    return null;
  }
  // the theme in force now is the opposite of the one the next event brings
  function sunTheme(now) {
    var next = nextSunEvent(now);
    return next && next.theme === 'light' ? 'dark' : 'light';
  }
  function savedChoice(now) {
    try {
      var c = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
      if (c && (c.theme === 'light' || c.theme === 'dark') && c.until > now.valueOf()) return c;
      if (c) localStorage.removeItem(THEME_KEY);   // its time is up: back to the sun
    } catch (e) {}
    return null;
  }
  function currentTheme(now) {
    var c = savedChoice(now);
    return c ? c.theme : sunTheme(now);
  }
  function apply() {
    document.documentElement.setAttribute('data-theme', currentTheme(new Date()));
  }
  window.chekinoTheme = {
    KEY: THEME_KEY,
    current: function () { return currentTheme(new Date()); },
    choice: function () { return savedChoice(new Date()); },
    nextSunEvent: nextSunEvent,
    apply: apply,
    // a press of the button: kept until the sun next brings the other theme;
    // a choice that matches the sun is just the sun, nothing to keep
    choose: function (theme) {
      var now = new Date();
      try {
        if (theme === sunTheme(now)) {
          localStorage.removeItem(THEME_KEY);
        } else {
          var until = nextSunEvent(now, theme === 'dark' ? 'light' : 'dark');
          localStorage.setItem(THEME_KEY, JSON.stringify({ theme: theme, until: until ? until.at.valueOf() : now.valueOf() + DAY_MS }));
        }
      } catch (e) {}
      document.documentElement.setAttribute('data-theme', theme);
    },
  };
  apply();

  // (no redirect to the board when signed in: /login in another tab is how
  // another account is signed into — the board then says so)
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
      // a sign-in that ran out (not one that never was) says so there
      window.location.replace(token ? '/login?expired=1' : '/login');
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
