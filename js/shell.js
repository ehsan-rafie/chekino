// Dashboard shell: the header's command button, the one-line summary under
// the page title, and the running total at the head of each board column.
//
// Read-only, like cheque-form.js: it reads the same cheque list the board
// renders from (loadCheques / getFilteredCheques in dashboard.js) and
// re-derives its numbers whenever the board redraws. It never changes a
// cheque or the board itself.
(function () {
  const $ = (id) => document.getElementById(id);
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => String(s).replace(/[0-9]/g, (d) => FA[d]);

  // ---- header command button → the ⌘K palette ----
  const cmdBtn = $('headerCmdBtn');
  const palette = window.ChekinoPalette;
  if (cmdBtn && palette) {
    cmdBtn.addEventListener('click', () => palette.open());
    const kbd = $('headerCmdKbd');
    if (kbd) kbd.textContent = `${palette.modLabel} K`;
  } else if (cmdBtn) {
    cmdBtn.hidden = true;
  }

  // ---- a hover tooltip shouldn't sit on top of the menu its button opened ----
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-status-for]')) {
      const tip = $('appTooltip');
      if (tip) tip.classList.remove('show');
    }
  }, true);

  // ---- short money: "۴۵۰ میلیون" / "۱٫۲۵ میلیارد" ----
  function shortRial(n) {
    if (!n) return '۰';
    const units = [[1e12, 'هزار میلیارد'], [1e9, 'میلیارد'], [1e6, 'میلیون'], [1e3, 'هزار']];
    for (const [v, name] of units) {
      if (n >= v) {
        const x = n / v;
        const s = x >= 100 ? Math.round(x).toString() : (Math.round(x * 100) / 100).toString();
        return `${toFa(s.replace('.', '٫'))} ${name}`;
      }
    }
    return toFa(String(n));
  }

  const board = $('boardColumns');
  const summary = $('boardSummary');
  if (!board || typeof window.loadCheques !== 'function') return;

  function recompute() {
    const all = window.loadCheques() || [];
    const filtered = typeof window.getFilteredCheques === 'function' ? window.getFilteredCheques() : all;

    // Column totals (for what's currently on the board, so a filter narrows them too)
    ['pending', 'done', 'problem'].forEach((st) => {
      const head = board.querySelector(`.board-column[data-status="${st}"] .board-col-head`);
      if (!head) return;
      let sum = head.querySelector('.board-col-sum');
      if (!sum) {
        sum = document.createElement('span');
        sum.className = 'board-col-sum';
        head.appendChild(sum);
      }
      const total = filtered
        .filter((c) => (c.status || 'pending') === st)
        .reduce((a, c) => a + (Number(c.amount) || 0), 0);
      const text = total ? `${shortRial(total)} ریال` : '';
      if (sum.textContent !== text) sum.textContent = text;
    });

    // One plain sentence about what needs doing
    if (summary) {
      const pending = all.filter((c) => (c.status || 'pending') === 'pending');
      const days = typeof window.daysUntilDue === 'function' ? window.daysUntilDue : () => null;
      const soonLimit = typeof window.DUE_SOON_DAYS === 'number' ? window.DUE_SOON_DAYS : 3;
      let overdue = 0, soon = 0;
      pending.forEach((c) => {
        const d = days(c.dueDate);
        if (d === null) return;
        if (d < 0) overdue++;
        else if (d <= soonLimit) soon++;
      });
      const problems = all.filter((c) => c.status === 'problem').length;
      const parts = [];
      if (!all.length) parts.push('هنوز چکی ثبت نشده است');
      else if (!pending.length && !problems) parts.push('همه‌ی چک‌ها ثبت شده‌اند');
      else {
        if (pending.length) parts.push(`${toFa(pending.length)} چک منتظر ثبت`);
        if (problems) parts.push(`${toFa(problems)} چک با مشکل`);
        if (overdue) parts.push(`${toFa(overdue)} سررسید گذشته`);
        if (soon) parts.push(`${toFa(soon)} سررسید تا ${toFa(soonLimit)} روز آینده`);
      }
      const text = parts.join('، ');
      if (summary.textContent !== text) summary.textContent = text;
      summary.classList.toggle('has-alert', overdue > 0 || problems > 0);
    }
  }

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; recompute(); });
  };
  new MutationObserver(schedule).observe(board, { childList: true, subtree: true });
  schedule();
})();
