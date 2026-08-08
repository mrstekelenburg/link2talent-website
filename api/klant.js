const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, answers } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Naam en e-mail zijn verplicht' });

  const ref = 'L2T-' + Math.floor(100000 + Math.random() * 900000);
  const notifyEmail = process.env.NOTIFY_EMAIL || 'demi@link2talent.nl';

  const rowsHtml = answers ? Object.entries(answers).map(([k, v]) => `
    <tr>
      <td style="padding:8px 14px;color:#6B7280;font-size:12px;vertical-align:top;border-bottom:1px solid #1a1a2a;width:40%">${k}</td>
      <td style="padding:8px 14px;font-size:13px;color:#F0EFED;vertical-align:top;border-bottom:1px solid #1a1a2a">${v || '—'}</td>
    </tr>`).join('') : '';

  const html = (isNotify) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08090C;font-family:'DM Sans',Arial,sans-serif;">
<div style="max-width:580px;margin:24px auto;background:#12141C;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
  <div style="background:#2F6FED;padding:24px 28px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:6px">${isNotify ? 'Nieuwe klant onboarding' : 'Welkom bij Link2Talent'}</div>
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px">Link2Talent</div>
  </div>
  <div style="padding:28px">
    <p style="font-size:15px;color:#F0EFED;margin:0 0 22px;line-height:1.6">
      ${isNotify
        ? `<strong>${name}</strong> van <strong>${company || '—'}</strong> heeft de onboarding vragenlijst ingevuld.`
        : `Beste <strong>${name}</strong>,<br><br>Bedankt voor het invullen van de vragenlijst. Wij gaan direct aan de slag met de setup van jouw campagne. Binnen 15 dagen na betaling ben je live.<br><br>Vragen? Stuur een app of mail naar Anne-Roos.`
      }
    </p>
    <div style="background:#0E1018;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:10px 14px;font-size:10px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #1a1a2a">Contactgegevens</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a;width:40%">Naam</td><td style="padding:8px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${name}</td></tr>
        <tr><td style="padding:8px 14px;color:#6B7280;font-size:12px;border-bottom:1px solid #1a1a2a">E-mail</td><td style="padding:8px 14px;font-weight:600;font-size:13px;color:#F0EFED;border-bottom:1px solid #1a1a2a">${email}</td></tr>
        <tr><td style="padding:8px 14px;color:#6B7280;font-size:12px">Bedrijf</td><td style="padding:8px 14px;font-weight:600;font-size:13px;color:#F0EFED">${company || '—'}</td></tr>
      </table>
    </div>
    ${rowsHtml ? `
    <div style="background:#0E1018;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:10px 14px;font-size:10px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #1a1a2a">Ingevulde vragenlijst</div>
      <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
    </div>` : ''}
    <div style="font-size:12px;color:#6B7280;line-height:1.7">
      ${isNotify
        ? `Referentienummer: <strong style="color:#2F6FED">${ref}</strong>`
        : `Referentienummer: <strong style="color:#2F6FED">${ref}</strong><br>Mail: <a href="mailto:${notifyEmail}" style="color:#2F6FED">${notifyEmail}</a> · Tel: +31 85 080 538 1`
      }
    </div>
  </div>
</div>
</body></html>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.resend.com',
      port: parseInt(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Link2Talent" <${process.env.MAIL_FROM || 'info@link2talent.nl'}>`,
      replyTo: process.env.REPLY_TO || 'info@link2talent.nl',
      to: email,
      subject: `Bedankt ${name} — jouw onboarding vragenlijst is ontvangen`,
      html: html(false),
    });

    await transporter.sendMail({
      from: `"Link2Talent Onboarding" <${process.env.MAIL_FROM || 'info@link2talent.nl'}>`,
      replyTo: email,
      to: notifyEmail,
      subject: `Nieuwe onboarding: ${name} (${company || '—'})`,
      html: html(true),
    });

    res.status(200).json({ success: true, ref });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
