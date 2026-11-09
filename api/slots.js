const graph = require('./_graph');

/* Geeft de tijdslots voor één dag terug.
   Aanroep: GET /api/slots?date=JJJJ-MM-DD
   Antwoord: { slots: ['09:00','10:30',...], taken: ['09:30','13:00',...], live: true|false }

   slots = boekbaar, taken = zichtbaar maar bezet (rood in de UI).
   live=false betekent dat de agenda niet geraadpleegd kon worden en dat
   het standaardrooster is teruggegeven. De boekingspagina blijft dan werken. */

const TZ = 'Europe/Amsterdam';

function pad(n) { return String(n).padStart(2, '0'); }

/* Het standaardrooster (Nederlandse tijd), laatste starttijd inclusief:
   ma t/m do 09:30-16:30, vr 09:30-13:00. */
function baseSlots(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (day === 0 || day === 6) return [];
  const endH = day === 5 ? 13 : 16.5;
  const out = [];
  for (let h = 9.5; h <= endH; h += 0.5) {
    out.push(pad(Math.floor(h)) + ':' + (h % 1 ? '30' : '00'));
  }
  return out;
}

/* Huidige datum en tijd in Amsterdam, ongeacht de serverzone. */
function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (+parts.hour === 24 ? 0 : +parts.hour) * 60 + (+parts.minute)
  };
}

function toMin(hhmm) { return +hhmm.slice(0, 2) * 60 + (+hhmm.slice(3, 5)); }

/* Vaste, per datum reproduceerbare willekeur. Dezelfde dag geeft altijd
   dezelfde uitkomst, ook na een refresh of op een ander toestel. */
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngFrom(seed) {
  let s = seed || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Blokt precies een derde van de vrije tijden zodat de agenda gevuld oogt.
   Alles wat echt bezet is blijft bezet; dit haalt er alleen extra opties af.
   Welke tijden dicht gaan is vast per datum, dus een refresh of een ander
   toestel geeft hetzelfde beeld. Uitzetten kan met SCARCITY_ENABLED=0. */
function applyScarcity(dateKey, freeSlots) {
  if (String(process.env.SCARCITY_ENABLED || '1') !== '1') return freeSlots;
  if (!freeSlots.length) return freeSlots;

  const rnd = rngFrom(seedFrom(dateKey + '|' + (process.env.SCARCITY_SALT || 'l2l')));
  const scored = freeSlots.map(t => ({ t, r: rnd() }));
  const dicht = Math.round(freeSlots.length / 3);
  const weg = scored.slice().sort((a, b) => a.r - b.r).slice(0, dicht).map(x => x.t);

  return freeSlots.filter(t => weg.indexOf(t) < 0);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const dateKey = String((req.query && req.query.date) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return res.status(400).json({ error: 'Ongeldige datum' });
  }

  const grid = baseSlots(dateKey);
  let slots = grid.slice();

  // Verleden en te korte termijn eruit.
  const now = nowInTz();
  const notice = Number(process.env.BOOKING_MIN_NOTICE_HOURS || 2) * 60;
  if (dateKey < now.dateKey) slots = [];
  else if (dateKey === now.dateKey) {
    slots = slots.filter(t => toMin(t) >= now.minutes + notice);
  }

  const debug = String((req.query && req.query.debug) || '') === '1';
  let live = false, busy = null, error = null;

  try {
    if (graph.configured() && slots.length) {
      busy = await graph.getBusy(dateKey);
      if (busy !== null) {
        slots = slots.filter(t => {
          const start = toMin(t);
          return !graph.overlaps(busy, start, start + 30);
        });
      }
      live = true;
    }
  } catch (err) {
    error = err.message;
    console.error('Slots:', err.message);
  }

  const echtVrij = slots.slice();
  slots = applyScarcity(dateKey, slots);
  const taken = grid.filter(t => !slots.includes(t));

  if (debug) {
    return res.status(200).json({
      slots, taken, live, error,
      dateKey,
      configured: graph.configured(),
      agendas: (process.env.MS_CHECK_CALENDARS || process.env.MS_CALENDAR_USER || '').split(',').map(x => x.trim()),
      bezet: busy,
      echt_vrij: echtVrij,
      ruwe_items: graph.lastRaw || null
    });
  }

  return res.status(200).json({ slots, taken, live });
};
