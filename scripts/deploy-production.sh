#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/edengrup-app1/htdocs/app1.edengrup.com}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PM2_BIN="${PM2_BIN:-/home/edengrup-app1/.npm-global/bin/pm2}"
FRONTEND_PROCESS="${FRONTEND_PROCESS:-eden-next-public}"
BACKEND_PROCESS="${BACKEND_PROCESS:-eden-fastapi}"
LOG_DIR="${DEPLOY_LOG_DIR:-/home/edengrup-app1/logs}"
STATE_DIR="${DEPLOY_STATE_DIR:-/home/edengrup-app1/.deploy-state}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/home/edengrup-app1/tmp/eden-production-deploy.lock}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://127.0.0.1:3001/login}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://127.0.0.1:8000/openapi.json}"
DEPLOY_ID="${DEPLOY_ID:-$(date +%Y%m%d-%H%M%S)}"
BUILD_ROOT="${DEPLOY_BUILD_ROOT:-$STATE_DIR/builds}"
BUILD_DIR="$BUILD_ROOT/$DEPLOY_ID"
NEXT_STAGE="$STATE_DIR/next-stage-$DEPLOY_ID"
NEXT_BACKUP_DIR="$STATE_DIR/next-backups"
NEXT_BACKUP="$NEXT_BACKUP_DIR/.next-$DEPLOY_ID"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$BUILD_ROOT" "$NEXT_BACKUP_DIR" "$(dirname "$LOCK_FILE")"
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

cleanup() {
  rm -rf "$BUILD_DIR" "$NEXT_STAGE"
}

resolve_pm2() {
  if [[ -x "$PM2_BIN" ]]; then
    return 0
  fi

  PM2_BIN="$(command -v pm2 || true)"
  if [[ -z "$PM2_BIN" || ! -x "$PM2_BIN" ]]; then
    echo "PM2 binary not found or not executable." >&2
    exit 1
  fi
}

validate_next_build() {
  local next_dir="$1"
  local required_file=""
  local required_files=(
    "BUILD_ID"
    "app-build-manifest.json"
    "build-manifest.json"
    "prerender-manifest.json"
    "routes-manifest.json"
    "required-server-files.json"
  )

  for required_file in "${required_files[@]}"; do
    if [[ ! -s "$next_dir/$required_file" ]]; then
      echo "Next build validation failed: missing $next_dir/$required_file" >&2
      return 1
    fi
  done

  if [[ ! -d "$next_dir/server" || ! -d "$next_dir/static" ]]; then
    echo "Next build validation failed: missing server/static directories in $next_dir" >&2
    return 1
  fi

  run node -e "for (const file of ['app-build-manifest.json','build-manifest.json','prerender-manifest.json','routes-manifest.json','required-server-files.json']) JSON.parse(require('fs').readFileSync(process.argv[1] + '/' + file, 'utf8'))" "$next_dir"
}

prepare_frontend_build_dir() {
  if ! command -v rsync >/dev/null 2>&1; then
    echo "rsync is required for atomic frontend builds." >&2
    exit 1
  fi

  log "Preparing isolated frontend build directory"
  run rm -rf "$BUILD_DIR"
  run mkdir -p "$BUILD_DIR"
  run rsync -a --delete \
    --exclude ".git" \
    --exclude ".next" \
    --exclude "node_modules" \
    --exclude ".deploy-builds" \
    "$APP_DIR"/ "$BUILD_DIR"/
  run ln -s "$APP_DIR/node_modules" "$BUILD_DIR/node_modules"
}

build_frontend_atomic() {
  log "Building frontend in isolated directory"
  prepare_frontend_build_dir
  run npm --prefix "$BUILD_DIR" run clean
  run npm --prefix "$BUILD_DIR" run build
  validate_next_build "$BUILD_DIR/.next"

  log "Staging validated frontend build"
  run rm -rf "$NEXT_STAGE"
  run mkdir -p "$NEXT_STAGE"
  run rsync -a --delete "$BUILD_DIR/.next"/ "$NEXT_STAGE"/
  validate_next_build "$NEXT_STAGE"
}

promote_frontend_build() {
  log "Promoting validated frontend build"
  run "$PM2_BIN" stop "$FRONTEND_PROCESS" || true

  run rm -rf "$NEXT_BACKUP"
  if [[ -d "$APP_DIR/.next" ]]; then
    run mv "$APP_DIR/.next" "$NEXT_BACKUP"
  fi

  run mv "$NEXT_STAGE" "$APP_DIR/.next"

  if ! run "$PM2_BIN" restart "$FRONTEND_PROCESS" --update-env; then
    rollback_frontend_build
    return 1
  fi
}

rollback_frontend_build() {
  log "Rolling back frontend build"
  run "$PM2_BIN" stop "$FRONTEND_PROCESS" || true

  if [[ -d "$NEXT_BACKUP" ]]; then
    if [[ -d "$APP_DIR/.next" ]]; then
      run mv "$APP_DIR/.next" "$STATE_DIR/.next-failed-$DEPLOY_ID"
    fi
    run mv "$NEXT_BACKUP" "$APP_DIR/.next"
    run "$PM2_BIN" restart "$FRONTEND_PROCESS" --update-env || true
  else
    echo "No previous .next backup is available for rollback." >&2
  fi
}

prune_old_next_backups() {
  find "$NEXT_BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -name ".next-*" \
    | sort \
    | head -n -5 \
    | xargs -r rm -rf
}

trap cleanup EXIT

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

resolve_pm2

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
  build_frontend_atomic
else
  log "Skipping frontend build because DEPLOY_SKIP_BUILD=1"
  validate_next_build "$APP_DIR/.next"
fi

if [[ "${DEPLOY_SKIP_RESTART:-0}" != "1" ]]; then
  log "Restarting PM2 processes"
  run "$PM2_BIN" restart "$BACKEND_PROCESS" --update-env
  if [[ "${DEPLOY_SKIP_BUILD:-0}" != "1" ]]; then
    promote_frontend_build
  else
    run "$PM2_BIN" restart "$FRONTEND_PROCESS" --update-env
  fi
  sleep 6
  run "$PM2_BIN" list
else
  log "Skipping PM2 restart because DEPLOY_SKIP_RESTART=1"
fi

if [[ "${DEPLOY_SKIP_HEALTH:-0}" != "1" ]]; then
  if ! wait_for_http frontend "$FRONTEND_HEALTH_URL"; then
    if [[ "${DEPLOY_SKIP_BUILD:-0}" != "1" && "${DEPLOY_SKIP_RESTART:-0}" != "1" ]]; then
      rollback_frontend_build
      wait_for_http frontend "$FRONTEND_HEALTH_URL" || true
    fi
    exit 1
  fi
  wait_for_http backend "$BACKEND_HEALTH_URL"
else
  log "Skipping health checks because DEPLOY_SKIP_HEALTH=1"
fi

run "$PM2_BIN" save
prune_old_next_backups
echo "$DEPLOY_COMMIT" > "$STATE_DIR/last-successful-commit"

log "Production deploy completed successfully"
