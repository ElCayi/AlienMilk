#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck source=/dev/null
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

case "${1:-}" in
  --help|-h)
    echo "Modo de empleo: dev.sh"
    echo "  Arranca backend y frontend y se queda en primer plano. Ctrl+C —o cerrar"
    echo "  la terminal— para todo lo que haya arrancado, llamando a stop.sh."
    echo "  Si un cierre a lo bruto dejó algo suelto: bash scripts/stop.sh"
    exit 0 ;;
  "") ;;
  *) echo "dev.sh: opción desconocida '$1' (prueba --help)" >&2; exit 2 ;;
esac

frontend_pid=""
backend_pid=""

cleanup() {
  trap - TERM INT EXIT

  # Nothing of ours is running: we aborted before starting, because the port was
  # already taken by someone else. That port is not ours to stop.
  [[ -z "$frontend_pid" && -z "$backend_pid" ]] && return

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

for service in "Frontend:$FRONTEND_PORT" "Backend:$BACKEND_PORT"; do
  label="${service%%:*}"
  port="${service##*:}"
  if port_in_use "$port"; then
    echo "[dev] ERROR: el puerto de $label ($port) ya está ocupado." >&2
    echo "[dev]        Si quedó algo suelto de este worktree:" >&2
    echo "[dev]            bash scripts/stop.sh" >&2
    exit 1
  fi
done

echo "[dev] Worktree:  ${WORKTREE_SLUG:-(sin .env.worktree — valores por defecto)}"
echo "[dev] Frontend:  http://127.0.0.1:$FRONTEND_PORT  (arrancando)"
echo "[dev] Backend:   $BACKEND_URL  (arrancando)"
(
  cd "$BACKEND_DIR"
  export SERVER_PORT="$BACKEND_PORT"
  export SPRING_DATASOURCE_URL="${DB_URL:-jdbc:mysql://127.0.0.1:3306/reserva_eventos_bbdd?serverTimezone=UTC}"
  export SPRING_DATASOURCE_USERNAME="${DB_USER:-root}"
  export SPRING_DATASOURCE_PASSWORD="${DB_PASS:-}"
  export SPRING_JPA_DATABASE_PLATFORM="org.hibernate.dialect.MySQLDialect"
  export SPRING_JPA_HIBERNATE_DDL_AUTO="none"
  ./mvnw spring-boot:run
) &
backend_pid=$!

(
  cd "$FRONTEND_DIR"
  ./node_modules/.bin/ng serve --host 127.0.0.1 --port "$FRONTEND_PORT"
) &
frontend_pid=$!

# Readiness is measured for both services; spawning a process is not the same as
# having a server ready to answer.
watch_readiness() {
  local label="$1" port="$2" url="$3"
  for _ in $(seq 1 120); do
    if port_in_use "$port"; then
      echo "[dev] $label:  respondiendo en $url"
      return 0
    fi
    sleep 0.5
  done
  echo "[dev] AVISO: 60 s después, $label ($port) sigue sin responder." >&2
  echo "[dev]        Mira arriba: probablemente el arranque falló." >&2
  return 1
}

(
  watch_readiness "Backend" "$BACKEND_PORT" "$BACKEND_URL"
  watch_readiness "Frontend" "$FRONTEND_PORT" "http://127.0.0.1:$FRONTEND_PORT"
) &

echo "[dev] Ctrl+C para detener ambos servicios de este worktree."
wait -n "$backend_pid" "$frontend_pid"
