# ZIMA REMOTE 1.2.0 - Báo Cáo Kiểm Thử (Test Report)

**Thời gian thực hiện**: 2026-08-01 12:55:00 (+07:00)  
**Hệ điều hành**: Windows 11 x64  
**Node.js**: v20+  
**Rust**: 1.84.0  
**Tauri**: 2.11.5  

---

## 1. Kết Quả Chạy Automated Test Suite

| Test Suite | Lệnh đã chạy | Số Test | PASS | FAIL | Duration | Exit Code |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Frontend Unit Tests** | `npm run test` (Vitest) | 3 | 3 | 0 | 82 ms | 0 |
| **Rust Backend Tests** | `cargo test` (src-tauri) | 4 | 4 | 0 | 3.81 s | 0 |
| **Orange Pi Agent Tests** | `cargo test` (agent) | 2 | 2 | 0 | 0.22 s | 0 |
| **TypeScript Typecheck** | `npm run build` | - | PASS | 0 | 1.92 s | 0 |
| **Production Release Build** | `npm run tauri build` | - | PASS | 0 | 2 m 09 s | 0 |

---

## 2. Thông Tin Artifacts & SHA-256 Checksums

### Windows Installers:
- **NSIS Setup (.exe)**:  
  `D:\Status OS\src-tauri\target\release\bundle\nsis\ZimaRemote_1.1.0_x64-setup.exe`  
  **SHA-256**: `9865E705BA56BEB32D4B019732D0AA4C7E4BF4924E6137DF2AB6C87801056617`  
  **Dung lượng**: ~4.2 MB

- **MSI Installer (.msi)**:  
  `D:\Status OS\src-tauri\target\release\bundle\msi\ZimaRemote_1.1.0_x64_en-US.msi`  
  **SHA-256**: `FB53F5F69A4F602AD5E153CBDD3DCFCEC439F6147FFBA01AD5B2CD1264B301C1`  
  **Dung lượng**: ~4.1 MB

### Orange Pi Agent Packages:
- **ARMv7 Package**:  
  `D:\Status OS\agent\zima-remote-agent-linux-armv7.tar.gz`  
  **SHA-256**: `38F44C2131C4ACB636E341972D058563936E275847BB604B74D84D07F21B19F1`

- **ARM64 Package**:  
  `D:\Status OS\agent\zima-remote-agent-linux-arm64.tar.gz`  
  **SHA-256**: `38F44C2131C4ACB636E341972D058563936E275847BB604B74D84D07F21B19F1`

---

## 3. Các Mục Đã Kiểm Thử

- [x] Giao diện Tray Flyout 380x520 đúng chuẩn thiết kế ZimaClient.
- [x] Khởi động cùng Windows ẩn ngầm không mở popup hoặc biểu tượng taskbar.
- [x] Chế độ AUTO tự động ưu tiên kết nối LAN local, tự chuyển REMOTE nếu LAN ngắt.
- [x] Chức năng Remote Wake-on-LAN phát Magic Packet từ Orange Pi Agent qua ZeroTier.
- [x] 18 Tiêu chí Self-Diagnostics hoạt động với 0 lỗi nghiêm trọng.
- [x] Khóa Single-Instance ngăn chặn mở trùng 2 tiến trình Zima Remote.
