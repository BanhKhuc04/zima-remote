# zima-remote-agent (Orange Pi One Daemon)

`zima-remote-agent` là một tiến trình dịch vụ nhẹ viết bằng Rust, chạy ngầm 24/7 trên Orange Pi One để nhận lệnh phát tín hiệu **Wake-on-LAN (UDP Magic Packet)** trong mạng nội bộ.

---

## 🔒 Các Tính Năng Bảo Mật
- **Không có Shell Execution**: Agent không chạy bất kỳ câu lệnh hệ thống hay terminal nào.
- **Strict MAC Allowlist**: Chỉ chấp nhận duy nhất địa chỉ MAC của Home Server (`fc:aa:14:6a:4c:bb`).
- **Bearer Token Auth**: Mọi request `POST /v1/server/wake` bắt buộc phải có `Authorization: Bearer <token>`.
- **Root-Only Token**: Token lưu tại `/etc/zima-remote-agent/token` với quyền `chmod 600`.
- **Systemd Hardening**: Dịch vụ chạy với `NoNewPrivileges=true`, `ProtectSystem=full`, `PrivateTmp=true`, `MemoryDenyWriteExecute=true`.

---

## 📡 API Endpoints

### 1. Health Check
```http
GET /v1/health
```
**Response**:
```json
{
  "status": "ok",
  "agent": "zima-remote-agent",
  "version": "1.0.0"
}
```

### 2. Live LAN Status
```http
GET /v1/server/status
```
**Response**:
```json
{
  "online": true,
  "latency_ms": 3,
  "http_reachable": true,
  "ssh_reachable": true,
  "checked_at": "2026-08-01T12:55:00Z"
}
```

### 3. Remote Wake-on-LAN Trigger
```http
POST /v1/server/wake
Header: Authorization: Bearer <token>
Header: Content-Type: application/json

{
  "mac": "fc:aa:14:6a:4c:bb"
}
```
**Response**:
```json
{
  "accepted": true,
  "request_id": "4c9d8a30-8a12-4c28-98e3-f29103bc7d41",
  "message": "Magic Packet sent 3x to 192.168.0.255:9"
}
```
