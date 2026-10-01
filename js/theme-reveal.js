// The theme button on the dashboard and the admin panel. The sun maths and
// the saved choice live in js/boot.js (window.chekinoTheme), which has
// already applied the right theme before the first paint; this file only
// changes it.
//
// A press flips light ↔ dark and the new theme spreads out in a circle from
// the button (after Magic UI's Animated Theme Toggler, View Transitions
// API). The choice holds until the sun next turns the other way; while a
// page is open it also changes by itself at sunrise and sunset, and when
// another tab changes it — with a soft fade, since nobody pressed anything
// here, so nothing should burst out of a button. Browsers without the API,
// and anyone who asked for reduced motion, get the plain instant switch.
//
// While a transition runs every CSS transition is switched off
// (html.theme-switching, see shared.css). The theme flips hundreds of
// colours at once; with their own 120–280ms transitions running, the new
// page under the circle had to be repainted every frame and the reveal
// ran at ~35fps. Without them the page is painted once and the circle is
// pure compositing — a steady 60fps.
(function () {
  const theme = window.chekinoTheme;
  const btn = document.getElementById('themeToggleBtn');
  if (!theme || !btn) return;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canTransition = typeof document.startViewTransition === 'function';

  function transition(apply, animate) {
    if (!canTransition || reduce.matches || document.hidden) { apply(); return; }
    root.classList.add('theme-switching');
    const t = document.startViewTransition(apply);
    t.ready.then(animate).catch(() => {});
    t.finished.finally(() => root.classList.remove('theme-switching'));
  }
  // A press: the new theme opens as a circle from the button
  function reveal(apply) {
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    transition(apply, () => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
    ));
  }
  // The sun, or another tab: a quiet fade
  function fade(apply) {
    transition(apply, () => root.animate(
      { opacity: [0, 1] },
      { duration: 700, easing: 'ease', pseudoElement: '::view-transition-new(root)' }
    ));
  }

  function toggle() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    reveal(() => theme.choose(next));
    schedule();
  }
  btn.addEventListener('click', toggle);
  // Ctrl+K / T in the command palette
  window.chekinoToggleTheme = toggle;

  // ---- while the page is open: sunrise, sunset, the end of a choice ----
  function follow() {
    if (theme.current() !== root.getAttribute('data-theme')) fade(() => theme.apply());
    schedule();
  }
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    const next = theme.nextSunEvent(new Date());
    if (!next) return;
    // a timer can sleep through a suspended laptop: capped at 15 minutes,
    // and checked again whenever the tab comes back
    timer = setTimeout(follow, Math.min(next.at - Date.now() + 1000, 15 * 60 * 1000));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) follow(); });
  // a press in another tab of the site
  window.addEventListener('storage', (e) => { if (e.key === theme.KEY || e.key === null) follow(); });
  schedule();
})();
