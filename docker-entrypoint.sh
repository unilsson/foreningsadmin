#!/bin/sh
set -eu

STATE_DIR="${FORENINGSADMIN_STATE_DIR:-/var/lib/foreningsadmin}"

mkdir -p \
  "$STATE_DIR/data" \
  "$STATE_DIR/tokens" \
  "$STATE_DIR/backups" \
  "$STATE_DIR/.tmp" \
  "$STATE_DIR/config"

exec "$@"
