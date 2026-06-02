#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
MODELS_DIR="${OLLAMA_MODELS_DIR:-/opt/eden-erp/.ollama/models}"
HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
PULL_MODEL="${PULL_MODEL:-true}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required before installing Ollama." >&2
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  echo "sudo is required when the script is not run as root." >&2
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

echo "Installing Ollama with the official Linux installer..."
curl -fsSL https://ollama.com/install.sh | sh

echo "Configuring Eden ERP Ollama model directory..."
$SUDO mkdir -p "$MODELS_DIR"
$SUDO chown -R ollama:ollama "$(dirname "$MODELS_DIR")" 2>/dev/null || true

if command -v systemctl >/dev/null 2>&1; then
  $SUDO mkdir -p /etc/systemd/system/ollama.service.d
  cat <<EOF | $SUDO tee /etc/systemd/system/ollama.service.d/eden-erp.conf >/dev/null
[Service]
Environment="OLLAMA_HOST=$HOST"
Environment="OLLAMA_MODELS=$MODELS_DIR"
EOF
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ollama
  $SUDO systemctl restart ollama
fi

echo "Waiting for Ollama on http://$HOST ..."
for _ in $(seq 1 60); do
  if curl -fsS "http://$HOST/api/tags" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://$HOST/api/tags" >/dev/null 2>&1; then
  echo "Ollama did not become ready on http://$HOST" >&2
  exit 1
fi

if [ "$PULL_MODEL" = "true" ]; then
  echo "Pulling Ollama model: $MODEL"
  ollama pull "$MODEL"
fi

echo "Ollama is ready for Eden ERP."
