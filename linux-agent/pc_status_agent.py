#!/usr/bin/env python3
import json
import os
import signal
import socket
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests

VERSION = "5.0.0"
TOKEN = os.getenv("AGENT_BEARER_TOKEN", "").strip()
PORT = int(os.getenv("AGENT_PORT", "8090"))
WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
DESKTOP_USER = os.getenv("DESKTOP_USER", "").strip()
DISPLAY = os.getenv("DISPLAY", ":0").strip() or ":0"
XAUTHORITY = os.getenv("XAUTHORITY", "").strip()
STATUS_INTERVAL = max(0, int(os.getenv("STATUS_INTERVAL_SECONDS", "300")))
SCREENSHOT_INTERVAL = max(0, int(os.getenv("SCREENSHOT_INTERVAL_SECONDS", "1800")))
STARTUP_SCREENSHOT = os.getenv("STARTUP_SCREENSHOT", "true").lower() in {"1","true","yes","on"}
TEMP_ALERT_C = float(os.getenv("TEMP_ALERT_C", "80"))
DISK_ALERT_PERCENT = float(os.getenv("DISK_ALERT_PERCENT", "90"))

stop_event = threading.Event()
last_temp_alert = 0.0
last_disk_alert = 0.0


def log(msg):
    print(f"[pc-status-agent] {msg}", flush=True)


def webhook_message(content):
    if not WEBHOOK_URL:
        return False
    try:
        r = requests.post(WEBHOOK_URL, json={"content": content}, timeout=12)
        if 200 <= r.status_code < 300:
            return True
        log(f"webhook HTTP {r.status_code}: {r.text[:300]}")
    except Exception as exc:
        log(f"webhook error: {exc}")
    return False


def webhook_file(content, path):
    if not WEBHOOK_URL:
        return False
    try:
        with open(path, "rb") as fh:
            r = requests.post(
                WEBHOOK_URL,
                data={"payload_json": json.dumps({"content": content})},
                files={"files[0]": (Path(path).name, fh, "image/png")},
                timeout=30,
            )
        if 200 <= r.status_code < 300:
            return True
        log(f"webhook file HTTP {r.status_code}: {r.text[:300]}")
    except Exception as exc:
        log(f"webhook file error: {exc}")
    return False


def hostname():
    return socket.gethostname()


def uptime_seconds():
    try:
        return int(float(Path("/proc/uptime").read_text().split()[0]))
    except Exception:
        return 0


def memory_mb():
    vals = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, rest = line.split(":", 1)
            vals[key] = int(rest.strip().split()[0])
        total = vals.get("MemTotal", 0) // 1024
        available = vals.get("MemAvailable", 0) // 1024
        return total, max(0, total - available)
    except Exception:
        return 0, 0


def disk_gb():
    st = os.statvfs("/")
    total = st.f_frsize * st.f_blocks
    free = st.f_frsize * st.f_bavail
    used = total - free
    return total / 1024**3, used / 1024**3


def cpu_temp():
    values = []
    for root in (Path("/sys/class/thermal"), Path("/sys/class/hwmon")):
        if not root.exists():
            continue
        for p in root.rglob("temp"):
            try:
                v = float(p.read_text().strip())
                if v > 500:
                    v /= 1000.0
                if 0 < v < 150:
                    values.append(v)
            except Exception:
                pass
        for p in root.rglob("temp*_input"):
            try:
                v = float(p.read_text().strip())
                if v > 500:
                    v /= 1000.0
                if 0 < v < 150:
                    values.append(v)
            except Exception:
                pass
    return max(values) if values else None


def ip_addresses():
    try:
        out = subprocess.check_output(["hostname", "-I"], text=True, timeout=3)
        return out.split()
    except Exception:
        return []


def status_dict():
    total_mem, used_mem = memory_mb()
    total_disk, used_disk = disk_gb()
    temp = cpu_temp()
    try:
        load1 = os.getloadavg()[0]
    except Exception:
        load1 = None
    return {
        "online": True,
        "hostname": hostname(),
        "uptime_seconds": uptime_seconds(),
        "cpu_temp_c": temp,
        "load_1": load1,
        "memory_total_mb": total_mem or None,
        "memory_used_mb": used_mem or None,
        "disk_total_gb": round(total_disk, 2),
        "disk_used_gb": round(used_disk, 2),
        "ip_addresses": ip_addresses(),
        "agent_version": VERSION,
    }


def format_uptime(seconds):
    d, rem = divmod(seconds, 86400)
    h, rem = divmod(rem, 3600)
    m = rem // 60
    out = []
    if d:
        out.append(f"{d}d")
    if h or d:
        out.append(f"{h}h")
    out.append(f"{m}m")
    return " ".join(out)


def status_message(prefix="💻"):
    s = status_dict()
    lines = [
        f"{prefix} **{s['hostname']}**",
        f"Uptime: {format_uptime(s['uptime_seconds'])}",
    ]
    if s["cpu_temp_c"] is not None:
        lines.append(f"CPU: {s['cpu_temp_c']:.1f}°C")
    if s["load_1"] is not None:
        lines.append(f"Load: {s['load_1']:.2f}")
    if s["memory_total_mb"]:
        lines.append(f"RAM: {s['memory_used_mb']}/{s['memory_total_mb']} MB")
    lines.append(f"Disk: {s['disk_used_gb']:.1f}/{s['disk_total_gb']:.1f} GB")
    if s["ip_addresses"]:
        lines.append("IP: " + ", ".join(s["ip_addresses"]))
    return "\n".join(lines)


