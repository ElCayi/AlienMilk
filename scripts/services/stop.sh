#!/usr/bin/env bash
# Stop services and verify that each process and port actually went away.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=/dev/null
. scripts/services/_common.sh

list=("$@")
[[ $# -eq 0 ]] && list=("${SERVICES[@]}")
rc=0
for service in "${list[@]}"; do
  [[ -s "$RUN/$service.pid" ]] || continue
  pid="$(<"$RUN/$service.pid")"
  kill -TERM "$pid" 2>/dev/null || true
  stopped=0
  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null && ! port_in_use "$(service_port "$service")"; then
      stopped=1
      break
    fi
    sleep 0.25
  done
  if [[ "$stopped" -eq 1 ]]; then
    rm -f "$RUN/$service.pid"
    echo "$service: parado (verificado)"
  else
    echo "$service: SIGUE activo o mantiene el puerto $(service_port "$service")" >&2
    rc=1
  fi
done
exit "$rc"
