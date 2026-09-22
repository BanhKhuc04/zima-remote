#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"

echo "[1/6] Installing minimal build/runtime dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y --no-install-recommends \
  ca-certificates curl build-essential pkg-config libssl-dev rustc cargo \
  openssl openssh-server lm-sensors

echo "[2/6] Building zima-remote-agent..."
cd "$AGENT_DIR"
cargo build --release

echo "[3/6] Installing binary and configuration..."
$SUDO install -m 0755 target/release/zima-remote-agent /usr/local/bin/zima-remote-agent
$SUDO install -d -m 0750 /etc/zima-remote-agent

if [ ! -f /etc/zima-remote-agent/agent.env ]; then
  TOKEN="$(openssl rand -hex 32)"
  printf 'AGENT_PORT=8090\nAGENT_BEARER_TOKEN=%s\n' "$TOKEN" \
    | $SUDO tee /etc/zima-remote-agent/agent.env >/dev/null
  $SUDO chmod 0600 /etc/zima-remote-agent/agent.env
  echo "Generated a new agent token."
else
  echo "Keeping existing /etc/zima-remote-agent/agent.env"
fi

echo "[4/6] Installing systemd service..."
$SUDO install -m 0644 "$AGENT_DIR/zima-remote-agent.service" \
  /etc/systemd/system/zima-remote-agent.service
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now zima-remote-agent.service

echo "[5/6] Ensuring SSH is enabled..."
$SUDO systemctl enable --now ssh

echo "[6/6] Verification..."
sleep 1
systemctl --no-pager --full status zima-remote-agent.service || true
echo
curl -fsS http://127.0.0.1:8090/v1/status || true
echo
echo
echo "Agent token (copy it into esp8266/config.h as LINUX_AGENT_TOKEN):"
$SUDO sed -n 's/^AGENT_BEARER_TOKEN=//p' /etc/zima-remote-agent/agent.env
echo
echo "Done. Recommended next: install Tailscale on this Linux PC and on your laptop."
