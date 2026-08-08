/* Microsoft Graph — maakt de afspraak aan in de Outlook-agenda van Link2Talent
   en laat Outlook zelf de uitnodiging naar de prospect sturen (incl. Teams-link).

   Benodigde omgevingsvariabelen in Vercel:
     MS_TENANT_ID        - de tenant-id uit Entra
     MS_CLIENT_ID        - de app-id (client-id) van de app-registratie
     MS_CLIENT_SECRET    - het geheim van die app-registratie
     MS_CALENDAR_USER    - het postvak waarin de afspraak komt (bijv. demi@link2leads.nl (dezelfde agenda als Link2Leads))
     MS_EXTRA_ATTENDEES  - optioneel, komma-gescheiden extra deelnemers (bijv. anneroos@link2leads.nl)
     MS_CHECK_CALENDARS  - optioneel, komma-gescheiden agenda's die meetellen voor de
                           beschikbaarheid. Standaard alleen MS_CALENDAR_USER.

   Ontbreekt een van de eerste vier, dan doet deze module niets en valt
   api/book.js automatisch terug op het meesturen van een .ics-bestand. */

const GRAPH = 'https://graph.microsoft.com/v1.0';

function configured() {
  return !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID &&
            process.env.MS_CLIENT_SECRET && process.env.MS_CALENDAR_USER);
}

async function token() {
  const url = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Token mislukt (' + res.status + '): ' + txt.slice(0, 300));
  }
  const data = await res.json();
  return data.access_token;
}

function pad(n) { return String(n).padStart(2, '0'); }

