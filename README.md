# PC Status v5 - Discord + ESP8266 + Linux

PC Status v5 bo desktop app khoi luong dieu khien chinh. Discord tro thanh trung tam quan ly mot Linux PC.

## Architecture

```text
Discord #pc-status
       |
       | /server ...
       v
ESP8266 (always on)
       |---------------- Relay COM/NO -> motherboard POWER SW
       |
       +---- HTTP LAN + Bearer token ----> Linux Agent
                                            |
                                            +-- status / telemetry
                                            +-- graceful shutdown / reboot
                                            +-- screenshot XFCE
                                            +-- display on/off
                                            +-- Discord webhook reports
```

ESP8266 van hoat dong khi PC Linux tat, nen `/server on` van bat duoc may.

## Discord commands

- `/server status` - ESP + Linux status
- `/server on` - pulse POWER SW
- `/server off` - graceful Linux shutdown
- `/server restart` - graceful reboot
- `/server forceoff` - hold POWER SW, chi dung khi treo
- `/server screenshot` - chup desktop Linux va gui vao Discord
- `/server report` - gui CPU/RAM/disk/load/uptime/IP vao Discord
- `/server display-on` - bat man hinh
- `/server display-off` - tat man hinh

Chi `DISCORD_ALLOWED_USER_ID` duoc phep ra lenh va lenh chi duoc chap nhan trong `DISCORD_CHANNEL_ID`.

## Automatic Discord notifications

Linux Agent:

- bao khi agent/Linux boot;
- chup anh sau boot;
- gui status dinh ky;
- chup man hinh dinh ky;
- canh bao CPU qua nong;
- canh bao disk sap day;
- bao khi reboot/shutdown duoc yeu cau.

ESP8266:

- bao Linux ONLINE/OFFLINE;
- bao boot timeout;
- van dieu khien relay khi Linux dang tat.

## Linux setup

```bash
cd ~/zima-remote
git fetch
git switch feature/discord-linux-hub
git pull
chmod +x scripts/install-pc-status-agent.sh
./scripts/install-pc-status-agent.sh
```

Installer hoi Discord Webhook URL, user XFCE, chu ky status va chu ky screenshot.

Kiem tra:

```bash
systemctl status pc-status-agent
journalctl -u pc-status-agent -f
curl http://127.0.0.1:8090/v1/status
```

Cuoi installer se in `AGENT_BEARER_TOKEN`. Copy token nay vao ESP8266 `config.h`.

## ESP8266 setup

Firmware:

`esp8266/zima_remote_esp8266.ino`

Copy:

`esp8266/config.example.h -> esp8266/config.h`

Arduino IDE libraries:

- ArduinoJson 7.x
- WebSockets by Markus Sattler / Links2004
- ESP8266 board core

Config can:

- Wi-Fi SSID/password
- Discord Application ID
- Discord Server/Guild ID
- Discord Channel ID
- Discord User ID cua ban
- Discord Bot Token
- Linux LAN IP/Agent URL
- Linux Agent Token

## Discord webhook

Tao webhook trong cung kenh Discord dieu khien. Webhook chi de Linux gui anh/status/canh bao; slash command van do Discord Bot + ESP8266 xu ly.

## Safety

Relay chi dung dry contact **COM + NO** dau song song voi motherboard **POWER SW**.

Khong dung firmware/relay nay de dong cat dien 220V/110V.

Khong public port 8090 ra Internet. Agent action duoc bao ve bang Bearer token va nen chi dung trong LAN/Tailscale.

## Full guide

See `PC_STATUS_V5.md`.
