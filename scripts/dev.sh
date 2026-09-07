#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/reto-eventos-frontend"
FRONTEND_PORT="${FRONTEND_PORT:-4300}"
frontend_pid=""

cleanup() {
  trap - TERM INT EXIT
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
  wait 2>/dev/null || true
}

trap cleanup TERM INT EXIT

echo "[dev] Usando Spring Boot compartido en http://127.0.0.1:8081"
echo "[dev] Arrancando Angular en http://127.0.0.1:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  ./node_modules/.bin/ng serve --host 127.0.0.1 --port "$FRONTEND_PORT"
) &
frontend_pid=$!

echo "[dev] Angular listo. Ctrl+C detiene Angular; Spring Boot lo gestiona BigCodex."
wait "$frontend_pid"
exit $?
