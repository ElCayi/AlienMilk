#!/usr/bin/env bash
# Prueba de reservas simultáneas: crea una sesión de aforo 3 y lanza 8 reservas de 1 plaza a la vez,
# de 8 cuentas de cliente distintas. Con el bloqueo de la sesión al reservar
# (EventoRepository#findByIdBloqueando) entran exactamente 3; sin él, entraban las 8.
# Escribe en la base: úsese en la demo, nunca en producción con datos reales. La sesión de prueba no se
# borra (con reservas, una sesión ya no se borra nunca): se cancela y se archiva al terminar.
#   scripts/prueba-carrera-aforo.sh [URL_API]      (por defecto http://127.0.0.1:8081/api)
# Las cuentas son las de cliente que haya; si faltan, «Añadir reservas demo» en /admin › Reservas las crea.
set -euo pipefail

API=${1:-http://127.0.0.1:8081/api}
AUTH="Authorization: Basic $(printf '%s' "${ADMIN_USER:-admin}:${ADMIN_PASS:-1234}" | base64)"
json() { node -e "const d=JSON.parse(require('fs').readFileSync(0));console.log($1)"; }

mapfile -t CLIENTES < <(curl -sf -H "$AUTH" "$API/admin/usuarios" \
	| json "d.filter(u => u.perfil === 'ROLE_CLIENTE' && u.enabled === 1).map(u => u.username).slice(0, 8).join('\n')")
[ "${#CLIENTES[@]}" -ge 4 ] || { echo "Hacen falta al menos 4 cuentas de cliente activas" >&2; exit 1; }

FECHA=$(date -d '+60 days' +%F)
ID=$(curl -sf -X POST -H "$AUTH" -H 'Content-Type: application/json' "$API/admin/eventos" -d "{
	\"nombre\": \"Prueba de reservas simultáneas\", \"descripcion\": \"\", \"fechaInicio\": \"$FECHA\",
	\"horaInicio\": \"19:00\", \"duracion\": 60, \"direccion\": \"Hangar 7\", \"aforoMaximo\": 3,
	\"minimoAsistencia\": 0, \"precio\": 10, \"idTipo\": 1}" | json 'd.idEvento')
echo "Sesión $ID, aforo 3: ${#CLIENTES[@]} reservas de 1 plaza a la vez"

for usuario in "${CLIENTES[@]}"; do
	curl -s -o /dev/null -w "  $usuario %{http_code}\n" -X POST -H "$AUTH" -H 'Content-Type: application/json' \
		"$API/admin/reservas/usuario/$usuario/evento/$ID" -d '{"cantidad": 1}' &
done
wait

PLAZAS=$(curl -sf -H "$AUTH" "$API/admin/eventos" | json "d.find(e => e.idEvento === $ID).plazasReservadas")
echo "Plazas reservadas: $PLAZAS de 3"
curl -sf -o /dev/null -X PATCH -H "$AUTH" "$API/admin/eventos/$ID/cancelar" \
	&& curl -sf -o /dev/null -X PATCH -H "$AUTH" "$API/admin/eventos/$ID/archivar" \
	&& echo "Sesión de prueba cancelada y archivada"
[ "$PLAZAS" -le 3 ] && echo "Bien: el aforo se respeta" || { echo "MAL: se ha pasado del aforo" >&2; exit 1; }
