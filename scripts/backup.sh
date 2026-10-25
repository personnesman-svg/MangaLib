#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ ! -f .env ]]; then echo "Missing .env" >&2; exit 1; fi
set -a; source .env; set +a
PREFIX="${VOLUME_PREFIX:-manga-platform}"
if [[ "${APP_ENV:-local}" == "production" ]]; then
  DC=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
else
  DC=(docker compose)
fi
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_DIR:-$ROOT/backups}/$STAMP"
mkdir -p "$DEST"
chmod 700 "$DEST"

echo "Backing up MySQL..."
"${DC[@]}" exec -T db sh -c 'exec mysqldump --single-transaction --routines --triggers -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > "$DEST/database.sql"

echo "Backing up manga uploads..."
docker run --rm -v "${PREFIX}_manga_uploads:/data:ro" -v "$DEST:/backup" alpine:3.21 sh -c "tar czf /backup/uploads.tar.gz -C /data ."

test -s "$DEST/database.sql"
test -s "$DEST/uploads.tar.gz"
sha256sum "$DEST/database.sql" "$DEST/uploads.tar.gz" > "$DEST/SHA256SUMS"
echo "Backup created: $DEST"
echo "Copy this directory off the VPS and test restores periodically."
