# Hướng Dẫn Cấu Hình Remote Wake-on-LAN Cho ZIMA REMOTE 1.2.0

Ứng dụng **ZIMA REMOTE 1.2.0** cho phép bật Home Server từ bất kỳ đâu qua Internet mà **KHÔNG CẦN mở port router (Port Forwarding)** và **KHÔNG làm giảm bảo mật**.

---

## Kiến Trúc Tổng Quan

```text
[ Windows Zima Remote App ]
             │ (Mạng bảo mật ZeroTier)
             ▼
[ Orange Pi One (Chạy zima-remote-agent 24/7) ]
             │ (UDP Magic Packet 192.168.0.255:9)
             ▼
[ Home Server ZimaOS (192.168.0.110) ]
```

---

## 🛠️ Các Bước Thiết Lập

### Bước 1: Cài đặt ZeroTier trên Orange Pi One và Windows
1. Đăng ký tài khoản tại [ZeroTier Central](https://central.zerotier.com/).
2. Tạo 1 mạng private (Network ID ví dụ: `8056464853xxxxxx`).
3. Cài ZeroTier trên Orange Pi One:
   ```bash
   curl -s https://install.zerotier.com | sudo bash
   sudo zerotier-cli join <NETWORK_ID>
   ```
4. Trên ứng dụng Windows ZeroTier, join vào cùng Network ID và bấm **Authorize** cả 2 thiết bị trong trang quản trị ZeroTier Central.

### Bước 2: Cài zima-remote-agent lên Orange Pi One
1. Giải nén gói Agent:
   ```bash
   tar -xzvf zima-remote-agent-linux-armv7.tar.gz
   cd zima-remote-agent
   ```
2. Đặt Bearer Token bảo mật (Permission 600):
   ```bash
   sudo mkdir -p /etc/zima-remote-agent
   echo "Mã_Token_Bảo_Mật_Tự_Chọn_Tối_Thiểu_32_Ký_Tự" | sudo tee /etc/zima-remote-agent/token
   sudo chmod 600 /etc/zima-remote-agent/token
   ```
3. Cài dịch vụ systemd:
   ```bash
   sudo cp zima-remote-agent.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now zima-remote-agent
   ```

### Bước 3: Cấu hình trên ZIMA REMOTE Windows App
1. Nhấp chuột trái vào icon Zima Remote dưới khay hệ thống -> Chọn **Cài đặt (Settings)**.
2. Tại phần **REMOTE ACCESS**:
   - **Chế độ kết nối**: Chọn `AUTO` (hoặc `REMOTE`).
   - **Orange Pi Agent URL**: Nhập `http://<ZeroTier_IP_Orange_Pi>:8090`.
   - **Agent Bearer Auth Token**: Nhập mã Token đã tạo ở Bước 2.
   - **ZimaOS ZeroTier IP**: Nhập IP ZeroTier của ZimaOS (nếu muốn Remote Shutdown/Restart).
3. Nhấn **Test Kết Nối Orange Pi Agent** để xác nhận kết nối thành công, sau đó nhấn **LƯU CẤU HÌNH**.
