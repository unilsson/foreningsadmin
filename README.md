# Föreningsadmin

Ett enkelt webbverktyg för återkommande administration i Haninge Hembygdsgille.

Appen hanterar i dag styrelsemöten, Google Calendar-inbjudningar och dagordningar. Målet är att sådant som föreningen behöver ändra i vardagen ska kunna administreras från webbgränssnittet utan att någon behöver redigera källkod.

## Status

### Sprint 1 – grund

- React/Vite-frontend
- Node.js/Express-backend
- formulär och förhandsgranskning för styrelsemöten
- standardvärden från `config/defaults.json`
- lokala styrelseuppgifter från `config/board.json`

### Sprint 2 – Google Calendar

- Google OAuth 2.0
- val av skrivbar Google-kalender, inklusive delade kalendrar
- kalenderhändelser med aktiva styrelsemedlemmar som deltagare
- lokalt sparat kalender-ID och OAuth-token

### Sprint 3 – dagordning

- strukturerad dagordningsmodell
- standardpunkter före och efter mötesspecifika ärenden
- automatisk numrering
- förhandsgranskning
- export till Markdown
- export till PDF med PDFKit

### Sprint 4 – administration och konfiguration

- redigering av dagordningens standardmall direkt i webbappen
- lägga till, ta bort, ändra och flytta standardpunkter
- lokal aktiv mall i `data/agenda.json`
- återställning till programmets standard i `config/agenda.json`
- lokal ändringshistorik i `data/agenda-history.jsonl`
- projektdokumentation under `docs/`

Se även [CHANGELOG.md](CHANGELOG.md).

## Struktur

```text
foreningsadmin/
├── backend/
│   └── src/
│       ├── agenda/
│       ├── config/
│       ├── google/
│       ├── meetings/
│       ├── templates/
│       └── server.mjs
├── config/
│   ├── agenda.json
│   ├── board.example.json
│   └── defaults.json
├── data/
├── docs/
│   ├── agenda.md
│   └── configuration.md
├── frontend/
│   └── src/
├── templates/
│   └── calendar/
├── tokens/
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── package.json
└── README.md
```

## Krav

- Node.js 20 eller senare
- npm
- ett Google-konto om Calendar-integrationen ska användas
- ett Google Cloud-projekt med Google Calendar API aktiverat

## Installation

```bash
npm install
cp .env.example .env
cp config/board.example.json config/board.json
npm run dev
```

Öppna därefter:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001
```

Vite proxyar `/api` till backend under utveckling.

## Konfigurationsprincip

Programstandard som är säker att publicera ligger under `config/` och versionshanteras i Git.

Lokal konfiguration som bara gäller installationen ligger under `data/` och ignoreras av Git.

För dagordningen gäller exempelvis:

```text
data/agenda.json      # aktiv lokal mall, om den finns
        ↓ fallback
config/agenda.json    # programmets standardmall
```

Riktiga styrelseuppgifter finns i `config/board.json`. Den filen är också lokal och ignoreras av Git.

Mer information finns i [docs/configuration.md](docs/configuration.md).

## Dagordning

Dagordningen består av standardpunkter före mötesspecifika ärenden, mötesspecifika ärenden och standardpunkter efter dem. Punktnumren genereras automatiskt.

Under **Administration – dagordningsmall** kan standardmallen ändras utan att källkoden behöver redigeras. Den sparade föreningsmallen ligger lokalt i `data/agenda.json`, medan `config/agenda.json` alltid finns kvar som återställningsbar programstandard.

Se [docs/agenda.md](docs/agenda.md) för datamodell, filer, historik och API.

## Google Calendar

Aktivera **Google Calendar API** i Google Cloud och skapa en OAuth-klient av typen **Web application**.

Lokal redirect URI:

```text
http://localhost:3001/api/google/oauth/callback
```

Appen använder följande Calendar-behörigheter:

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.calendarlist.readonly
```

Dessutom används `openid` och `email` för att kontrollera vilket Google-konto som anslutits.

Fyll i den lokala `.env`-filen:

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/oauth/callback
GOOGLE_ACCOUNT_EMAIL=
```

Om OAuth-appen står i **Testing** måste kontot som används finnas bland Google-projektets test users.

Valt kalender-ID sparas i:

```text
data/google-calendar.json
```

OAuth-token sparas i:

```text
tokens/google.json
```

## API

Centrala endpoints:

```text
GET  /api/health
GET  /api/config
GET  /api/board
POST /api/meetings/preview

GET  /api/agenda/template
POST /api/agenda/preview
POST /api/agenda/pdf

GET  /api/admin/agenda-template
PUT  /api/admin/agenda-template
POST /api/admin/agenda-template/reset

GET  /api/google/status
GET  /api/google/auth
GET  /api/google/oauth/callback
GET  /api/google/calendars
POST /api/google/calendar-selection
POST /api/google/calendar/events
```

## Säkerhet

Riktiga nycklar, OAuth-tokens, lösenord och privata kontaktuppgifter ska aldrig checkas in i Git.

Projektets `.gitignore` skyddar bland annat:

- `.env`
- `config/board.json`
- `tokens/`
- `secrets/`
- `data/*`
- lokala databaser

Kontrollera alltid `git status` innan push.

Administrations-API:t är i nuläget avsett för en lokal installation. Om Föreningsadmin senare exponeras publikt måste administrationsfunktionerna skyddas med autentisering och behörighetskontroll.
