// The theme button and its menu — «روشن» / «تیره» / «خودکار» — on the
// dashboard and the admin panel. The modes and the sun maths live in
// js/boot.js (window.chekinoTheme), which has already applied the right
// theme before the first paint; this file only changes it.
//
// A change the user asks for spreads out in a circle from the theme button
// (after Magic UI's Animated Theme Toggler, View Transitions API). In
// «خودکار» the page also changes by itself at sunrise and sunset, with a
// soft fade instead — nobody pressed anything, so nothing should burst out
// of a button. Browsers without the API, and anyone who asked for reduced
// motion, get the plain instant switch.
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
    if (!canTransition || reduce.matches) { apply(); return; }
    root.classList.add('theme-switching');
    const t = document.startViewTransition(apply);
    t.ready.then(animate).catch(() => {});
    t.finished.finally(() => root.classList.remove('theme-switching'));
  }
  // A choice: the new theme opens as a circle from the button
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
  // The sun: a quiet fade
  function fade(apply) {
    transition(apply, () => root.animate(
      { opacity: [0, 1] },
      { duration: 700, easing: 'ease', pseudoElement: '::view-transition-new(root)' }
    ));
  }

  function choose(mode) {
    const before = root.getAttribute('data-theme');
    if (theme.themeFor(mode) === before) theme.set(mode);   // same look: just remember the mode
    else reveal(() => theme.set(mode));
    scheduleSun();
  }
  // Ctrl+K / T in the command palette: flip to the other look, by hand
  window.chekinoToggleTheme = () => choose(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  // ---- the menu (HeroUI's Dropdown with a radio group) ----
  const ICONS = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    dark: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    auto: '<path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  };
  const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const LABELS = { light: 'روشن', dark: 'تیره', auto: 'خودکار' };
  const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const hhmm = (d) => faDigits(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);

  // the auto icon joins the sun and moon already in the button
  const autoIcon = document.createElement('span');
  autoIcon.className = 'icon-auto';
  autoIcon.innerHTML = svg(ICONS.auto);
  btn.appendChild(autoIcon);
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'تم');
  btn.removeAttribute('title');

  const menu = document.createElement('div');
  menu.className = 'theme-menu';
  menu.id = 'themeMenu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'تم');
  document.body.appendChild(menu);

  function renderMenu() {
    const mode = theme.mode();
    const next = theme.nextSunEvent(new Date());
    const sub = next ? `${next.theme === 'dark' ? 'تیره' : 'روشن'} از ${hhmm(next.at)}` : '';
    menu.innerHTML = ['light', 'dark', 'auto'].map((m) => `
      <button type="button" role="menuitemradio" aria-checked="${m === mode}" data-mode="${m}" tabindex="-1">
        ${svg(ICONS[m])}
        <span class="theme-menu-label">${LABELS[m]}</span>
        ${m === 'auto' && sub ? `<span class="theme-menu-sub">${sub}</span>` : ''}
        <svg class="theme-menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      </button>`).join('');
  }
  const items = () => [...menu.querySelectorAll('[data-mode]')];
  const isOpen = () => menu.classList.contains('show');

  function openMenu(focusChecked) {
    renderMenu();
    menu.classList.add('show');
    btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    // opens inward from the button, which sits at the page's end edge
    menu.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    menu.style.top = (r.bottom + 8) + 'px';
    if (focusChecked) (menu.querySelector('[aria-checked="true"]') || items()[0]).focus();
  }
  function closeMenu(returnFocus) {
    if (!isOpen()) return;
    menu.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) closeMenu(); else openMenu(e.detail === 0);   // from the keyboard: into the menu
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-mode]');
    if (!item) return;
    e.stopPropagation();
    closeMenu(e.detail === 0);
    choose(item.dataset.mode);
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu(true);
    } else if (e.key === 'Tab') {
      closeMenu(false);
    }
  });
  document.addEventListener('click', (e) => { if (isOpen() && !menu.contains(e.target)) closeMenu(); });
  window.addEventListener('resize', () => closeMenu());

  // ---- «خودکار»: change at sunrise and sunset while the page is open ----
  let sunTimer = null;
  function followSun() {
    if (theme.mode() !== 'auto') return;
    if (theme.themeFor('auto') !== root.getAttribute('data-theme')) fade(() => theme.apply());
    if (isOpen()) renderMenu();
    scheduleSun();
  }
  function scheduleSun() {
    clearTimeout(sunTimer);
    if (theme.mode() !== 'auto') return;
    const next = theme.nextSunEvent(new Date());
    if (!next) return;
    // a timer can sleep through a suspended laptop: capped at 15 minutes,
    // and checked again whenever the tab comes back
    sunTimer = setTimeout(followSun, Math.min(next.at - Date.now() + 1000, 15 * 60 * 1000));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) followSun(); });
  scheduleSun();
})();