def desktop_env():
    env = os.environ.copy()
    env["DISPLAY"] = DISPLAY
    if XAUTHORITY:
        env["XAUTHORITY"] = XAUTHORITY
    elif DESKTOP_USER:
        env["XAUTHORITY"] = f"/home/{DESKTOP_USER}/.Xauthority"
    return env


def run_as_desktop_user(args):
    if not DESKTOP_USER:
        raise RuntimeError("DESKTOP_USER is not configured")
    cmd = ["runuser", "-u", DESKTOP_USER, "--", "env", f"DISPLAY={DISPLAY}"]
    auth = desktop_env().get("XAUTHORITY")
    if auth:
        cmd.append(f"XAUTHORITY={auth}")
    cmd.extend(args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=20)


def capture_screenshot():
    fd, path = tempfile.mkstemp(prefix="pc-status-", suffix=".png")
    os.close(fd)
    try:
        result = run_as_desktop_user(["scrot", "--silent", path])
        if result.returncode != 0 or not Path(path).exists() or Path(path).stat().st_size == 0:
            raise RuntimeError(result.stderr.strip() or "scrot failed")
        return path
    except Exception:
        Path(path).unlink(missing_ok=True)
        raise


def send_screenshot(reason="Discord request"):
    path = capture_screenshot()
    try:
        return webhook_file(f"📸 **{hostname()}** - {reason}", path)
    finally:
        Path(path).unlink(missing_ok=True)


def display_power(on):
    mode = "on" if on else "off"
    r = run_as_desktop_user(["xset", "dpms", "force", mode])
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "xset failed")


def authorized(headers):
    if not TOKEN:
        return False
    return headers.get("Authorization", "") == f"Bearer {TOKEN}"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        log(fmt % args)

    def send_json(self, code, payload):
        data = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/v1/health":
            return self.send_json(200, {"status":"ok","agent":"pc-status-linux-agent","version":VERSION})
        if self.path in ("/v1/status", "/v1/server/status"):
            return self.send_json(200, status_dict())
        self.send_json(404, {"error":"Not found"})

    def do_POST(self):
        if not authorized(self.headers):
            return self.send_json(401, {"error":"Unauthorized"})

        try:
            if self.path == "/v1/system/poweroff":
                webhook_message(f"🔴 **{hostname()}**\nGraceful shutdown requested.")
                self.send_json(202, {"accepted":True,"action":"poweroff"})
                threading.Thread(target=lambda: (time.sleep(1), subprocess.call(["systemctl","poweroff"])), daemon=True).start()
                return

            if self.path == "/v1/system/reboot":
                webhook_message(f"🔄 **{hostname()}**\nReboot requested.")
                self.send_json(202, {"accepted":True,"action":"reboot"})
                threading.Thread(target=lambda: (time.sleep(1), subprocess.call(["systemctl","reboot"])), daemon=True).start()
                return

            if self.path == "/v1/discord/status":
                ok = webhook_message(status_message("📊"))
                return self.send_json(200 if ok else 502, {"ok":ok})

            if self.path == "/v1/discord/screenshot":
                ok = send_screenshot("Discord command")
                return self.send_json(200 if ok else 502, {"ok":ok})

            if self.path == "/v1/display/on":
                display_power(True)
                return self.send_json(200, {"ok":True,"display":"on"})

            if self.path == "/v1/display/off":
                display_power(False)
                return self.send_json(200, {"ok":True,"display":"off"})

            self.send_json(404, {"error":"Not found"})
        except Exception as exc:
            log(f"action failed: {exc}")
            self.send_json(500, {"error":str(exc)})


def monitor_loop():
    global last_temp_alert, last_disk_alert
    next_status = time.monotonic() + STATUS_INTERVAL if STATUS_INTERVAL else None
    next_shot = time.monotonic() + SCREENSHOT_INTERVAL if SCREENSHOT_INTERVAL else None

    while not stop_event.wait(2):
        now = time.monotonic()
        s = status_dict()

        if next_status is not None and now >= next_status:
            webhook_message(status_message("📊"))
            next_status = now + STATUS_INTERVAL

        if next_shot is not None and now >= next_shot:
            try:
                send_screenshot("Scheduled screenshot")
            except Exception as exc:
                log(f"scheduled screenshot failed: {exc}")
            next_shot = now + SCREENSHOT_INTERVAL

        temp = s.get("cpu_temp_c")
        if temp is not None and temp >= TEMP_ALERT_C and now - last_temp_alert > 1800:
            last_temp_alert = now
            webhook_message(f"🌡️ **{hostname()}** CPU temperature alert: {temp:.1f}°C")

        total = s.get("disk_total_gb") or 0
        used = s.get("disk_used_gb") or 0
        disk_pct = (used / total * 100.0) if total else 0
        if disk_pct >= DISK_ALERT_PERCENT and now - last_disk_alert > 21600:
            last_disk_alert = now
            webhook_message(f"💾 **{hostname()}** disk alert: {disk_pct:.1f}% used")


def main():
    if not TOKEN:
        raise SystemExit("AGENT_BEARER_TOKEN is required")

    webhook_message(status_message("🟢") + "\nPC Status Linux agent started.")

    if STARTUP_SCREENSHOT:
        def delayed_shot():
            time.sleep(12)
            try:
                send_screenshot("Startup screenshot")
            except Exception as exc:
                log(f"startup screenshot failed: {exc}")
        threading.Thread(target=delayed_shot, daemon=True).start()

    threading.Thread(target=monitor_loop, daemon=True).start()

    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)

    def stop_handler(signum, frame):
        stop_event.set()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop_handler)
    signal.signal(signal.SIGINT, stop_handler)

    log(f"v{VERSION} listening on 0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    finally:
        webhook_message(f"🟠 **{hostname()}**\nPC Status Linux agent stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
