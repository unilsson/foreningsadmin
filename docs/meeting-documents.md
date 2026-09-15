# Mötesdokument och protokoll

Sprint 8 låter Föreningsadmin koppla ett färdigt protokoll till ett sparat möte. Själva protokollet skrivs fortfarande av sekreteraren i valfritt ordbehandlingsverktyg; Föreningsadmin fungerar som arkiv och håller ihop mötet med rätt dokument.

## Ansvar

Föreningsadmin redigerar inte protokollets innehåll. Sekreteraren ansvarar för protokollet och laddar upp den färdiga filen när den är klar.

I Sprint 8 stöds en dokumenttyp:

```text
protocol   Protokoll
```

Datamodellen är generell så att fler dokumenttyper kan läggas till senare, exempelvis kallelse, bilagor eller ekonomiska rapporter.

## Tillåtna filformat

Protokoll kan laddas upp som:

```text
.pdf
.docx
.odt
```

PDF rekommenderas för slutligt arkiv eftersom formatet är stabilt och kan öppnas direkt i webbläsaren.

Maximal filstorlek är 20 MB.

## Lagring

Metadata sparas i mötesobjektets `documents`-lista i:

```text
data/meetings/<meeting-id>.json
```

Själva filen sparas separat under:

```text
data/meeting-files/<meeting-id>/
```

Exempel på metadata:

```json
{
  "id": "uuid",
  "type": "protocol",
  "originalFilename": "protokoll-2026-09-24.pdf",
  "storedFilename": "uuid.pdf",
  "mimeType": "application/pdf",
  "size": 184320,
  "uploadedAt": "2026-10-03T12:15:00.000Z"
}
```

Det ursprungliga filnamnet visas för användaren, medan filen lagras med ett genererat UUID för att undvika kollisioner och problem med filnamn.

## Arbetsflöde

1. Öppna ett sparat möte i **Möten → Mötesarkiv**.
2. Under **Dokument → Protokoll**, välj **Ladda upp protokoll**.
3. Välj PDF, DOCX eller ODT.
4. Om ett protokoll redan finns måste ersättning bekräftas.
5. PDF kan öppnas direkt i webbläsaren. Alla format kan hämtas.
6. Protokollet kan tas bort utan att själva mötet tas bort.

När ett möte tas bort raderas också dess dokumentkatalog.

## Mötesarkiv

Mötesarkivet visar om ett möte har ett protokoll. För genomförda möten utan protokoll visas en tydlig varning.

## API

```text
PUT    /api/saved-meetings/:id/documents/protocol
GET    /api/saved-meetings/:id/documents/protocol
GET    /api/saved-meetings/:id/documents/protocol?download=1
DELETE /api/saved-meetings/:id/documents/protocol
```

Uppladdningen skickar filen som `application/octet-stream`. Det ursprungliga filnamnet skickas i HTTP-headern `X-File-Name`.

## Säkerhet och backup

Dokumenten ligger under `data/` och ignoreras av Git. De kan innehålla föreningsintern information och ska inte checkas in i det publika repot.

Backup av Föreningsadmin bör därför omfatta både:

```text
data/meetings/
data/meeting-files/
```

Metadata utan motsvarande dokumentfil räcker inte för att återställa protokollet.
