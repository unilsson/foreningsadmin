# Kalendarium och evenemang

Sprint 10 gör föreningens evenemangslista till strukturerad lokal data. Webbappen är redigeringsverktyget och Markdown/PDF är exportformat för spridning.

## Lagring

Evenemangen sparas i:

```text
data/events.json
```

Filen ligger under `data/` och ignoreras av Git.

## Datamodell

Varje evenemang har bland annat:

```json
{
  "id": "uuid",
  "date": "2026-09-05",
  "startTime": "",
  "endTime": "",
  "title": "Haningedagen",
  "location": "",
  "mainResponsible": "Ulf Nilsson",
  "staffing": "Ulf Nilsson, Margareta Runqvist, Sune Nilsson, Anna Hartzell",
  "practicalPreparations": "...",
  "standardMarketing": false,
  "marketingNotes": "...",
  "status": "planning",
  "notes": "",
  "afterEvent": {
    "visitors": "",
    "workedWell": "",
    "improvements": "",
    "financialResult": "",
    "otherExperience": ""
  },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Statusvärden:

- `not_started` – Ej påbörjad
- `planning` – Planering pågår
- `ready` – Klart för genomförande
- `completed` – Genomfört

Alla evenemang ligger i samma kronologiska lista. Status används för uppföljning och filtrering men poster flyttas inte mellan separata datalistor.

## Marknadsföring

Fältet `standardMarketing` motsvarar föreningens vanliga rutiner för evenemang:

- affischering på de vanliga platserna
- Facebook
- Gillets hemsida
- Haninge kommuns webbplats

Särskilda instruktioner sparas i `marketingNotes`.

## Efter genomfört evenemang

Erfarenheter kan sparas direkt på evenemanget:

- antal besökare
- vad som fungerade bra
- vad som bör ändras
- ekonomiskt resultat
- övriga erfarenheter

Det gör att informationen finns kvar till nästa gång ett liknande arrangemang planeras.

## Filter och export

Sidan **Kalendarium → Evenemang** kan filtreras på år och på alla/ej genomförda/genomförda evenemang.

Export till Markdown och PDF använder valt år. Markdown är tabellbaserad och ligger nära föreningens tidigare evenemangslista. PDF använder ett mer lättläst A4-format med ett block per evenemang.

## Import av äldre Markdown-lista

Den tidigare Markdown-tabellen kan importeras med:

```bash
node scripts/import-events-markdown.mjs "/sökväg/till/Evenemangslista.md"
```

Om `data/events.json` redan finns avbryts importen. För testdata som får skrivas över används:

```bash
node scripts/import-events-markdown.mjs "/sökväg/till/Evenemangslista.md" --force
```

Importören läser året från raden `Period`, tolkar svenska månadsnamn och mappar de fyra statusvärdena. Texten "Vanliga rutiner för evenemang" konverteras till `standardMarketing: true`.

## API

```text
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
GET    /api/events/export.md?year=2026
GET    /api/events/export.pdf?year=2026
```

## Backup

`data/events.json` är föreningsdata och måste ingå i den lokala backupen. GitHub-repot innehåller inte evenemangslistan.
