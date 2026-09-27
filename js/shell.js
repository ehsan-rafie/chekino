// Dashboard shell: two Magic UI touches on the board (the pointer
// spotlight on a card and the blur-fade the first cards arrive with), and
// one tidy-up for tooltips. The header search button, the summary line and
// the column totals it used to drive are gone.
//
// Read-only, like cheque-form.js: it never changes a cheque or the board.
(function () {
  const $ = (id) => document.getElementById(id);

  // ---- a hover tooltip shouldn't sit on top of the menu its button opened ----
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-status-for]')) {
      const tip = $('appTooltip');
      if (tip) tip.classList.remove('show');
    }
  }, true);

  const board = $('boardColumns');
  if (!board) return;

  // ---- Magic Card: the card under the pointer gets its light at the
  // pointer (dashboard.css draws it from --mx / --my) ----
  if (window.matchMedia('(hover: hover)').matches) {
    let spotRaf = 0;
    let lastMove = null;
    board.addEventListener('pointermove', (e) => {
      lastMove = e;
      if (spotRaf) return;
      spotRaf = requestAnimationFrame(() => {
        spotRaf = 0;
        const card = lastMove.target.closest && lastMove.target.closest('.check-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${lastMove.clientX - r.left}px`);
        card.style.setProperty('--my', `${lastMove.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  // ---- Blur Fade: the first cards to arrive come in from a blur; later
  // redraws (a filter, a status change) don't replay it ----
  document.body.classList.add('is-entering');
  const end = () => document.body.classList.remove('is-entering');
  const fallback = setTimeout(end, 4000);
  const watch = new MutationObserver(() => {
    if (!board.querySelector('.check-card, .board-col-empty')) return;
    watch.disconnect();
    clearTimeout(fallback);
    setTimeout(end, 1000);
  });
  watch.observe(board, { childList: true, subtree: true });
})();
