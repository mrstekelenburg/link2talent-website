/* Link2Talent - tracking
   Google Analytics + Meta Pixel (alleen na toestemming) + Vercel Web Analytics.
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
  var PIXEL = '35218029017788041';

  // Google Analytics en Meta Pixel laden pas na toestemming (Telecommunicatiewet
  // art. 11.7a). Keuze wordt 12 maanden bewaard. l2tCookies() opent de melding opnieuw.
  var CONSENT_KEY = 'l2t_consent';
  var marketingLoaded = false;
  function loadMarketing() {
    if (marketingLoaded) return;
    marketingLoaded = true;
    if (GA.indexOf('X') === -1) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', GA, { anonymize_ip: true });
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
  }

  function readConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if (c && c.ts && Date.now() - c.ts < 365 * 24 * 3600 * 1000) return c.v;
    } catch (e) {}
    return null;
  }
  function saveConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: v, ts: Date.now() })); } catch (e) {}
  }

  var TXT = {
    nl: { t: 'Mogen we cookies gebruiken om te meten hoe de site gebruikt wordt en hoe onze advertenties werken? Zonder akkoord laden we alleen wat nodig is.', ja: 'Akkoord', nee: 'Alleen noodzakelijk', meer: 'Meer info', kort: 'Cookies voor statistieken en advertenties?', url: '/privacy#cookies' },
    en: { t: 'May we use cookies to measure how the site is used and how our ads perform? Without your consent we only load what is necessary.', ja: 'Accept', nee: 'Necessary only', meer: 'More info', kort: 'Cookies for analytics and ads?', url: '/privacy#cookies' }
  };

  function showBanner() {
    if (document.getElementById('l2l-cc')) return;
    var lang = (document.documentElement.getAttribute('lang') || 'nl').slice(0, 2) === 'en' ? 'en' : 'nl';
    var T = TXT[lang];
    var st = document.createElement('style');
    st.textContent = '#l2l-cc{position:fixed;left:20px;bottom:20px;z-index:1000;max-width:460px;box-sizing:border-box;'
      + 'background:rgba(10,12,18,.97);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px 20px;'
      + 'box-shadow:0 12px 40px rgba(0,0,0,.6);color:#F0EFED;font:14px/1.55 "DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}'
      + '#l2l-cc p{margin:0 0 14px;color:rgba(240,239,237,.82);}#l2l-cc a{color:#5B8FF5;text-decoration:underline;}'
      + '#l2l-cc .r{display:flex;gap:10px;flex-wrap:wrap;}#l2l-cc button{font:inherit;font-weight:700;border-radius:100px;'
      + 'padding:9px 18px;cursor:pointer;border:1px solid #2F6FED;}#l2l-cc .ja{background:#2F6FED;color:#fff;}'
      + '#l2l-cc .nee{background:transparent;color:#F0EFED;border-color:rgba(255,255,255,.3);}'
      + '@media(max-width:640px){#l2l-cc{left:10px;right:80px;bottom:16px;max-width:none;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.4;}'
      + '#l2l-cc p{margin:0 0 8px;}#l2l-cc .r{gap:6px;flex-wrap:nowrap;}#l2l-cc button{padding:6px 12px;font-size:12.5px;}}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.id = 'l2l-cc';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Cookies');
    d.setAttribute('data-i18n-skip', '');
    var tekst = window.innerWidth <= 640 ? T.kort : T.t;
    d.innerHTML = '<p>' + tekst + ' <a href="' + T.url + '">' + T.meer + '</a></p>'
      + '<div class="r"><button type="button" class="ja">' + T.ja + '</button>'
      + '<button type="button" class="nee">' + T.nee + '</button></div>';
    d.querySelector('.ja').addEventListener('click', function () { saveConsent('ja'); d.remove(); loadMarketing(); });
    d.querySelector('.nee').addEventListener('click', function () {
      var had = readConsent() === 'ja';
      saveConsent('nee'); d.remove();
      if (had) location.reload();
    });
    (document.body || document.documentElement).appendChild(d);
  }

  window.l2tCookies = showBanner;
  var keuze = readConsent();
  if (keuze === 'ja') loadMarketing();
  else if (keuze === null) {
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner);
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
