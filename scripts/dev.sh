#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/reto-eventos-frontend"

# Per-worktree port assignment, generated when the worktree is created.
# See worktree.toml for the contract. Absent on a plain clone, and that is fine:
# the defaults below reproduce the original single-copy behaviour, so no tooling
# outside this repo is needed to run it.
if [[ -f "$ROOT_DIR/.env.worktree" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT_DIR/.env.worktree"
  set +a
fi

FRONTEND_PORT="${FRONTEND_PORT:-4300}"
# Shared backend unless this worktree was told otherwise. Exported because
# proxy.conf.mjs reads it from the environment.
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8081}"
export BACKEND_URL

frontend_pid=""

port_in_use() {
  # /dev/tcp is a bash builtin, so this needs neither ss nor lsof and works the
  # same on a machine without our toolchain.
  timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/$1" 2>/dev/null
}

cleanup() {
  trap - TERM INT EXIT

  # Nothing of ours is running: we aborted before starting (the port was already
  # taken by someone else). That port is not ours to wait on, and blocking here
  # would hang the abort path for five seconds and then warn about a process we
  # never owned.
  [[ -z "$frontend_pid" ]] && return

  kill "$frontend_pid" 2>/dev/null || true
  wait 2>/dev/null || true

  # Verify, do not assume. The Angular CLI re-execs itself, so the pid we spawned
  # is not always the process holding the port; a port left bound would make the
  # next run fail with a confusing error somewhere else.
  for _ in $(seq 1 10); do
    if ! port_in_use "$FRONTEND_PORT"; then
      echo "[dev] Puerto $FRONTEND_PORT liberado."
      return
    fi
    sleep 0.5
  done
  echo "[dev] AVISO: el puerto $FRONTEND_PORT sigue ocupado tras 5 s." >&2
  echo "[dev]        Compruébalo con: ss -ltnp sport = :$FRONTEND_PORT" >&2
}

trap cleanup TERM INT EXIT

ensure_deps() {
  # git worktrees do not share gitignored files, so every worktree needs its own
  # node_modules. --frozen-lockfile is what keeps that reproducible: it refuses to
  # rewrite pnpm-lock.yaml and fails outright if package.json and the lock
  # disagree, so every worktree resolves to an identical tree.
  local modules="$FRONTEND_DIR/node_modules"
  if [[ ! -d "$modules" || "$FRONTEND_DIR/pnpm-lock.yaml" -nt "$modules/.modules.yaml" ]]; then
    echo "[dev] Dependencias ausentes o desfasadas; instalando..."
    (cd "$FRONTEND_DIR" && pnpm install --frozen-lockfile)
  fi
}

ensure_deps

if port_in_use "$FRONTEND_PORT"; then
  echo "[dev] ERROR: el puerto $FRONTEND_PORT ya está ocupado." >&2
  echo "[dev]        ¿Tienes otra copia de este worktree corriendo?" >&2
  exit 1
fi

echo "[dev] Worktree:  ${WORKTREE_SLUG:-(sin .env.worktree — valores por defecto)}"
echo "[dev] Frontend:  http://127.0.0.1:$FRONTEND_PORT"
echo "[dev] Backend:   $BACKEND_URL  (destino del proxy de /api)"
(
  cd "$FRONTEND_DIR"
  ./node_modules/.bin/ng serve --host 127.0.0.1 --port "$FRONTEND_PORT"
) &
frontend_pid=$!

echo "[dev] Angular listo. Ctrl+C detiene el frontend; el backend se gestiona aparte."
wait "$frontend_pid"
