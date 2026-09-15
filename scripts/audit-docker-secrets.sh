#!/usr/bin/env bash
set -Eeuo pipefail

# Föreningsadmin Docker secret audit
#
# Builds a temporary test image from the current Git commit, injects fake
# canary secrets into paths that must never enter the image, and verifies that
# neither the final filesystem nor any saved image layer contains them.
#
# Usage:
#   bash scripts/audit-docker-secrets.sh
#
# Optional environment variables:
#   AUDIT_IMAGE=foreningsadmin:secret-audit   Image name to build.
#   KEEP_AUDIT_IMAGE=1                        Keep the test image afterwards.
#   SKIP_TRIVY=1                              Skip Trivy even if installed.

IMAGE="${AUDIT_IMAGE:-foreningsadmin:secret-audit}"
KEEP_IMAGE="${KEEP_AUDIT_IMAGE:-0}"
SKIP_TRIVY="${SKIP_TRIVY:-0}"
FAILURES=0
WARNINGS=0

if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  BOLD=''
  RESET=''
fi

pass() {
  printf '%bPASS%b  %s\n' "$GREEN" "$RESET" "$*"
}

fail() {
  printf '%bFAIL%b  %s\n' "$RED" "$RESET" "$*"
  FAILURES=$((FAILURES + 1))
}

warn() {
  printf '%bWARN%b  %s\n' "$YELLOW" "$RESET" "$*"
  WARNINGS=$((WARNINGS + 1))
}

info() {
  printf '%bINFO%b  %s\n' "$BLUE" "$RESET" "$*"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '%bFEL:%b kommandot %s saknas.\n' "$RED" "$RESET" "$1" >&2
    exit 2
  fi
}

need_command docker
need_command git
need_command tar
need_command grep
need_command mktemp

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" || ! -f "$ROOT/Dockerfile" || ! -f "$ROOT/.dockerignore" ]]; then
  printf '%bFEL:%b kör skriptet från Föreningsadmin-repot.\n' "$RED" "$RESET" >&2
  exit 2
fi

TMP="$(mktemp -d -t foreningsadmin-secret-audit.XXXXXX)"
CONTEXT="$TMP/context"
BUILD_LOG="$TMP/docker-build.log"
IMAGE_TAR="$TMP/image.tar"
mkdir -p "$CONTEXT"

