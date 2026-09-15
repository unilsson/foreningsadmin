# Navigation och appskal

Sprint 5 delar upp Föreningsadmin i separata arbetsytor med en permanent vänstermeny på större skärmar och en infällbar meny på mindre skärmar.

## Routes

```text
/               Start och översikt
/meetings/new   Nytt styrelsemöte
/agenda         Dagordning för aktuellt möte
/admin/board    Administration av styrelsen
/admin/agenda   Administration av standardmall för dagordning
/admin/google   Google Calendar-konfiguration
```

Frontend använder React Router. Menyn använder riktiga URL:er så att sidor kan bokmärkas och webbläsarens bakåt-/framåtknappar fungerar.

## Ansvar mellan sidorna

**Styrelsemöte** innehåller datum, tider, plats, deltagare, mötesförhandsgranskning och skapande av kalenderinbjudan.

**Dagordning** innehåller redigering av dagordningen för det aktuella mötet samt export till Markdown och PDF. Mötesuppgifterna delas i frontendens tillstånd när användaren navigerar mellan sidorna.

**Styrelse** innehåller administration av namn, e-postadress, roll, aktiv/inaktiv-status och ordning för styrelsens personer. Den aktiva listan används direkt av mötes- och kalenderfunktionerna.

**Dagordningsmall** är administration av föreningens återkommande standardpunkter och använder den lokala konfigurationsmodellen från Sprint 4.

**Google Calendar** innehåller OAuth-status och val av skrivbar kalender.

## Responsivitet

På desktop är vänstermenyn permanent synlig. På mindre skärmar döljs den bakom en menyknapp och visas som en panel ovanpå innehållet.

## Drift

Vite hanterar history fallback under lokal utveckling. Vid framtida produktion bakom en webbserver måste okända frontend-routes skickas till `index.html`, så att direktlänkar som `/admin/board` och `/admin/agenda` kan öppnas direkt.
