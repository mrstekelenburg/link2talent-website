/* Herinneringen voor geboekte kennismakingsgesprekken.

   Wordt elk kwartier aangeroepen (zie WIJZIGINGEN.md voor de twee manieren) en
   kijkt in de Outlook-agenda naar gesprekken die binnenkort beginnen:

     - tussen 23 en 25 uur van tevoren  -> herinnering "morgen" (klant + intern)
     - tussen 45 en 75 minuten van tevoren -> herinnering "over een uur" (klant + intern)

   Welke herinnering al verstuurd is, staat als categorie op de afspraak in
   Outlook ("L2L herinnering dag verstuurd" / "L2L herinnering uur verstuurd").
   Daardoor gaat elke herinnering precies een keer uit, ook als dit adres vaker
   wordt aangeroepen dan nodig.

   Beveiliging: alleen aanroepen met de sleutel uit REMIND_SECRET, als header
   "Authorization: Bearer <sleutel>" of als ?key=<sleutel> in het adres.
   Vercel Cron stuurt automatisch CRON_SECRET mee; die wordt ook geaccepteerd.

   Welke afspraken meetellen: alles met "Link2Talent" in het onderwerp (boekingen
   van /book en handmatige uitnodigingen zoals "Kennismaking Link2Talent x Bedrijf")
   of met de Outlook-categorie "L2T herinnering aan". Categorie "L2T geen
   herinnering" sluit een afspraak uit. De duur komt uit de afspraak zelf.

   Werkt alleen voor afspraken die in de Outlook-agenda staan
   (dezelfde MS_* variabelen als api/_graph.js). Boekingen die op de .ics-fallback
   liepen, staan niet in de agenda en krijgen dus geen herinnering. */

const nodemailer = require('nodemailer');
const graph = require('./_graph');
const M = require('./_mail');
const { esc, KLANT_URL } = M;

const CAT_DAG = 'L2T herinnering dag verstuurd';
const CAT_UUR = 'L2T herinnering uur verstuurd';

function transporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 465),
    secure: Number(process.env.MAIL_PORT || 465) === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

