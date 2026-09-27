// The calendar's month-and-year header, drawn as HeroUI's: one button
// («مهر ۱۴۰۵» and a chevron) instead of two native dropdowns. Pressing it
// swaps the day grid for a grid of years (HeroUI's year picker); picking a
// year shows the twelve months, and picking a month goes back to the days.
//
// Presentation only, like date-segments.js. The two <select>s dashboard.js
// reads stay in the page, hidden; every choice made here is written to
// them and announced with a 'change' event, so renderCalendar() and the
// rest of the calendar logic run exactly as before.
(function () {
  const pop = document.getElementById('dueDateCal');
  const monthSel = document.getElementById('calMonthSelect');
  const yearSel = document.getElementById('calYearSelect');
  const grid = document.getElementById('calGrid');
  if (!pop || !monthSel || !yearSel || !grid) return;
  const header = pop.querySelector('.cal-header');
  const group = pop.querySelector('.cal-title-group');
  if (!header || !group) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cal-title-btn';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'انتخاب ماه و سال');
  const label = document.createElement('span');
  trigger.appendChild(label);
  trigger.insertAdjacentHTML('beforeend',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>');
  header.insertBefore(trigger, header.firstChild);
  group.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'cal-picker';
  panel.hidden = true;
  header.insertAdjacentElement('afterend', panel);

  const optText = (sel) => (sel.options[sel.selectedIndex] || {}).textContent || '';
  function syncTitle() {
    const text = `${optText(monthSel)} ${optText(yearSel)}`;
    if (label.textContent !== text) label.textContent = text;
  }

  function choose(sel, value) {
    sel.value = value;
    sel.dispatchEvent(new Event('change'));
    syncTitle();
  }

  function fill(sel, current, onPick) {
    panel.textContent = '';
    Array.from(sel.options).forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-pick';
      b.textContent = opt.textContent;
      if (opt.value === sel.value) b.classList.add('is-selected');
      if (current !== null && Number(opt.value) === current) b.classList.add('is-current');
      b.addEventListener('click', (e) => {
        // The panel is rebuilt right away; stop here so the calendar's own
        // "clicked outside?" check never sees a detached target.
        e.stopPropagation();
        onPick(opt.value);
      });
      panel.appendChild(b);
    });
  }

  function showYears() {
    const [ty] = typeof todayJalali === 'function' ? todayJalali() : [null];
    panel.classList.remove('is-months');
    fill(yearSel, ty, (v) => { choose(yearSel, v); showMonths(); });
    open();
    const sel = panel.querySelector('.is-selected');
    if (sel) panel.scrollTop = sel.offsetTop - panel.clientHeight / 2 + sel.offsetHeight / 2;
  }

  function showMonths() {
    let tm = null;
    if (typeof todayJalali === 'function') {
      const [ty, m] = todayJalali();
      if (String(ty) === yearSel.value) tm = m;
    }
    panel.classList.add('is-months');
    fill(monthSel, tm, (v) => { choose(monthSel, v); close(); });
    panel.scrollTop = 0;
    open();
  }

  function open() {
    panel.hidden = false;
    pop.classList.add('is-picking');
    trigger.setAttribute('aria-expanded', 'true');
  }
  function close() {
    // Guarded: close() is also called from the class observer below, and
    // touching the class list again would call it back.
    if (panel.hidden && !pop.classList.contains('is-picking')) return;
    panel.hidden = true;
    pop.classList.remove('is-picking');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pop.classList.contains('is-picking')) close();
    else showYears();
  });

  // Keep the title in step with the arrows and with every redraw, and start
  // each opening of the calendar on its days.
  new MutationObserver(syncTitle).observe(grid, { childList: true });
  new MutationObserver(() => { if (!pop.classList.contains('show')) close(); })
    .observe(pop, { attributes: true, attributeFilter: ['class'] });
  syncTitle();
})();
