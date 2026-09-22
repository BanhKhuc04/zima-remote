# PC Status Linux Agent

Companion service for **PC Status by vanhkhuc.dev**.

It runs on the Debian/XFCE computer and sends notifications to a Discord channel through a Discord Webhook.

## What it sends

- Linux/agent started notification
- Periodic PC status:
  - uptime
  - CPU temperature when available
  - load
  - RAM
  - disk
- Periodic screenshot of the physical XFCE desktop
- Best-effort shutdown/service-stop notification

The Windows **PC Status** application remains responsible for the existing Wake-on-LAN, SSH shutdown, restart, status and dashboard controls. No ESP8266 is required.

## Discord webhook

In Discord:

1. Open your server.
2. Open the channel you want to receive PC notifications.
3. Edit Channel -> Integrations -> Webhooks.
4. Create a webhook.
5. Copy the webhook URL.

Keep the webhook URL private.

## Install on Debian

From the repository:

```bash
cd ~/zima-remote
git switch feature/pc-status-linux-discord
git pull
chmod +x scripts/install-pc-status-linux.sh
sudo ./scripts/install-pc-status-linux.sh
```

The installer asks for:

- Linux desktop user
- Discord webhook URL
- status interval
- screenshot interval
- whether screenshots are enabled

## Check

```bash
systemctl status pc-status-agent
journalctl -u pc-status-agent -f
```

## Change settings

```bash
sudo nano /etc/pc-status/pc-status.env
sudo systemctl restart pc-status-agent
```

## Screenshot note

The default target is the physical XFCE desktop on `:0` using the user's `~/.Xauthority`.

If your desktop uses another X11 display, change:

```ini
PC_STATUS_DISPLAY=":0"
PC_STATUS_XAUTHORITY="/home/your-user/.Xauthority"
```

The service uses `scrot` for screenshots.
