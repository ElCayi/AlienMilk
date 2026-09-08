#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_DIR="$ROOT_DIR"
DB_DIR="$ROOT_DIR/.dev-state/mariadb"
DB_SOCKET="$ROOT_DIR/.dev-state/mariadb.sock"
DB_PID="$ROOT_DIR/.dev-state/mariadb.pid"
DB_LOG="$ROOT_DIR/.dev-state/mariadb.log"
children=()

cleanup() {
  trap - EXIT INT TERM
  for pid in "${children[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

mkdir -p "$ROOT_DIR/.dev-state"

if [[ ! -d "$DB_DIR/mysql" ]]; then
  echo "[AlienMilk] Inicializando la base de datos local..."
  direnv exec "$MAIN_DIR" mariadb-install-db \
    --datadir="$DB_DIR" \
    --auth-root-authentication-method=normal \
    --skip-test-db
fi

echo "[AlienMilk] Arrancando MariaDB en 127.0.0.1:3306..."
direnv exec "$MAIN_DIR" mariadbd \
  --datadir="$DB_DIR" \
  --socket="$DB_SOCKET" \
  --pid-file="$DB_PID" \
  --log-error="$DB_LOG" \
  --bind-address=127.0.0.1 \
  --port=3306 \
  --skip-networking=0 &
children+=("$!")

for _ in $(seq 1 80); do
  if direnv exec "$MAIN_DIR" mariadb-admin \
    --protocol=tcp --host=127.0.0.1 --port=3306 --user=root ping \
    >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
direnv exec "$MAIN_DIR" mariadb-admin \
  --protocol=tcp --host=127.0.0.1 --port=3306 --user=root ping >/dev/null
echo "[AlienMilk] MariaDB responde."

database_exists="$(direnv exec "$MAIN_DIR" mariadb \
  --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --batch --skip-column-names \
  --execute="SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='reserva_eventos_bbdd'" \
  2>/dev/null || true)"
if [[ "$database_exists" != "reserva_eventos_bbdd" ]]; then
  echo "[AlienMilk] Cargando los datos iniciales..."
  direnv exec "$MAIN_DIR" mariadb \
    --protocol=tcp --host=127.0.0.1 --port=3306 --user=root \
    < "$MAIN_DIR/reto-eventos-backend/script_bbdd.sql"
fi

mapfile -t worktrees < <(
  git -C "$MAIN_DIR" worktree list --porcelain |
    sed -n 's/^worktree //p'
)

for worktree_dir in "${worktrees[@]}"; do
  worktree_name="$(git -C "$worktree_dir" branch --show-current)"
  echo "[AlienMilk] Arrancando $worktree_name desde $worktree_dir..."
  (
    cd "$worktree_dir"
    direnv exec . bash scripts/dev.sh
  ) &
  children+=("$!")
done

echo "[AlienMilk] Todos los worktrees solicitados. Ctrl+C detiene las aplicaciones y MariaDB."
wait -n "${children[@]}"
