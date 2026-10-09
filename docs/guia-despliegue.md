# Guía de Despliegue — Reto Reserva de Eventos

## Arquitectura

```
Internet → Apache2 (80/443)
              ├── / → Angular (archivos estáticos en /var/www/html)
              └── /api/ → Spring Boot (localhost:8081)
                               └── MySQL (localhost:3306)
```

## Requisitos del servidor

- Ubuntu 24.04 LTS
- Java 21 (openjdk-21-jre-headless)
- MySQL Server 8.x
- Apache2 con módulos: proxy, proxy_http, ssl, headers, rewrite

## Fase 1 — Preparación del servidor

```bash
apt update && apt upgrade -y
apt install -y openjdk-21-jre-headless mysql-server apache2
systemctl enable mysql apache2
```

## Fase 2 — Configuración MySQL

```bash
# Crear usuario y base de datos
mysql -u root -p << 'SQL'
CREATE DATABASE reserva_eventos_bbdd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'retoeventos'@'localhost' IDENTIFIED BY 'PASSWORD_AQUI';
GRANT ALL PRIVILEGES ON reserva_eventos_bbdd.* TO 'retoeventos'@'localhost';
FLUSH PRIVILEGES;
SQL

# Importar esquema
mysql -u retoeventos -p reserva_eventos_bbdd < /opt/reto-eventos/reto-eventos-backend/script_bbdd.sql
```

`script_bbdd.sql` **borra y recrea** las tablas, así que solo sirve para una base nueva. Sobre una
base que ya tiene datos, aplica en su lugar las migraciones de
`reto-eventos-backend/migraciones/` que falten. Son idempotentes: repetir una no rompe nada.

```bash
mysql -u retoeventos -p reserva_eventos_bbdd < /opt/reto-eventos/reto-eventos-backend/migraciones/2026-09-26-contacto.sql
```

## Fase 3 — Backend como servicio systemd

Crear `/etc/systemd/system/reto-eventos-backend.service`:

```ini
[Unit]
Description=Reto Eventos Backend
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/reto-eventos
ExecStart=/usr/bin/java -jar /opt/reto-eventos/app.jar --spring.profiles.active=prod
EnvironmentFile=/etc/reto-eventos/backend.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Las credenciales van en `/etc/reto-eventos/backend.env`, legible solo por root (systemd lo lee
antes de pasar a `www-data`), y no en la unidad, que cualquiera puede leer con `systemctl cat`:

```bash
install -d -m 755 /etc/reto-eventos
install -m 600 /dev/null /etc/reto-eventos/backend.env
nano /etc/reto-eventos/backend.env
```

```ini
DB_USER=retoeventos
DB_PASS=PASSWORD_AQUI

# Aviso por correo de las solicitudes de los formularios (opcional; sin esto, solo panel de admin).
# Con Gmail: verificación en dos pasos activada y una "contraseña de aplicación", nunca la normal.
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_USERNAME=cuenta-que-envia@gmail.com
SPRING_MAIL_PASSWORD=CONTRASENA_DE_APLICACION
AVISOS_CORREO_DESTINO=quien-recibe-los-avisos@example.com
AVISOS_CORREO_PANEL=https://217.154.182.6/admin
```

Al arrancar, el log dice si el aviso quedó `activo` o por qué está apagado.

```bash
systemctl daemon-reload
systemctl enable reto-eventos-backend
systemctl start reto-eventos-backend
```

## Fase 4 — Frontend en Apache2

```bash
# El script hace el build y copia los archivos
bash /opt/reto-eventos/scripts/deploy-frontend.sh
```

VirtualHost en `/etc/apache2/sites-available/reto-eventos.conf`:

```apache
<VirtualHost *:80>
    ServerName 217.154.182.6

    DocumentRoot /var/www/html
    <Directory /var/www/html>
        Options -Indexes
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:8081/api
    ProxyPassReverse /api http://localhost:8081/api

    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</VirtualHost>
```

## Fase 5 — HTTPS con Certbot

```bash
apt install -y certbot python3-certbot-apache
certbot --apache
```

## Fase 6 — Firewall UFW

```bash
ufw allow OpenSSH
ufw allow 'Apache Full'
ufw enable
ufw status
```

## Fase 7 — Backup automático con cron

```bash
# Añadir a crontab (crontab -e)
0 2 * * * DB_USER=retoeventos DB_PASS=PASSWORD /opt/reto-eventos/scripts/backup-db.sh
```

## Rollback de versión

```bash
# Restaurar JAR anterior
systemctl stop reto-eventos-backend
cp /opt/reto-eventos/app.jar.bak /opt/reto-eventos/app.jar
systemctl start reto-eventos-backend

# Restaurar base de datos
bash /opt/reto-eventos/scripts/restore-db.sh /opt/reto-eventos/backups/ARCHIVO.sql.gz
```

## Comandos de monitorización

```bash
systemctl status apache2 mysql reto-eventos-backend
journalctl -u reto-eventos-backend -f
tail -f /var/log/apache2/access.log
tail -f /var/log/reto-eventos/backend.log
```
