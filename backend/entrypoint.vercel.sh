#!/bin/sh
set -eu

php artisan manga:mongodb-setup --no-interaction
php artisan manga:bootstrap-admin --no-interaction

exec frankenphp run --config /etc/caddy/Caddyfile
