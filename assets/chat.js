/* Chat - Crisp (vervangt de GHL-chatwidget).
   Zelfde Crisp-inbox voor link2leads.nl, link2leads.co, link2talent.nl en wieisdeware.nl.
   Antwoorden gaat via de Crisp-app; elk gesprek krijgt de site als segment mee. */
(function () {
  if (window.$crisp) return;
  var lang = (document.documentElement.getAttribute('lang') || 'nl').toLowerCase();
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = '6efa6396-192e-48f6-883b-9b87d095f831';
  window.CRISP_RUNTIME_CONFIG = { locale: lang.indexOf('en') === 0 ? 'en' : 'nl' };
  window.$crisp.push(['set', 'session:segments', [[location.hostname.replace(/^www\./, '')]]]);
  // De eigen WhatsApp-knop (#l2l-fab) schuift omhoog, zodat hij boven de Crisp-bubbel staat in plaats van eronder.
  var st = document.createElement('style');
  st.textContent = 'html body #l2l-fab{bottom:96px !important}' +
    '@media (max-width:760px){html body #l2l-fab{bottom:84px !important}}';
  document.head.appendChild(st);
  var s = document.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = 1;
  document.head.appendChild(s);
})();
