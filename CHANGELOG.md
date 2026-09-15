# Changelog

## Sprint 10 – Kalendarium och evenemang

- Ny sida **Kalendarium → Evenemang**.
- Evenemang sparas strukturerat i `data/events.json`.
- Stöd för datum, tider, plats, huvudansvarig, bemanning, praktiska förberedelser och planeringsanteckningar.
- Status stöder Ej påbörjad, Planering pågår, Klart för genomförande och Genomfört.
- Föreningens vanliga marknadsföringsrutiner kan markeras separat från särskilda marknadsföringsanteckningar.
- Erfarenheter efter genomfört evenemang kan sparas på posten.
- Listan kan filtreras på år och genomförandestatus.
- Export till Markdown och PDF använder valt år.
- Äldre Markdown-listor kan importeras med `scripts/import-events-markdown.mjs`.
- API för skapa, ändra, ta bort och exportera evenemang.
- Datamodell och arbetsflöde dokumenteras i `docs/events.md`.

## Sprint 9 – Åtgärdslista

- Ny sida **Åtgärder → Åtgärdslista**.
- Åtgärdspunkter sparas strukturerat i `data/action-items.json`.
- Synliga åtgärdsnummer i formatet `ÅÅ-NNN` kan anges eller skapas automatiskt.
- Stöd för flera ansvariga, beslutstext, deadline, kommentar och möteskoppling.
- Status stöder Ej påbörjad, Pågår, Väntar och Klart.
- Klara punkter visas automatiskt under Avslutade åtgärder utan separat lagring.
- Åtgärdslistan kan exporteras till Markdown och PDF.
- Äldre Markdown-listor i föreningens tidigare tabellformat kan importeras med ett lokalt migreringsskript.
- API för skapa, ändra, ta bort och exportera åtgärdspunkter.
- Datamodell och arbetsflöde dokumenteras i `docs/action-items.md`.

## Sprint 8 – Mötesdokument och protokollarkiv

- Sparade möten kan få ett färdigt protokoll kopplat till sig.
- Protokoll kan laddas upp som PDF, DOCX eller ODT, max 20 MB.
- PDF-protokoll kan öppnas direkt i webbläsaren och alla format kan hämtas.
- Ett befintligt protokoll kan ersättas efter bekräftelse eller tas bort utan att mötet tas bort.
- Dokumentmetadata sparas i mötesobjektets `documents`-lista.
- Själva dokumentfilen sparas separat under `data/meeting-files/<meeting-id>/`.
- Mötesarkivet visar om protokoll finns och varnar när ett genomfört möte saknar protokoll.
- När ett möte tas bort raderas även dess dokumentkatalog.
- Dokumentlagringen är generell för att senare kunna utökas med andra möteshandlingar.

## Sprint 7 – Sparade möten och mötesarkiv

- Ny sida **Möten → Mötesarkiv**.
- Styrelsemöten kan sparas permanent och öppnas igen senare.
- Varje möte får ett stabilt UUID och sparas lokalt under `data/meetings/`.
- Mötesstatus stöder Planerat, Genomfört och Inställt.
- Mötesuppgifter och dagordning sparas tillsammans som ett mötesobjekt.
- Sparade möten kan öppnas för fortsatt redigering av mötesuppgifter eller dagordning.
- Möten kan tas bort från arkivet efter bekräftelse.
- Backend har CRUD-API under `/api/saved-meetings`.
- Mötesarkivet och lagringsmodellen dokumenteras i `docs/meetings.md`.

## Sprint 6 – Styrelseadministration

- Ny sida **Administration → Styrelse**.
- Styrelsemedlemmar kan läggas till och redigeras i webbappen.
- Personer kan markeras som aktiva eller inaktiva.
- Ordningen på styrelsemedlemmar kan ändras.
- E-postadresser och obligatoriska fält valideras i backend.
- Aktiv styrelse sparas lokalt i `data/board.json`.
- Ändringshistorik sparas lokalt i `data/board-history.jsonl`.
- Äldre `config/board.json` stöds som fallback tills styrelsen sparas från administrationssidan.
- Mötesförhandsgranskning och kalenderinbjudningar läser aktuell styrelse dynamiskt utan omstart.

## Sprint 5 – Appskal och navigation

- Permanent vänstermeny på större skärmar.
- Responsiv meny för mindre skärmar.
- Separata routes för start, styrelsemöte, dagordning och administration.
- Google Calendar-inställningar flyttades till en egen administrationssida.
- Dagordningsmallen nås från en egen administrationssida.
- Startsida med genvägar till appens viktigaste delar.
- React Router används för bokmärkningsbara URL:er och webbläsarnavigation.
- Navigationsstrukturen dokumenteras i `docs/navigation.md`.

## Sprint 4 – Administration och konfiguration

- Dagordningens standardmall kan redigeras direkt i webbappen.
- Standardpunkter kan läggas till, tas bort, ändras och flyttas.
- Aktiv föreningsmall sparas lokalt i `data/agenda.json`.
- `config/agenda.json` fungerar fortsatt som programmets återställningsbara standardmall.
- Ändringar av dagordningsmallen loggas lokalt i `data/agenda-history.jsonl`.
- Administrationsdelen visar grundläggande ändringshistorik.
- Dokumentation för dagordning och lokal konfiguration har lagts under `docs/`.

## Sprint 3 – Dagordning

- Strukturerad dagordningsmodell.
- Mötesspecifika dagordningspunkter.
- Automatisk numrering.
- Förhandsgranskning i webbappen.
- Export till Markdown.
- Export till PDF med PDFKit.

## Sprint 2 – Google Calendar

- OAuth 2.0 mot Google.
- Val av skrivbar kalender.
- Kalenderhändelser med aktiva styrelsemedlemmar som deltagare.
- Lokalt sparat kalender-ID och OAuth-token.

## Sprint 1 – Grund

- React/Vite-frontend.
- Node.js/Express-backend.
- Formulär och förhandsgranskning för styrelsemöten.
- Lokal konfiguration för standardvärden och styrelsemedlemmar.
