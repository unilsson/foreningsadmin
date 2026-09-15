# Konfiguration

Föreningsadmin skiljer på programstandard, lokal föreningsdata och hemligheter.

## Programstandard

Filer under `config/` som är säkra att publicera följer med repot och fungerar som standardvärden eller exempel.

Exempel:

```text
config/defaults.json
config/agenda.json
config/board.example.json
```

De här filerna versionshanteras i Git.

## Lokal föreningsdata

Inställningar och arbetsdata som ska kunna ändras från appen eller som bara gäller en viss installation sparas lokalt under:

```text
data/
```

Hela `data/*` ignoreras av Git, med undantag för `data/.gitkeep`.

Aktuella lokala filer och kataloger är:

```text
data/agenda.json
data/agenda-history.jsonl
data/board.json
data/board-history.jsonl
data/google-calendar.json
data/meetings/
data/meeting-files/
```

`data/agenda.json` innehåller den aktiva dagordningsmallen när någon har ändrat den via webbappen. Om filen saknas används `config/agenda.json`.

`data/board.json` innehåller den aktiva styrelsen. En äldre lokal `config/board.json` kan fortfarande användas som fallback tills styrelsen har sparats från administrationssidan.

`data/meetings/` innehåller ett separat JSON-dokument per sparat styrelsemöte.

`data/meeting-files/` innehåller filer som hör till sparade möten. I Sprint 8 används katalogen för färdiga protokoll. Dokumentmetadata ligger i respektive mötes-JSON, medan själva dokumentfilen ligger separat under `data/meeting-files/<meeting-id>/`.

Historikfilerna `data/agenda-history.jsonl` och `data/board-history.jsonl` är lokala ändringsloggar.

## Hemligheter

Hemligheter ska aldrig checkas in. Det gäller bland annat:

```text
.env
tokens/
secrets/
credentials.json
```

Projektets `.gitignore` är byggd för att skydda dessa filer.

## Prioritetsordning

För dagordningsmallen gäller:

```text
data/agenda.json      # aktiv lokal mall, om den finns
        ↓ fallback
config/agenda.json    # programmets standardmall
```

För styrelsen gäller:

```text
data/board.json       # aktiv styrelse
        ↓ fallback
config/board.json     # äldre lokal installation, om filen finns
```

`config/board.example.json` är bara ett publikt exempel och ska aldrig innehålla riktiga kontaktuppgifter.

## Backup

Eftersom lokal föreningsdata under `data/` inte finns i Git måste installationens `data/` tas med i vanlig lokal backup. GitHub-repot räcker alltså inte som backup av mötesarkiv, protokoll, styrelseuppgifter eller aktiva inställningar.

För ett komplett mötesarkiv måste både `data/meetings/` och `data/meeting-files/` finnas med i backupen.

OAuth-token ligger separat under `tokens/` och ska hanteras som en hemlighet i backup och återställning.
