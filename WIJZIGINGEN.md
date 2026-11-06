**6 november 2026: foto van Anne-Roos en Demi in de hero**
- Desktop: kop links met knop, tekst en cijfers, rechts een uitgeknipte foto van Anne-Roos en Demi met label en handgeschreven "In 40 seconden zie je hoe het werkt" met pijltje naar de film. Film daaronder.
- Mobiel: zelfde volgorde als eerst, met tussen kop en film twee gezichtjes en "Check even de korte video hieronder". Film blijft direct in beeld.
- Zelfde opzet als link2leads.nl. Engels in `assets/i18n/l2t-i18n-data.js`, `l2t-i18n.js?v=12`.

**6 november 2026: accenten en trema's waar de spelling ze vraagt**
- "Je krijgt één van ons tweeën aan de lijn" en categorieën rechtgezet. Sleutel in `assets/i18n/l2t-i18n-data.js` mee aangepast, homepage op `l2t-i18n.js?v=11`.

**5 november 2026 (later): schuine 2 in de herofilm**
- In de film staat de 2 nu schuin, net als in het logo (in het rondje en in het eindbeeld, NL en EN). Nieuwe bestandsnamen zodat browsers de oude film niet blijven tonen.

**5 november 2026 (later): film start weer vanzelf op iPhone**
- De film start altijd gedempt (dat is wat iPhone en andere browsers toestaan) en het geluid gaat direct aan als de browser dat toelaat. Anders gaat het geluid aan bij de eerste klik of tik op de pagina.

**5 november 2026: herofilm, matchgesprek, 100+ setters**
- Herofilm bovenaan de homepage in plaats van de matchkaart, in dezelfde stijl en speler als link2leads.nl (`assets/video/herofilm-l2t-v1*.mp4`, 42 sec, muziek van de L2L-film). Zes scenes: wij zoeken jouw setter, jij kiest de match, elke dag bellen namens jou, leads zeggen ja, jij focust op het sluiten van deals, eindbeeld. Engelse versie wisselt mee (event `l2t:langchange`).
- Speler: start direct met geluid. Blokkeert de browser geluid, dan start hij gedempt en gaat het geluid aan bij de eerste klik of toets op de pagina. Klik op de film pauzeert, dempen via de knop. Geen loop meer: aan het eind staat een knop "Opnieuw afspelen".
- Knoptekst overal "Plan je gratis matchgesprek" (menubalk: "Gratis matchgesprek"). Het gesprek heet nu matchgesprek, ook in de boekingspagina, bevestigingsmails, herinneringen en agenda-uitnodiging (`Matchgesprek Link2Talent x Bedrijf`). Herinneringen herkennen oude uitnodigingen nog steeds.
- "100+ setters geplaatst" in de hero (derde cijfer), stappen, cases op homepage en /cases, boekingspagina, contactblok, footer op alle pagina's, metabeschrijving en llms-bestanden.
- Branchecarrousel lager (ongeveer halve hoogte) en sneller (35 sec per rondje, 28 op mobiel).
- Link naar Google Reviews weggehaald; reviewverwijzingen alleen naar de eigen reviewsectie.
- Engelse vertalingen bijgewerkt, homepage op `l2t-i18n.js?v=10`.

**16 oktober 2026: Crisp-chat vervangt de GHL-chatwidget**
- Nieuw bestand `assets/chat.js` laadt Crisp (website-ID 6efa6396-...). Het staat op elke pagina vlak voor `</body>`. Dezelfde Crisp-inbox draait op link2leads.nl, link2leads.co, link2talent.nl en wieisdeware.nl; elk gesprek krijgt de site als segment mee, zodat in Crisp te zien is waar het vandaan komt.
- Taal van de chat volgt het `lang`-attribuut van de pagina (nl of en).
- Antwoorden gaat via de Crisp-app. De GHL-widget zelf staat uit in GHL.

**8 oktober 2026: deelgegevens kennisbank en kortere homepage-omschrijving**
- Zeven kennispagina's hadden geen Open Graph-tags, waardoor een gedeelde link op LinkedIn of WhatsApp zonder titel en afbeelding verscheen: `kennis/index`, `interne-sdr-kosten`, `performance-vs-seat-model`, `remote-setter-inhuren`, `remote-setter-vs-sdr`, `salescapaciteit-uitbesteden` en `setter-vs-closer`. Ze hebben nu og:type, og:url, og:title, og:description, og:image, og:locale en og:site_name, gelijk aan de andere artikelen.
- `twitter:card` (summary_large_image) toegevoegd op de 18 pagina's die wel Open Graph hadden maar geen kaarttype.
- Meta description van de homepage ingekort van 259 naar 148 tekens, zodat Google hem niet afkapt. De og- en twitter-omschrijving zijn ongewijzigd.
- Vertalingen: twee Engelse sleutels toegevoegd aan `l2t-i18n-data.js` (nieuwe homepage-omschrijving en de og-titel van de kennisbank), cachebuster naar `?v=8`.

