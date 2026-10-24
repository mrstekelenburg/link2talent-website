/* Link2Talent - tracking
   Google Analytics + Meta Pixel + Vercel Web Analytics.
   Gebruik l2tTrack('naam', {..}) om een gebeurtenis te loggen.
   Legt ook de bron van een bezoeker vast (zie onderaan), zodat bij elke
   boeking, vragenlijst en contactaanvraag in de notificatiemail staat
   waar iemand vandaan kwam (bijv. chatgpt.com, google.com, een campagne).

   LET OP: vul hieronder je eigen Link2Talent-property in. Zolang deze
   op de placeholder staat, wordt er niets gemeten. Gebruik NIET de
   Link2Leads-ID's, anders lopen de cijfers van beide sites door elkaar. */
(function () {
  if (window.__l2tTracking) return;
  window.__l2tTracking = true;

  var GA = 'G-JFRR6RDMND';
  var PIXEL = '';

  if (GA.indexOf('X') === -1) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA);
  }

  if (PIXEL) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL);
    fbq('track', 'PageView');
  }

  // Vercel Web Analytics: cookieloos, toont bezoekers per pagina en per
  // verwijzer (o.a. chatgpt.com). Werkt zodra Analytics in Vercel aanstaat.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  var va = document.createElement('script');
  va.defer = true;
  va.src = '/_vercel/insights/script.js';
  document.head.appendChild(va);

  var META = { booking_confirmed: 'Schedule', questionnaire_completed: 'Lead', contact_submitted: 'Lead' };

  window.l2tTrack = function (name, params) {
    if (window.gtag) window.gtag('event', name, params || {});
    if (window.fbq) {
      if (META[name]) fbq('track', META[name]);
      else fbq('trackCustom', name, params || {});
    }
  };

  // ---- Bron vastleggen ----
  // We bewaren de eerste externe bron (verwijzende site of utm-tags) plus de
  // pagina waarop iemand binnenkwam, 90 dagen lang in deze browser.
  // Komt iemand eerst direct en later via bijv. ChatGPT, dan wint ChatGPT.
  var SRC_KEY = 'l2t_src';
  var MAX_AGE = 90 * 24 * 3600 * 1000;

  function readSrc() {
    try {
      var s = JSON.parse(localStorage.getItem(SRC_KEY) || 'null');
      if (s && s.ts && Date.now() - s.ts > MAX_AGE) return null;
      return s;
    } catch (e) { return null; }
  }
  function saveSrc(s) {
    try { localStorage.setItem(SRC_KEY, JSON.stringify(s)); } catch (e) {}
  }

  try {
    var q = new URLSearchParams(location.search);
    var refHost = '';
    try { refHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    if (/(^|\.)link2talent\.nl$/.test(refHost)) refHost = '';
    var utm = q.get('utm_source') || '';
    var cur = readSrc();
    if (refHost || utm) {
      if (!cur || !(cur.ref || cur.utm)) {
        saveSrc({
          ref: refHost, utm: utm,
          medium: q.get('utm_medium') || '', campaign: q.get('utm_campaign') || '',
          landing: location.pathname, ts: Date.now()
        });
      }
    } else if (!cur) {
      saveSrc({ ref: '', utm: '', medium: '', campaign: '', landing: location.pathname, ts: Date.now() });
    }
  } catch (e) {}

  window.l2tSource = readSrc;

  // Stuur de bron automatisch mee met boeking, vragenlijst en contactformulier.
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var method = String((init && init.method) || 'GET').toUpperCase();
        if (method === 'POST' && /^\/api\/(book|klant|contact)\b/.test(url) && init && typeof init.body === 'string') {
          var data = JSON.parse(init.body);
          var s = readSrc();
          if (s && data && typeof data === 'object' && !Array.isArray(data) && !data._src) {
            data._src = s;
            init = Object.assign({}, init, { body: JSON.stringify(data) });
          }
        }
      } catch (e) {}
      return origFetch.call(window, input, init);
    };
  }
})();
