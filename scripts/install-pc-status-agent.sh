#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_USER="${SUDO_USER:-}"
if [ -z "${DEFAULT_USER}" ] || [ "${DEFAULT_USER}" = "root" ]; then
  DEFAULT_USER="$(find /home -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | head -n1 || true)"
fi

echo "=== PC Status Linux + Discord setup ==="
read -r -p "Linux desktop user [${DEFAULT_USER}]: " DESKTOP_USER
DESKTOP_USER="${DESKTOP_USER:-$DEFAULT_USER}"

read -r -p "Discord Webhook URL: " DISCORD_WEBHOOK_URL
if [ -z "${DISCORD_WEBHOOK_URL}" ]; then
  echo "Discord Webhook URL is required."
  exit 1
fi

read -r -p "Status interval seconds [300]: " STATUS_INTERVAL
STATUS_INTERVAL="${STATUS_INTERVAL:-300}"

read -r -p "Screenshot interval seconds [1800, 0=off]: " SCREENSHOT_INTERVAL
SCREENSHOT_INTERVAL="${SCREENSHOT_INTERVAL:-1800}"

echo "[1/5] Installing dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y --no-install-recommends python3 python3-requests openssl scrot x11-xserver-utils

echo "[2/5] Installing agent..."
$SUDO install -d -m 0755 /opt/pc-status
$SUDO install -m 0755 "$ROOT_DIR/linux-agent/pc_status_agent.py" /opt/pc-status/pc_status_agent.py
$SUDO install -d -m 0750 /etc/pc-status

TOKEN="$($SUDO openssl rand -hex 32)"
HOME_DIR="$(getent passwd "$DESKTOP_USER" | cut -d: -f6)"

$SUDO tee /etc/pc-status/agent.env >/dev/null <<EOF
AGENT_PORT=8090
AGENT_BEARER_TOKEN=$TOKEN
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
DESKTOP_USER=$DESKTOP_USER
DISPLAY=:0
XAUTHORITY=$HOME_DIR/.Xauthority
STATUS_INTERVAL_SECONDS=$STATUS_INTERVAL
SCREENSHOT_INTERVAL_SECONDS=$SCREENSHOT_INTERVAL
STARTUP_SCREENSHOT=true
TEMP_ALERT_C=80
DISK_ALERT_PERCENT=90
EOF
$SUDO chmod 0600 /etc/pc-status/agent.env

echo "[3/5] Installing systemd service..."
$SUDO install -m 0644 "$ROOT_DIR/linux-agent/pc-status-agent.service" /etc/systemd/system/pc-status-agent.service
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now pc-status-agent.service

echo "[4/5] Waiting for agent..."
sleep 2
curl -fsS http://127.0.0.1:8090/v1/status || true
echo

echo "[5/5] Done."
echo "Agent token for ESP8266:"
echo "$TOKEN"
echo
echo "Config: /etc/pc-status/agent.env"
echo "Logs: journalctl -u pc-status-agent -f"
