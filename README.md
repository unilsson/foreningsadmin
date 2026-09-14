# Föreningsadmin

Ett enkelt webbverktyg för återkommande administration i Haninge Hembygdsgille.

Första modulen är **Styrelsemöten**. Appen kan förhandsgranska ett möte, läsa aktiva deltagare från en lokal styrelsefil och skapa en riktig Google Calendar-händelse i en valfri kalender där det anslutna Google-kontot har skrivrättighet.

## Status

### Sprint 1 – grund

- React/Vite-frontend
- Node.js/Express-backend
- Formulär för nytt styrelsemöte
- Datum, starttid, sluttid och plats
- Förhandsgranskning via backend-API
- Kalendertext från separat mallfil
- Standardvärden från `config/defaults.json`
- Aktiva styrelsemedlemmar från lokal `config/board.json`

### Sprint 2 – Google Calendar

- Google OAuth 2.0
- Kontroll av förväntat Google-konto
- Val av skrivbar Google-kalender, inklusive delade kalendrar
- Vald kalender sparas lokalt
- Kalenderhändelser skapas via Google Calendar API
- Aktiva styrelsemedlemmar läggs till som individuella deltagare
- Google skickar kalenderinbjudningar med `sendUpdates=all`
- OAuth-token sparas lokalt under `tokens/`

Sprint 2 är funktionstestad med en delad kalender och testdeltagare.

## Struktur

```text
foreningsadmin/
├── backend/
│   └── src/
│       ├── config/
│       ├── google/
│       ├── meetings/
│       ├── templates/
│       └── server.mjs
├── config/
│   ├── board.example.json
│   └── defaults.json
├── data/
├── frontend/
│   └── src/
├── templates/
│   ├── calendar/
│   │   └── styrelsemote.txt
│   ├── dagordning/
│   └── kallelse/
├── tokens/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

`tokens/`, den riktiga `.env`, `config/board.json` och lokala filer under `data/` ska inte checkas in i Git.

## Krav

- Node.js 20 eller senare
- npm
- ett Google-konto
- ett Google Cloud-projekt med Google Calendar API aktiverat

## Installation

```bash
npm install
cp .env.example .env
cp config/board.example.json config/board.json
npm run dev
```

Öppna därefter:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Hälsokontroll: http://localhost:3001/api/health

Vite proxyar `/api` till backend under utveckling.

## Lokal konfiguration

### Standardvärden

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

Ändringar används nästa gång backend startas.

### Styrelsemedlemmar

Den publika exempelkonfigurationen finns i:

```text
config/board.example.json
```

Skapa den lokala filen med:

```bash
cp config/board.example.json config/board.json
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

Endast personer med `"active": true` används som kalenderdeltagare. `config/board.json` är medvetet ignorerad av Git eftersom den kan innehålla riktiga kontaktuppgifter.

Efter ändringar i `config/board.json` behöver backend startas om.

## Google Calendar

### 1. Google Cloud

Skapa eller välj ett Google Cloud-projekt och aktivera **Google Calendar API**.

Konfigurera därefter OAuth för användardata och skapa en klient av typen **Web application**.

Använd denna redirect URI vid lokal utveckling:

```text
http://localhost:3001/api/google/oauth/callback
```

Appen begär följande Calendar-behörigheter:

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.calendarlist.readonly
```

Den begär också `openid` och `email` för att kunna kontrollera vilket Google-konto som anslutits.

Om OAuth-appen står i läget **Testing** måste kontot som används läggas till under **Google Auth Platform → Audience → Test users**.

### 2. `.env`

Fyll i den lokala `.env`-filen:

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/oauth/callback
GOOGLE_ACCOUNT_EMAIL=your.account@gmail.com
```

`GOOGLE_ACCOUNT_EMAIL` är valfri men rekommenderas. När den är satt kontrollerar backend efter OAuth att rätt Google-konto faktiskt anslöts.

Client secret och tokens får aldrig checkas in i Git.

### 3. Anslut och välj kalender

Starta appen och öppna frontend. Under **Google Calendar**:

1. klicka på **Anslut Google Calendar**
2. godkänn OAuth-behörigheterna
3. välj den kalender som ska användas

Listan visar bara kalendrar där det anslutna kontot har skrivrättighet. Kalendern kan vara kontots primära kalender eller en delad kalender.

Valt kalender-ID sparas lokalt i:

```text
data/google-calendar.json
```

OAuth-token sparas lokalt i:

```text
tokens/google.json
```

Båda platserna är avsedda att vara lokala och ska inte checkas in.

### 4. Skapa ett möte

Fyll i datum, tider och plats och klicka först på **Förhandsgranska**. Kontrollera deltagarna och texten innan du klickar på:

```text
Skapa och skicka kalenderinbjudan
```

Backend skapar då händelsen i den valda Google-kalendern och lägger till alla aktiva personer från `config/board.json` som deltagare. Google Calendar skickar inbjudningarna.

Vid test rekommenderas en separat `board.json` med enbart testadresser.

## Kalendertext

Texten i kalenderhändelsens beskrivning ligger separat i:

```text
templates/calendar/styrelsemote.txt
```

Mallen kan använda platshållare som:

```text
{{date}}
{{startTime}}
{{endTime}}
{{location}}
```

## API

Viktiga endpoints:

```text
GET  /api/health
GET  /api/config
GET  /api/board
POST /api/meetings/preview

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
- lokal data och databaser

Kontrollera alltid `git status` innan push.

## Nästa steg

### Sprint 3

- kallelsemall
- Gmail-integration
- utskick via Groups.io
- dagordning

### Senare

- personregister
- möteshistorik
- protokoll
- namnskyltar
- fler föreningsadministrativa verktyg
