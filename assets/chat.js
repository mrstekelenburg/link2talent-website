/* Chat - Crisp (vervangt de GHL-chatwidget).
   Zelfde Crisp-inbox voor link2leads.nl, link2leads.co, link2talent.nl en wieisdeware.nl.
   Antwoorden gaat via de Crisp-app; elk gesprek krijgt de site als segment mee. */
(function () {
  if (window.$crisp) return;
  var lang = (document.documentElement.getAttribute('lang') || 'nl').toLowerCase();
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = 'c4126310-98e3-4b95-a016-342d34004a8e';
  window.CRISP_RUNTIME_CONFIG = { locale: lang.indexOf('en') === 0 ? 'en' : 'nl' };
  window.$crisp.push(['set', 'session:segments', [[location.hostname.replace(/^www\./, '')]]]);
  var s = document.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = 1;
  document.head.appendChild(s);
})();
