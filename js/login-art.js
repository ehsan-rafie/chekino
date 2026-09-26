// Login art pane: draws the lapis security print, signs the sample cheque,
// and lets the cheque lean toward the pointer. Decoration only — nothing
// here touches the login form.
(function () {
  const Print = window.ChekinoPrint;
  if (!Print) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Background: a larger sheet of the same print the cheque carries.
  const bg = document.getElementById('authGuilloche');
  if (bg) {
    Print.guilloche(bg, { width: 1000, height: 1100, lines: 72, gap: 16, rosettes: [[760, 260, 1.5], [220, 900, 1.1]], rough: false });
    if (!reduced) {
      // Each line starts undrawn and is drawn in by CSS (.is-drawing), the
      // two wave families and the rosettes a beat apart.
      bg.querySelectorAll('path').forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        const family = p.classList.contains('g-r') ? 0.5 : p.classList.contains('g-b') ? 0.25 : 0;
        p.style.setProperty('--d', (family + (i % 72) * 0.012).toFixed(3) + 's');
      });
      requestAnimationFrame(() => bg.classList.add('is-drawing'));
    }
  }

  // The sample cheque's own print and signature.
  Print.guilloche(document.getElementById('authChequeGuilloche'));
  const sign = document.getElementById('authSignPath');
  if (sign) {
    sign.setAttribute('d', Print.signaturePath('شرکت بازرگانی آرمان'));
    if (!reduced) setTimeout(() => Print.drawIn(sign), 1300);
  }

  // Lean toward the pointer (fine pointers only).
  const cheque = document.getElementById('authCheque');
  const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced;
  if (cheque && canTilt) {
    const art = cheque.closest('.auth-art');
    let raf = 0;
    art.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = cheque.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        cheque.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
        cheque.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
        cheque.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        cheque.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        cheque.classList.add('is-tilting');
      });
    });
    art.addEventListener('pointerleave', () => {
      cheque.classList.remove('is-tilting');
      cheque.style.setProperty('--rx', '0deg');
      cheque.style.setProperty('--ry', '0deg');
    });
  }
})();
