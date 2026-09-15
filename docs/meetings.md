# Sparade möten och mötesarkiv

Sprint 7 gör ett styrelsemöte till ett permanent objekt i Föreningsadmin. Ett möte kan sparas, öppnas igen, ändras och tas bort.

## Lagring

Varje sparat möte ligger som ett separat JSON-dokument under:

```text
data/meetings/<uuid>.json
```

`data/` ignoreras av Git och innehåller föreningens lokala driftdata. Ett separat dokument per möte gör det enkelt att säkerhetskopiera och inspektera data utan att introducera en databas i samma sprint. Om datamodellen senare växer med protokoll, åtgärdspunkter och fler relationer kan lagringen migreras till SQLite utan att frontendens arbetsflöde behöver ändras.

## Datamodell

Ett möte innehåller i Sprint 7:

```json
{
  "id": "uuid",
  "status": "planned",
  "meeting": {
    "date": "2026-09-24",
    "startTime": "18:30",
    "endTime": "20:30",
    "location": "Tingshussalen"
  },
  "agenda": {
    "title": "Dagordning",
    "beforeMeetingItems": [],
    "meetingItems": [],
    "afterMeetingItems": []
  },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Giltiga statusvärden är:

- `planned` – Planerat
- `completed` – Genomfört
- `cancelled` – Inställt

## Arbetsflöde

1. Öppna **Möten → Styrelsemöte**.
2. Ange datum, tid och plats.
3. Välj **Spara mötet**.
4. Lägg till eller ändra dagordningen under **Dagordning**.
5. Välj **Spara möte och dagordning**.
6. Öppna senare **Möten → Mötesarkiv** för att fortsätta arbetet.

När ett sparat möte öppnas från arkivet kan användaren välja att redigera mötesuppgifterna eller dagordningen. Det aktuella mötet läggs då i webbläsarens session som arbetsyta, medan den permanenta kopian ligger kvar i `data/meetings/` tills användaren sparar ändringarna.

## API

```text
GET    /api/saved-meetings
POST   /api/saved-meetings
GET    /api/saved-meetings/:id
PUT    /api/saved-meetings/:id
DELETE /api/saved-meetings/:id
```

Skapande och uppdatering återanvänder samma validering av datum, tider och plats som mötesförhandsgranskningen.

## Säkerhet och backup

Mötesfilerna kan innehålla föreningsintern information och ska inte checkas in i ett publikt Git-repository. De täcks av `data/*` i `.gitignore`.

En framtida backup bör omfatta hela `data/`-katalogen och `tokens/` enligt respektive säkerhetskrav.
