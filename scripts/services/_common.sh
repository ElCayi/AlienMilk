# Shared service contract for up/stop/status/wait/logs.
# shellcheck source=/dev/null
. scripts/_env.sh

SERVICES=(mariadb backend frontend)
RUN="$ROOT_DIR/.services"
LOG_DIR="$RUN/logs"
DB_DIR="$ROOT_DIR/.dev-state/mariadb"
DB_SOCKET="$ROOT_DIR/.dev-state/mariadb.sock"

service_port() {
  case "$1" in
    mariadb) printf '%s\n' "$DB_PORT" ;;
    backend) printf '%s\n' "$BACKEND_PORT" ;;
    frontend) printf '%s\n' "$FRONTEND_PORT" ;;
  esac
}

service_alive() {
  local pid
  [[ -s "$RUN/$1.pid" ]] || return 1
  pid="$(<"$RUN/$1.pid")"
  kill -0 "$pid" 2>/dev/null
}

# up.sh and wait.sh must compute exactly the same tier. wt calls them with the
# same arguments and WT_SUPPRESS value.
targets() {
  local list=("$@") service
  [[ $# -eq 0 ]] && list=("${SERVICES[@]}")
  for service in "${list[@]}"; do
    case " ${WT_SUPPRESS:-} " in *" $service "*) continue ;; esac
    printf '%s\n' "$service"
  done
}
