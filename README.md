# RLP26 — Tournament Brackets

Toernooisite voor de Ronnie LAN Party: per spel een tab met een single-elimination
bracket (4–32 deelnemers), agenda, teams en uitslagen. Gebouwd met **Next.js**
(App Router, static export) en **Tailwind CSS**.

## Stack

- `app/` — Next.js-pagina's: brackets (home), tournaments, schedule (agenda), teams, sponsors, contact
- `components/` + `lib/` — React-componenten en bracket-logica
- `public/data.json` — alle toernooidata (de site leest dit bestand op GitHub Pages)
- `server.py` — lokale admin-API (Python stdlib, geen dependencies)

## Lokaal beheren

```bash
python3 server.py    # admin-API op :8080 (leest credentials uit .env)
npm run dev          # site op :3000, proxiet /api/* naar server.py
```

Log in via **Admin login** (gebruikersnaam/wachtwoord staan in `.env`:
`RLP_ADMIN_USER` / `RLP_ADMIN_PASSWORD`). Als admin kun je:

- spellen toevoegen/verwijderen via de tabs (bracket van 4, 8, 16 of 32 deelnemers)
- deelnemers invullen in ronde 1 — een lege plek is automatisch een bye
- scores invullen; de winnaar schuift automatisch door
- per toernooi een datum/tijd instellen op de Schedule-pagina (agenda)

Wijzigingen worden automatisch opgeslagen in `public/data.json`.

## Publiceren

De site draait op GitHub Pages in read-only modus (zonder API valt hij terug op
`data.json`). Bracket bijgewerkt? Commit & push — de workflow bouwt en deployt
automatisch:

```bash
git add public/data.json && git commit -m "Update bracket" && git push
```
