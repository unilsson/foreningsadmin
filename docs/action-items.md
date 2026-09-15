# Åtgärdslista

Sprint 9 flyttar föreningens åtgärdslista från handredigerad Markdown till strukturerad lokal data. Markdown och PDF är exportformat; webbappen och `data/action-items.json` är den aktiva källan.

## Datamodell

Varje åtgärdspunkt innehåller:

```json
{
  "id": "uuid",
  "number": "26-001",
  "title": "Installation av ny projektor i Tingshuset",
  "responsible": ["Förnamn Efternamn"],
  "decided": "Våren 2026",
  "meetingId": null,
  "dueDate": "2026-08-30",
  "status": "in_progress",
  "comment": "Kommentar",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "completedAt": null
}
```

`id` är ett internt stabilt UUID. `number` är det synliga åtgärdsnumret som används i styrelsearbetet. Om nummer lämnas tomt skapas nästa nummer automatiskt i formatet `ÅÅ-NNN`, till exempel `26-004`.

## Status

Internt används:

```text
not_started  Ej påbörjad
in_progress  Pågår
waiting      Väntar
completed    Klart
```

När status ändras till `completed` sätts `completedAt` automatiskt. Om punkten åter öppnas rensas `completedAt`.

Webbappen visar alla andra statusvärden under **Pågående åtgärder** och `completed` under **Avslutade åtgärder**. Punkten flyttas alltså inte mellan separata lagringslistor.

## Ansvariga

En åtgärd kan ha flera ansvariga. De lagras som en lista av namn. Detta gör historiken oberoende av framtida ändringar i styrelseregistret.

## Koppling till möten

`meetingId` kan peka på ett sparat möte från mötesarkivet. Kopplingen är frivillig. Fältet `decided` är fortfarande fri text för äldre åtgärder och beslut som inte hör till ett specifikt sparat möte.

## Lokal lagring

All data ligger i:

```text
data/action-items.json
```

Filen ignoreras av Git och ska ingå i lokal backup.

## Export

Markdown och PDF genereras från samma strukturerade data:

```text
GET /api/action-items/export.md
GET /api/action-items/export.pdf
```

Markdown-exporten följer föreningens tidigare upplägg med separata tabeller för pågående och avslutade åtgärder. PDF använder ett mer läsbart A4-format med en post per block i stället för en bred sjucolumnstabell.

## Import från äldre Markdown-lista

En äldre åtgärdslista i det tidigare tabellformatet kan importeras en gång med:

```bash
node scripts/import-action-items-markdown.mjs "/sökväg/till/Åtgärdslista.md"
```

Importen skapar `data/action-items.json`. Om filen redan finns avbryts importen för att skydda befintliga data. `--force` finns för en avsiktlig ersättning:

```bash
node scripts/import-action-items-markdown.mjs "/sökväg/till/Åtgärdslista.md" --force
```

Kontrollera alltid resultatet i webbappen efter import.

## API

```text
GET    /api/action-items
POST   /api/action-items
PUT    /api/action-items/:id
DELETE /api/action-items/:id
GET    /api/action-items/export.md
GET    /api/action-items/export.pdf
```
