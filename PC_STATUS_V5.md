# PC Status v5 - Discord + ESP8266 + Linux

## Muc tieu

Khong can desktop app de dieu khien. Mot kenh Discord la trung tam:

- ESP8266 luon bat va nhan slash command Discord.
- ESP8266 + relay bat/tat cuong buc qua chan POWER SW.
- Linux Agent quan ly tat/restart an toan, telemetry, screenshot va man hinh.
- Linux Agent gui status/anh/canh bao ve cung mot kenh Discord bang Webhook.

## Lenh de xuat

- /server status
- /server on
- /server off
- /server restart
- /server forceoff
- /server screenshot
- /server report
- /server display-on
- /server display-off

## Tu dong thong bao

Linux Agent co the gui:

- PC vua boot.
- Anh man hinh sau khi boot.
- Status dinh ky: CPU/RAM/disk/load/uptime/IP.
- Screenshot dinh ky.
- Canh bao CPU qua nong.
- Canh bao disk sap day.
- Thong bao reboot/shutdown.
- Linux online/offline do ESP8266 theo doi.

## Bao mat

- Chi DISCORD_ALLOWED_USER_ID duoc phep ra lenh.
- Chi dung trong DISCORD_CHANNEL_ID.
- Linux API action can Bearer token.
- Webhook/token de trong file env/config bi mat, khong commit.
- Khong port-forward port 8090 ra Internet.
- Relay chi dau COM + NO song song voi POWER SW, khong dung voi 220V.

## Cai Linux

Tao Discord Webhook trong dung kenh dieu khien, sau do:

    cd ~/zima-remote
    git fetch
    git switch feature/discord-linux-hub
    git pull
    chmod +x scripts/install-pc-status-agent.sh
    ./scripts/install-pc-status-agent.sh

Installer se hoi:

- user XFCE,
- Discord Webhook URL,
- chu ky status,
- chu ky screenshot.

Sau khi cai:

    systemctl status pc-status-agent
    journalctl -u pc-status-agent -f
    curl http://127.0.0.1:8090/v1/status

Token in ra cuoi installer duoc copy vao ESP8266 config.h -> LINUX_AGENT_TOKEN.

## API Linux

- GET /v1/health
- GET /v1/status
- POST /v1/system/poweroff
- POST /v1/system/reboot
- POST /v1/discord/status
- POST /v1/discord/screenshot
- POST /v1/display/on
- POST /v1/display/off

Tat ca POST can:

    Authorization: Bearer <token>

## Ghi chu screenshot

Debian XFCE X11 thuong dung DISPLAY=:0 va ~/.Xauthority. Installer tu dien theo user desktop. Neu screenshot loi, kiem tra:

    echo $DISPLAY
    ls -la ~/.Xauthority

