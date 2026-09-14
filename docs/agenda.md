# Dagordning

Dagordningen i Föreningsadmin består av tre delar:

1. standardpunkter före mötesspecifika ärenden
2. mötesspecifika ärenden för det aktuella mötet
3. standardpunkter efter mötesspecifika ärenden

Numreringen skapas först när dagordningen förhandsgranskas eller exporteras. Därför behöver inga punktnummer lagras i konfigurationen.

## Programstandard och aktiv mall

Programmets fabriksinställning ligger i:

```text
config/agenda.json
```

Den filen versionshanteras i Git och ska beskriva en fungerande standardmall.

Om någon ändrar standardmallen i webbappen sparas den aktiva föreningsmallen i:

```text
data/agenda.json
```

`data/agenda.json` är lokal och ignoreras av Git. Backend använder den lokala mallen om den finns. Om den saknas används `config/agenda.json`.

Det innebär att en rättning av exempelvis en felskriven dagordningspunkt kan göras direkt i Föreningsadmin utan kodändring eller Git-commit.

## Administration i webbappen

Under **Administration – dagordningsmall** kan man:

- ändra rubriken
- redigera standardpunkter
- lägga till och ta bort standardpunkter
- flytta punkter uppåt och nedåt
- spara den aktiva mallen
- återställa till programmets standardmall

Mötesspecifika ärenden sparas inte i standardmallen. De hör till det enskilda mötet.

Efter att en standardmall har sparats eller återställts kan sidan laddas om för att mötesredigeraren ska läsa in den nya aktiva mallen.

## Ändringshistorik

Varje lokal ändring sparas i:

```text
data/agenda-history.jsonl
```

Historiken innehåller tidpunkt, typ av ändring och en kort beskrivning av vad som ändrades. Historiken visas även i administrationsdelen av appen.

Historikfilen är lokal och ignoreras av Git.

## Export

En färdig dagordning kan exporteras som:

- Markdown (`.md`)
- PDF (`.pdf`) via PDFKit

Båda formaten skapas från samma strukturerade dagordningsdata så att innehåll och numrering blir konsekventa.

## API

```text
GET  /api/agenda/template
POST /api/agenda/preview
POST /api/agenda/pdf

GET  /api/admin/agenda-template
PUT  /api/admin/agenda-template
POST /api/admin/agenda-template/reset
```

Administrations-API:t är i nuläget avsett för den lokala installationen. Om Föreningsadmin senare exponeras publikt måste administrationsfunktionerna skyddas med autentisering och behörighetskontroll.
