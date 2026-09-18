use std::net::UdpSocket;

/// Builds and sends a Wake-on-LAN Magic Packet over UDP broadcast
pub fn send_wol_packet(mac: &str, broadcast_ip: &str, port: u16) -> Result<(), String> {
    // Parse MAC address (e.g., "fc:aa:14:6a:4c:bb" or "FC-AA-14-6A-4C-BB")
    let mac_clean = mac.replace([':', '-'], "");
    if mac_clean.len() != 12 {
        return Err("Địa chỉ MAC phải có đúng 12 ký tự hex (ví dụ: fc:aa:14:6a:4c:bb)".to_string());
    }

    let mut mac_bytes = [0u8; 6];
    for i in 0..6 {
        mac_bytes[i] = u8::from_str_radix(&mac_clean[i * 2..i * 2 + 2], 16)
            .map_err(|_| "Định dạng MAC hex không hợp lệ".to_string())?;
    }

    // Magic Packet format: 6 bytes of 0xFF followed by MAC address repeated 16 times (102 bytes total)
    let mut packet = Vec::with_capacity(102);
    packet.extend_from_slice(&[0xFF; 6]);
    for _ in 0..16 {
        packet.extend_from_slice(&mac_bytes);
    }

    // Bind local UDP socket and enable broadcast
    let socket =
        UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("Lỗi khởi tạo UDP socket: {}", e))?;

    socket
        .set_broadcast(true)
        .map_err(|e| format!("Lỗi bật chế độ UDP Broadcast: {}", e))?;

    let destination = format!("{}:{}", broadcast_ip, port);
    socket
        .send_to(&packet, &destination)
        .map_err(|e| format!("Lỗi gửi packet tới {}: {}", destination, e))?;

    Ok(())
}
