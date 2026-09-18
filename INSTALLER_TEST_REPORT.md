# INSTALLER TEST REPORT - ZIMA REMOTE 3.0.0

**Installer**: NSIS Setup & MSI Package  
**Target Executable**: `zima-remote.exe`  
**Product Display Name**: Zima Remote  
**Registry & Config Path**: `%APPDATA%\ZimaRemote`  

---

## 1. Clean Installation Test

1. **Previous Version Cleanup**: Uninstall previous 1.x / 2.x versions. Verify no legacy processes (`zima-remote.exe`, `ZimaRemote.exe`) remain running.
2. **Execute Setup**: Run `ZimaRemote_3.0.0_x64-setup.exe`.
3. **Start Menu Shortcut**: Confirm shortcut created as **Zima Remote** with the new dark navy / white K4 logo.
4. **Windows Search Indexing**: Search `Zima Remote` in Windows Search bar. Icon renders crisp with no white borders or blurred pixels.
5. **Executable Verification**: Destination binary is `zima-remote.exe` in `%LOCALAPPDATA%\Programs\Zima Remote\`.

---

## 2. Autostart & System Tray Verification

1. **Windows Boot Behavior**: On system launch, `zima-remote.exe` starts automatically in hidden mode (`visible: false`).
2. **System Tray Icon**: System Tray displays the white K4 icon.
3. **No Taskbar Entry**: App does not display a taskbar tab on startup or when minimized.
4. **Left Click Interactivity**: Left clicking system tray icon smoothly toggles the 390x540px flyout at the bottom-right of the primary monitor above the taskbar.
5. **Right Click Menu**: Right clicking tray icon opens the full native menu:
   - Mở Zima Remote
   - Kiểm tra trạng thái
   - Bật Home Server
   - Mở Dashboard
   - Cài đặt
   - Chẩn đoán
   - Thoát hoàn toàn

---

## 3. Single Instance Enforcement Test

1. Launch `zima-remote.exe`.
2. While `zima-remote.exe` is running, launch `ZimaRemote_3.0.0_x64-setup.exe` or click the Start Menu shortcut again.
3. **Result**: Single instance plugin detects running process, prevents second process launch, and brings the existing flyout window to the foreground.

---

## 4. Uninstallation Test

1. Open Windows Add/Remove Programs. Select **Zima Remote** and click Uninstall.
2. Uninstaller removes shortcuts, registry keys, and installation folder.
3. Autostart registry entry is cleaned up completely.