**25 september 2026 (2): cases, kennisbank, vergelijkingspagina, Amsterdam-pagina, capaciteitsscan, contact, herinneringen, 404**
- Drie cases met cijfers, klantnamen weggelaten: `cases/marketingbureau` (setter 10 uur per week, 10 afspraken per week, 30 procent close, 125 per nieuwe klant), `cases/belkantoor` (tien setters geplaatst, een afspraak per uur op toegankelijke campagnes, een per twee uur op moeilijkere) en `cases/setter-op-commissie` (eigen setter bij Link2Leads op 10 procent doorlopende commissie). Elke case heeft startsituatie, inzet, resultaat, een "wat het verschil maakte"-blok, FAQ met FAQPage-schema en Article/Breadcrumb-schema. `cases/index.html` opnieuw opgezet met de drie cases en de case-standaard.
- Homepage: sectie `#cases` na de werkwijze met de drie cases als kaarten (groot cijfer, titel, twee kengetallen, link). Sectie `#capaciteitsscan` na "Dit werkt, maar niet voor iedereen": venster met uitleg en formulier (e-mail plus situatie) dat via `api/contact` met `type: 'scan'` verstuurt. De eind-CTA is vervangen door sectie `#contact` in de stijl van link2leads.nl: sticker "Binnen 14 dagen actief", tekst, knop, foto van de oprichters, contactformulier (naam, e-mail, vraag) en drie directe ingangen (mail, telefoon, account aanmaken). Menu heeft "Contact" erbij.
- Vier nieuwe kennisartikelen: `kennis/afspraken-per-week-setter` (benchmark uit de cases), `kennis/appointment-setter-inhuren-kosten` (drie modellen met rekenvoorbeelden), `kennis/remote-setter-aansturen` (eerste 30 dagen) en `kennis/appointment-setting-uitbesteden` (callbureau, freelancer, recruitmentbureau, platform). `kennis/index.html` toont nu tien artikelen en linkt naar de vergelijkingspagina.
- Nieuwe pagina `appointment-setting-bureaus-nederland` (vijf soorten aanbieders op zes punten, zonder bedrijfsnamen, met de zes vragen die je elke aanbieder stelt, methodologie en FAQ) en `appointment-setter-amsterdam` (stadspagina, remote setter voor Amsterdamse bedrijven). Beide met Article, Breadcrumb en FAQPage-schema.
- `404.html` toegevoegd (noindex) met links naar homepage, cases en kennisbank. `vercel.json` heeft nu `trailingSlash: false` en redirects voor /contact, /modellen, /vergelijking, /blog, /kennis/index en /cases/index.
- API: `api/_mail.js` (mailtemplate in huisstijl, van Link2Leads overgenomen en op Link2Talent gezet, vragenlijst 15 vragen / 7 minuten), `api/contact.js` (contactformulier en capaciteitsscan, bevestiging naar afzender en notificatie naar demi@link2talent.nl, referentie L2T-xxxxxx), `api/remind.js` (herinnering een dag en een uur vooraf voor gesprekken in de Outlook-agenda met "Link2Talent" in het onderwerp, categorieen "L2T herinnering ..."). `api/_graph.js` is vervangen door de versie van Link2Leads met `listUpcoming` en `addCategory`; boekingen van /book heten nu "Kennismaking Link2Talent x Bedrijf" (was "Strategiecall Link2Leads x Bedrijf", een fout uit de kopie). Herinneringen: `api/remind` elk kwartier aanroepen met REMIND_SECRET, zie de toelichting bovenin dat bestand; dezelfde MAIL_* en MS_* variabelen als Link2Leads.
- Alle mails nu in dezelfde huisstijl als Link2Leads: `api/book.js` en `api/klant.js` zijn overgenomen van Link2Leads (donker template via `_mail.js`, agenda-uitnodiging vanuit Outlook met Teams-link, .ics-fallback, blok dat om de vragenlijst op /klant vraagt, kopie van de antwoorden naar de klant, interne notificatie). Omdat /book op Link2Talent de korte vragen in dezelfde aanvraag meestuurt, staan die antwoorden direct in de interne boekingsmail. Teksten: kennismakingsgesprek in plaats van fitcheck, 15 vragen / 7 minuten, referentie L2T-xxxxxx.
- SEO en llms: `sitemap.xml` met negen nieuwe URL's, `llms.txt` met cases, benchmark, capaciteitsscan en alle nieuwe pagina's, `llms-full.txt` opnieuw gegenereerd (homepage, vier casepagina's, tien kennisartikelen, vergelijking en Amsterdam, 73 KB).
- Vertalingen: 411 Engelse sleutels toegevoegd aan `l2t-i18n-data.js` voor alle nieuwe pagina's en secties, cachebuster naar `?v=4`. Gecontroleerd per pagina: alleen namen en merknamen blijven onvertaald.
- Foto's: tien foto's uit de fotoshoot van link2leads.nl gekopieerd naar `assets/img` en gebruikt als kaartfoto op de kennisbank- en casespagina (`.art-img`) en als kopfoto onder de meta-regel op alle tien kennisartikelen, de drie cases, de vergelijkingspagina en de Amsterdam-pagina (`.hero-img`, in `site.css`, cachebuster naar `?v=7`). Alt-teksten met Engelse vertaling.
- Wat er nog niet is: logo's van klanten (geen materiaal) en een lage-instap-product met kassa zoals /leads bij Link2Leads (bewust niet gebouwd).

**25 september 2026: homepage gelijkgetrokken met link2leads.nl (vergelijking, reviews, FAQ, garantie, SEO en llms)**
- Nieuwe sectie `#vergelijk` onder de modellen: "Vergelijkbaar met zelf iemand aannemen?" met negen punten in vier kolommen (waar je op let, Link2Talent, SDR in dienst, callbureau): opstarttijd, vaste lasten, wisselen van setter, wie stuurt aan, contract/betaling/rapportage, wie er belt, leads erbij (Link2Leads), setters en closers, inzicht in resultaat. Inhoud sluit aan op het kennisartikel remote-setter-vs-sdr. Op mobiel per punt een kaart met een blauw blok "Bij ons" en daaronder twee blokken naast elkaar voor SDR in dienst en callbureau. Voettekst zegt eerlijk wanneer een eigen SDR de betere keuze is.
- Garantiebalk onder de modellen ("Binnen 14 dagen een actieve setter", badge rechtsboven) plus drie accordeons met icoon: Wat zit er in de fee, Wie doet wat, Garantie en flexibiliteit.
- Component `.rv-mini`: compacte reviewkaart (initiaal als avatar, vijf sterren, 5,0, Google-logo, korte quote, naam en functie, link naar #reviews). Vier keer geplaatst: onder de werkwijze (Jamie), onder de accordeons (Dick), onder de vergelijking (Arnold) en onder de FAQ (Micah).
- De losse zin over Link2Leads onder "Dit werkt, maar niet voor iedereen" is een eigen sectie `#leads` geworden: "Te weinig gesprekken voor je setter?" met uitleg, twee knoppen en vier punten over Link2Leads.
- Nieuwe FAQ-sectie `#faq` tussen reviews en team met elf vragen (starttijd, uren per week, wat een setter doet, leads aanleveren, aansturing, wisselen van setter, kosten per model, vergelijking met SDR in dienst, op- en afschalen, closers, aanmelden als setter), met knoppen en link naar de kennisbank.
- Schema.org: FAQPage toegevoegd; Organization heeft nu AggregateRating (4,8) en de zes reviews als Review. Meta description verwijst naar de garantie en de vergelijking.
- Menu: "Vergelijk" erbij (desktop en mobiel), "Vragen" in het mobiele menu.
- `llms.txt`: secties samenwerkingsvormen en prijzen, garantie, vergelijking, combinatie met Link2Leads en de volledige FAQ toegevoegd. `llms-full.txt` bevat nu de volledige tekst van de homepage-samenvatting, alle zes kennisartikelen en de casespagina (was een korte samenvatting van 2,4 KB, nu ruim 40 KB). `sitemap.xml` lastmod homepage op 25 september.
- Formuleringen over uitval, mismatch en vervanging zijn vermeden of positief gesteld ("wisselen van setter kan altijd").
- Engelse vertalingen van alle nieuwe teksten (garantiebalk, accordeons, vergelijking, leads-band, FAQ, reviewkaarten, menu, aria-labels en alt-teksten) toegevoegd aan `l2t-i18n-data.js` (185 sleutels, blok onderaan), cachebuster naar `?v=3`. "SDR in dienst" vertaalt nu als "In-house SDR" (was "an SDR on payroll"). Mobiele labels "Bij ons / SDR in dienst / Callbureau" zijn CSS-content en krijgen hun Engelse tekst via `html[lang=en]`. Gecontroleerd met `?lang=en`.
- Nog niet gedaan: cases met cijfers ontbreken nog; de casespagina zegt zelf dat die volgen zodra ze verifieerbaar gedeeld kunnen worden.

## 25 september 2026, homepage en menu gelijk getrokken met Link2Leads

**Homepage opnieuw opgebouwd op het skelet van link2leads.nl.** Zelfde opbouw, stijl en scripts, inhoud blijft Link2Talent.
- Menubalk: dezelfde zwevende balk als L2L (`nav.l2n`). Klapt in tot hamburger zodra de links niet passen (onder 1080px), wordt donkerder bij scrollen.
- Hero: widget standaard naast de tekst, net als op L2L. De matches wisselen live, zoals de inbox op L2L.
- Volgorde van onderdelen, gelijk aan L2L: hero, branches-strip (loopt als de logoband), vier stappen (#zowerkthet), cases-carrousel (#resultaten), voor wie + capaciteitsscan (#capaciteitsscan), modellen (#modellen) met garantiebalk en uitklappers, vergelijking (#vergelijk), app/platform (#platform, op de plek van koopsignalen), leads via Link2Leads (#leads), reviews, FAQ, contact, footer.
- Vervallen als losse blokken: het probleemblok en het teamblok. Het team staat in het contactblok (foto en LinkedIn), zoals op L2L. Het app-blok met laptop is samengevoegd in #platform.
- Footer: dezelfde vierkoloms footer als L2L (`footer.l2f`) met Dienst, Meer lezen en Bedrijf, plus KvK, BTW en adres.
- WhatsApp-knop rechtsonder, net als op L2L.
- Oude ankers #aanpak, #cases en #team op alle pagina's omgezet naar #zowerkthet, /cases en #contact.

**Alle subpagina's** (kennis, cases, vergelijking, Amsterdam, 404, privacy, voorwaarden, calculator, book, klant) hebben nu hetzelfde menu, dezelfde footer en de WhatsApp-knop. Gedeelde stijl staat in `/assets/l2t-shared.css`.

**Knoppen gelijk aan L2L (aanvulling):** alle knoppen op subpagina's hebben nu exact de L2L-opmaak (effen blauwe pil-knop en omlijnde pil-knop, zelfde maat en dikte, nagemeten). Het eindblok op kennis-, case- en vergelijkingspagina's is opgemaakt als de eind-CTA op L2L, met tweede knop "Stel eerst je vraag" en een mailregel. "Plan een matchgesprek" heet overal "Plan een gesprek". Vertalingen meegeleverd (v=6).

**Footer en taalkeuze (aanvulling):** footer op de homepage stond binnen het contactblok en was daardoor smaller; staat nu over de volle breedte, net als op L2L. Kolommen gelijk aan L2L (Bedrijf: over ons, contact, voorwaarden, privacy). Taalkeuze staat nu in de menubalk naast de knop, zoals op L2L, in plaats van los linksonder.

**Vertalingen:** 170 nieuwe Engelse teksten toegevoegd, data-bestand naar v=5.


**4 november 2026: homepage op het niveau van link2leads.nl**
- Hero in dezelfde opbouw als link2leads.nl: gecentreerde kop "Een remote setter die afspraken in je agenda zet", daaronder de matchkaart, een knop "Plan een gesprek", een korte regel en drie cijfers (Google 4,8, garantie binnen 14 dagen, per maand op- en afschalen). Tweede knop, kleine lettertjes en belknop uit de hero. De knop staat op elk scherm zonder scrollen in beeld.
- Vier stappen als korte alinea's in plaats van opsommingen. Teksten ingekort bij cases, capaciteitsscan, modellen, "Wie doet wat", vergelijking (9 naar 6 regels), app-sectie (kaarten twee naast elkaar op mobiel) en het Link2Leads-blok. FAQ-kop heet nu "Veelgestelde vragen".
- Engelse vertalingen van alle nieuwe teksten in `assets/i18n/l2t-i18n-data.js`, versie naar v=9.
