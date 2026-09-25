// Kort contactformulier (naam + e-mail + vraag) en de gratis capaciteitsscan
// (e-mail + situatie). Bewust de laagste drempel op de site: geen agenda,
// geen call, gewoon een vraag of een scan.
const nodemailer = require('nodemailer');

const M = require('./_mail');
const { esc, SIGNER } = M;

const BOOK_URL = 'https://www.link2talent.nl/book';
const KENNIS_URL = 'https://www.link2talent.nl/kennis/';

function transporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 465),
    secure: Number(process.env.MAIL_PORT || 465) === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

// Simpele in-memory rate limit per IP. Vercel-instanties zijn kortlevend,
// dus dit vangt alleen de botherhalingen binnen dezelfde instantie op.
const HITS = new Map();
function tooMany(ip) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const list = (HITS.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  HITS.set(ip, list);
  if (HITS.size > 500) HITS.clear();
  return list.length > 5;
}

// Teksten per soort aanvraag. Zelfde woorden in onderwerp, kop, tekst- en HTML-versie.
const KIND = {
  vraag: {
    subject: 'Je vraag is binnen',
    h1: (name) => `Hoi ${esc(name)}, je vraag is binnen`,
    intro: 'Ik lees hem zelf en je hoort binnen een werkdag van me. Geen automatische reeks en geen verkoopmail, gewoon antwoord op wat je vraagt.',
    label: 'Je vraag',
    next: 'Ik lees je vraag zelf en antwoord binnen een werkdag, met een concreet antwoord in plaats van een uitnodiging voor een gesprek. Wil je liever meteen doorpraten, plan dan hieronder het gratis kennismakingsgesprek. Dat hoeft niet.',
    footer: 'Je ontvangt deze mail omdat je het contactformulier op link2talent.nl hebt ingevuld.'
  },
  scan: {
    subject: 'Je capaciteitsscan is aangevraagd',
    h1: () => 'Je capaciteitsscan is aangevraagd',
    intro: 'We rekenen uit hoeveel afspraken een setter in jouw situatie per week realistisch zet, hoeveel uur daarbij past en welk model daar het beste bij aansluit. Je krijgt het binnen een werkdag, met een eerlijk oordeel of een setter nu al logisch is.',
    label: 'Je situatie',
    next: 'De capaciteitsscan komt binnen een werkdag in je mailbox. Wil je de uitkomst direct doorpraten, plan dan hieronder het gratis kennismakingsgesprek. Dat hoeft niet.',
    footer: 'Je ontvangt deze mail omdat je de gratis capaciteitsscan op link2talent.nl hebt aangevraagd.'
  }
};

