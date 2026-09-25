// Mailtemplate in de huisstijl van link2talent.nl
// Donkere achtergrond, blauw accent, DM Sans met veilige fallbacks.
// Alles is opgebouwd met tabellen zodat Outlook het ook netjes rendert.

const C = {
  bg:      '#08090C',
  card:    '#0E1018',
  card2:   '#12141C',
  panel:   '#0F1523',
  border:  '#1E212B',
  border2: '#25334D',
  accent:  '#2F6FED',
  accent2: '#7EB3FF',
  text:    '#F0EFED',
  muted:   '#8A919E',
  green:   '#4ADE80',
  amber:   '#F5B301'
};

const FONT = "'DM Sans','Segoe UI',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif";
const MONO = "'DM Mono',SFMono-Regular,Consolas,'Liberation Mono',monospace";

const SITE      = 'https://www.link2talent.nl';
const KLANT_URL = 'https://link2talent.nl/klant';
// Naam onder de mail. Aanpasbaar via env als iemand anders de call doet.
const SIGNER    = process.env.MAIL_SIGNER || 'Demi';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Haalt 'woensdag' uit 'Woensdag 13 augustus 2026'.
function weekdayOf(dateStr) {
  const w = String(dateStr || '').trim().split(/[\s,]+/)[0].toLowerCase();
  return /^(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)$/.test(w) ? w : '';
}

// ── Bouwstenen ───────────────────────────────────────────────────────────────

function h1(text) {
  return `<h1 class="l2l-h1" style="margin:0 0 14px;font-family:${FONT};font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-0.6px;color:${C.text};">${text}</h1>`;
}

function p(text, opts) {
  const o = opts || {};
  return `<p style="margin:0 0 ${o.gap || 20}px;font-family:${FONT};font-size:15px;line-height:1.65;color:${o.color || C.muted};">${text}</p>`;
}

function label(text) {
  return `<div style="font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};margin:0 0 10px;">${esc(text)}</div>`;
}

