# Changelog

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
