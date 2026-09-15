# Sparade möten och mötesarkiv

Sprint 7 gör ett styrelsemöte till ett permanent objekt i Föreningsadmin. Ett möte kan sparas, öppnas igen, ändras och tas bort. Från Sprint 8 kan mötesobjektet också ha dokument kopplade till sig.

## Lagring

Varje sparat möte ligger som ett separat JSON-dokument under:

```text
data/meetings/<uuid>.json
```

`data/` ignoreras av Git och innehåller föreningens lokala driftdata. Ett separat dokument per möte gör det enkelt att säkerhetskopiera och inspektera data utan att introducera en databas.

Dokumentfiler som hör till mötet ligger separat under:

```text
data/meeting-files/<uuid>/
```

## Datamodell

Ett möte innehåller:

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
  "documents": [],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Giltiga statusvärden är:

- `planned` – Planerat
- `completed` – Genomfört
- `cancelled` – Inställt

`documents` innehåller metadata om filer som hör till mötet. Själva filerna sparas inte i JSON. Se [meeting-documents.md](meeting-documents.md).

## Arbetsflöde

1. Öppna **Möten → Styrelsemöte**.
2. Ange datum, tid och plats.
3. Välj **Spara mötet**.
4. Lägg till eller ändra dagordningen under **Dagordning**.
5. Välj **Spara möte och dagordning**.
6. Öppna senare **Möten → Mötesarkiv** för att fortsätta arbetet.
7. När sekreterarens färdiga protokoll finns kan det laddas upp på mötets arkivsida.

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

Dokument-API:t dokumenteras i [meeting-documents.md](meeting-documents.md).

## Säkerhet och backup

Mötesdata och mötesdokument kan innehålla föreningsintern information och ska inte checkas in i ett publikt Git-repository. De täcks av `data/*` i `.gitignore`.

En backup bör omfatta hela `data/`-katalogen och `tokens/` enligt respektive säkerhetskrav.