// pairs = [[label, waarde], ...]  waarde mag {raw:'<a …>'} zijn.
function detailTable(pairs) {
  const list = pairs.filter(function (r) { return r && r[1]; });
  if (!list.length) return '';
  const body = list.map(function (r, i) {
    const last = i === list.length - 1;
    const bb = last ? '' : `border-bottom:1px solid ${C.border};`;
    const val = (r[1] && r[1].raw) ? r[1].raw : esc(r[1]);
    return `<tr>
        <td class="l2l-key" width="120" style="width:120px;padding:13px 16px;${bb}font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};vertical-align:top;">${esc(r[0])}</td>
        <td class="l2l-val" style="padding:13px 18px 13px 0;${bb}font-family:${FONT};font-size:15px;font-weight:500;line-height:1.5;color:${C.text};vertical-align:top;">${val}</td>
      </tr>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background:${C.card2};border:1px solid ${C.border};border-radius:12px;">${body}</table>`;
}

// Voor de vragenlijst: label boven, antwoord eronder (antwoorden zijn lang).
function answerTable(obj) {
  const list = Object.entries(obj || {}).filter(function (e) { return e[1]; });
  if (!list.length) return '';
  const body = list.map(function (e, i) {
    const last = i === list.length - 1;
    const bb = last ? '' : `border-bottom:1px solid ${C.border};`;
    return `<tr><td style="padding:15px 18px;${bb}">
        <div style="font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};margin:0 0 6px;">${esc(e[0])}</div>
        <div style="font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text};">${esc(e[1])}</div>
      </td></tr>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background:${C.card2};border:1px solid ${C.border};border-radius:12px;">${body}</table>`;
}

function button(href, text) {
  const url = escAttr(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="left">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:46px;v-text-anchor:middle;width:252px;" arcsize="52%" stroke="f" fillcolor="${C.accent}">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(text)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a class="l2l-btn" href="${url}" style="display:inline-block;background:${C.accent};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:15px 30px;border-radius:100px;mso-hide:all;">${esc(text)}</a>
    <!--<![endif]-->
  </td></tr></table>`;
}

// Naam, mail en bedrijf meegeven aan de vragenlijst, zodat niemand zijn
// gegevens twee keer hoeft te typen. who = { name, email, company }.
function klantUrl(who) {
  const w = who || {};
  const p = [];
  if (w.name) p.push('naam=' + encodeURIComponent(w.name));
  if (w.email) p.push('email=' + encodeURIComponent(w.email));
  if (w.company) p.push('bedrijf=' + encodeURIComponent(w.company));
  return p.length ? KLANT_URL + '?' + p.join('&') : KLANT_URL;
}

// Het blok dat in elke boekingsmail vraagt om /klant in te vullen.
// Zelfde boodschap overal: vul de vragenlijst in voor de beste kennismaking.
function prepBlock(dateStr, variant, soort, who) {
  const g = soort || 'kennismaking';
  const wd = weekdayOf(dateStr);
  const wanneer = wd ? wd : 'in de ' + g;
  const isFull = variant === 'full';
  const isReminder = variant === 'reminder';

  const kop = isFull
    ? 'Vul nu de volledige vragenlijst in'
    : isReminder
    ? 'Vragenlijst nog niet ingevuld? Doe het nu'
    : `Vul de vragenlijst in voor de beste ${g}`;

  const tekst = isFull
    ? `Je antwoorden hierboven geven me al richting. De volledige vragenlijst (15 vragen over je aanbod, je doelgroep, je salesproces en wat je van een setter verwacht, ongeveer 7 minuten) maakt het beeld compleet. Zo kan ik ${wanneer} direct met een voorstel voor de match komen in plaats van eerst alles uit te vragen.`
    : isReminder
    ? `De vragenlijst (15 vragen, ongeveer 7 minuten) is de basis van de ${g}. Vul hem in, dan kunnen we je ${wanneer} gericht helpen. Al gedaan? Dan hoef je niets te doen.`
    : `Vul de vragenlijst in: 15 vragen over je aanbod, je doelgroep, je salesproces en wat je van een setter verwacht, ongeveer 7 minuten. Een deel is aanklikken. Dan weet ik vooraf waar je staat en kan ik ${wanneer} direct met een voorstel voor de match komen in plaats van eerst alles uit te vragen.`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${C.panel};border:1px solid ${C.border2};border-radius:14px;">
    <tr><td style="padding:24px 22px;">
      ${label('Voorbereiding · 15 vragen · 7 minuten')}
      <div style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.3px;color:${C.text};margin:0 0 8px;">${esc(kop)}</div>
      <p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.muted};">${esc(tekst)}</p>
      ${button(klantUrl(who), 'Vul de vragenlijst in')}
    </td></tr>
  </table>`;
}

// signoff('Woensdag 13 augustus 2026')  -> "Bedankt en tot woensdag."
// signoff('', { tot: 'morgen' })          -> "Bedankt en tot morgen."
// signoff('', { name: 'Anne-Roos', lead: 'Groet,' })
function signoff(dateStr, opts) {
  const o = opts || {};
  const wd = weekdayOf(dateStr);
  const tot = o.tot || wd || 'snel';
  const lead = o.lead || `Bedankt en tot ${esc(tot)}.`;
  return `<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.text};">
      ${lead}<br>
      <span style="color:${C.muted};">${esc(o.name || SIGNER)} · Link2Talent</span>
    </p>`;
}

// Witruimte tussen blokken (div met vaste hoogte, werkt ook in Outlook).
function spacer(h) {
  const px = h || 28;
  return `<div style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</div>`;
}

// ── Buitenkant ───────────────────────────────────────────────────────────────

function shell(o) {
  const opts = o || {};
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="nl">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escAttr(opts.title || 'Link2Talent')}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style type="text/css">
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { color:${C.accent2}; }
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  @media only screen and (max-width:620px) {
    .l2l-pad  { padding-left:22px !important; padding-right:22px !important; }
    .l2l-h1   { font-size:22px !important; }
    .l2l-btn  { display:block !important; text-align:center !important; }
    .l2l-key  { width:96px !important; padding:13px 10px 13px 14px !important; font-size:9px !important; letter-spacing:0.9px !important; }
    .l2l-val  { padding:13px 14px 13px 0 !important; font-size:14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<div style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader || '')}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg};width:100%;">
  <tr><td align="center" style="padding:36px 12px 28px;">

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">

      <tr><td height="3" bgcolor="${C.accent}" style="height:3px;line-height:3px;font-size:0;background-color:${C.accent};">&nbsp;</td></tr>

      <tr><td class="l2l-pad" style="padding:24px 34px;border-bottom:1px solid ${C.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="left" style="font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-0.6px;color:${C.text};">Link<span style="color:${C.accent};">2</span>Leads</td>
          <td align="right" style="font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};">${esc(opts.badge || '')}</td>
        </tr></table>
      </td></tr>

      <tr><td class="l2l-pad" style="padding:34px;">
        ${opts.body || ''}
      </td></tr>

      <tr><td class="l2l-pad" style="padding:20px 34px;border-top:1px solid ${C.border};background-color:${C.card2};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="left" style="font-family:${MONO};font-size:10px;letter-spacing:1px;color:${C.muted};">${opts.ref ? 'REF ' + esc(opts.ref) : ''}</td>
          <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:1px;"><a href="${SITE}" style="color:${C.muted};text-decoration:none;">LINK2TALENT.NL</a></td>
        </tr></table>
      </td></tr>

    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td align="center" style="padding:18px 24px 0;font-family:${FONT};font-size:11px;line-height:1.6;color:#5A616E;">
        Link2Talent · Remote setters en closers voor B2B<br>
        ${esc(opts.footerNote || 'Je ontvangt deze mail omdat je in gesprek bent met Link2Talent.')}
      </td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;
}

module.exports = {
  C, FONT, MONO, SITE, KLANT_URL, SIGNER,
  esc, escAttr, weekdayOf,
  h1, p, label, detailTable, answerTable, button, klantUrl, prepBlock, signoff, spacer, shell
};
