#!/usr/bin/env python3
import json
import os
import signal
import socket
import subprocess
import time
from pathlib import Path

import requests

WEBHOOK_URL = os.getenv("PC_STATUS_DISCORD_WEBHOOK_URL", "").strip()
PC_NAME = os.getenv("PC_STATUS_NAME", socket.gethostname()).strip() or socket.gethostname()
STATUS_INTERVAL = max(30, int(os.getenv("PC_STATUS_INTERVAL_SECONDS", "300")))
SCREENSHOT_ENABLED = os.getenv("PC_STATUS_SCREENSHOT_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
SCREENSHOT_INTERVAL = max(60, int(os.getenv("PC_STATUS_SCREENSHOT_INTERVAL_SECONDS", "1800")))
DISPLAY = os.getenv("PC_STATUS_DISPLAY", ":0").strip() or ":0"
XAUTHORITY = os.getenv("PC_STATUS_XAUTHORITY", "").strip()
STARTUP_NOTIFY = os.getenv("PC_STATUS_NOTIFY_STARTUP", "true").lower() in {"1", "true", "yes", "on"}
STATUS_NOTIFY = os.getenv("PC_STATUS_NOTIFY_STATUS", "true").lower() in {"1", "true", "yes", "on"}
SHUTDOWN_NOTIFY = os.getenv("PC_STATUS_NOTIFY_SHUTDOWN", "true").lower() in {"1", "true", "yes", "on"}

running = True


def log(message: str) -> None:
    print(f"[pc-status] {message}", flush=True)


def post_message(content: str, file_path: str | None = None) -> bool:
    if not WEBHOOK_URL:
        log("Discord webhook is not configured")
        return False

    try:
        if file_path:
            with open(file_path, "rb") as handle:
                response = requests.post(
                    WEBHOOK_URL,
                    data={"payload_json": json.dumps({"content": content})},
                    files={"files[0]": (Path(file_path).name, handle, "image/png")},
                    timeout=15,
                )
        else:
            response = requests.post(
                WEBHOOK_URL,
                json={"content": content},
                timeout=10,
            )

        if 200 <= response.status_code < 300:
            return True

        log(f"Discord returned HTTP {response.status_code}: {response.text[:300]}")
    except Exception as exc:
        log(f"Discord send failed: {exc}")
    return False


def read_uptime() -> str:
    try:
        seconds = int(float(Path("/proc/uptime").read_text().split()[0]))
    except Exception:
        return "unknown"

    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes = rem // 60

    parts = []
    if days:
        parts.append(f"{days}d")
    if hours or days:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)


def read_memory() -> tuple[int, int]:
    values = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, raw = line.split(":", 1)
            values[key] = int(raw.strip().split()[0])
        total = values.get("MemTotal", 0) // 1024
        available = values.get("MemAvailable", 0) // 1024
        return total, max(0, total - available)
    except Exception:
        return 0, 0


def read_temperature() -> float | None:
    temperatures = []
    for pattern in (
        "/sys/class/thermal/thermal_zone*/temp",
        "/sys/class/hwmon/hwmon*/temp*_input",
    ):
        for path in Path("/").glob(pattern.lstrip("/")):
            try:
                value = float(path.read_text().strip())
                if value > 1000:
                    value /= 1000.0
                if 0 < value < 150:
                    temperatures.append(value)
            except Exception:
                pass
    return max(temperatures) if temperatures else None


def read_disk() -> tuple[float, float]:
    try:
        stat = os.statvfs("/")
        total = stat.f_frsize * stat.f_blocks / (1024 ** 3)
        free = stat.f_frsize * stat.f_bavail / (1024 ** 3)
        return total, total - free
    except Exception:
        return 0.0, 0.0


def status_text(prefix: str = "🟢") -> str:
    mem_total, mem_used = read_memory()
    disk_total, disk_used = read_disk()
    temp = read_temperature()

    try:
        load1 = os.getloadavg()[0]
    except Exception:
        load1 = 0.0

    lines = [
        f"{prefix} **{PC_NAME}**",
        f"Uptime: {read_uptime()} | Load: {load1:.2f}",
    ]

    if temp is not None:
        lines.append(f"CPU: {temp:.1f}°C")

    if mem_total:
        lines.append(f"RAM: {mem_used}/{mem_total} MB")

    if disk_total:
        lines.append(f"Disk: {disk_used:.1f}/{disk_total:.1f} GB")

    return "\n".join(lines)


def screenshot_environment() -> dict[str, str]:
    env = os.environ.copy()
    env["DISPLAY"] = DISPLAY

    if XAUTHORITY:
        env["XAUTHORITY"] = XAUTHORITY
    else:
        candidate = Path.home() / ".Xauthority"
        if candidate.exists():
            env["XAUTHORITY"] = str(candidate)

    return env


def capture_screenshot() -> str | None:
    if not SCREENSHOT_ENABLED:
        return None

    output = f"/tmp/pc-status-{int(time.time())}.png"
    try:
        result = subprocess.run(
            ["scrot", "--silent", output],
            env=screenshot_environment(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
            check=False,
            text=True,
        )

        if result.returncode == 0 and Path(output).exists():
            return output

        log(f"screenshot failed: {result.stderr.strip()}")
    except Exception as exc:
        log(f"screenshot failed: {exc}")

    try:
        Path(output).unlink(missing_ok=True)
    except Exception:
        pass
    return None


def send_screenshot() -> None:
    path = capture_screenshot()
    if not path:
        return

    try:
        post_message(f"📸 **{PC_NAME}** - screenshot", path)
    finally:
        Path(path).unlink(missing_ok=True)


def handle_stop(signum, frame):
    global running
    running = False


signal.signal(signal.SIGTERM, handle_stop)
signal.signal(signal.SIGINT, handle_stop)


def main() -> None:
    if not WEBHOOK_URL:
        raise SystemExit("PC_STATUS_DISCORD_WEBHOOK_URL is required")

    log(f"starting for {PC_NAME}; DISPLAY={DISPLAY}")

    if STARTUP_NOTIFY:
        post_message(status_text("🟢") + "\nPC Status agent started.")

    now = time.monotonic()
    next_status = now + STATUS_INTERVAL
    next_screenshot = now + min(30, SCREENSHOT_INTERVAL)

    while running:
        now = time.monotonic()

        if STATUS_NOTIFY and now >= next_status:
            post_message(status_text("💻"))
            next_status = now + STATUS_INTERVAL

        if SCREENSHOT_ENABLED and now >= next_screenshot:
            send_screenshot()
            next_screenshot = now + SCREENSHOT_INTERVAL

        time.sleep(1)

    if SHUTDOWN_NOTIFY:
        post_message(f"🔴 **{PC_NAME}**\nPC Status agent is stopping / Linux is shutting down.")


if __name__ == "__main__":
    main()
