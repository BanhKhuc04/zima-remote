#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Run with sudo: sudo ./scripts/install-pc-status-linux.sh"
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_USER="${SUDO_USER:-}"

if [ -z "${DEFAULT_USER}" ] || [ "${DEFAULT_USER}" = "root" ]; then
  DEFAULT_USER="$(find /home -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | head -n 1 || true)"
fi

read -r -p "Linux desktop user [${DEFAULT_USER}]: " PC_USER
PC_USER="${PC_USER:-$DEFAULT_USER}"

if ! id "${PC_USER}" >/dev/null 2>&1; then
  echo "User not found: ${PC_USER}"
  exit 1
fi

read -r -p "Discord Webhook URL: " WEBHOOK_URL
if [ -z "${WEBHOOK_URL}" ]; then
  echo "Webhook URL is required."
  exit 1
fi

read -r -p "Status interval seconds [300]: " STATUS_INTERVAL
STATUS_INTERVAL="${STATUS_INTERVAL:-300}"

read -r -p "Screenshot interval seconds [1800]: " SCREENSHOT_INTERVAL
SCREENSHOT_INTERVAL="${SCREENSHOT_INTERVAL:-1800}"

read -r -p "Enable screenshots? [Y/n]: " SCREENSHOT_ANSWER
case "${SCREENSHOT_ANSWER:-Y}" in
  n|N|no|NO) SCREENSHOT_ENABLED=false ;;
  *) SCREENSHOT_ENABLED=true ;;
esac

echo "[1/5] Installing dependencies..."
apt-get update
apt-get install -y python3 python3-requests scrot

echo "[2/5] Installing PC Status agent..."
install -d -m 0755 /opt/pc-status
install -m 0755 "${APP_DIR}/linux-pc-status/pc_status_agent.py" /opt/pc-status/pc_status_agent.py
install -d -m 0755 /etc/pc-status

HOME_DIR="$(getent passwd "${PC_USER}" | cut -d: -f6)"
cat >/etc/pc-status/pc-status.env <<EOF
PC_STATUS_DISCORD_WEBHOOK_URL="${WEBHOOK_URL}"
PC_STATUS_NAME="$(hostname)"
PC_STATUS_INTERVAL_SECONDS=${STATUS_INTERVAL}
PC_STATUS_NOTIFY_STATUS=true
PC_STATUS_SCREENSHOT_ENABLED=${SCREENSHOT_ENABLED}
PC_STATUS_SCREENSHOT_INTERVAL_SECONDS=${SCREENSHOT_INTERVAL}
PC_STATUS_DISPLAY=":0"
PC_STATUS_XAUTHORITY="${HOME_DIR}/.Xauthority"
PC_STATUS_NOTIFY_STARTUP=true
PC_STATUS_NOTIFY_SHUTDOWN=true
EOF
chmod 0600 /etc/pc-status/pc-status.env

echo "[3/5] Installing systemd service..."
cat >/etc/systemd/system/pc-status-agent.service <<EOF
[Unit]
Description=PC Status by vanhkhuc.dev Linux Agent
After=network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=${PC_USER}
EnvironmentFile=/etc/pc-status/pc-status.env
ExecStart=/usr/bin/python3 /opt/pc-status/pc_status_agent.py
Restart=always
RestartSec=5
TimeoutStopSec=12

[Install]
WantedBy=graphical.target
EOF

echo "[4/5] Enabling service..."
systemctl daemon-reload
systemctl enable --now pc-status-agent.service

echo "[5/5] Status..."
systemctl --no-pager --full status pc-status-agent.service || true

echo
echo "Done."
echo "Config: /etc/pc-status/pc-status.env"
echo "Logs:   journalctl -u pc-status-agent -f"
echo "Restart after config changes: sudo systemctl restart pc-status-agent"
