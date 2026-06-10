# RLP26 — Tournament Brackets

Toernooisite voor de Ronnie LAN Party op **https://xrlp.github.io/** — brackets
(single & double elimination), races, kalender, seatplan en tickets. Gebouwd met
**Next.js** (App Router, static export) en **Tailwind CSS**, gehost op GitHub Pages.

## Hoe het werkt

Er is géén server. De database is één bestand: **`public/data.json`** in deze repo.

- Bezoekers lezen dat bestand direct (de site ververst elke 10 seconden).
- De **admin** logt in op `/admin` met een GitHub fine-grained token
  (alleen deze repo, permissie Contents: read & write). Daarna wordt elke
  wijziging als commit op `public/data.json` opgeslagen; na ±1 minuut bouwt
  Pages de site opnieuw en ziet iedereen de nieuwe stand.

Als admin kun je: spellen toevoegen (bracket / double elimination / race),
deelnemers en scores invullen, de agenda plannen, het seatplan indelen en het
startmoment van de countdown zetten.

## Ontwikkelen

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # statische export naar out/
```

Elke push naar `main` deployt automatisch via `.github/workflows/pages.yml`.
