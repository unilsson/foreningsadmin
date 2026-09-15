# Föreningsadmin

Ett enkelt webbverktyg för återkommande administration i Haninge Hembygdsgille.

Appen hanterar styrelsemöten, mötesarkiv, Google Calendar-inbjudningar, dagordningar, styrelseuppgifter och mötesdokument. Målet är att sådant som föreningen behöver ändra i vardagen ska kunna administreras från webbgränssnittet utan att någon behöver redigera källkod.

## Status

### Sprint 1 – grund

- React/Vite-frontend
- Node.js/Express-backend
- formulär och förhandsgranskning för styrelsemöten
- standardvärden från `config/defaults.json`

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
- export till Markdown och PDF

### Sprint 4 – administration och konfiguration

- redigering av dagordningens standardmall direkt i webbappen
- lokal aktiv mall i `data/agenda.json`
- återställning till programmets standard i `config/agenda.json`
- lokal ändringshistorik

### Sprint 5 – appskal och navigation

- permanent vänstermeny på desktop
- responsiv meny på mindre skärmar
- React Router och bokmärkningsbara sidor
- separata arbetsytor för möten, dagordning och administration

### Sprint 6 – styrelseadministration

- sida **Administration → Styrelse**
- redigering av namn, roll, e-post och aktiv/inaktiv-status
- lokal styrelsedata i `data/board.json`
- ändringshistorik i `data/board-history.jsonl`
- aktuell styrelse används direkt i möten och kalenderinbjudningar

### Sprint 7 – sparade möten och mötesarkiv

- sida **Möten → Mötesarkiv**
- möten kan sparas, öppnas igen och redigeras
- möte och dagordning sparas tillsammans
- status: Planerat, Genomfört eller Inställt
- separata mötesfiler under `data/meetings/`
- sparade möten kan tas bort efter bekräftelse

### Sprint 8 – mötesdokument och protokollarkiv

- ett färdigt protokoll kan kopplas till varje sparat möte
- stöd för PDF, DOCX och ODT, max 20 MB
- PDF kan öppnas direkt i webbläsaren
- protokoll kan hämtas, ersättas eller tas bort
- mötesarkivet visar om protokoll finns eller saknas
- dokumentmetadata sparas i mötesobjektet och själva filen under `data/meeting-files/`
- lagringsmodellen är förberedd för fler dokumenttyper senare

Se även [CHANGELOG.md](CHANGELOG.md).

## Struktur

```text
foreningsadmin/
├── backend/
│   └── src/
│       ├── agenda/
│       ├── board/
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
│   ├── meetings/
│   └── meeting-files/
├── docs/
│   ├── agenda.md
│   ├── board.md
│   ├── configuration.md
│   ├── meeting-documents.md
│   ├── meetings.md
│   └── navigation.md
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

När styrelsen senare sparas genom webbgränssnittet skapas `data/board.json`, som därefter används i stället för den äldre lokala `config/board.json`.

Öppna därefter:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001
```

Vite proxyar `/api` till backend under utveckling.

## Navigation

De viktigaste sidorna är:

```text
/                       Start
/meetings               Mötesarkiv
/meetings/:meetingId    Sparat möte och dess dokument
/meetings/new           Styrelsemöte
/agenda                 Dagordning
/admin/board            Styrelse
/admin/agenda           Dagordningsmall
/admin/google           Google Calendar
```

Se [docs/navigation.md](docs/navigation.md).

## Lokal data

Programstandard som är säker att publicera ligger under `config/` och versionshanteras i Git. Lokal föreningsdata ligger under `data/` och ignoreras av Git.

Exempel:

```text
data/agenda.json                         aktiv dagordningsmall
data/agenda-history.jsonl                historik för dagordningsmallen
data/board.json                          aktuell styrelse
data/board-history.jsonl                 historik för styrelsen
data/google-calendar.json                valt Google Calendar-ID
data/meetings/<uuid>.json                 sparade möten och dokumentmetadata
data/meeting-files/<uuid>/<fil>           mötesdokument
```

Mer information finns i [docs/configuration.md](docs/configuration.md), [docs/meetings.md](docs/meetings.md) och [docs/meeting-documents.md](docs/meeting-documents.md).

## Mötesarkiv

Ett sparat möte innehåller datum, tid, plats, status, sin dagordning och metadata om kopplade dokument. Varje möte får ett stabilt UUID och sparas som ett separat JSON-dokument i `data/meetings/`.

Från mötesarkivet kan ett möte öppnas och sedan skickas tillbaka till mötes- eller dagordningsarbetsytan för fortsatt redigering. Den permanenta filen ändras först när användaren sparar.

Se [docs/meetings.md](docs/meetings.md).

## Mötesdokument och protokoll

Föreningsadmin skriver inte protokollet. Sekreteraren ansvarar för innehållet och kan när protokollet är färdigt ladda upp filen till rätt sparat möte.

I Sprint 8 tillåts ett dokument av typen `protocol` per möte. PDF, DOCX och ODT stöds. PDF rekommenderas för slutarkiv och kan öppnas direkt i webbläsaren.

Dokumentmetadata sparas i mötets `documents`-lista. Själva filen ligger separat under `data/meeting-files/<meeting-id>/`. Ett protokoll kan ersättas eller tas bort utan att själva mötet påverkas.

Se [docs/meeting-documents.md](docs/meeting-documents.md).

## Dagordning

Dagordningen består av standardpunkter före mötesspecifika ärenden, mötesspecifika ärenden och standardpunkter efter dem. Punktnumren genereras automatiskt.

Under **Administration → Dagordningsmall** kan standardmallen ändras utan att källkoden behöver redigeras. Den sparade föreningsmallen ligger lokalt i `data/agenda.json`, medan `config/agenda.json` finns kvar som återställningsbar programstandard.

Se [docs/agenda.md](docs/agenda.md).

## Styrelse

Under **Administration → Styrelse** kan namn, roll, e-post, aktiv/inaktiv-status och ordning ändras. Aktiva personer används som kalenderdeltagare i mötesförhandsgranskning och Google Calendar-inbjudningar.

Den aktiva styrelsen sparas i `data/board.json`. En äldre lokal `config/board.json` stöds som fallback tills styrelsen har sparats genom webbappen.

Se [docs/board.md](docs/board.md).

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

GET    /api/saved-meetings
POST   /api/saved-meetings
GET    /api/saved-meetings/:id
PUT    /api/saved-meetings/:id
DELETE /api/saved-meetings/:id

PUT    /api/saved-meetings/:id/documents/protocol
GET    /api/saved-meetings/:id/documents/protocol
DELETE /api/saved-meetings/:id/documents/protocol

GET  /api/agenda/template
POST /api/agenda/preview
POST /api/agenda/pdf

GET /api/admin/board
PUT /api/admin/board

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

Riktiga nycklar, OAuth-tokens, lösenord, privata kontaktuppgifter, föreningens lokala mötesdata och mötesdokument ska aldrig checkas in i Git.

Projektets `.gitignore` skyddar bland annat:

- `.env`
- `config/board.json`
- `tokens/`
- `secrets/`
- `data/*`
- lokala databaser

Kontrollera alltid `git status` innan push.

Administrations-API:t är i nuläget avsett för en lokal installation. Om Föreningsadmin senare exponeras publikt måste administrationsfunktionerna och dokumentåtkomsten skyddas med autentisering och behörighetskontroll.
