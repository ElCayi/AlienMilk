#!/usr/bin/env bash
# Compatibility entrypoint for clones without wt.
set -Eeuo pipefail

case "${1:-}" in
  --help|-h)
    echo "Modo de empleo: stop.sh"
    echo "  Para todos los servicios de ESTE checkout. Idempotente."
    exit 0 ;;
esac

exec "$(dirname "${BASH_SOURCE[0]}")/services/stop.sh"
