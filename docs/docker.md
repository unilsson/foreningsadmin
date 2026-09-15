# Docker och produktionsdrift

Föreningsadmin kan köras som en enda Docker-container. Frontend byggs till statiska filer och serveras av samma Express-process som API:t, så produktionen behöver inte två separata containrar.

## Vad ligger i containern?

Docker-imagen innehåller:

- Node.js och backendens runtime-beroenden
- backend-koden
- den färdigbyggda React-frontenden
- programmets publika standardkonfiguration under `config/`
- programmets mallar under `templates/`

Ingen föreningsdata eller hemlighet bakas in i imagen.

## Persistent state

Containern använder en enda persistent katalog:

```text
/var/lib/foreningsadmin/
├── data/        # styrelse, dagordning, möten, protokoll, åtgärder, kalendarium osv.
├── tokens/      # Google OAuth-token
├── backups/     # säkerhetskopior som skapas före restore
├── .tmp/        # temporär staging vid restore
└── config/
    └── board.json   # endast äldre installationer som fortfarande använder filen
```

Docker Compose mappar normalt den till:

```text
./runtime:/var/lib/foreningsadmin
```

`runtime/` ligger alltså på Docker-värden och överlever både containerbyte och ombyggnad av imagen. Katalogen är ignorerad av Git.

Det är avsiktligt en enda mount. Backup/restore använder atomiska filsystemsoperationer mellan `data/`, `.tmp/` och `backups/`, och dessa kataloger måste därför ligga på samma filsystem.

## Hemligheter och .env

Produktionsmiljön läser miljövariabler från:

```text
runtime/.env
```

Filen ligger utanför imagen och versionshanteras aldrig. `docker.env.example` är en säker mall som kan kopieras när installationen skapas.

Exempel:

```dotenv
FRONTEND_URL=https://foreningsadmin.example.se

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://foreningsadmin.example.se/api/google/oauth/callback
GOOGLE_ACCOUNT_EMAIL=...
```

`PORT`, `NODE_ENV` och `FORENINGSADMIN_STATE_DIR` sätts av `compose.yaml`.

Google OAuth-token ligger separat i `runtime/tokens/` och överlever containeruppdateringar. Den vanliga backupfunktionen i webbappen tar däremot av säkerhetsskäl inte med OAuth-token eller `.env`.

## Första installation

Från repo-roten:

```bash
mkdir -p runtime/{data,tokens,backups,config,.tmp}
cp docker.env.example runtime/.env
```

På en vanlig Linux-värd där containern kör som UID/GID 1000:

```bash
sudo chown -R 1000:1000 runtime
chmod 700 runtime
chmod 600 runtime/.env
```

Redigera därefter `runtime/.env` och fyll i rätt produktionsvärden.

Bygg och starta:

```bash
docker compose build
docker compose up -d
```

Standardporten på värden är 8080:

```text
http://<server>:8080
```

En annan port kan väljas utan att ändra filen:

```bash
FORENINGSADMIN_PORT=8085 docker compose up -d
```

## Flytta befintlig lokal installation till Docker

Stoppa först den lokala utvecklingsinstansen så att inga filer ändras under kopieringen.

Skapa runtime-katalogen och kopiera befintlig state:

```bash
mkdir -p runtime/{data,tokens,backups,config,.tmp}
cp -a data/. runtime/data/
```

Om Google Calendar redan är ansluten:

```bash
cp -a tokens/. runtime/tokens/
```

Om installationen fortfarande har den äldre lokala styrelsefilen:

```bash
cp config/board.json runtime/config/board.json
```

Kopiera därefter `.env`:

```bash
cp .env runtime/.env
```

Ändra framför allt `FRONTEND_URL` och `GOOGLE_REDIRECT_URI` till produktionsadressen innan containern startas.

Alternativt kan föreningsdata flyttas med **Administration → Backup**: skapa en backup i den gamla installationen och återställ den i Docker-installationen. Google Calendar behöver då anslutas igen eftersom OAuth-token inte ingår i app-backupen.

## Uppdatera containern

När ny kod finns på `main`:

```bash
git pull
docker compose build --pull
docker compose up -d
```

`runtime/` påverkas inte. Den nya containern använder samma data, dokument, tokens och backupkatalog som den gamla.

Kontrollera status:

```bash
docker compose ps
docker compose logs -f foreningsadmin
```

Healthcheck använder:

```text
GET /api/health
```

## Backup på värdnivå

Webbappens backup är bra för flytt och manuell återställning, men för produktionsdrift bör även hela `runtime/` säkerhetskopieras av värdens vanliga backuplösning.

En värdbackup av hela `runtime/` innehåller även Google-token och gör det möjligt att återställa installationen ännu mer exakt. Skydda därför en sådan backup som en hemlighet.

## Reverse proxy och HTTPS

Föreningsadmin har ännu ingen egen användarinloggning. Exponera därför inte containerporten direkt mot internet.

För en produktionsinstallation rekommenderas att tjänsten ligger bakom en reverse proxy med HTTPS och lämpligt åtkomstskydd, eller endast är tillgänglig över ett privat nät/VPN.

Om Google Calendar används ska `FRONTEND_URL` och `GOOGLE_REDIRECT_URI` motsvara den externa HTTPS-adressen och callback-URL:en måste vara registrerad i Google Cloud.

Exempel:

```text
https://foreningsadmin.example.se
https://foreningsadmin.example.se/api/google/oauth/callback
```

## Dockerfiler

```text
Dockerfile          multi-stage build för frontend + backend
compose.yaml        produktionskörning och persistent state
docker.env.example  mall för runtime/.env
.dockerignore       hindrar data, hemligheter och lokala filer från build context
```

`config/board.json`, `.env`, `data/`, `tokens/`, `backups/` och `runtime/` får aldrig bakas in i eller committas tillsammans med imagen.
