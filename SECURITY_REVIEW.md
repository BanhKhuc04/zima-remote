# SECURITY REVIEW & THREAT MODEL - ZIMA REMOTE 3.0.0

Báo cáo đánh giá bảo mật và mô hình an toàn cho hệ thống ZIMA REMOTE 3.0.0 FINAL STABLE.

---

## 1. Core Security Principles

1. **Zero Open Ports on Router**: No port forwarding required on router/modem (no public SSH port 22, HTTP port 80, or WOL UDP port 9).
2. **Command Execution Allowlist**: SSH command execution is restricted exclusively to specific non-interactive systemctl commands (`sudo -n /usr/bin/systemctl poweroff` and `sudo -n /usr/bin/systemctl reboot`).
3. **No Credential / Key Storage**: Private keys are referenced via local user paths (`C:\Users\khucv\.ssh\zima_remote`). Private key contents and secrets are never embedded in the app bundle or logged.
4. **Secret Redaction**: Tokens and sensitive parameters are automatically redacted from diagnostic reports and log files (`[REDACTED]`).
5. **Single-Instance Enforcement**: Tauri single-instance plugin enforces a single process instance (`zima-remote.exe`) to prevent duplicate tray icons or race conditions.
6. **No External Asset Dependencies (Zero CDN)**: All fonts, icons, styles, and scripts are packaged locally inside the application bundle. No network requests are made to external CDNs.

---

## 2. Component Security Matrix

| Component | Potential Risk | Mitigation Mechanism |
| :--- | :--- | :--- |
| **Windows Client (`zima-remote.exe`)** | Config / Secret Disclosure | Config saved in user profile `%APPDATA%\ZimaRemote\config.json`; SSH key stored locally; automatic secret redaction in diagnostics. |
| **ZeroTier Tunnel** | Unauthorized Tunnel Access | Private encrypted mesh tunnel requiring explicit device authorization. |
| **Orange Pi Agent** | Replay / Bruteforce Attacks | 32-byte Bearer Token authentication, fixed MAC allowlist validation, rate limiting. |
| **SSH Power Commands** | Arbitrary Shell Execution | Strict allowlist validation enforcing `sudo -n /usr/bin/systemctl poweroff` and `sudo -n /usr/bin/systemctl reboot` only. |
