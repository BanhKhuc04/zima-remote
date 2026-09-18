# UI QA REPORT - ZIMA REMOTE 3.0.0

---

## 1. Design System & Aesthetics

- **Dark Theme Palette**:
  - App Background: `#111315`
  - Surface: `#181A1E`
  - Card: `#1E2025`
  - Inner Card: `#141619`
  - Border: `rgba(255,255,255,0.10)`
  - Primary Text: `#F5F6F8`
  - Secondary Text: `#92969F`
  - Status Online: `#26D07C`
  - Status Offline: `#737780`
  - Status Warning: `#FFB020`
  - Status Danger: `#FF625A`
  - Accent Blue: `#2E7BF6`

- **Typography**: Local system font stack (`Segoe UI Variable`, `Segoe UI`, `system-ui`). Full Vietnamese diacritic rendering with zero overflow or text clipping.
- **Card Geometry**: 390px width x 540px height, 20px outer corner radius, subtle dark drop shadow.

---

## 2. White Screen Prevention Verification

1. **Initialization State**: Main window is created hidden (`visible: false`).
2. **HTML Shell Background**: `index.html` inline CSS sets `#111315` background on `html, body, #root`.
3. **Mount Handshake**: React mounts, loads local CSS, and executes `invoke('mark_frontend_ready')`.
4. **Error Boundary Safeguard**: If React component tree throws a runtime error, `ErrorBoundary` catches it and renders a dark recovery panel with error details, a "Copy Error" button, and a "Restart App" button.

---

## 3. Flyout Animations & Interactivity

- **Entrance Animation**: `opacity: 0 -> 1`, `translateY: 12px -> 0`, `scale: 0.98 -> 1` (200ms cubic-bezier).
- **Exit Animation**: `opacity: 1 -> 0`, `translateY: 0 -> 8px`, `scale: 1 -> 0.98` (160ms ease-in).
- **Reduced Motion**: Fully respects system `prefers-reduced-motion` settings.

---

## 4. UI Screen Breakdown

1. **Main Flyout Header**: White K4 logo mark (Dark theme) / Black logo mark (Light theme), "Zima Remote" title, "by VanhKhuc · v3.0.0" subtext, theme toggle, options menu, and close button.
2. **Connection Card**: Ethernet status, mode badge (`LOCAL` / `REMOTE`), IP (`192.168.0.110`), Latency badge, "Dashboard" button.
3. **Server Card**: "Home Server" (ZimaOS), Uptime indicator, Files shortcut.
4. **Action Grid**: Utility tiles for "Bật máy (WOL)", "Tắt nguồn", and "Khởi động lại".
5. **Inline Modals & Toast**: Confirmation modals for power off / reboot; non-intrusive toast popups for user feedback.
6. **Settings Panel**: Server parameters, IP, MAC, SSH key path, WOL port, Autostart toggle, Theme toggle, and Remote access options.
7. **Diagnostics Panel**: Non-destructive system test runner returning PASS/WARN/FAIL state badges.
