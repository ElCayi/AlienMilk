#!/usr/bin/env bash
# Regenera reto-eventos-backend/src/main/resources/fabrica/datos.sql, el estado de fábrica de la demo
# que restaura el botón «Restaurar» de /admin (FabricaService). Crea una base temporal con
# script_bbdd.sql, vuelca solo sus datos y la borra. Ejecutar cuando cambien los datos de script_bbdd.sql.
#   scripts/fabrica.sh            (MariaDB local, usuario root sin contraseña)
set -euo pipefail

cd "$(dirname "$0")/../reto-eventos-backend"
DB=am_fabrica_tmp
MYSQL=(mariadb -uroot -h127.0.0.1)
DESTINO=src/main/resources/fabrica/datos.sql

"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS $DB"
trap '"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS $DB"' EXIT
sed "s/reserva_eventos_bbdd/$DB/g" script_bbdd.sql | "${MYSQL[@]}"

{
	echo "-- Estado de fábrica de la demo: los datos que deja script_bbdd.sql, sin esquema. Lo carga FabricaService"
	echo "-- al pulsar «Restaurar» en /admin. Si cambian los datos de script_bbdd.sql, regenerar con scripts/fabrica.sh."
	mariadb-dump -uroot -h127.0.0.1 --no-create-info --compact --complete-insert --skip-triggers --skip-tz-utc "$DB" \
		| grep -v '^/\*M!999999'
} > "$DESTINO"
echo "Regenerado $DESTINO"
