#!/bin/sh
set -eu

# Stream Laravel application errors to the Vercel Runtime Logs by default.
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Laravel's database session driver works with the MongoDB connection.
# Normalize the earlier deployment value "mongodb" to the supported driver.
if [ "${SESSION_DRIVER:-database}" = "mongodb" ]; then
    export SESSION_DRIVER="database"
fi
export SESSION_CONNECTION="${SESSION_CONNECTION:-mongodb}"

if [ -z "${APP_KEY:-}" ]; then
    echo "[MangaLib startup] APP_KEY is missing. Set it in Vercel Environment Variables for this deployment." >&2
    exit 1
fi

if [ -z "${MONGODB_URI:-}" ]; then
    echo "[MangaLib startup] MONGODB_URI is missing. Set it in Vercel Environment Variables for this deployment." >&2
    exit 1
fi

php artisan manga:mongodb-setup --no-interaction
php artisan manga:bootstrap-admin --no-interaction

exec frankenphp run --config /etc/caddy/Caddyfile
