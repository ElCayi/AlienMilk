#!/usr/bin/env bash
set -Eeuo pipefail

case "${1:-}" in
  --help|-h)
    echo "Modo de empleo: dev.sh"
    echo "  Arranca MariaDB, backend y frontend con el supervisor del proyecto."
    echo "  Los deja en segundo plano; usa bash scripts/stop.sh para pararlos."
    exit 0 ;;
  "") ;;
  *) echo "dev.sh: opción desconocida '$1' (prueba --help)" >&2; exit 2 ;;
esac

services_dir="$(dirname "${BASH_SOURCE[0]}")/services"
"$services_dir/up.sh"
"$services_dir/wait.sh" backend frontend
