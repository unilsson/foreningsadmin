# Föreningsadmin

Ett enkelt webbverktyg för återkommande administration i Haninge Hembygdsgille.

Första modulen är **Styrelsemöten**. Sprint 1 innehåller ingen Google-integration och skickar inga mejl eller kalenderinbjudningar.

## Sprint 1

- React/Vite-frontend
- Node.js/Express-backend
- Formulär för nytt styrelsemöte
- Datum, starttid, sluttid och plats
- Förhandsgranskning via backend-API
- Kalendertext från separat mallfil
- Standardvärden från `config/defaults.json`
- Aktiva styrelsemedlemmar från `config/board.json`
- Grundstruktur för framtida moduler
- Säker `.gitignore` för hemligheter och lokal data

## Struktur

```text
foreningsadmin/
├── config/
│   └── defaults.json
├── backend/
│   └── src/
│       ├── config/
│       ├── meetings/
│       └── server.mjs
├── frontend/
│   └── src/
├── templates/
│   ├── calendar/
│   │   └── styrelsemote.txt
│   ├── dagordning/
│   └── kallelse/
├── data/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Krav

- Node.js 20 eller senare
- npm

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Öppna därefter:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Hälsokontroll: http://localhost:3001/api/health

Vite proxyar `/api` till backend under utveckling.


## Standardvärden

Standardvärden som inte är hemliga ligger i:

```text
config/defaults.json
```

Exempel:

```json
{
  "organisation": {
    "name": "Haninge Hembygdsgille"
  },
  "meeting": {
    "title": "Styrelsemöte",
    "startTime": "18:30",
    "endTime": "20:30",
    "location": "Tingshussalen"
  }
}
```

Ändringar här används av både backend och frontend nästa gång servern startas.


## Styrelsemedlemmar

Styrelsemedlemmarna definieras i:

```text
config/board.json
```

Exempel:

```json
{
  "members": [
    {
      "name": "Förnamn Efternamn",
      "email": "namn@example.se",
      "role": "Ledamot",
      "active": true
    }
  ]
}
```

Endast personer med `"active": true` visas i mötesförhandsgranskningen och kommer senare att användas som kalenderdeltagare.

Efter ändringar i `config/board.json` behöver backend startas om.

## API i Sprint 1

### `GET /api/health`

Returnerar backend-status.

### `POST /api/meetings/preview`

Exempel:

```json
{
  "date": "2026-10-08",
  "startTime": "18:30",
  "endTime": "20:30",
  "location": "Tingshussalen"
}
```

Backend validerar uppgifterna och returnerar ett förhandsgranskat möte.

## Säkerhet

Riktiga nycklar, tokens och lösenord ska aldrig checkas in i Git.

`.env`, databaser, tokenfiler samt katalogerna `secrets/` och `tokens/` ignoreras av Git.

När Google-integrationen införs ska klienthemligheter och refresh tokens endast finnas i backend-miljön.

## Planerade sprintar

### Sprint 2
- Google OAuth 2.0
- Google Calendar API
- Skapa kalenderhändelse från användarens Google-konto
- Individuella styrelseledamöter som gäster

### Sprint 3
- Kallelsemall
- Gmail API
- Utskick via Groups.io
- Dagordning

### Senare
- Personregister
- Möteshistorik
- Protokoll
- Namnskyltar
- Fler föreningsadministrativa verktyg
