# Konfiguration

Föreningsadmin skiljer på programstandard, lokal föreningskonfiguration och hemligheter.

## Programstandard

Filer under `config/` som är säkra att publicera följer med repot och fungerar som standardvärden eller exempel.

Exempel:

```text
config/defaults.json
config/agenda.json
config/board.example.json
```

De här filerna versionshanteras i Git.

## Lokal föreningskonfiguration

Inställningar som ska kunna ändras från appen eller som bara gäller en viss installation sparas lokalt under:

```text
data/
```

Hela `data/*` ignoreras av Git, med undantag för `data/.gitkeep`.

Sprint 4 använder:

```text
data/agenda.json

data/agenda-history.jsonl
```

`data/agenda.json` innehåller den aktiva dagordningsmallen när någon har ändrat den via webbappen. Om filen saknas används `config/agenda.json`.

`data/agenda-history.jsonl` innehåller den lokala ändringshistoriken för dagordningsmallen.

## Styrelseuppgifter

Riktiga styrelseuppgifter ligger fortfarande i:

```text
config/board.json
```

Den filen ignoreras av Git. En publik exempelversion finns i `config/board.example.json`.

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

Samma princip kan återanvändas i kommande sprintar för andra inställningar som ska kunna administreras från webbappen.

## Backup

Eftersom lokal konfiguration under `data/` inte finns i Git bör installationens data tas med i vanlig lokal backup. GitHub-repot räcker alltså inte som backup av den aktiva föreningskonfigurationen.
