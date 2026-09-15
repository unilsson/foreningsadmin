# Backup och återställning

Sprint 11 lägger till en inbyggd backupfunktion för Föreningsadmins lokala föreningsdata.

## Vad backupen innehåller

Backupen tar med alla filer under:

```text
data/
```

Det innebär bland annat:

- aktiv dagordningsmall och historik
- styrelsedata och historik
- valt Google Calendar-ID
- sparade möten
- protokoll och andra mötesdokument
- åtgärdslista
- kalendarium/evenemang

Om den äldre lokala fallback-filen `config/board.json` fortfarande används tas även den med.

Backupfilen innehåller binära dokument som base64 och varje fil får en SHA-256-kontrollsumma. Vid återställning kontrolleras filsökväg, storlek och kontrollsumma innan något skrivs.

## Vad som inte ingår

Följande hemligheter ingår medvetet inte:

```text
.env
tokens/
secrets/
```

Det betyder att en ny installation behöver sin egen `.env` och att Google Calendar normalt behöver anslutas igen efter flytt. Själva valda kalender-ID:t ligger däremot under `data/` och följer med backupen.

## Skapa backup

Öppna:

```text
Administration → Backup
```

och välj **Hämta backupfil**.

Filen får ett namn i stil med:

```text
foreningsadmin-backup-2026-09-15T07-45-00Z.json
```

Backupfilen bör behandlas som föreningsdata eftersom den kan innehålla protokoll, kontaktuppgifter och andra interna dokument.

## Återställ backup

På samma sida väljs en tidigare backupfil. Webbappen visar datum, antal filer och datamängd innan återställningen kan startas.

Återställningen ersätter den lokala `data/`-katalogen med innehållet i backupen. Om backupen innehåller `config/board.json` återställs även den.

Innan den befintliga installationen ersätts flyttas nuvarande lokala data automatiskt till:

```text
backups/pre-restore-<timestamp>/
```

`backups/` är ignorerad av Git och ska inte checkas in.

## Flytta Föreningsadmin till en ny dator/server

Ett normalt flyttflöde är:

1. Installera samma eller en kompatibel version av Föreningsadmin från GitHub.
2. Kör `npm install` och skapa lokal `.env`.
3. Starta appen.
4. Öppna **Administration → Backup**.
5. Återställ den tidigare backupfilen.
6. Kontrollera mötesarkiv, dokument, åtgärdslista och kalendarium.
7. Anslut Google Calendar igen om integrationen används.

Ingen manuell kopiering av enskilda filer under `data/` behövs.

## Backupformat

Backupformatet är versionsstyrt och har inledningsvis version 1:

```json
{
  "format": "foreningsadmin-backup",
  "version": 1,
  "application": "Föreningsadmin",
  "createdAt": "2026-09-15T05:45:00.000Z",
  "scope": "local-data",
  "fileCount": 12,
  "totalBytes": 123456,
  "files": []
}
```

Varje post i `files` har relativ sökväg, kodning, storlek, SHA-256 och själva innehållet.
