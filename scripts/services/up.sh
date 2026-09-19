#!/usr/bin/env bash
# Start services. No arguments starts everything; WT_SUPPRESS is only the
# topology override supplied by wt.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=/dev/null
. scripts/services/_common.sh
mkdir -p "$RUN" "$LOG_DIR" .dev-state

run_service() {
  local service="$1"
  case "$service" in
    mariadb)
      exec mariadbd --datadir="$DB_DIR" --socket="$DB_SOCKET" \
        --pid-file="$ROOT_DIR/.dev-state/mariadb.pid" \
        --bind-address=127.0.0.1 --port="$DB_PORT" --skip-networking=0
      ;;
    backend)
      cd reto-eventos-backend
      export SERVER_PORT="$BACKEND_PORT"
      export SPRING_DATASOURCE_URL="${DB_URL:-jdbc:mysql://127.0.0.1:${DB_PORT}/reserva_eventos_bbdd?serverTimezone=UTC}"
      export SPRING_DATASOURCE_USERNAME="${DB_USER:-root}"
      export SPRING_DATASOURCE_PASSWORD="${DB_PASS:-}"
      export SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.MySQLDialect
      export SPRING_JPA_HIBERNATE_DDL_AUTO=none
      exec ./mvnw spring-boot:run
      ;;
    frontend)
      cd reto-eventos-frontend
      exec ./node_modules/.bin/ng serve --host 127.0.0.1 --port "$FRONTEND_PORT"
      ;;
    *) echo "Servicio desconocido: $service" >&2; exit 2 ;;
  esac
}

if [[ "${1:-}" == --run ]]; then
  run_service "$2"
fi

while read -r service; do
  service_alive "$service" && continue

  if port_in_use "$(service_port "$service")"; then
    echo "$service: puerto $(service_port "$service") ocupado; no se ha arrancado" >&2
    exit 1
  fi

  if [[ "$service" == mariadb && ! -d "$DB_DIR/mysql" ]]; then
    mariadb-install-db --datadir="$DB_DIR" \
      --auth-root-authentication-method=normal --skip-test-db \
      >"$LOG_DIR/mariadb-init.log" 2>&1
  elif [[ "$service" == frontend ]]; then
    modules=reto-eventos-frontend/node_modules
    if [[ ! -d "$modules" || reto-eventos-frontend/pnpm-lock.yaml -nt "$modules/.modules.yaml" ]]; then
      (cd reto-eventos-frontend && pnpm install --frozen-lockfile)
    fi
  fi

  "$0" --run "$service" >"$LOG_DIR/$service.log" 2>&1 &
  echo $! >"$RUN/$service.pid"
done < <(targets "$@")