cleanup() {
  rm -rf "$TMP"
  if [[ "$KEEP_IMAGE" != "1" ]]; then
    docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# The marker is deliberately generated at runtime. It is fake and unique, so a
# hit proves that one of the injected secret files leaked into the image.
MARKER="FA_SECRET_CANARY_$(date +%s)_$$_${RANDOM}${RANDOM}"

printf '%bFöreningsadmin – Docker secret audit%b\n' "$BOLD" "$RESET"
printf 'Image: %s\n' "$IMAGE"
printf 'Commit: %s\n\n' "$(git -C "$ROOT" rev-parse --short HEAD)"

printf '%b1. Kontrollerar .dockerignore%b\n' "$BOLD" "$RESET"
required_ignore_patterns=(
  '.env'
  '.env.*'
  'runtime/'
  'data/'
  'tokens/'
  'backups/'
  'secrets/'
  'config/board.json'
  'credentials.json'
  '*.token.json'
)

for pattern in "${required_ignore_patterns[@]}"; do
  if grep -Fqx "$pattern" "$ROOT/.dockerignore"; then
    pass ".dockerignore innehåller $pattern"
  else
    fail ".dockerignore saknar $pattern"
  fi
done

printf '\n%b2. Skapar isolerad build context med fejkade hemligheter%b\n' "$BOLD" "$RESET"
# Use only committed project files. Real local .env, data, tokens and other
# untracked secrets are therefore never copied into the audit context.
git -C "$ROOT" archive --format=tar HEAD | tar -xf - -C "$CONTEXT"

mkdir -p \
  "$CONTEXT/tokens" \
  "$CONTEXT/data" \
  "$CONTEXT/runtime/data" \
  "$CONTEXT/backups" \
  "$CONTEXT/secrets" \
  "$CONTEXT/config"

printf 'GOOGLE_CLIENT_SECRET=%s\n' "$MARKER" > "$CONTEXT/.env"
printf 'GOOGLE_CLIENT_SECRET=%s\n' "$MARKER" > "$CONTEXT/.env.production"
printf '{"access_token":"%s"}\n' "$MARKER" > "$CONTEXT/tokens/google.json"
printf '{"secret":"%s"}\n' "$MARKER" > "$CONTEXT/data/secret-test.json"
printf 'GOOGLE_CLIENT_SECRET=%s\n' "$MARKER" > "$CONTEXT/runtime/.env"
printf '{"secret":"%s"}\n' "$MARKER" > "$CONTEXT/runtime/data/secret-test.json"
printf '%s\n' "$MARKER" > "$CONTEXT/backups/secret-test.txt"
printf '%s\n' "$MARKER" > "$CONTEXT/secrets/private.key"
printf '{"members":[],"secret":"%s"}\n' "$MARKER" > "$CONTEXT/config/board.json"
printf '{"secret":"%s"}\n' "$MARKER" > "$CONTEXT/credentials.json"
printf '{"token":"%s"}\n' "$MARKER" > "$CONTEXT/test.token.json"
pass 'Testkontext skapad utan att läsa riktiga lokala hemligheter'

printf '\n%b3. Bygger Docker-imagen utan cache%b\n' "$BOLD" "$RESET"
set +e
docker build --no-cache --progress=plain -t "$IMAGE" "$CONTEXT" 2>&1 | tee "$BUILD_LOG"
build_rc=${PIPESTATUS[0]}
set -e

if [[ "$build_rc" -ne 0 ]]; then
  fail "Docker build misslyckades (exit $build_rc)"
  printf '\n%bSLUTRESULTAT: MISSLYCKAD%b – imagen kunde inte byggas.\n' "$RED" "$RESET"
  exit 1
fi
pass 'Docker image byggdes'

if grep -aFq "$MARKER" "$BUILD_LOG"; then
  fail 'Canary-hemligheten förekommer i Docker-buildloggen'
else
  pass 'Ingen canary-hemlighet i Docker-buildloggen'
fi

printf '\n%b4. Kontrollerar slutcontainerns filsystem%b\n' "$BOLD" "$RESET"
set +e
container_scan="$({
  docker run --rm --entrypoint sh "$IMAGE" -c \
    "grep -R -a -F -l '$MARKER' /app /var/lib/foreningsadmin 2>/dev/null || true"
} 2>&1)"
container_rc=$?
set -e

if [[ "$container_rc" -ne 0 ]]; then
  fail "Kunde inte starta audit-containern (exit $container_rc): $container_scan"
elif [[ -n "$container_scan" ]]; then
  fail 'Canary-hemligheten hittades i slutcontainerns filsystem'
  printf '%s\n' "$container_scan" | sed 's/^/      /'
else
  pass 'Ingen canary-hemlighet i slutcontainerns filsystem'
fi

state_files="$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'find /var/lib/foreningsadmin -type f -print 2>/dev/null || true')"
if [[ -n "$state_files" ]]; then
  fail 'Persistent state innehåller vanliga filer redan i imagen'
  printf '%s\n' "$state_files" | sed 's/^/      /'
else
  pass 'Persistent state-katalogen är tom på filer i imagen'
fi

forbidden_files="$(docker run --rm --entrypoint sh "$IMAGE" -c '
  for f in \
    /app/.env \
    /app/.env.production \
    /app/credentials.json \
    /app/tokens/google.json \
    /app/test.token.json; do
      if [ -f "$f" ]; then printf "%s\n" "$f"; fi
  done
  if [ -f /app/config/board.json ] && [ ! -L /app/config/board.json ]; then
    printf "%s\n" /app/config/board.json
  fi
