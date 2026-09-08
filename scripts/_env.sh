# Shared by dev.sh and stop.sh: where this worktree's services live.
#
# Sourced, never executed. Sets ROOT_DIR, FRONTEND_DIR, FRONTEND_PORT and
# BACKEND_URL, and defines port_in_use().

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/reto-eventos-frontend"

# Per-worktree port assignment, generated when the worktree is created.
# See worktree.toml for the contract. Absent on a plain clone, and that is fine:
# the defaults below reproduce the original single-copy behaviour, so no tooling
# outside this repo is needed to run it.
if [[ -f "$ROOT_DIR/.env.worktree" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT_DIR/.env.worktree"
  set +a
fi

FRONTEND_PORT="${FRONTEND_PORT:-4300}"
# Shared backend unless this worktree was told otherwise. Exported because
# proxy.conf.mjs reads it from the environment.
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8081}"
export BACKEND_URL

port_in_use() {
  # /dev/tcp is a bash builtin, so this needs neither ss nor lsof and works the
  # same on a machine without our toolchain.
  timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/$1" 2>/dev/null
}

# Who is listening on a TCP port, as a list of PIDs.
#
# `ss` (iproute2) first and not fuser/lsof: iproute2 is on essentially every
# Linux, while psmisc and lsof frequently are not. MEASURED on the machine this
# was written on — neither fuser nor lsof installed, ss present. The other two
# stay as fallbacks for systems that went the other way.
port_pids() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:$port" 2>/dev/null | sort -u
  elif command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' | sort -u
  fi
}

# Free a port, politely and then not.
kill_port() {
  local port="$1" label="$2" sig pids _
  port_in_use "$port" || { echo "[stop] $label ($port): ya estaba libre."; return 0; }

  pids=$(port_pids "$port")
  if [[ -z "$pids" ]]; then
    echo "[stop] $label ($port) ocupado, pero no hay forma de saber por quién." >&2
    echo "[stop]   (hace falta ss, lsof o fuser; ninguno disponible)" >&2
    return 1
  fi

  for sig in TERM KILL; do
    # shellcheck disable=SC2086
    kill "-$sig" $pids 2>/dev/null || true
    # Verify rather than assume: an ignored TERM looks just like one that worked.
    for _ in $(seq 1 6); do
      port_in_use "$port" || { echo "[stop] $label ($port): liberado ($sig)."; return 0; }
      sleep 0.5
    done
    pids=$(port_pids "$port")
    [[ -z "$pids" ]] && break
  done

  echo "[stop] $label ($port): SIGUE ocupado. Mira quién con: ss -ltnp sport = :$port" >&2
  return 1
}
