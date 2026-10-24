#!/usr/bin/env node
/* Zet de <lastmod> van elke pagina in sitemap.xml op de datum van de laatste
   wijziging aan het bijbehorende HTML-bestand (uit git).
   Draait automatisch in .github/workflows/indexnow.yml na elke push naar main,
   zodat Bing, Google en ChatGPT altijd zien welke pagina's vers zijn.
   Handmatig: node scripts/sitemap-lastmod.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const sitemapPath = path.join(root, 'sitemap.xml');
let xml = fs.readFileSync(sitemapPath, 'utf8');

function fileFor(urlPath) {
  const p = urlPath.replace(/^\/+|\/+$/g, '');
  const kandidaten = p === '' ? ['index.html'] : [p + '.html', p + '/index.html'];
  return kandidaten.find(f => fs.existsSync(path.join(root, f))) || null;
}

function laatsteWijziging(file) {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  } catch (e) { return null; }
}

let gewijzigd = 0;
const missend = [];
xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, (blok, inhoud) => {
  const loc = (inhoud.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  if (!loc) return blok;
  const file = fileFor(new URL(loc).pathname);
  if (!file) { missend.push(loc); return blok; }
  const datum = laatsteWijziging(file);
  if (!datum) return blok;
  if (/<lastmod>[^<]*<\/lastmod>/.test(inhoud)) {
    const nieuw = blok.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${datum}</lastmod>`);
    if (nieuw !== blok) gewijzigd++;
    return nieuw;
  }
  gewijzigd++;
  return blok.replace(/(<loc>[^<]+<\/loc>)/, `$1\n    <lastmod>${datum}</lastmod>`);
});

// Pagina's die wel bestaan maar nog niet in de sitemap staan (bijv. een nieuw
// kennisartikel), voegen we automatisch toe.
const locs = (xml.match(/<loc>[^<]+<\/loc>/g) || []).map(l => l.slice(5, -6));
const origin = locs.length ? new URL(locs[0]).origin : null;
const inSitemap = new Set(locs.map(l => new URL(l).pathname.replace(/\/$/, '') || '/'));
const uitsluiten = /^(404|klant|intake|_)/;
const nieuw = [];
function zoekHtml(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'api', 'assets', 'scripts'].includes(e.name)) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) zoekHtml(path.join(dir, e.name), r);
    else if (e.name.endsWith('.html') && !uitsluiten.test(e.name)) {
      const url = '/' + r.replace(/(\/)?index\.html$/, '').replace(/\.html$/, '');
      const norm = url === '/' ? '/' : url.replace(/\/$/, '');
      const html = fs.readFileSync(path.join(dir, e.name), 'utf8');
      if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;
      if (!inSitemap.has(norm)) nieuw.push({ url: norm, file: r });
    }
  }
}
zoekHtml(root);
if (origin && nieuw.length) {
  const blokken = nieuw.map(n => `  <url>
    <loc>${origin}${n.url === '/' ? '/' : n.url}</loc>
    <lastmod>${laatsteWijziging(n.file) || new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`).join('');
  xml = xml.replace(/<\/urlset>/, blokken + '</urlset>');
  gewijzigd += nieuw.length;
  console.log('Toegevoegd aan sitemap: ' + nieuw.map(n => n.url).join(', '));
}

fs.writeFileSync(sitemapPath, xml);
console.log(`Sitemap: ${gewijzigd} datum(s) bijgewerkt.`);
if (missend.length) console.log('Geen bestand gevonden voor: ' + missend.join(', '));
