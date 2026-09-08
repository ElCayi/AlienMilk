#!/usr/bin/env bash
# Stop what this worktree started.
#
# TWO WAYS IN, ONE IMPLEMENTATION. dev.sh calls this from its exit trap, so the
# normal Ctrl+C path and the manual lever run exactly the same code and cannot
# drift apart. Nobody has to remember to run it — but it is here when the trap
# never got the chance.
#
# MEASURED: a supervisor killed with SIGTERM (Ctrl+C, closing the terminal) does
# run its trap and does free the port. One killed with SIGKILL — a crash, the OOM
# killer, `kill -9` — does not, and its server survives, reparented to init. That
# orphan is the entire reason this file exists.
#
# It only ever touches THIS worktree's ports. That is the point of assigning them
# per worktree: stopping here cannot take down the copy someone else is looking at.
#
# Safe to run at any time, including when nothing is running.
set -Eeuo pipefail

case "${1:-}" in
  --help|-h)
    echo "Modo de empleo: stop.sh"
    echo "  Para los servicios de ESTE worktree. Idempotente."
    echo "  dev.sh ya lo llama solo al cerrarse; esto es para cuando no pudo"
    echo "  (un cierre a lo bruto que dejó el servidor suelto)."
    exit 0 ;;
esac

# shellcheck source=/dev/null
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

echo "[stop] Worktree: ${WORKTREE_SLUG:-(sin .env.worktree — valores por defecto)}"
rc=0
kill_port "$FRONTEND_PORT" "Frontend" || rc=1

kill_port "$BACKEND_PORT" "Backend" || rc=1
exit $rc
