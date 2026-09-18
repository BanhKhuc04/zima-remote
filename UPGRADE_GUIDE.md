# UPGRADE GUIDE - ZIMA REMOTE 3.0.0 FINAL STABLE

Hướng dẫn nâng cấp từ phiên bản cũ (1.x / 2.x) lên **ZIMA REMOTE 3.0.0 FINAL STABLE**.

---

## 1. Summary of Changes in v3.0.0

- **Product Naming & Paths**:
  - Display Name: `Zima Remote`
  - Executable: `zima-remote.exe`
  - Process: `zima-remote.exe`
  - Configuration Path: `%APPDATA%\ZimaRemote\config.json`
- **Branding & App Icons**: Official K4 white logo on dark navy rounded-square background for Windows Search & Start Menu.
- **White Screen Prevention**: Window remains hidden until React mounts and sends the `mark_frontend_ready` signal. Dark inline background in `index.html` and React `ErrorBoundary` safeguard.
- **Tray & Flyout Architecture**: Native Windows context menu, Win32 window positioning (`HWND_TOPMOST`, `BringWindowToTop`, `SetForegroundWindow`), state machine preventing double-click flickering.
- **UI Design System**: Compact 390x540px utility card matching ZimaClient aesthetic.

---

## 2. Upgrade Instructions

### Step 1: Download Official Deliverable
Select the installer format:
- Setup Installer: `ZimaRemote_3.0.0_x64-setup.exe`
- MSI Package: `ZimaRemote_3.0.0_x64_en-US.msi`
- Standalone Portable Executable: `zima-remote.exe`

### Step 2: Run Installer
1. Double-click `ZimaRemote_3.0.0_x64-setup.exe`.
2. The installer will automatically detect and clean up old 1.x/2.x shortcuts and registry startup keys.
3. Your existing configuration settings from `%APPDATA%\zima_remote` or `%APPDATA%\Zima` will automatically migrate to `%APPDATA%\ZimaRemote\config.json`.

### Step 3: Verify Startup & Tray Operation
1. The app will launch in the background.
2. Check your Windows System Tray for the white K4 icon.
3. Left-click the icon to view your server status flyout.
4. Right-click the icon to view the options menu or open Settings.

---

## 3. Reversion / Rollback

If you need to uninstall v3.0.0:
1. Open Windows Settings -> Apps -> Installed Apps.
2. Search for **Zima Remote** and select **Uninstall**.
3. All shortcuts, processes, and autostart registry keys will be removed.
