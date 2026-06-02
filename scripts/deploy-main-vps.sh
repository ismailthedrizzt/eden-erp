#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/eden-erp/app}"
ENV_FILE="${ENV_FILE:-/etc/eden-erp/eden-erp.env}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-eden-erp-next}"
RUN_TYPECHECK="${RUN_TYPECHECK:-true}"

cd "$APP_DIR"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
else
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

npm ci
if [ "$RUN_TYPECHECK" = "true" ]; then
  npm run typecheck:fast
fi
npm run env:safety
npm run release:check
npm run build

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME"
fi

echo "Eden ERP deployed from origin/$BRANCH."
