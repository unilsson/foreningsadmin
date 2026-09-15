# Changelog

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
- Google Calendar-inställningar flyttade till en egen administrationssida.
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
