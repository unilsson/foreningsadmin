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
data/action-items.json
data/events.json
data/meetings/
data/meeting-files/
```

`data/agenda.json` innehåller den aktiva dagordningsmallen när någon har ändrat den via webbappen. Om filen saknas används `config/agenda.json`.

`data/board.json` innehåller den aktiva styrelsen. En äldre lokal `config/board.json` kan fortfarande användas som fallback tills styrelsen har sparats från administrationssidan.

`data/action-items.json` innehåller föreningens strukturerade åtgärdslista. Markdown och PDF genereras från denna fil och är exportformat, inte primär datakälla.

`data/events.json` innehåller föreningens strukturerade kalendarium/evenemangslista. Markdown och PDF genereras från samma data.

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

Under **Administration → Backup** kan en samlad backup av installationens lokala föreningsdata hämtas. Backupen innehåller hela `data/` och, om den fortfarande används, den äldre lokala `config/board.json`.

Det innebär att mötesarkiv, protokoll och andra mötesdokument, styrelseuppgifter, aktiva mallar, historik, åtgärdslista, kalendarium och valt kalender-ID följer med i samma backupfil.

Vid återställning valideras filens format, sökvägar, storlekar och SHA-256-kontrollsummor. Nuvarande lokala data flyttas först till:

```text
backups/pre-restore-<timestamp>/
```

`backups/` ignoreras av Git.

OAuth-token, `.env` och andra hemligheter ingår inte i appbackupen. De måste hanteras separat. På en ny installation behöver Google Calendar därför normalt anslutas igen.

Se [backup.md](backup.md) för backupformat och flytt till en ny installation.
