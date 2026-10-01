// Animated theme toggle (after Magic UI's Animated Theme Toggler): the new
// theme spreads out in a circle from the button that was pressed, using
// the View Transitions API.
//
// It wraps whatever click handler the page already has on #themeToggleBtn
// instead of replacing it. A click is caught in the capture phase on the
// document, before it reaches the button, and replayed inside
// document.startViewTransition(); the replay goes through untouched, so
// the page's own handler flips data-theme and saves it exactly as before.
// Browsers without the API, and anyone who asked for reduced motion, get
// the plain instant switch.
//
// While the circle opens, every CSS transition is switched off
// (html.theme-switching, see shared.css). The theme flips hundreds of
// colours at once; with their own 120–280ms transitions running, the new
// page under the circle had to be repainted every frame and the reveal
// ran at ~35fps. Without them the page is painted once and the circle is
// pure compositing — a steady 60fps.
(function () {
  if (typeof document.startViewTransition !== 'function') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let replaying = false;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#themeToggleBtn');
    if (!btn || replaying || reduce.matches) return;
    e.stopPropagation();
    e.preventDefault();

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const root = document.documentElement;
    root.classList.add('theme-switching');
    const transition = document.startViewTransition(() => {
      replaying = true;
      try { btn.click(); } finally { replaying = false; }
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
    transition.finished.finally(() => root.classList.remove('theme-switching'));
  }, true);
})();
