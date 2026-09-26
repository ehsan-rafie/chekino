// Login art pane: draws the sample cheque's security print and signs it.
// Decoration only — nothing here touches the login form.
(function () {
  const Print = window.ChekinoPrint;
  if (!Print) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The sample cheque's own print and signature.
  Print.guilloche(document.getElementById('authChequeGuilloche'));
  const sign = document.getElementById('authSignPath');
  if (sign) {
    sign.setAttribute('d', Print.signaturePath('شرکت بازرگانی آرمان'));
    if (!reduced) setTimeout(() => Print.drawIn(sign), 700);
  }

})();
