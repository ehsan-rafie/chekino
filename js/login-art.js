// Login art pane: draws the sample cheque's security print.
// Decoration only — nothing here touches the login form.
(function () {
  const Print = window.ChekinoPrint;
  if (!Print) return;
  Print.guilloche(document.getElementById('authChequeGuilloche'));
  Print.star(document.getElementById('authChequeStar'));
})();
