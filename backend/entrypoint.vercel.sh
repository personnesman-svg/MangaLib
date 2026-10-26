#!/bin/sh
set -eu

# Stream Laravel application errors to the Vercel Runtime Logs by default.
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

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
