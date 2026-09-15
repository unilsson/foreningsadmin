# Styrelseadministration

Föreningsadmin kan hantera styrelsemedlemmar direkt i webbgränssnittet under **Administration → Styrelse**.

## Datamodell

Varje person har:

- `id` – stabilt internt ID
- `name` – namn
- `email` – e-postadress
- `role` – roll i styrelsen
- `active` – om personen ska räknas som aktiv kalenderdeltagare

Exempel:

```json
{
  "id": "8fb1c0f0-0000-4000-8000-000000000000",
  "name": "Förnamn Efternamn",
  "email": "namn@example.se",
  "role": "Ledamot",
  "active": true
}
```

## Lokal lagring

Den aktiva styrelsen sparas i:

```text
data/board.json
```

Ändringshistorik sparas i:

```text
data/board-history.jsonl
```

Båda ligger under `data/` och ska inte versionshanteras.

Äldre installationer kan fortfarande ha riktiga styrelseuppgifter i:

```text
config/board.json
```

Om `data/board.json` saknas läser programmet den äldre filen som fallback. Första gången styrelsen sparas från administrationssidan skapas `data/board.json`; därefter används den lokala datafilen automatiskt.

`config/board.example.json` är endast ett publikt exempel och får inte innehålla riktiga kontaktuppgifter.

## Kalenderinbjudningar

Mötesförhandsgranskning och skapande av kalenderhändelser läser styrelsen dynamiskt. Bara personer med `active: true` skickas som deltagare till Google Calendar.

En ändring som sparas i styrelseadministrationen kräver därför ingen omstart av backend.

## API

```text
GET /api/board
GET /api/admin/board
PUT /api/admin/board
```

`GET /api/board` returnerar endast aktiva personer och används av mötesfunktionerna.

`GET /api/admin/board` returnerar hela styrelsen, aktuell datakälla och ändringshistorik.

`PUT /api/admin/board` validerar och sparar hela styrelselistan.