/* Schuift 'JJJJ-MM-DD' een aantal dagen op. */
function shiftDate(dateKey, days) {
  const d = new Date(Date.UTC(+dateKey.slice(0, 4), +dateKey.slice(5, 7) - 1, +dateKey.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

/* Zet 'JJJJ-MM-DD' + 'UU:MM' + duur om naar het formaat dat Graph verwacht. */
function window_(dateKey, time, minutes) {
  const h = +time.slice(0, 2), mi = +time.slice(3, 5);
  const endTotal = h * 60 + mi + minutes;
  return {
    start: `${dateKey}T${pad(h)}:${pad(mi)}:00`,
    end: `${dateKey}T${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}:00`
  };
}

/* Maakt de afspraak aan. Geeft { joinUrl, webLink, id } terug bij succes,
   of null als er geen configuratie is. Gooit een fout als Graph weigert. */
async function createEvent(opts) {
  if (!configured()) return null;

  const dk = String(opts.dateKey || '');
  const tm = String(opts.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || !/^\d{2}:\d{2}$/.test(tm)) {
    throw new Error('Ongeldige datum of tijd voor de agenda-afspraak');
  }

  const w = window_(dk, tm, opts.minutes || 30);
  const user = encodeURIComponent(process.env.MS_CALENDAR_USER);

  const attendees = [{
    emailAddress: { address: opts.email, name: opts.name || opts.email },
    type: 'required'
  }];

  (process.env.MS_EXTRA_ATTENDEES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(a => attendees.push({ emailAddress: { address: a }, type: 'required' }));

  const body = {
    subject: 'Strategiecall Link2Leads' + (opts.companyName ? ' x ' + opts.companyName : ''),
    body: {
      contentType: 'HTML',
      content:
        `<p>Strategiecall van ${opts.minutes || 30} minuten met Link2Leads.</p>` +
        (opts.companyName ? `<p>Bedrijf: ${opts.companyName}</p>` : '') +
        (opts.phone ? `<p>Telefoon: ${opts.phone}</p>` : '') +
        `<p>Boekingsnummer: ${opts.ref || '-'}</p>`
    },
    start: { dateTime: w.start, timeZone: 'W. Europe Standard Time' },
    end: { dateTime: w.end, timeZone: 'W. Europe Standard Time' },
    attendees,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    allowNewTimeProposals: true,
    reminderMinutesBeforeStart: 15,
    transactionId: String(opts.ref || Date.now())
  };

  const res = await fetch(`${GRAPH}/users/${user}/events`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (await token()),
      'Content-Type': 'application/json',
      Prefer: 'outlook.timezone="W. Europe Standard Time"'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Agenda-afspraak mislukt (' + res.status + '): ' + txt.slice(0, 400));
  }

  const ev = await res.json();
  return {
    id: ev.id,
    webLink: ev.webLink,
    joinUrl: (ev.onlineMeeting && ev.onlineMeeting.joinUrl) || null
  };
}

/* Zet een tijdstip in wereldtijd om naar Amsterdamse datum en minuten.
   Werkt ongeacht de tijdzone van de server of van het Outlook-account. */
function utcToAmsterdam(isoZonderZone) {
  const d = new Date(isoZonderZone.slice(0, 19) + 'Z');
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
  const uur = +p.hour === 24 ? 0 : +p.hour;
  return {
    dateKey: `${p.year}-${p.month}-${p.day}`,
    minutes: uur * 60 + (+p.minute),
    label: `${p.year}-${p.month}-${p.day} ${pad(uur)}:${p.minute}`
  };
}

/* Leest de daadwerkelijke agenda-items tussen twee tijdstippen.
   Anders dan de vrij/bezet-weergave telt hier ALLES mee wat in de agenda
   staat, ook items die als "Vrij" gemarkeerd zijn. Geannuleerde items
   worden overgeslagen.

   Geeft een lijst terug van { start, end } in minuten sinds middernacht.
   Een afspraak van een hele dag geeft { start: 0, end: 1440 }. */
async function getBusy(dateKey) {
  module.exports.lastRaw = [];
  if (!configured()) return null;

  const cals = (process.env.MS_CHECK_CALENDARS || process.env.MS_CALENDAR_USER)
    .split(',').map(x => x.trim()).filter(Boolean);

  // Microsoft leest de datums in de vraag als wereldtijd, niet als lokale tijd.
  // Daarom vragen we een ruimere periode op en knippen we hieronder zelf
  // precies de gevraagde dag eruit, op basis van de lokale tijden in het antwoord.
  const dayBefore = shiftDate(dateKey, -1);
  const dayAfter = shiftDate(dateKey, 1);
  const from = `${dayBefore}T00:00:00`;
  const to = `${dayAfter}T23:59:59`;
  const tok = await token();
  const busy = [];

  for (const cal of cals) {
    const url = `${GRAPH}/users/${encodeURIComponent(cal)}/calendarView` +
      `?startDateTime=${from}&endDateTime=${to}` +
      `&$select=subject,start,end,isAllDay,isCancelled&$top=250&$orderby=start/dateTime`;

    // Bewust geen Prefer-header: Microsoft levert dan wereldtijd,
    // en die rekenen we hieronder zelf om naar Amsterdamse tijd.
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Agenda uitlezen mislukt voor ' + cal + ' (' + res.status + '): ' + txt.slice(0, 250));
    }

    const data = await res.json();

    for (const ev of (data.value || [])) {
      if (ev.isCancelled) continue;

      const rs = String((ev.start && ev.start.dateTime) || '');
      const re = String((ev.end && ev.end.dateTime) || '');
      if (rs.length < 16 || re.length < 16) continue;

      let sDate, sMin, eDate, eMin, sLabel, eLabel;

      if (ev.isAllDay) {
        // Bij afspraken van een hele dag staat er geen echt tijdstip in;
        // de datum zelf is leidend en er wordt niet omgerekend.
        sDate = rs.slice(0, 10); sMin = 0; sLabel = sDate + ' (hele dag)';
        eDate = re.slice(0, 10); eMin = 0; eLabel = eDate + ' (hele dag)';
      } else {
        const a = utcToAmsterdam(rs), b = utcToAmsterdam(re);
        sDate = a.dateKey; sMin = a.minutes; sLabel = a.label;
        eDate = b.dateKey; eMin = b.minutes; eLabel = b.label;
      }

      module.exports.lastRaw.push({
        onderwerp: ev.subject || '(geen onderwerp)',
        heleDag: !!ev.isAllDay,
        wereldtijd: rs.slice(0, 16) + ' tot ' + re.slice(0, 16),
        amsterdam: sLabel + ' tot ' + eLabel
      });

      if (sDate > dateKey || eDate < dateKey) continue;
      if (eDate === dateKey && eMin === 0 && sDate < dateKey) continue;

      const startMin = sDate < dateKey ? 0 : sMin;
      const endMin = eDate > dateKey ? 1440 : eMin;
      if (endMin > startMin) busy.push({ start: startMin, end: endMin });
    }
  }

  return busy;
}

/* Overlapt [start, end) met een van de bezette blokken? */
function overlaps(busy, start, end) {
  return busy.some(b => start < b.end && b.start < end);
}

/* Is één specifiek tijdslot nog helemaal vrij? */
async function isFree(dateKey, time, minutes) {
  const busy = await getBusy(dateKey);
  if (busy === null) return true;
  const start = +time.slice(0, 2) * 60 + +time.slice(3, 5);
  return !overlaps(busy, start, start + (minutes || 30));
}

module.exports = { configured, createEvent, getBusy, overlaps, isFree };