function nextBlock(k) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${M.C.panel};border:1px solid ${M.C.border2};border-radius:14px;">
    <tr><td style="padding:24px 22px;">
      ${M.label('Wat er nu gebeurt')}
      <p style="margin:0 0 20px;font-family:${M.FONT};font-size:14px;line-height:1.65;color:${M.C.muted};">
        ${esc(k.next)}
        <br><br>
        Ondertussen staat het meeste al op papier: de modellen, wat een setter per week zet en wat een SDR in dienst echt kost. Je vindt het in de <a href="${KENNIS_URL}" style="color:${M.C.accent2};">kennisbank</a>.
      </p>
      ${M.button(BOOK_URL, 'Plan het gratis gesprek')}
    </td></tr>
  </table>`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const { name, email, company, question, website, type } = body;
  const isScan = type === 'scan';

  // Honeypot: echte bezoekers laten dit veld leeg.
  if (website) return res.status(200).json({ ok: true, ref: 'L2T-000000' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    return res.status(429).json({ error: 'Je hebt net al een bericht gestuurd. Antwoord volgt binnen een werkdag.' });
  }

  if (!name || !email) return res.status(400).json({ error: 'Naam en e-mail zijn verplicht' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email))) {
    return res.status(400).json({ error: 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.' });
  }
  if (String(name).length > 120 || String(email).length > 160 ||
      String(company || '').length > 160 || String(question || '').length > 4000) {
    return res.status(400).json({ error: 'Een van de velden is te lang.' });
  }

  const k = KIND[isScan ? 'scan' : 'vraag'];

  const ref = 'L2T-' + Math.floor(100000 + Math.random() * 900000);
  const notify = process.env.NOTIFY_EMAIL || 'demi@link2talent.nl';
  const from = `"Link2Talent" <${process.env.MAIL_FROM || 'info@link2talent.nl'}>`;
  const t = transporter();

  try {
    // ===== Bevestiging naar de afzender =====
    await t.sendMail({
      from,
      to: email,
      replyTo: 'info@link2talent.nl',
      subject: `${k.subject} — Link2Talent ${ref}`,
      text: [
        isScan ? `Hoi,` : `Hoi ${name},`,
        ``,
        k.intro,
        ``,
        question ? `${k.label}:\n${question}` : '',
        ``,
        k.next.replace('hieronder het gratis kennismakingsgesprek', `het gratis kennismakingsgesprek via ${BOOK_URL}`),
        `Het meeste staat trouwens al op papier: ${KENNIS_URL}`,
        ``,
        `Groet,`,
        `${SIGNER} · Link2Talent`,
        `info@link2talent.nl · 085 080 5381`,
        ``,
        `Ref ${ref}`
      ].filter(Boolean).join('\n'),
      html: M.shell({
        title: k.subject,
        badge: isScan ? 'Capaciteitsscan' : 'Contact',
        footerNote: k.footer,
        preheader: `${k.subject}. Je hoort binnen een werkdag van ons.`,
        ref,
        body: [
          M.h1(k.h1(name)),
          M.p(k.intro),
          question ? M.answerTable({ [k.label]: question }) : '',
          M.spacer(22),
          nextBlock(k),
          M.spacer(22),
          M.signoff('', { lead: 'Groet,' })
        ].join('')
      })
    });

    // ===== Notificatie naar ons =====
    await t.sendMail({
      from,
      to: notify,
      replyTo: email,
      subject: `${isScan ? 'CAPACITEITSSCAN' : 'Contactformulier'} - ${isScan ? email : name}${company ? ' (' + company + ')' : ''} - ${ref}`,
      text: [
        isScan ? '' : `Naam: ${name}`,
        `E-mail: ${email}`,
        company ? `Bedrijf: ${company}` : '',
        ``,
        isScan ? `Situatie:` : `Vraag:`,
        question || '(geen vraag ingevuld)',
        ``,
        `Ref ${ref}`
      ].filter(Boolean).join('\n'),
      html: M.shell({
        title: isScan ? 'Nieuwe capaciteitsscan-aanvraag' : 'Nieuw contactformulier',
        badge: isScan ? 'Capaciteitsscan' : 'Contactformulier',
        footerNote: 'Interne notificatie.',
        preheader: `${name}${company ? ' — ' + company : ''}`,
        ref,
        body: [
          M.h1(isScan ? 'Nieuwe capaciteitsscan-aanvraag' : 'Nieuw contactformulier'),
          M.detailTable([
            // Bij de scan is er geen naamveld: de frontend stuurt het stuk voor de @ mee, dus die regel slaan we over.
            ['Naam', isScan ? '' : name],
            ['E-mail', { raw: `<a href="mailto:${M.escAttr(email)}" style="color:${M.C.accent2};">${esc(email)}</a>` }],
            ['Bedrijf', company || ''],
          ]),
          M.spacer(18),
          M.answerTable({ [isScan ? 'Situatie' : 'Vraag']: question || '(geen vraag ingevuld)' })
        ].join('')
      })
    });

    return res.status(200).json({ ok: true, ref });
  } catch (err) {
    console.error('contact.js', err);
    return res.status(500).json({ error: 'Versturen is niet gelukt. Mail ons direct op info@link2talent.nl.' });
  }
};
