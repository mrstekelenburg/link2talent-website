const nodemailer = require('nodemailer');
const graph = require('./_graph');

const ACCENT = '#2F6FED';

function transporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 465),
    secure: Number(process.env.MAIL_PORT || 465) === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function wrap(title, inner, ref) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:22px 28px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:18px;font-weight:800;color:#111;">Link<span style="color:${ACCENT};">2</span>Talent</span>
      </div>
      <div style="padding:28px;">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111;">${title}</h2>
        ${inner}
        ${ref ? `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Referentienummer: ${ref}</p>` : ''}
      </div>
    </div>
  </div>`;
}

function rows(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v]) => `
      <tr>
        <td style="padding:9px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;vertical-align:top;white-space:nowrap;">${esc(k)}</td>
        <td style="padding:9px 12px;font-size:13px;color:#111;border-bottom:1px solid #f3f4f6;vertical-align:top;">${esc(v)}</td>
      </tr>`).join('');
}

function table(obj) {
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #f3f4f6;border-radius:8px;">${rows(obj)}</table>`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Bouwt een agenda-uitnodiging (.ics) voor Europe/Amsterdam.
// dateKey = 'JJJJ-MM-DD', time = 'UU:MM', duur in minuten.
function buildIcs(opts) {
  var dk = String(opts.dateKey || '');
  var tm = String(opts.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || !/^\d{2}:\d{2}$/.test(tm)) return null;

  var y = +dk.slice(0, 4), mo = +dk.slice(5, 7), d = +dk.slice(8, 10);
  var h = +tm.slice(0, 2), mi = +tm.slice(3, 5);

  var startLocal = y + pad(mo) + pad(d) + 'T' + pad(h) + pad(mi) + '00';
  var endMin = h * 60 + mi + (opts.minutes || 30);
  var endLocal = y + pad(mo) + pad(d) + 'T' + pad(Math.floor(endMin / 60)) + pad(endMin % 60) + '00';

  var stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  var uid = (opts.ref || 'l2t') + '-' + Date.now() + '@link2talent.nl';

  function esc(t) {
    return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Link2Talent//Booking//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Amsterdam',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + stamp,
    'DTSTART;TZID=Europe/Amsterdam:' + startLocal,
    'DTEND;TZID=Europe/Amsterdam:' + endLocal,
    'SUMMARY:' + esc('Kennismakingsgesprek Link2Talent' + (opts.companyName ? ' x ' + opts.companyName : '')),
    'DESCRIPTION:' + esc('Kennismakingsgesprek van 30 minuten met Link2Talent.\nJe ontvangt de meeting-link uiterlijk een dag van tevoren.\n\nBoekingsnummer: ' + (opts.ref || '')),
    'LOCATION:' + esc('Online (link volgt per mail)'),
    'ORGANIZER;CN=Link2Talent:mailto:' + (opts.organizer || 'demi@link2talent.nl'),
    'ATTENDEE;CN=' + esc(opts.name || '') + ';RSVP=TRUE:mailto:' + (opts.email || ''),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Kennismakingsgesprek Link2Talent over 15 minuten',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Morgen je kennismakingsgesprek met Link2Talent',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  const b = req.body || {};
  const notify = process.env.NOTIFY_EMAIL || b.notifyEmail || 'demi@link2talent.nl';
  const from = `"Link2Talent" <${process.env.MAIL_FROM || 'info@link2talent.nl'}>`;
  // Verzendadres en antwoordadres staan los van elkaar. Zolang link2talent.nl
  // nog geen eigen verzenddienst heeft, vertrekt de mail vanaf link2leads.nl
  // (MAIL_FROM) maar komen antwoorden gewoon op link2talent.nl binnen.
  const replyTo = process.env.REPLY_TO || 'info@link2talent.nl';
  const t = transporter();

  try {
    if (b.type === 'answers' || b.stage === 'answers') {
      // ===== Mail 2: ingevulde vragenlijst =====
      const ref = b.ref || '';
      const contact = { Naam: b.name, 'E-mail': b.email, Bedrijf: b.companyName, Telefoon: b.phone, Afspraak: `${b.date} om ${b.time}` };

      // Naar Demi
      await t.sendMail({
        from, to: notify, replyTo: b.email,
        subject: `Vragenlijst ingevuld — ${b.name}${b.companyName ? ' (' + b.companyName + ')' : ''} ${ref}`,
        html: wrap('Vragenlijst ingevuld',
          `<p style="font-size:14px;color:#374151;margin:0 0 18px;">${esc(b.name)}${b.companyName ? ' van ' + esc(b.companyName) : ''} heeft de vragenlijst ingevuld.</p>
           <h3 style="font-size:14px;color:#111;margin:0 0 8px;">Contactgegevens</h3>${table(contact)}
           <h3 style="font-size:14px;color:#111;margin:20px 0 8px;">Ingevulde vragenlijst</h3>${table(b.answers || {})}`, ref)
      });

      // Naar de klant (kopie)
      await t.sendMail({
        from, to: b.email, replyTo,
        subject: `Kopie van je antwoorden — Link2Talent ${ref}`,
        html: wrap(`Bedankt, ${esc(b.name)}!`,
          `<p style="font-size:14px;color:#374151;margin:0 0 18px;">Je antwoorden zijn ontvangen. Hieronder een kopie voor je eigen administratie. We bereiden hiermee het gesprek van <strong>${esc(b.date)} om ${esc(b.time)}</strong> voor.</p>
           ${table(b.answers || {})}`, ref)
      });

      return res.status(200).json({ success: true });
    }

    // ===== Mail 1: boekingsbevestiging =====
    const ref = 'L2T-' + Math.floor(100000 + Math.random() * 900000);
    const details = { Naam: b.name, 'E-mail': b.email, Bedrijf: b.companyName, Telefoon: b.phone, Datum: b.date, Tijd: `${b.time} (CET) · 30 minuten` };

    // Naar Demi
    // Laatste controle: is het tijdslot ondertussen niet volgeboekt?
    try {
      if (graph.configured() && b.dateKey && b.time) {
        const vrij = await graph.isFree(b.dateKey, b.time, 30);
        if (!vrij) {
          return res.status(409).json({ success: false, reason: 'slot_taken' });
        }
      }
    } catch (err) {
      console.error('Beschikbaarheidscheck:', err.message);
    }

    // Eerst proberen we de afspraak echt in de Outlook-agenda te zetten.
    // Lukt dat, dan verstuurt Outlook zelf de uitnodiging met Teams-link en
    // hoeft er geen .ics mee. Lukt het niet, dan valt hij terug op de .ics.
    let calendar = null, calendarError = null;
    try {
      calendar = await graph.createEvent({
        dateKey: b.dateKey, time: b.time, minutes: 30, ref,
        name: b.name, email: b.email, companyName: b.companyName, phone: b.phone
      });
    } catch (err) {
      calendarError = err.message;
      console.error('Graph:', err.message);
    }

    const ics = calendar ? null : buildIcs({
      dateKey: b.dateKey, time: b.time, minutes: 30, ref,
      name: b.name, email: b.email, companyName: b.companyName, organizer: notify
    });
    const icsAttach = ics ? [{ filename: 'kennismaking-link2talent.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }] : [];
    const icsAlt = ics ? [{ contentType: 'text/calendar; charset=utf-8; method=REQUEST', content: ics }] : [];

    await t.sendMail({
      from, to: notify, replyTo: b.email,
      attachments: icsAttach,
      subject: `Nieuwe boeking — ${b.name}${b.companyName ? ' (' + b.companyName + ')' : ''} · ${b.date} ${b.time}`,
      html: wrap('Nieuw kennismakingsgesprek geboekt',
        `<p style="font-size:14px;color:#374151;margin:0 0 18px;">${esc(b.name)} heeft een kennismakingsgesprek geboekt. De vragenlijst volgt in een aparte mail zodra die is ingevuld.</p>
         ${table(details)}
         ${calendar
            ? `<p style="margin:18px 0 0;font-size:13px;color:#166534;">De afspraak staat in de agenda en de uitnodiging is vanuit Outlook verstuurd.${calendar.joinUrl ? ` <a href="${calendar.joinUrl}">Teams-link</a>` : ''}</p>`
            : `<p style="margin:18px 0 0;font-size:13px;color:#b45309;">Let op: de afspraak kon niet in de agenda gezet worden${calendarError ? ' (' + esc(calendarError) + ')' : ''}. Zet hem handmatig in je agenda.</p>`}`, ref)
    });

    // Naar de klant
    await t.sendMail({
      from, to: b.email, replyTo,
      attachments: icsAttach,
      alternatives: icsAlt,
      subject: `Je kennismakingsgesprek is bevestigd — ${b.date} om ${b.time}`,
      html: wrap('Je afspraak is bevestigd!',
        `<p style="font-size:14px;color:#374151;margin:0 0 18px;">Hoi ${esc(b.name)}, je kennismakingsgesprek met Link2Talent staat ingepland.${calendar ? ' Je krijgt zo een agenda-uitnodiging met de deelnamelink.' : ' Je ontvangt de meeting-link uiterlijk een dag van tevoren.'}</p>
         ${table(Object.assign(
            { Datum: b.date, Tijd: `${b.time} (CET) · 30 minuten` },
            calendar && calendar.joinUrl ? { Deelnemen: calendar.joinUrl } : { Format: 'Web conferencing' }
         ))}`, ref)
    });

    return res.status(200).json({ success: true, ref });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
};
