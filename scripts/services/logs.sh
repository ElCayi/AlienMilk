#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
service="${1:?uso: logs.sh <mariadb|backend|frontend>}"
exec tail -n 100 -f ".services/logs/$service.log"
