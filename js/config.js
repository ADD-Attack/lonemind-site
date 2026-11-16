// The ONE place the domain lives. Owner ruling 2026-11-16 08:15 (board): lonemind.ai.
// The order also quoted "lonebrain.ai" (does not resolve). Change it here only.
window.LM_CONFIG = {
  DOMAIN: 'lonemind.ai'
};
(function () {
  var d = window.LM_CONFIG.DOMAIN;
  function apply() {
    document.querySelectorAll('[data-domain]').forEach(function (el) {
      el.textContent = (el.getAttribute('data-domain') || '') + d + (el.getAttribute('data-suffix') || '');
    });
    document.title = document.title.replace('{domain}', d);
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
    var b = document.querySelector('.nav-toggle');
    if (b) b.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
