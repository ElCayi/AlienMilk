#!/usr/bin/env bash
set -Eeuo pipefail

if ! command -v wt >/dev/null 2>&1; then
  echo "run-alienmilk-dev.sh requiere wt; para un clon normal usa bash scripts/dev.sh" >&2
  exit 127
fi

echo "La gestión multi-worktree ahora pertenece a wt; arrancando este worktree."
exec wt svc up
