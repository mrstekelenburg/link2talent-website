const nodemailer = require('nodemailer');

function makeICS({ ref, name, email, notifyEmail, companyLabel, time, dateObj }) {
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date(dateObj);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const now = fmt(new Date());
  return [
    'BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//' + companyLabel + '//Booking//NL',
    'CALSCALE:GREGORIAN','METHOD:REQUEST',
    'BEGIN:VEVENT',
    'UID:' + ref + '@link2talent.nl',
    'DTSTAMP:' + now,
    'DTSTART:' + fmt(start),
    'DTEND:' + fmt(end),
    'SUMMARY:Kennismakingsgesprek ' + companyLabel + ' - ' + name,
    'DESCRIPTION:Gesprek met ' + companyLabel + '. Boekingsnummer: ' + ref,
    'ORGANIZER;CN=' + companyLabel + ':mailto:' + notifyEmail,
    'ATTENDEE;CN=' + name + ';RSVP=TRUE:mailto:' + email,
    'ATTENDEE;CN=' + companyLabel + ';RSVP=FALSE:mailto:' + notifyEmail,
    'STATUS:CONFIRMED','SEQUENCE:0',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { company, notifyEmail, name, email, companyName, phone, date, time, dateObj, answers } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  const ref = (company === 'link2talent' ? 'L2T' : 'L2L') + '-' + Math.floor(100000 + Math.random() * 900000);
  const companyLabel = company === 'link2talent' ? 'Link2Talent' : 'Link2Leads';
  const accentColor = '#2F6FED';

  const icsContent = makeICS({ ref, name, email, notifyEmail, companyLabel, time, dateObj: dateObj || new Date().toISOString() });
  const icsAttachment = { filename: 'afspraak.ics', content: icsContent, contentType: 'text/calendar; method=REQUEST' };

  const answersHtml = answers ? Object.entries(answers).map(([k, v]) => `
    <tr>
      <td style="padding:8px 12px;color:#6B7280;font-size:12px;vertical-align:top;border-bottom:1px solid #1a1a2a;width:38%">${k}</td>
      <td style="padding:8px 12px;font-size:13px;color:#F0EFED;vertical-align:top;border-bottom:1px solid #1a1a2a">${v || '—'}</td>
    </tr>`).join('') : '';

  const emailHtml = (isNotify) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08090C;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#12141C;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
  <div style="background:${accentColor};padding:24px 28px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:6px">${isNotify ? 'Nieuwe afspraak' : 'Afspraakbevestiging'}</div>
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px">${companyLabel}</div>
  </div>
  <div style="padding:28px">
    <p style="font-size:15px;color:#F0EFED;margin:0 0 22px;line-height:1.6">
      ${isNotify
        ? `<strong>${name}</strong> heeft een kennismakingsgesprek ingepland.`
        : `Beste <strong>${name}</strong>,<br><br>Je afspraak met ${companyLabel} is bevestigd. De agenda-uitnodiging staat als bijlage bij deze mail — klik erop om de afspraak toe te voegen aan je agenda.`
      }
    </p>
    <div style="background:#0E1018;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a;width:38%">Datum</td><td style="padding:10px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${date}</td></tr>
        <tr><td style="padding:10px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a">Tijd</td><td style="padding:10px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${time} · 30 min · CET</td></tr>
        <tr><td style="padding:10px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a">Naam</td><td style="padding:10px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${name}</td></tr>
        ${companyName ? `<tr><td style="padding:10px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a">Bedrijf</td><td style="padding:10px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${companyName}</td></tr>` : ''}
        ${phone ? `<tr><td style="padding:10px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a">Telefoon</td><td style="padding:10px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${phone}</td></tr>` : ''}
        <tr><td style="padding:10px 14px;color:#6B7280;font-size:12px">Boekingsnr.</td><td style="padding:10px 14px;font-weight:800;font-size:14px;color:${accentColor};letter-spacing:2px">${ref}</td></tr>
      </table>
    </div>
    ${answersHtml ? `
    <div style="background:#0E1018;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:10px 14px;font-size:10px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #1a1a2a">Ingevulde vragen</div>
      <table style="width:100%;border-collapse:collapse">${answersHtml}</table>
    </div>` : ''}
    <div style="font-size:12px;color:#6B7280;line-height:1.7">
      ${isNotify
        ? `Contact opnemen: <a href="mailto:${email}" style="color:${accentColor}">${email}</a>`
        : `Vragen? Mail naar <a href="mailto:${notifyEmail}" style="color:${accentColor}">${notifyEmail}</a>.`
      }
    </div>
  </div>
</div>
</body></html>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'shared168.cloud86-host.io',
      port: parseInt(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    // Mail to booker
    await transporter.sendMail({
      from: `"${companyLabel}" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Afspraakbevestiging ${companyLabel} — ${date} om ${time}`,
      html: emailHtml(false),
      attachments: [icsAttachment],
    });

    // Mail to Demi
    await transporter.sendMail({
      from: `"${companyLabel} Booking" <${process.env.MAIL_USER}>`,
      to: notifyEmail,
      subject: `Nieuwe afspraak: ${name} — ${date} om ${time}`,
      html: emailHtml(true),
      attachments: [icsAttachment],
    });

    res.status(200).json({ success: true, ref });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
