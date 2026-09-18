# KNOWN LIMITATIONS & SCOPE - ZIMA REMOTE 3.0.0

Báo cáo minh bạch về các giới hạn kỹ thuật và phạm vi môi trường kiểm thử của phiên bản Zima Remote 3.0.0 FINAL STABLE.

---

## 1. Scope & Verification

- **Fully Automated Verification**:
  - Codebase linting and formatting (`npm run typecheck`, `cargo fmt --check`, `cargo clippy -- -D warnings`).
  - Frontend component rendering and state transitions via Vitest & React Testing Library.
  - Backend Rust unit tests for WOL magic packet generation, config migration, single-instance lifecycle, and SSH command allowlist.
  - Production packaging into NSIS setup installer (`ZimaRemote_3.0.0_x64-setup.exe`), MSI package, standalone executable (`zima-remote.exe`), and source ZIP archive.

- **Hardware Scope**:
  - Wake-on-LAN delivery requires the Home Server motherboards to support and have WOL enabled in BIOS/UEFI.
  - SSH Shutdown and Reboot commands require SSH key-based authentication configured at `C:\Users\khucv\.ssh\zima_remote` with passwordless sudo rights (`sudo -n /usr/bin/systemctl poweroff` and `sudo -n /usr/bin/systemctl reboot`).
  - Remote Wake via Orange Pi Agent requires the Orange Pi agent service running on the ZeroTier network with a valid authorization pairing token.

---

## 2. Technical Notes

1. **Taskbar Behavior**: Zima Remote is designed as a system tray utility. It runs hidden on boot and does not display a taskbar button unless explicitly opened as a window.
2. **Display Scaling**: Flyout positioning dynamically calculates screen work area bounds for DPI scale levels (100%, 125%, 150%) on single and multi-monitor setups.
