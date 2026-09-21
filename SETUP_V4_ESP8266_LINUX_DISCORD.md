# Zima Remote v4 - ESP8266 + Debian Linux + Discord

## 1. Kien truc moi

Zima Remote v4 tach thanh 3 thanh phan:

1. **ESP8266 controller (luon bat)**
   - Ket noi Wi-Fi va Discord.
   - Nhan lenh trong 1 kenh Discord.
   - Dieu khien relay nhu nut POWER SW vat ly.
   - Goi Linux Agent de tat/reboot an toan.
   - Thong bao server online/offline va canh bao nhiet do.

2. **Linux Agent tren may PC**
   - Chay bang systemd, port mac dinh 8090.
   - Bao uptime, nhiet CPU, load, RAM, disk, IP.
   - Nhan poweroff/reboot co Bearer token.
   - Khong phu thuoc desktop environment.

3. **Windows desktop app**
   - Chi hien thi ket noi va trang thai.
   - Khong con WOL / Power Off / Restart.
   - Ket noi Linux Agent bang LAN hoac Tailscale.

Luon nho: khi Linux PC da tat thi agent tren PC cung tat. ESP8266 phai dung nguon USB 5V rieng va luon online de co the bat PC lai.

---

## 2. Dau relay dung cach

### Khuyen nghi

Dung relay nhu mot nut bam vat ly:

- ESP8266 D1 (GPIO5) -> IN relay
- ESP8266 GND -> GND relay
- VCC relay -> nguon dung voi module relay cua ban
- Relay COM -> mot chan PWR_SW tren mainboard
- Relay NO -> chan PWR_SW con lai tren mainboard

Hai day COM/NO chi la dry contact va dau song song voi nut Power cua case.

### KHONG lam

Khong dung relay trong firmware nay de cat truc tiep dien luoi 220V/110V vao PSU.

Ly do:
- cat dien dot ngot co the lam loi filesystem;
- nguy hiem dien giat/chay no;
- khong can thiet vi motherboard da co chan POWER SW.

### Relay module

ESP8266 dung logic 3.3V. Hay dung module relay co dau vao 3.3V-compatible. Neu module relay 5V khong nhan muc logic 3.3V on dinh, dung transistor/driver hoac module relay phu hop thay vi noi truc tiep.

Mac dinh firmware:
- pin: D1;
- relay active LOW;
- bam bat may: 700 ms;
- force off: giu 6 giay.

Tat ca co the doi trong config.h.

---

## 3. Nap firmware ESP8266

Thu muc:

    esp8266/
      zima_remote_esp8266.ino
      config.example.h

### Arduino IDE

1. Cai ESP8266 board support.
2. Cai ArduinoJson 6.x.
3. Chon dung board cua ban:
   - NodeMCU 1.0 (ESP-12E), hoac
   - LOLIN(WEMOS) D1 R2 & mini.
4. Copy:

    cp config.example.h config.h

5. Sua config.h:

    WIFI_SSID
    WIFI_PASSWORD
    DISCORD_BOT_TOKEN
    DISCORD_CHANNEL_ID
    DISCORD_ALLOWED_USER_ID
    LINUX_AGENT_URL
    LINUX_AGENT_TOKEN
    LINUX_LAN_IP
    LINUX_SSH_PORT

6. Upload sketch.

File config.h da duoc .gitignore de tranh commit token/mat khau len GitHub.

### Linux Agent URL

ESP8266 khong chay Tailscale. LINUX_AGENT_URL va LINUX_LAN_IP nen tro toi IP LAN co dinh cua PC, vi du:

    LINUX_AGENT_URL = http://192.168.1.50:8090
    LINUX_LAN_IP = 192.168.1.50

ESP cung kiem tra TCP/22 nhu mot lop du phong. Neu Linux Agent bi dung nhung SSH van con song, lenh !server on se bi huy thay vi bam nham POWER SW tren mot may dang bat.

Nen dat DHCP Reservation trong router cho MAC cua PC thay vi hard-code static IP trong Debian.

---

## 4. Tao Discord bot

1. Vao Discord Developer Portal.
2. Tao Application -> Bot.
3. Tao/reset Bot Token.
4. Neu Discord yeu cau, bat Message Content Intent.
5. Invite bot vao server voi quyen toi thieu:
   - View Channel
   - Send Messages
   - Read Message History
6. Tao mot channel rieng, vi du #server-control.
7. Bat Developer Mode trong Discord.
8. Copy:
   - Channel ID;
   - User ID cua ban.

Gan hai ID nay vao config.h.

Firmware chi chap nhan lenh power tu DISCORD_ALLOWED_USER_ID.

### Lenh

Voi prefix mac dinh !server:

    !server status
    !server on
    !server off
    !server restart
    !server forceoff
    !server help

Y nghia:
- status: ESP + Linux + nhiet do/RAM/disk.
- on: bam relay 700 ms.
- off: goi systemctl poweroff qua Linux Agent.
- restart: goi systemctl reboot.
- forceoff: giu nut Power 6 giay. Chi dung khi may treo.

ESP se tu thong bao khi Linux chuyen ONLINE/OFFLINE va canh bao khi CPU vuot TEMP_ALERT_C.

---

## 5. Cai Linux nhe

