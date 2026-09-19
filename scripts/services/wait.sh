#!/usr/bin/env bash
# Wait for measured readiness; initialise the schema once MariaDB answers.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=/dev/null
. scripts/services/_common.sh

list=("$@")
[[ $# -eq 0 ]] && list=("${SERVICES[@]}")
for service in "${list[@]}"; do
  ready=0
  for _ in $(seq 1 120); do
    if port_in_use "$(service_port "$service")"; then ready=1; break; fi
    service_alive "$service" || break
    sleep 0.5
  done
  [[ "$ready" -eq 1 ]] || { echo "$service: no llegó a estar listo" >&2; exit 1; }

  if [[ "$service" == mariadb ]]; then
    database_exists="$(mariadb --protocol=tcp --host=127.0.0.1 --port="$DB_PORT" \
      --user=root --batch --skip-column-names \
      --execute="SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='reserva_eventos_bbdd'" \
      2>/dev/null || true)"
    if [[ "$database_exists" != reserva_eventos_bbdd ]]; then
      mariadb --protocol=tcp --host=127.0.0.1 --port="$DB_PORT" --user=root \
        < reto-eventos-backend/script_bbdd.sql
    fi
  fi
  echo "$service: listo en el puerto $(service_port "$service")"
done
