#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=/dev/null
. scripts/services/_common.sh

for service in "${SERVICES[@]}"; do
  if service_alive "$service"; then
    pid="$(<"$RUN/$service.pid")"
    if port_in_use "$(service_port "$service")"; then
      printf '%s\tup\tpid %s, port %s\n' "$service" "$pid" "$(service_port "$service")"
    else
      printf '%s\tstarting\tpid %s, waiting for port %s\n' "$service" "$pid" "$(service_port "$service")"
    fi
  else
    printf '%s\tdown\tnot running\n' "$service"
  fi
done
