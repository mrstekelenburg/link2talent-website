#!/usr/bin/env python3
"""Bouwt llms-full.txt opnieuw op uit de echte pagina's van de site.

llms-full.txt is de volledige tekst van alle inhoudspagina's, bedoeld voor
taalmodellen (ChatGPT, Claude, Perplexity). Door hem na elke push automatisch
te genereren loopt hij nooit meer achter op de site: een nieuw kennisartikel,
een aangepaste case of een gewijzigde vergelijking staat er direct in.

Draait in .github/workflows/indexnow.yml. Handmatig: python3 scripts/llms-full.py

Welke pagina's erin komen: alles uit sitemap.xml, behalve de pagina's in
OVERSLAAN hieronder (formulieren, juridische pagina's, overzichtspagina's).
De kop bovenaan (tot en met de eerste ====-regel) blijft staan zoals hij is,
alleen de datum "Laatst bijgewerkt" wordt bijgewerkt.
"""
import datetime
import os
import re
import sys
from html import unescape
from html.parser import HTMLParser

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'llms-full.txt')

# Pagina's die geen inhoud voor een taalmodel bevatten (pad zonder .html).
OVERSLAAN = {
    'book', 'klant', 'intake', 'privacy', 'algemene-voorwaarden', 'terms',
    'calculator', 'calculator-l2l', 'calculator-l2t', 'kennis', 'kennis/index',
    'resources', 'resources/index', 'cases/index', 'cases', '404',
}

# Volgorde: vergelijking eerst, dan kennis, dan cases, dan de rest.
def volgorde(pad):
    if pad in ('', 'index'):
        return (-1, pad)
    if 'vergel' in pad or 'compared' in pad or 'bureaus' in pad:
        return (0, pad)
    if pad.startswith(('kennis/', 'resources/')):
        return (1, pad)
    if pad.startswith('cases/'):
        return (2, pad)
    return (3, pad)

MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
           'augustus', 'september', 'oktober', 'november', 'december']
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']

SKIP_TAGS = {'script', 'style', 'noscript', 'svg', 'nav', 'footer', 'form',
             'button', 'select', 'textarea', 'template', 'iframe', 'header'}
BLOCK = {'p', 'div', 'section', 'article', 'main', 'aside', 'blockquote',
         'figure', 'figcaption', 'details', 'summary', 'dl', 'dt', 'dd', 'ul', 'ol', 'br', 'hr'}
