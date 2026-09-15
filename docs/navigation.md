# Navigation och appskal

Sprint 5 delar upp Föreningsadmin i separata arbetsytor med en permanent vänstermeny på större skärmar och en infällbar meny på mindre skärmar. Sprint 7 utökar mötesdelen med ett permanent mötesarkiv.

## Routes

```text
/                       Start och översikt
/meetings               Mötesarkiv
/meetings/:meetingId    Sparat möte
/meetings/new           Styrelsemöte / aktuell arbetsyta
/agenda                 Dagordning för aktuell arbetsyta
/admin/board            Administration av styrelsen
/admin/agenda           Administration av standardmall för dagordning
/admin/google           Google Calendar-konfiguration
```

Frontend använder React Router. Menyn använder riktiga URL:er så att sidor kan bokmärkas och webbläsarens bakåt-/framåtknappar fungerar.

## Ansvar mellan sidorna

**Mötesarkiv** listar sparade styrelsemöten och visar deras datum, tid, plats och status. Ett möte kan öppnas för att se den sparade dagordningen och fortsätta redigeringen.

**Styrelsemöte** innehåller datum, tider, plats, status, lagring i mötesarkivet, deltagare, mötesförhandsgranskning och skapande av kalenderinbjudan.

**Dagordning** innehåller redigering av dagordningen för det aktuella mötet samt export till Markdown och PDF. Om arbetsytan kommer från ett sparat möte sparas dagordningen tillbaka till samma mötesobjekt.

**Styrelse** innehåller administration av namn, e-postadress, roll, aktiv/inaktiv-status och ordning för styrelsens personer. Den aktiva listan används direkt av mötes- och kalenderfunktionerna.

**Dagordningsmall** är administration av föreningens återkommande standardpunkter och använder den lokala konfigurationsmodellen från Sprint 4.

**Google Calendar** innehåller OAuth-status och val av skrivbar kalender.

## Arbetsyta för ett sparat möte

När användaren väljer **Redigera mötet** eller **Redigera dagordning** från mötesarkivet läggs det sparade mötesobjektet i webbläsarens `sessionStorage`. Det gör att de befintliga arbetsytorna kan laddas med rätt mötes- och dagordningsdata. Den permanenta versionen förändras först när användaren väljer att spara.

## Responsivitet

På desktop är vänstermenyn permanent synlig. På mindre skärmar döljs den bakom en menyknapp och visas som en panel ovanpå innehållet.

## Drift

Vite hanterar history fallback under lokal utveckling. Vid framtida produktion bakom en webbserver måste okända frontend-routes skickas till `index.html`, så att direktlänkar som `/meetings/<uuid>`, `/admin/board` och `/admin/agenda` kan öppnas direkt.
