# ZIMA REMOTE - Windows Desktop Application

**ZIMA REMOTE** là ứng dụng desktop Windows (x64) cao cấp, tối giản và hiện đại dùng để điều khiển máy chủ **ZimaOS** trong mạng LAN.

Ứng dụng được xây dựng trên công nghệ **Tauri v2**, **React**, **TypeScript**, **Vite** và **Rust backend**, đảm bảo dung lượng siêu nhẹ, khởi động cực nhanh và bảo mật an toàn.

---

## 🌟 Tính năng chính

1. **Bật máy qua Wake-on-LAN (WOL)**: Gửi Magic Packet chuẩn qua UDP broadcast port 9.
2. **Tắt nguồn máy chủ (Power Off)**: Thực thi lệnh an toàn qua SSH (`sudo -n /usr/bin/systemctl poweroff`).
3. **Khởi động lại (Restart)**: Thực thi lệnh qua SSH (`sudo -n /usr/bin/systemctl reboot`).
4. **Theo dõi trạng thái thời gian thực**: Kiểm tra định kỳ TCP/HTTP port 80 & SSH port 22, đo độ trễ (latency ms) và thời gian hoạt động (uptime).
5. **Mở Dashboard ZimaOS**: Truy cập nhanh vào giao diện web quản trị `http://192.168.0.110`.
6. **Chạy nền System Tray**: Menu khay hệ thống hỗ trợ thao tác nhanh và thu nhỏ ứng dụng khi đóng.
7. **Cài đặt linh hoạt (Settings)**: Tùy chỉnh thông tin server, SSH key path, tần suất kiểm tra, ngôn ngữ (Tiếng Việt / English).

---

## 🔒 An toàn & Bảo mật

- **Không hard-code mật khẩu hoặc private key**: Không đóng gói private key hay secret vào mã nguồn hoặc installer.
- **Không có cửa sổ terminal**: Thực thi lệnh SSH chạy ẩn hoàn toàn dưới nền (`CREATE_NO_WINDOW`), không hiển thị cửa sổ CMD hay PowerShell.
- **Giới hạn quyền sudo**: Chỉ thực thi đúng 2 lệnh `systemctl poweroff` và `systemctl reboot`.
- **Mạng LAN nội bộ**: Hoạt động trực tiếp trong LAN, không qua bất kỳ máy chủ cloud trung gian nào.

---

## ⚙️ Cấu hình mặc định

- **Server Name**: `Home Server`
- **Hostname**: `ZimaOS`
- **IP Address**: `192.168.0.110`
- **Dashboard**: `http://192.168.0.110`
- **Broadcast Address**: `192.168.0.255`
- **WOL Port**: `9`
- **MAC Address**: `fc:aa:14:6a:4c:bb`
- **SSH Port**: `22`
- **SSH User**: `vanhkhuc`
- **SSH Private Key Path**: `C:\Users\khucv\.ssh\zima_remote`

*Cấu hình được lưu tự động tại `%APPDATA%\ZimaRemote\config.json`.*

---

## 🛠️ Hướng dẫn Chạy Development

### Yêu cầu môi trường:
- **Windows 10 / 11 x64**
- **Node.js** v18+ & **npm**
- **Rust toolchain** (`rustc` & `cargo` 1.75+)
- Visual Studio C++ Build Tools (hoặc Windows SDK)

### Các bước chạy:
```bash
# 1. Cài đặt các gói phụ thuộc frontend
npm install

# 2. Khởi chạy ứng dụng ở chế độ Development (mở cửa sổ app với Hot-Reload)
npm run tauri dev
```

---

## 📦 Hướng dẫn Build Production & Đóng gói Installer

Để đóng gói ứng dụng thành file cài đặt Windows `.exe` hoặc `.msi`:

```bash
# Thực hiện build toàn bộ React frontend và Rust release binary
npm run tauri build
```

Sau khi build hoàn tất, file cài đặt sẽ được tạo tại:
- **NSIS Setup Exe**: `src-tauri/target/release/bundle/nsis/ZimaRemote_1.0.0_x64-setup.exe`
- **MSI Installer**: `src-tauri/target/release/bundle/msi/ZimaRemote_1.0.0_x64_en-US.msi`

### Đặc điểm bộ cài đặt:
- Tạo shortcut tự động trong **Start Menu**.
- Hỗ trợ gỡ cài đặt sạch sẽ từ **Windows Settings > Apps**.
- Không đòi hỏi quyền Administrator cho các thao tác thông thường.

---

## 📄 Giấy phép & Thương hiệu
Sản phẩm được thiết kế độc quyền cho hệ sinh thái máy chủ ZimaOS.
