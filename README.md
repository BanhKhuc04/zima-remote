# Zima Remote v4

Zima Remote v4 is a lightweight remote status and power-management stack for a home Linux PC.

## Architecture

- **ESP8266 + relay**: always-on physical power controller and Discord Gateway client.
- **Discord**: native slash-command control/status channel.
- **Linux Agent**: telemetry and graceful system actions.
- **Windows Tauri app**: status-only desktop client.
- **Tailscale**: recommended private remote path from laptop to Linux.

The desktop app no longer performs Wake-on-LAN, shutdown, or reboot. All power operations are intentionally isolated to the ESP8266/Discord controller.

## Discord commands

The ESP8266 registers a native `/server` guild command and stays connected to the Discord Gateway over WebSocket:

- `/server status`
- `/server on`
- `/server off`
- `/server restart`
- `/server forceoff`

This avoids REST message polling and keeps `/server on` available even while the Linux PC is powered off.

## Linux Agent

Endpoints:

- `GET /v1/health`
- `GET /v1/status`
- `GET /v1/server/status` (compatibility alias)
- `POST /v1/system/poweroff` (Bearer token)
- `POST /v1/system/reboot` (Bearer token)

Telemetry includes hostname, uptime, CPU temperature when available, load, RAM, disk usage, and IP addresses.

## ESP8266

Firmware:

`esp8266/zima_remote_esp8266.ino`

Arduino dependencies:

- ArduinoJson 7.x
- WebSockets by Markus Sattler / Links2004

Create your local secret config:

`esp8266/config.example.h -> esp8266/config.h`

`config.h` is ignored by Git.

## Linux install

On Debian:

```bash
git clone https://github.com/BanhKhuc04/zima-remote.git
cd zima-remote
git checkout feature/esp8266-discord-controller
chmod +x scripts/install-linux-agent.sh
./scripts/install-linux-agent.sh
```

## Full setup

See:

**SETUP_V4_ESP8266_LINUX_DISCORD.md**

It covers relay wiring, Discord bot setup, ESP8266 flashing, Debian minimal installation, Tailscale, Linux Agent installation, desktop configuration, commands, and troubleshooting.

## Safety

Use the relay as a **dry-contact replacement for the motherboard POWER SW button**.

Do **not** use this project to switch mains voltage directly.