Khuyen nghi Debian 13 amd64 netinst.

Trong Debian Installer, khong chon GNOME/KDE/XFCE. Chi chon:
- SSH server
- standard system utilities

Sau khi boot:

    sudo apt update
    sudo apt full-upgrade -y
    sudo apt install -y git curl ca-certificates

Dat hostname neu muon:

    sudo hostnamectl set-hostname code-server

---

## 6. Cai Tailscale de laptop truy cap tu xa

Tren Debian:

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up

Sau khi dang nhap:

    tailscale ip -4

Vi du ket qua:

    100.80.12.34

Cai Tailscale tren laptop Windows va dang nhap cung tailnet.

Test tu laptop:

    ssh your-user@100.80.12.34

Khuyen nghi dung SSH key thay vi password.

---

## 7. Cai Linux Agent

Clone branch v4:

    git clone https://github.com/BanhKhuc04/zima-remote.git
    cd zima-remote
    git checkout feature/esp8266-discord-controller

Chay:

    chmod +x scripts/install-linux-agent.sh
    ./scripts/install-linux-agent.sh

Script se:
- cai Rust/build dependencies;
- build agent release;
- cai /usr/local/bin/zima-remote-agent;
- tao token ngau nhien;
- cai systemd service;
- bat SSH;
- start agent.

Xem token:

    sudo sed -n 's/^AGENT_BEARER_TOKEN=//p' /etc/zima-remote-agent/agent.env

Copy token nay vao:

    esp8266/config.h -> LINUX_AGENT_TOKEN

Restart agent:

    sudo systemctl restart zima-remote-agent

Kiem tra:

    curl http://127.0.0.1:8090/v1/status
    systemctl status zima-remote-agent

Log:

    journalctl -u zima-remote-agent -f

---

## 8. Cau hinh desktop app

App v4 chi hien thi status.

Trong Settings:

- Server name: tuy y
- LAN IP: IP LAN cua Linux PC
- Connection mode:
  - AUTO: thu Agent truoc, fallback LAN
  - REMOTE: chi Linux Agent
  - LOCAL: chi probe SSH trong LAN
- Linux Agent URL:
  - trong LAN: http://192.168.1.50:8090
  - tu xa: http://100.x.y.z:8090 (Tailscale IP)
- Refresh interval: 5 giay la hop ly

Neu laptop thuong o ngoai nha, dat Agent URL bang Tailscale IP.

---

## 9. Luong hoat dong

### Bat may

Discord -> ESP8266 -> relay bam POWER SW -> PC boot -> systemd start Linux Agent -> ESP thay agent online -> Discord thong bao ONLINE.

### Tat may

Discord -> ESP8266 -> POST /v1/system/poweroff -> Linux systemd tat may an toan -> agent mat ket noi -> ESP thong bao OFFLINE.

### May treo

Discord -> !server forceoff -> ESP giu relay 6 giay -> motherboard force power off.

---

## 10. Bao mat

- Khong commit esp8266/config.h.
- Khong chia se Discord Bot Token.
- Neu lo token: reset token ngay trong Discord Developer Portal.
- Kenh Discord nen la private channel.
- Chi cho phep user ID cua ban.
- Linux Agent action can Bearer token.
- Khuyen nghi chi truy cap agent tu LAN/Tailscale, khong port-forward 8090 ra Internet.

Firmware ESP8266 hien dung TLS encryption nhung bo qua certificate verification de setup nhe tren ESP8266. Dieu nay phu hop prototype/home LAN, nhung neu can hardening cao hon nen chuyen Discord bridge sang mot service co TLS verification day du hoac cai CA trust store tren ESP.

---

## 11. Checklist truoc khi test relay

1. ESP cap nguon rieng, PC tat van con online.
2. Relay o trang thai OFF sau boot ESP.
3. COM/NO dau dung vao PWR_SW, khong phai 220V.
4. Test !server status.
5. Khi PC dang tat, test !server on.
6. Cho Linux boot, kiem tra Discord bao ONLINE.
7. Test !server off va dam bao Linux shutdown sach.
8. Chi test forceoff khi da hieu ro no la tat cuong buc.

---

## 12. Troubleshooting

### ESP online nhung status bao Linux offline

- Kiem tra IP LAN cua Linux.
- Kiem tra DHCP reservation.
- Tren Linux:

    ss -lntp | grep 8090
    systemctl status zima-remote-agent

- Tu may cung LAN:

    curl http://LINUX_IP:8090/v1/status

### Discord bot khong doc lenh

- Kiem tra DISCORD_CHANNEL_ID.
- Kiem tra DISCORD_ALLOWED_USER_ID.
- Kiem tra bot co View Channel + Read Message History.
- Kiem tra token.
- Neu can, bat Message Content Intent.

### Relay bam nhung PC khong bat

- Kiem tra dung hai chan PWR_SW.
- Thu chap hai chan PWR_SW bang nut case de xac nhan header.
- Kiem tra RELAY_ACTIVE_LOW.
- Kiem tra module relay co nhan logic 3.3V.

### Nhiet do hien "-"

Mot so mainboard/sensor khong expose nhiet do qua /sys/class/thermal hoac /sys/class/hwmon. Agent se de null thay vi bao sai.