function authorized(req) {
  const secrets = [process.env.REMIND_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (!secrets.length) return false;
  const hdr = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  const q = String((req.query && req.query.key) || '').trim();
  return secrets.includes(hdr) || secrets.includes(q);
}

/* 'donderdag 17 september 2026' en '10:00' in Nederlandse tijd. */
function nlDate(d) {
  const s = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function nlTime(d) {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(d);
}

/* Haalt de gegevens van de prospect uit de afspraak. */
function prospectOf(ev) {
  const ours = new Set(
    [process.env.MS_CALENDAR_USER].concat((process.env.MS_EXTRA_ATTENDEES || '').split(','))
      .map(s => String(s || '').trim().toLowerCase()).filter(Boolean)
  );
  const a = ev.attendees.find(x => x.email && !ours.has(x.email.toLowerCase()));
  const company = (ev.subject.split(' x ')[1] || '').trim();
  const refMatch = ev.bodyPreview.match(/L2T-\d{6}/);
  const phoneMatch = ev.bodyPreview.match(/Telefoon:\s*(.+?)(?=\s*(?:Boekingsnummer|Bedrijf)\b|\s*$)/m);
  return {
    email: a ? a.email : '',
    name: a ? (a.name || a.email) : '',
    company,
    ref: refMatch ? refMatch[0] : '',
    phone: phoneMatch ? phoneMatch[1].trim() : ''
  };
}

/* 'intake' als het onderwerp dat woord bevat, anders 'kennismaking' (boekingen van /book en handmatige uitnodigingen). */
function soortOf(ev) {
  return /intake/i.test(ev.subject) ? 'intake' : 'kennismaking';
}
function duurOf(ev) {
  const m = Math.round((ev.endUtc - ev.startUtc) / 60000);
  return (m > 0 && m < 600 ? m : 30) + ' minuten';
}

function joinRow(ev) {
  return ev.joinUrl
    ? ['Deelnemen', { raw: `<a href="${M.escAttr(ev.joinUrl)}" style="color:${M.C.accent2};text-decoration:none;font-weight:700;">Deelnemen via Microsoft Teams</a>` }]
    : ['Format', 'Online via Microsoft Teams · de link staat in je agenda-uitnodiging'];
}

async function sendDag(t, ev, p, from, notify) {
  const datum = nlDate(ev.startUtc), tijd = nlTime(ev.startUtc), g = soortOf(ev), duur = duurOf(ev);
  const firstName = p.name.split(' ')[0];

  // Klant
  await t.sendMail({
    from, to: p.email,
    subject: `Morgen om ${tijd}: je ${g} met Link2Talent`,
    text: [
      `Hoi ${firstName},`,
      ``,
      `Morgen om ${tijd} (Nederlandse tijd) staat je ${g} met Link2Talent. ${duur} via Microsoft Teams.`,
      ev.joinUrl ? `Deelnemen: ${ev.joinUrl}` : `De deelnamelink staat in je agenda-uitnodiging.`,
      ``,
      `Vragenlijst nog niet ingevuld? Doe het nu op ${M.klantUrl({ name: p.name, email: p.email, company: p.company })} (15 vragen, ongeveer 7 minuten), dan kunnen we je in de ${g} gericht helpen. Al gedaan? Dan hoef je niets te doen.`,
      ``,
      `Komt het toch niet uit? Antwoord op deze mail, dan prikken we een ander moment.`,
      ``,
      `Bedankt en tot morgen.`,
      `${M.SIGNER} · Link2Talent`,
      `${M.SITE}`,
      ``,
      p.ref ? `Ref ${p.ref}` : ''
    ].filter(l => l !== null).join('\n'),
    html: M.shell({
      title: `Morgen: je ${g}`,
      badge: 'Herinnering',
      footerNote: `Je ontvangt deze mail omdat je een ${g} met Link2Talent hebt gepland.`,
      preheader: `Morgen ${datum.toLowerCase()} om ${tijd} · ${duur} via Microsoft Teams`,
      ref: p.ref,
      body: [
        M.h1(`Morgen om ${esc(tijd)}: je ${g}, ${esc(firstName)}`),
        M.p(`Een korte herinnering. Morgen staat je ${g} met Link2Talent. Komt het toch niet uit? Antwoord op deze mail, dan prikken we een ander moment.`, { gap: 24 }),
        M.detailTable([
          ['Datum', datum],
          ['Tijd', `${tijd} (Nederlandse tijd)`],
          ['Duur', duur],
          joinRow(ev)
        ]),
        M.spacer(),
        M.prepBlock('', 'reminder', g, { name: p.name, email: p.email, company: p.company }),
        M.spacer(),
        M.signoff('', { tot: 'morgen' })
      ].join('')
    })
  });

  // Intern
  await t.sendMail({
    from, to: notify, replyTo: p.email || undefined,
    subject: `Morgen ${tijd}: ${g} met ${p.name}${p.company ? ' (' + p.company + ')' : ''}`,
    html: M.shell({
      title: `Morgen: ${g}`,
      badge: 'Intern · herinnering',
      preheader: `${p.name} · ${datum} om ${tijd}`,
      ref: p.ref,
      body: [
        M.h1(`Morgen om ${esc(tijd)}: ${g} met ${esc(p.name)}`),
        M.p(`De klant heeft dezelfde herinnering gekregen, met de vraag om de vragenlijst op /klant in te vullen. Check of die al binnen is.`, { gap: 24 }),
        M.detailTable([
          ['Naam', p.name],
          ['E-mail', p.email ? { raw: `<a href="mailto:${M.escAttr(p.email)}" style="color:${M.C.accent2};">${esc(p.email)}</a>` } : ''],
          ['Bedrijf', p.company],
          ['Telefoon', p.phone],
          ['Datum', datum],
          ['Tijd', `${tijd} (Nederlandse tijd) · ${duur}`],
          ev.joinUrl ? ['Teams', { raw: `<a href="${M.escAttr(ev.joinUrl)}" style="color:${M.C.accent2};">Deelnemen</a>` }] : null,
          ev.webLink ? ['Agenda', { raw: `<a href="${M.escAttr(ev.webLink)}" style="color:${M.C.accent2};">Open in Outlook</a>` }] : null
        ])
      ].join('')
    })
  });
}

async function sendUur(t, ev, p, from, notify) {
  const datum = nlDate(ev.startUtc), tijd = nlTime(ev.startUtc), g = soortOf(ev), duur = duurOf(ev);
  const firstName = p.name.split(' ')[0];

  // Klant
  await t.sendMail({
    from, to: p.email,
    subject: `Over een uur: je ${g} met Link2Talent (${tijd})`,
    text: [
      `Hoi ${firstName},`,
      ``,
      `Over een uur, om ${tijd} (Nederlandse tijd), begint je ${g} met Link2Talent. ${duur} via Microsoft Teams.`,
      ev.joinUrl ? `Deelnemen: ${ev.joinUrl}` : `De deelnamelink staat in je agenda-uitnodiging.`,
      ``,
      `Vragenlijst nog niet ingevuld? Doe het nu op ${M.klantUrl({ name: p.name, email: p.email, company: p.company })}, dan kunnen we je gericht helpen.`,
      ``,
      `Tot zo.`,
      `${M.SIGNER} · Link2Talent`,
      `${M.SITE}`,
      ``,
      p.ref ? `Ref ${p.ref}` : ''
    ].join('\n'),
    html: M.shell({
      title: `Over een uur: je ${g}`,
      badge: 'Herinnering',
      footerNote: `Je ontvangt deze mail omdat je een ${g} met Link2Talent hebt gepland.`,
      preheader: `Vandaag om ${tijd} · ${duur} via Microsoft Teams`,
      ref: p.ref,
      body: [
        M.h1(`Over een uur: je ${g}, ${esc(firstName)}`),
        M.p(`Om ${esc(tijd)} begint je ${g} met Link2Talent. Je kunt hieronder direct deelnemen.`, { gap: 24 }),
        M.detailTable([
          ['Datum', datum],
          ['Tijd', `${tijd} (Nederlandse tijd)`],
          ['Duur', duur],
          joinRow(ev)
        ]),
        M.spacer(),
        ev.joinUrl ? M.button(ev.joinUrl, 'Deelnemen via Microsoft Teams') : '',
        ev.joinUrl ? M.spacer() : '',
        M.prepBlock('', 'reminder', g, { name: p.name, email: p.email, company: p.company }),
        M.spacer(),
        M.signoff('', { lead: 'Tot zo.' })
      ].join('')
    })
  });

  // Intern
  await t.sendMail({
    from, to: notify, replyTo: p.email || undefined,
    subject: `Over een uur (${tijd}): ${g} met ${p.name}${p.company ? ' (' + p.company + ')' : ''}`,
    html: M.shell({
      title: `Over een uur: ${g}`,
      badge: 'Intern · herinnering',
      preheader: `${p.name} · vandaag om ${tijd}`,
      ref: p.ref,
      body: [
        M.h1(`Over een uur: ${g} met ${esc(p.name)}`),
        M.p(`Om ${esc(tijd)}. De klant heeft dezelfde herinnering gekregen.`, { gap: 24 }),
        M.detailTable([
          ['Naam', p.name],
          ['E-mail', p.email ? { raw: `<a href="mailto:${M.escAttr(p.email)}" style="color:${M.C.accent2};">${esc(p.email)}</a>` } : ''],
          ['Bedrijf', p.company],
          ['Telefoon', p.phone],
          ['Tijd', `${tijd} (Nederlandse tijd) · ${duur}`],
          ev.joinUrl ? ['Teams', { raw: `<a href="${M.escAttr(ev.joinUrl)}" style="color:${M.C.accent2};">Deelnemen</a>` }] : null,
          ev.webLink ? ['Agenda', { raw: `<a href="${M.escAttr(ev.webLink)}" style="color:${M.C.accent2};">Open in Outlook</a>` }] : null
        ])
      ].join('')
    })
  });
}

module.exports = async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Geen of verkeerde sleutel' });
  if (!graph.configured()) return res.status(200).json({ ok: false, error: 'MS_* variabelen ontbreken, geen agenda' });

  const notify = process.env.NOTIFY_EMAIL || 'demi@link2talent.nl';
  const from = `"Link2Talent" <${process.env.MAIL_FROM || 'info@link2talent.nl'}>`;
  const t = transporter();
  const log = [];

  try {
    const events = await graph.listUpcoming(26);
    const now = Date.now();

    for (const ev of events) {
      const minutes = (ev.startUtc.getTime() - now) / 60000;
      const p = prospectOf(ev);
      const wie = `${p.name || '?'} ${ev.startUtc.toISOString().slice(0, 16)}`;

      if (!p.email) { log.push(`overgeslagen (geen deelnemer): ${wie}`); continue; }

      if (minutes > 23 * 60 && minutes <= 25 * 60 && !ev.categories.includes(CAT_DAG)) {
        await sendDag(t, ev, p, from, notify);
        await graph.addCategory(ev.id, CAT_DAG);
        log.push(`dag-herinnering: ${wie}`);
      } else if (minutes > 45 && minutes <= 75 && !ev.categories.includes(CAT_UUR)) {
        await sendUur(t, ev, p, from, notify);
        await graph.addCategory(ev.id, CAT_UUR);
        log.push(`uur-herinnering: ${wie}`);
      }
    }

    return res.status(200).json({ ok: true, gecontroleerd: events.length, verstuurd: log });
  } catch (err) {
    console.error('remind.js', err);
    return res.status(500).json({ ok: false, error: err.message, verstuurd: log });
  }
};
