#!/usr/bin/env sh
set -e

: "${NODE_ENV:=production}"
: "${UPLOAD_PATH:=/usr/src/app/public/uploads}"

mkdir -p "${UPLOAD_PATH}/posts"

chmod -R 775 "${UPLOAD_PATH}" 2>/dev/null || true

echo "=> starting app"

exec node index.js