MARK = '\x00'
VOID = {'br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'param', 'track'}


class Tekst(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0
        self.stack = []
        self.cell = None
        self.row = None
        self.in_table = 0

    def _hidden(self, attrs):
        a = dict(attrs)
        st = (a.get('style') or '').replace(' ', '').lower()
        cls = ' ' + (a.get('class') or '') + ' '
        return ('display:none' in st or a.get('aria-hidden') == 'true' or 'hidden' in a
                or ' sr-only ' in cls or ' visually-hidden ' in cls)

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if tag == 'br' and not self.skip:
                self.out.append('\n')
            return
        hide = tag in SKIP_TAGS or self._hidden(attrs)
        self.stack.append(hide)
        if hide:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.out.append('\n\n' + {'h1': '# ', 'h2': '## ', 'h3': '### ', 'h4': '#### '}[tag])
        elif tag == 'li':
            self.out.append('\n- ')
        elif tag == 'table':
            self.in_table += 1
            self.out.append('\n\n')
        elif tag == 'tr':
            self.row = []
        elif tag in ('td', 'th'):
            self.cell = []
        elif tag in BLOCK:
            self.out.append('\n\n')
        elif tag == 'span' and self.cell is None:
            self.out.append(MARK)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            return
        hide = self.stack.pop()
        if hide:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag in ('td', 'th') and self.cell is not None and self.row is not None:
            self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            if any(self.row):
                self.out.append('\t'.join(self.row) + '\n')
            self.row = None
        elif tag == 'table':
            self.in_table -= 1
            self.out.append('\n')
        elif tag in ('h1', 'h2', 'h3', 'h4') or tag in BLOCK:
            self.out.append('\n\n')
        elif tag == 'span' and self.cell is None:
            self.out.append(MARK)

    def handle_data(self, data):
        if self.skip:
            return
        if self.cell is not None:
            self.cell.append(data)
        elif self.in_table and self.row is not None:
            return
        else:
            self.out.append(re.sub(r'\s+', ' ', data))

    def tekst(self):
        t = ''.join(self.out)
        # Grens tussen losse <span>s: alleen een spatie waar een cijfer tegen een
        # woord aan zou plakken ("38Gekwalificeerde", "weken38"). De merknaam
        # Link<span>2</span>Leads blijft aan elkaar.
        t = re.sub('Link%s*2%s*(Leads|Talent|Group)' % (MARK, MARK), r'Link2\1', t)
        t = re.sub('(?<=[0-9x%%])%s+(?=[A-Za-z€])' % MARK, ' ', t)
        t = re.sub('(?<=[a-z])%s+(?=[0-9€])' % MARK, ' ', t)
        t = t.replace(MARK, '')
        regels = []
        for r in t.split('\n'):
            r = r.strip() if not r.startswith('\t') else r.rstrip()
            r = re.sub(r'[ ]{2,}', ' ', r)
            regels.append(r)
        t = '\n'.join(regels)
        t = re.sub(r'^- *$', '', t, flags=re.M)          # lege opsommingspunten
        t = re.sub(r'^\d{1,3}$', '', t, flags=re.M)      # losse grafiekgetallen
        t = re.sub(r'^[A-Z]{1,3}$', '', t, flags=re.M)    # initialen in voorbeeldschermen
        t = re.sub(r' ([.,?!:;)])', r'\1', t)           # geen spatie voor leestekens
        t = re.sub(r'^(#+) *$', '', t, flags=re.M)        # lege koppen
        t = re.sub(r'\n{3,}', '\n\n', t)
        return t.strip()


def hoofdinhoud(html):
    """Pak <main>, anders <article>, anders <body>."""
    for tag in ('main', 'article', 'body'):
        m = re.search(r'<%s\b[^>]*>(.*)</%s>' % (tag, tag), html, re.S | re.I)
        if m:
            return m.group(1)
    return html


def pagina_naar_tekst(pad, url):
    html = open(os.path.join(ROOT, pad + '.html'), encoding='utf-8').read()
    if re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', html, re.I):
        return None
    titel = re.search(r'<h1\b[^>]*>(.*?)</h1>', html, re.S | re.I)
    titel = ' '.join(unescape(re.sub(r'<[^>]+>', '', titel.group(1))).split()) if titel else pad
    p = Tekst()
    p.feed(hoofdinhoud(html))
    body = p.tekst()
    # De h1 staat al in de kop van het blok; haal hem uit de body.
    body = re.sub(r'\A(.*?)^# [^\n]*\n?', '', body, count=1, flags=re.S | re.M).strip()
    # Inhoudsopgave ("In dit artikel" / "In this article") is navigatie, geen inhoud.
    body = re.sub(r'^(In dit artikel|In this article|Inhoud|Contents)\n\n(- .*\n?)+', '', body, flags=re.M)
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    lijn = '=' * 78
    return f'{lijn}\n# {titel}\nBron: {url}\n{lijn}\n\n{body}\n'


def main():
    sitemap = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    urls = re.findall(r'<loc>([^<]+)</loc>', sitemap)
    paden = []
    for u in urls:
        pad = re.sub(r'^https?://[^/]+/?', '', u).strip('/')
        if pad in OVERSLAAN:
            continue
        for kand in ((pad, pad + '/index') if pad else ('index',)):
            if os.path.exists(os.path.join(ROOT, kand + '.html')):
                paden.append((kand, u))
                break
    paden.sort(key=lambda x: volgorde(x[0]))

    bestaand = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    kop = bestaand.split('\n' + '=' * 78, 1)[0].rstrip() if bestaand else '# Volledige tekst'
    vandaag = datetime.date.today()
    nl = f'{vandaag.day} {MAANDEN[vandaag.month - 1]} {vandaag.year}'
    en = f'{vandaag.day} {MONTHS[vandaag.month - 1]} {vandaag.year}'
    kop = re.sub(r'(Laatst bijgewerkt: )[^.\n]+', lambda m: m.group(1) + nl, kop)
    kop = re.sub(r'(Last updated: )[^.\n]+', lambda m: m.group(1) + en, kop)

    blokken = []
    for pad, url in paden:
        b = pagina_naar_tekst(pad, url)
        if b:
            blokken.append(b)

    nieuw = kop + '\n\n\n' + '\n\n'.join(blokken)
    # Alleen de datum veranderd? Dan niets wegschrijven, anders krijg je bij
    # elke push een lege wijziging.
    zonder_datum = lambda s: re.sub(r'(Laatst bijgewerkt|Last updated): [^.\n]+', '', s)
    if zonder_datum(nieuw) == zonder_datum(bestaand):
        print('llms-full.txt: geen inhoudelijke wijziging.')
        return
    open(OUT, 'w', encoding='utf-8').write(nieuw)
    print(f'llms-full.txt: {len(blokken)} pagina\'s, {len(nieuw.split())} woorden.')


if __name__ == '__main__':
    sys.exit(main())
