#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck source=/dev/null
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

case "${1:-}" in
  --help|-h)
    echo "Modo de empleo: dev.sh"
    echo "  Arranca el frontend y se queda en primer plano. Ctrl+C —o cerrar"
    echo "  la terminal— para todo lo que haya arrancado, llamando a stop.sh."
    echo "  Si un cierre a lo bruto dejó algo suelto: bash scripts/stop.sh"
    exit 0 ;;
  "") ;;
  *) echo "dev.sh: opción desconocida '$1' (prueba --help)" >&2; exit 2 ;;
esac

frontend_pid=""

cleanup() {
  trap - TERM INT EXIT

  # Nothing of ours is running: we aborted before starting, because the port was
  # already taken by someone else. That port is not ours to stop.
  [[ -z "$frontend_pid" ]] && return

  # Delegate to stop.sh rather than duplicate the teardown here. One
  # implementation, two ways in — so what Ctrl+C does and what the manual lever
  # does cannot drift apart.
  "$(dirname "${BASH_SOURCE[0]}")/stop.sh" || true
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
  echo "[dev]        Si quedó algo suelto de este worktree:" >&2
  echo "[dev]            bash scripts/stop.sh" >&2
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

echo "[dev] Angular listo. Ctrl+C para todo. El backend compartido se gestiona aparte."
wait "$frontend_pid"
