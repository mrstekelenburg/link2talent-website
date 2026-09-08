/* ============================================================
   Link2Talent i18n engine + language switcher
   - Source language: NL (renders by default, best for NL SEO)
   - Client-side swap to EN / ES via l2t-i18n-data.js dictionary
   - Language persisted in localStorage + ?lang= URL param
   ============================================================ */
(function () {
  "use strict";

  var LANGS = ["nl", "en"];
  var STORAGE_KEY = "l2t_lang";
  var DATA = window.L2T_I18N_DATA || {};

  // De vertaaldata is een groot bestand. Nederlandse bezoekers hebben het
  // niet nodig, dus we laden het pas zodra er daadwerkelijk naar Engels of
  // Spaans wordt geschakeld. Dat scheelt elke NL-bezoeker een halve MB.
  var DATA_URL = "/assets/i18n/l2t-i18n-data.js?v=2";
  var dataPromise = null;
  function loadData() {
    if (window.L2T_I18N_DATA) { DATA = window.L2T_I18N_DATA; NORM = null; return Promise.resolve(); }
    if (dataPromise) return dataPromise;
    dataPromise = new Promise(function (resolve) {
      var sc = document.createElement("script");
      sc.src = DATA_URL;
      sc.async = true;
      sc.onload = function () { DATA = window.L2T_I18N_DATA || {}; NORM = null; resolve(); };
      sc.onerror = function () { resolve(); };
      (document.head || document.documentElement).appendChild(sc);
    });
    return dataPromise;
  }

  // ---- current language (URL param wins, then storage, then nl) ----
  function readLang() {
    try {
      var p = new URLSearchParams(window.location.search).get("lang");
      if (p && LANGS.indexOf(p) !== -1) return p;
      var s = localStorage.getItem(STORAGE_KEY);
      if (s && LANGS.indexOf(s) !== -1) return s;
    } catch (e) {}
    return "nl";
  }

  var current = readLang();

  // ---- caches of original NL content, filled once ----
  var textNodes = [];   // { node, original }
  var attrNodes = [];   // { el, attr, original }
  var built = false;
  var lastApplied = (typeof WeakMap !== "undefined") ? new WeakMap() : null; // node -> value we wrote
  var trackedNodes = (typeof WeakSet !== "undefined") ? new WeakSet() : null; // text nodes already in textNodes

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CANVAS: 1, SVG: 1 };
  var TRANSLATE_ATTRS = ["placeholder", "title", "alt", "aria-label"];

  // Returns true if the node is inside the language switcher itself, or inside
  // any element marked data-i18n-skip (content that manages its own text, such
  // as the calculator result which is rebuilt per language by its own script).
  function isInSwitcher(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    while (el) {
      if (el.classList && el.classList.contains("l2t-lang")) return true;
      if (el.getAttribute && el.getAttribute("data-i18n-skip") !== null) return true;
      el = el.parentNode;
    }
    return false;
  }

  function collect() {
    // text nodes
    var walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || SKIP_TAGS[p.nodeName]) return NodeFilter.FILTER_REJECT;
          if (isInSwitcher(n)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    var node;
    while ((node = walker.nextNode())) {
      textNodes.push({ node: node, original: node.nodeValue });
      if (trackedNodes) trackedNodes.add(node);
    }
    // translatable attributes
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isInSwitcher(el)) continue;
      for (var a = 0; a < TRANSLATE_ATTRS.length; a++) {
        var attr = TRANSLATE_ATTRS[a];
        if (el.hasAttribute(attr) && el.getAttribute(attr).trim()) {
          attrNodes.push({ el: el, attr: attr, original: el.getAttribute(attr) });
        }
      }
      // submit / button input values
      if (el.tagName === "INPUT" &&
          (el.type === "submit" || el.type === "button") &&
          el.value && el.value.trim()) {
        attrNodes.push({ el: el, attr: "value", original: el.value });
      }
    }
    built = true;
  }

  // translate one raw string, preserving surrounding whitespace
  // Genormaliseerde index: witruimte, harde spaties en typografische tekens
  // verschillen per pagina, dus zoeken we ook op een genormaliseerde sleutel.
  var NORM = null;
  function normalize(t) {
    return t.replace(/\u00a0/g, " ")
            .replace(/[\u2018\u2019\u02bc]/g, "'")
            .replace(/[\u201c\u201d]/g, '"')
            .replace(/\s+/g, " ")
            .trim();
  }
  function buildNorm() {
    NORM = {};
    for (var k in DATA) {
      if (!Object.prototype.hasOwnProperty.call(DATA, k)) continue;
      var n = normalize(k);
      if (!(n in NORM)) NORM[n] = DATA[k];
    }
  }

  function lookup(key) {
    var entry = DATA[key];
    if (entry) return entry;
    if (!NORM) buildNorm();
    return NORM[normalize(key)];
  }

  function tr(raw, lang) {
    if (lang === "nl") return raw;
    var lead = (raw.match(/^\s*/) || [""])[0];
    var trail = (raw.match(/\s*$/) || [""])[0];
    var entry = lookup(raw.trim());
    if (entry && entry[lang]) return lead + entry[lang] + trail;
    return raw; // no translation -> keep NL (source of truth)
  }

  function trAttr(raw, lang) {
    if (lang === "nl") return raw;
    var entry = lookup(raw.trim());
    if (entry && entry[lang]) return entry[lang];
    return raw;
  }

  // head elements (title + meta description) handled explicitly
  var headCache = null;
  function cacheHead() {
    headCache = {
      title: document.title,
      metaDesc: null, metaDescOrig: "",
      ogTitle: null, ogTitleOrig: "",
      ogDesc: null, ogDescOrig: ""
    };
    var md = document.querySelector('meta[name="description"]');
    if (md) { headCache.metaDesc = md; headCache.metaDescOrig = md.getAttribute("content") || ""; }
    var ot = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
    if (ot) { headCache.ogTitle = ot; headCache.ogTitleOrig = ot.getAttribute("content") || ""; }
    var od = document.querySelector('meta[property="og:description"], meta[name="twitter:description"]');
    if (od) { headCache.ogDesc = od; headCache.ogDescOrig = od.getAttribute("content") || ""; }
  }

  function applyHead(lang) {
    if (!headCache) return;
    document.title = trAttr(headCache.title, lang);
    if (headCache.metaDesc) headCache.metaDesc.setAttribute("content", trAttr(headCache.metaDescOrig, lang));
    if (headCache.ogTitle) headCache.ogTitle.setAttribute("content", trAttr(headCache.ogTitleOrig, lang));
    if (headCache.ogDesc) headCache.ogDesc.setAttribute("content", trAttr(headCache.ogDescOrig, lang));
  }

  function apply(lang) {
    for (var i = 0; i < textNodes.length; i++) {
      var t = textNodes[i];
      var next = tr(t.original, lang);
      if (t.node.nodeValue !== next) t.node.nodeValue = next;
      if (lastApplied) lastApplied.set(t.node, t.node.nodeValue);
    }
    for (var j = 0; j < attrNodes.length; j++) {
      var an = attrNodes[j];
      var nv = trAttr(an.original, lang);
      if (an.attr === "value") { if (an.el.value !== nv) an.el.value = nv; }
      else an.el.setAttribute(an.attr, nv);
    }
    applyHead(lang);
    document.documentElement.setAttribute("lang", lang);
  }

  function persist(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    try {
      var url = new URL(window.location.href);
      if (lang === "nl") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    } catch (e) {}
  }

  // ---- dynamic content: translate nodes added/changed after load ----
  function processTextNode(node, forceReoriginal) {
    if (!node || node.nodeType !== 3) return;
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    var p = node.parentNode;
    if (!p || SKIP_TAGS[p.nodeName]) return;
    if (isInSwitcher(node)) return;
    var isTracked = trackedNodes ? trackedNodes.has(node) : false;
    var entry = null, k;
    if (isTracked) {
      for (k = 0; k < textNodes.length; k++) {
        if (textNodes[k].node === node) { entry = textNodes[k]; break; }
      }
    }
    if (!entry) {
      // new node: current text is the NL source of truth
      entry = { node: node, original: node.nodeValue };
      textNodes.push(entry);
      if (trackedNodes) trackedNodes.add(node);
    } else if (forceReoriginal) {
      // the app rewrote this node in NL: refresh the source
      entry.original = node.nodeValue;
    }
    var next = tr(entry.original, current);
    if (node.nodeValue !== next) node.nodeValue = next;
    if (lastApplied) lastApplied.set(node, node.nodeValue);
  }

  function scanForText(root) {
    if (root.nodeType === 3) { processTextNode(root, false); return; }
    if (root.nodeType !== 1) return;
    if (isInSwitcher(root)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) processTextNode(n, false);
  }

  function startObserver() {
    if (typeof MutationObserver === "undefined") return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "characterData") {
          var t = m.target;
          if (!t || t.nodeType !== 3) continue;
          if (lastApplied && lastApplied.get(t) === t.nodeValue) continue; // our own write
          processTextNode(t, true);
        } else if (m.type === "childList") {
          for (var a = 0; a < m.addedNodes.length; a++) scanForText(m.addedNodes[a]);
        }
      }
    });
    try {
      mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    } catch (e) {}
  }

  function emitLangChange(lang) {
    try {
      var ev;
      if (typeof CustomEvent === "function") ev = new CustomEvent("l2t:langchange", { detail: { lang: lang } });
      else { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("l2t:langchange", false, false, { lang: lang }); }
      document.dispatchEvent(ev);
    } catch (e) {}
  }

  function applyLang(lang) {
    current = lang;
    if (!built) collect();
    apply(lang);
    persist(lang);
    updateSwitcherState();
    emitLangChange(lang);
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    if (lang === "nl") { applyLang(lang); return; }
    loadData().then(function () { applyLang(lang); });
  }

  // ---------------- switcher UI ----------------
  var FLAGS = {
    nl: '<svg viewBox="0 0 9 6" class="l2t-flag" aria-hidden="true"><rect width="9" height="6" fill="#21468B"/><rect width="9" height="4" fill="#fff"/><rect width="9" height="2" fill="#AE1C28"/></svg>',
    en: '<svg viewBox="0 0 60 30" class="l2t-flag" aria-hidden="true"><clipPath id="l2tgb"><rect width="60" height="30"/></clipPath><g clip-path="url(#l2tgb)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 60,30 M60,0 0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 60,30 M60,0 0,30" clip-path="url(#l2tgb)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></g></svg>'
  };
  var LABELS = { nl: "NL", en: "EN" };
  var TITLES = { nl: "Nederlands", en: "English" };

  var switcherEl = null;

  function buildSwitcher() {
    var wrap = document.createElement("div");
    wrap.className = "l2t-lang";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language / Taal / Idioma");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "l2t-lang-toggle";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = wrap.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    wrap.appendChild(toggle);

    var menu = document.createElement("div");
    menu.className = "l2t-lang-menu";
    for (var i = 0; i < LANGS.length; i++) {
      var lang = LANGS[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "l2t-lang-btn";
      btn.setAttribute("data-lang", lang);
      btn.setAttribute("title", TITLES[lang]);
      btn.setAttribute("aria-label", TITLES[lang]);
      btn.innerHTML = FLAGS[lang] + '<span class="l2t-lang-lbl">' + TITLES[lang] + "</span>";
      btn.addEventListener("click", (function (l) {
        return function (e) {
          e.preventDefault();
          e.stopPropagation();
          setLang(l);
          wrap.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        };
      })(lang));
      menu.appendChild(btn);
    }
    wrap.appendChild(menu);

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        wrap.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    switcherEl = wrap;
    return wrap;
  }

  function updateSwitcherState() {
    if (!switcherEl) return;
    var btns = switcherEl.querySelectorAll(".l2t-lang-btn");
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute("data-lang") === current;
      btns[i].classList.toggle("is-active", on);
      btns[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var toggle = switcherEl.querySelector(".l2t-lang-toggle");
    if (toggle) {
      toggle.innerHTML = FLAGS[current] +
        '<span class="l2t-lang-lbl">' + LABELS[current] + '</span>' +
        '<svg class="l2t-lang-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      toggle.setAttribute("title", TITLES[current]);
      toggle.setAttribute("aria-label", TITLES[current]);
    }
  }

  function mountSwitcher() {
    buildSwitcher();
    placeSwitcher();
  }

  // The language switcher always lives as a floating pill on the right-middle
  // edge, on every page and at every width. It never sits in the nav bar, so
  // it never competes with the real navigation or the hamburger.
  function placeSwitcher() {
    if (!switcherEl) return;
    // Bij voorkeur in de navigatiebalk, links van de call to action. Zo staat
    // hij bovenaan vast, schuift hij mee met de nav en dekt hij niets af.
    var nav = document.querySelector(".nav-inner") || document.querySelector(".navin") || document.querySelector("nav");
    var cta = nav && (nav.querySelector(".nav-cta") || nav.querySelector(".btn.primary") || nav.querySelector(".nav-hamburger") || nav.querySelector(".nav-back"));
    if (nav && cta) {
      switcherEl.className = "l2t-lang l2t-lang-in-nav";
      if (switcherEl.parentNode !== nav) nav.insertBefore(switcherEl, cta);
    } else {
      switcherEl.className = "l2t-lang l2t-lang-floating";
      if (switcherEl.parentNode !== document.body) document.body.appendChild(switcherEl);
    }
    updateSwitcherState();
  }

  function injectStyles() {
    if (document.getElementById("l2t-i18n-styles")) return;
    var css =
      ".l2t-lang{position:relative;z-index:60;flex-shrink:0;" +
      "font:600 13px/1 'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}" +
      ".l2t-lang-in-nav{margin-left:auto;margin-right:10px;}" +
      "nav > .l2t-lang-in-nav{margin-right:14px;}" +
      ".l2t-lang-floating{position:fixed !important;left:16px !important;right:auto !important;" +
      "bottom:16px !important;top:auto !important;z-index:9998 !important;}" +

      ".l2t-lang-toggle{display:inline-flex;align-items:center;gap:7px;cursor:pointer;" +
      "border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);" +
      "color:rgba(255,255,255,0.88);font:inherit;padding:8px 12px;border-radius:100px;" +
      "transition:border-color .15s,background .15s;}" +
      ".l2t-lang-toggle:hover{border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.09);}" +
      ".l2t-lang-chev{opacity:.55;transition:transform .2s;}" +
      ".l2t-lang.open .l2t-lang-chev{transform:rotate(180deg);}" +

      ".l2t-lang-menu{position:absolute;right:0;top:calc(100% + 10px);min-width:162px;" +
      "display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:14px;" +
      "background:rgba(18,20,29,0.97);border:1px solid rgba(255,255,255,0.12);" +
      "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" +
      "box-shadow:0 16px 40px rgba(0,0,0,.5);" +
      "opacity:0;visibility:hidden;transform:translateY(-6px);" +
      "transition:opacity .16s ease,transform .16s ease,visibility .16s;}" +
      ".l2t-lang.open .l2t-lang-menu{opacity:1;visibility:visible;transform:none;}" +
      ".l2t-lang-floating .l2t-lang-menu{top:auto;bottom:calc(100% + 10px);left:0;right:auto;transform:translateY(6px);}" +
      ".l2t-lang-floating.open .l2t-lang-menu{transform:none;}" +

      ".l2t-lang-btn{display:flex;align-items:center;gap:9px;width:100%;cursor:pointer;border:none;" +
      "background:transparent;color:rgba(255,255,255,0.72);font:inherit;text-align:left;" +
      "padding:9px 11px;border-radius:9px;transition:background .15s,color .15s;}" +
      ".l2t-lang-btn:hover{color:#fff;background:rgba(255,255,255,0.07);}" +
      ".l2t-lang-btn.is-active{color:#fff;background:rgba(47,111,237,.18);}" +
      ".l2t-flag{width:20px;height:14px;border-radius:3px;display:block;" +
      "box-shadow:0 0 0 1px rgba(0,0,0,.2);flex-shrink:0;}" +
      ".l2t-lang-toggle .l2t-flag{width:18px;height:13px;}" +
      ".l2t-lang-lbl{letter-spacing:.2px;}" +

      "@media(max-width:900px){.l2t-lang-in-nav{margin-right:8px;}" +
      ".l2t-lang-toggle{padding:7px 10px;gap:6px;font-size:12.5px;}" +
      ".l2t-lang-toggle .l2t-lang-lbl{display:none;}" +
      ".l2t-lang-menu{min-width:150px;}}" +
      "@media print{.l2t-lang{display:none;}}";
    var st = document.createElement("style");
    st.id = "l2t-i18n-styles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function reveal() {
    document.documentElement.classList.remove("i18n-pending");
  }

  function boot() {
    injectStyles();
    cacheHead();
    collect();
    mountSwitcher();
    apply(current);
    persist(current);
    updateSwitcherState();
    startObserver();
    reveal();
    emitLangChange(current);
  }

  function init() {
    if (current === "nl") { boot(); return; }
    loadData().then(boot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // failsafe: never leave content hidden
  setTimeout(reveal, 1500);

  // expose for debugging / manual calls
  window.L2T_setLang = setLang;
  window.L2T_lang = function () { return current; };
})();
