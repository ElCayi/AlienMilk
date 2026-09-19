#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=/dev/null
. scripts/services/_common.sh

endpoint() {
  case "$1" in
    backend) printf 'http://127.0.0.1:%s\n' "$BACKEND_PORT" ;;
    frontend) printf 'http://127.0.0.1:%s/\n' "$FRONTEND_PORT" ;;
    *) printf '%s\n' - ;;
  esac
}

for service in "${SERVICES[@]}"; do
  if service_alive "$service"; then
    pid="$(<"$RUN/$service.pid")"
    if port_in_use "$(service_port "$service")"; then
      printf '%s\tup\tpid %s, port %s\t%s\n' "$service" "$pid" "$(service_port "$service")" "$(endpoint "$service")"
    else
      printf '%s\tstarting\tpid %s, waiting for port %s\t%s\n' "$service" "$pid" "$(service_port "$service")" "$(endpoint "$service")"
    fi
  else
    printf '%s\tdown\tnot running\t%s\n' "$service" "$(endpoint "$service")"
  fi
done