')"
if [[ -n "$forbidden_files" ]]; then
  fail 'Känsliga filnamn finns som vanliga filer i imagen'
  printf '%s\n' "$forbidden_files" | sed 's/^/      /'
else
  pass 'Inga förbjudna känsliga filer finns som vanliga filer i imagen'
fi

printf '\n%b5. Kontrollerar image-konfiguration och historik%b\n' "$BOLD" "$RESET"
image_env="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$IMAGE")"
embedded_runtime_vars=0
for key in FRONTEND_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI GOOGLE_ACCOUNT_EMAIL; do
  if printf '%s\n' "$image_env" | grep -q "^${key}="; then
    fail "$key är inbakad som ENV i Docker-imagen"
    embedded_runtime_vars=1
  fi
done
if [[ "$embedded_runtime_vars" -eq 0 ]]; then
  pass 'Inga apphemligheter eller installationsspecifika Google-värden är inbakade som ENV'
fi

history="$(docker history --no-trunc "$IMAGE")"
if printf '%s' "$history" | grep -aFq "$MARKER"; then
  fail 'Canary-hemligheten hittades i Docker history'
else
  pass 'Ingen canary-hemlighet i Docker history'
fi

inspect_json="$(docker image inspect "$IMAGE")"
if printf '%s' "$inspect_json" | grep -aFq "$MARKER"; then
  fail 'Canary-hemligheten hittades i image metadata/config'
else
  pass 'Ingen canary-hemlighet i image metadata/config'
fi

printf '\n%b6. Söker igenom ALLA image-lager%b\n' "$BOLD" "$RESET"
docker image save "$IMAGE" -o "$IMAGE_TAR"
if grep -aFq "$MARKER" "$IMAGE_TAR"; then
  fail 'Canary-hemligheten hittades i image-arkivet – minst ett lager innehåller den'
else
  pass 'Ingen canary-hemlighet i något sparat Docker-lager'
fi

printf '\n%b7. Generisk secret scanner%b\n' "$BOLD" "$RESET"
if [[ "$SKIP_TRIVY" == "1" ]]; then
  warn 'Trivy hoppades över via SKIP_TRIVY=1'
elif command -v trivy >/dev/null 2>&1; then
  set +e
  trivy image --scanners secret --exit-code 1 "$IMAGE"
  trivy_rc=$?
  set -e
  if [[ "$trivy_rc" -eq 0 ]]; then
    pass 'Trivy hittade inga secrets'
  else
    fail "Trivy rapporterade möjliga secrets (exit $trivy_rc)"
  fi
else
  warn 'Trivy är inte installerat; den generiska secret-scanningen hoppades över'
  info 'Installera Trivy senare för ett extra oberoende lager av kontroll.'
fi

printf '\n%bRapport%b\n' "$BOLD" "$RESET"
printf 'Fel:      %d\n' "$FAILURES"
printf 'Varningar: %d\n' "$WARNINGS"

if [[ "$KEEP_IMAGE" == "1" ]]; then
  info "Testimagen behålls som $IMAGE"
else
  info 'Testimagen tas bort automatiskt när skriptet avslutas'
fi

if [[ "$FAILURES" -gt 0 ]]; then
  printf '\n%bSLUTRESULTAT: MISSLYCKAD%b – publicera inte imagen innan felen är åtgärdade.\n' "$RED" "$RESET"
  exit 1
fi

printf '\n%bSLUTRESULTAT: GODKÄND%b – inga testhemligheter hittades i Docker-imagen.\n' "$GREEN" "$RESET"
if [[ "$WARNINGS" -gt 0 ]]; then
  printf 'Kontrollen blev godkänd med %d varning(ar).\n' "$WARNINGS"
fi
