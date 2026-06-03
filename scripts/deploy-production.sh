#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/edengrup-app1/htdocs/app1.edengrup.com}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PM2_BIN="${PM2_BIN:-/home/edengrup-app1/.npm-global/bin/pm2}"
LOG_DIR="${DEPLOY_LOG_DIR:-/home/edengrup-app1/logs}"
STATE_DIR="${DEPLOY_STATE_DIR:-/home/edengrup-app1/.deploy-state}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/home/edengrup-app1/tmp/eden-production-deploy.lock}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://127.0.0.1:3000/}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://127.0.0.1:8000/openapi.json}"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$(dirname "$LOCK_FILE")"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  printf '\n==> %s\n' "$*"
}

run() {
  printf '+ '
  printf '%q ' "$@"
  printf '\n'
  "$@"
}

hash_file() {
  local file="$1"

  if [[ -f "$file" ]]; then
    sha256sum "$file" | awk '{print $1}'
  fi
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local code=""

  log "Checking $name at $url"
  for attempt in {1..15}; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true)"
    if [[ "$code" =~ ^[23][0-9][0-9]$ ]]; then
      echo "$name is healthy (HTTP $code)."
      return 0
    fi

    echo "$name is not ready yet (attempt $attempt/15, HTTP ${code:-none})."
    sleep 4
  done

  echo "$name health check failed after 15 attempts."
  return 1
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deploy is already running. Lock: $LOCK_FILE"
  exit 1
fi

log "Starting production deploy"
echo "Log file: $LOG_FILE"

cd "$APP_DIR"
export PATH="$HOME/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export NPM_CONFIG_PRODUCTION=false

if [[ ! -x "$PM2_BIN" ]]; then
  echo "PM2 binary not found or not executable: $PM2_BIN"
  exit 1
fi

if [[ "${DEPLOY_SKIP_GIT_SYNC:-0}" != "1" ]]; then
  log "Syncing live checkout with origin/$DEPLOY_BRANCH"
  run git fetch origin "$DEPLOY_BRANCH"
  run git reset --hard "origin/$DEPLOY_BRANCH"
  run git clean -fd
else
  log "Skipping git sync because DEPLOY_SKIP_GIT_SYNC=1"
fi

DEPLOY_COMMIT="$(git rev-parse --short HEAD)"
export NEXT_PUBLIC_APP_VERSION="${NEXT_PUBLIC_APP_VERSION:-$DEPLOY_COMMIT}"
echo "Deploy commit: $DEPLOY_COMMIT"
echo "Frontend app version: $NEXT_PUBLIC_APP_VERSION"

PACKAGE_LOCK_HASH="$(hash_file package-lock.json)"
PREVIOUS_PACKAGE_LOCK_HASH="$(cat "$STATE_DIR/package-lock.sha256" 2>/dev/null || true)"
if [[ "${DEPLOY_SKIP_NPM_CI:-0}" == "1" ]]; then
  log "Skipping npm ci because DEPLOY_SKIP_NPM_CI=1"
elif [[ ! -d node_modules || "$PACKAGE_LOCK_HASH" != "$PREVIOUS_PACKAGE_LOCK_HASH" ]]; then
  log "Installing frontend dependencies"
  run npm ci
  echo "$PACKAGE_LOCK_HASH" > "$STATE_DIR/package-lock.sha256"
else
  log "Frontend dependencies unchanged; skipping npm ci"
fi

BACKEND_PROJECT_HASH="$(hash_file backend/pyproject.toml)"
PREVIOUS_BACKEND_PROJECT_HASH="$(cat "$STATE_DIR/backend-pyproject.sha256" 2>/dev/null || true)"
if [[ "${DEPLOY_SKIP_PIP_INSTALL:-0}" == "1" ]]; then
  log "Skipping backend dependency install because DEPLOY_SKIP_PIP_INSTALL=1"
elif [[ -x backend/.venv/bin/python && "$BACKEND_PROJECT_HASH" != "$PREVIOUS_BACKEND_PROJECT_HASH" ]]; then
  log "Installing backend dependencies"
  run backend/.venv/bin/python -m pip install -e ./backend
  echo "$BACKEND_PROJECT_HASH" > "$STATE_DIR/backend-pyproject.sha256"
elif [[ ! -x backend/.venv/bin/python ]]; then
  echo "Backend virtualenv is missing: $APP_DIR/backend/.venv"
  exit 1
else
  log "Backend dependencies unchanged; skipping pip install"
fi

if [[ "${DEPLOY_SKIP_BUILD:-0}" != "1" ]]; then
  log "Building frontend"
  run npm run clean
  run npm run build
else
  log "Skipping frontend build because DEPLOY_SKIP_BUILD=1"
fi

if [[ "${DEPLOY_SKIP_RESTART:-0}" != "1" ]]; then
  log "Restarting PM2 processes"
  run "$PM2_BIN" restart eden-fastapi --update-env
  run "$PM2_BIN" restart eden-app --update-env
  sleep 6
  run "$PM2_BIN" list
else
  log "Skipping PM2 restart because DEPLOY_SKIP_RESTART=1"
fi

if [[ "${DEPLOY_SKIP_HEALTH:-0}" != "1" ]]; then
  wait_for_http frontend "$FRONTEND_HEALTH_URL"
  wait_for_http backend "$BACKEND_HEALTH_URL"
else
  log "Skipping health checks because DEPLOY_SKIP_HEALTH=1"
fi

run "$PM2_BIN" save
echo "$DEPLOY_COMMIT" > "$STATE_DIR/last-successful-commit"

log "Production deploy completed successfully"
