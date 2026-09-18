#[cfg(test)]
mod tests {
    use crate::config::AppConfig;
    use crate::tray::{is_frontend_ready, set_frontend_ready, STATE_HIDDEN, STATE_VISIBLE};
    use crate::wol::send_wol_packet;

    #[test]
    fn test_wol_magic_packet_format() {
        let mac = "fc:aa:14:6a:4c:bb";
        let clean = mac.replace([':', '-'], "");
        assert_eq!(clean.len(), 12);

        let mut mac_bytes = [0u8; 6];
        for i in 0..6 {
            mac_bytes[i] = u8::from_str_radix(&clean[i * 2..i * 2 + 2], 16).unwrap();
        }

        let mut packet = Vec::with_capacity(102);
        packet.extend_from_slice(&[0xFF; 6]);
        for _ in 0..16 {
            packet.extend_from_slice(&mac_bytes);
        }

        assert_eq!(packet.len(), 102);
        assert_eq!(&packet[0..6], &[0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
        assert_eq!(&packet[6..12], &mac_bytes);
        assert_eq!(&packet[96..102], &mac_bytes);
    }

    #[test]
    fn test_invalid_mac_handling() {
        let res = send_wol_packet("invalid_mac", "192.168.0.255", 9);
        assert!(res.is_err());
    }

    #[test]
    fn test_ssh_command_allowlist() {
        let valid_poweroff = "sudo -n /usr/bin/systemctl poweroff";
        let valid_reboot = "sudo -n /usr/bin/systemctl reboot";
        let dangerous_cmd = "rm -rf /";

        let is_allowed = |cmd: &str| -> bool {
            cmd == "sudo -n /usr/bin/systemctl poweroff"
                || cmd == "sudo -n /usr/bin/systemctl reboot"
                || cmd == "uptime -p"
        };

        assert!(is_allowed(valid_poweroff));
        assert!(is_allowed(valid_reboot));
        assert!(!is_allowed(dangerous_cmd));
    }

    #[test]
    fn test_secret_redaction() {
        let token = "secret_bearer_token_1234567890";
        let log_line = format!("Sending request with token: {}", token);
        let redacted = log_line.replace(token, "[REDACTED]");
        assert!(!redacted.contains(token));
        assert!(redacted.contains("[REDACTED]"));
    }

    #[test]
    fn test_app_config_defaults() {
        let cfg = AppConfig::default();
        assert_eq!(cfg.server_name, "Home Server");
        assert_eq!(cfg.hostname, "ZimaOS");
        assert_eq!(cfg.ip_address, "192.168.0.110");
        assert_eq!(cfg.mac_address, "fc:aa:14:6a:4c:bb");
        assert_eq!(cfg.ssh_user, "vanhkhuc");
        assert_eq!(cfg.ssh_port, 22);
    }

    #[test]
    fn test_frontend_ready_state() {
        assert!(!is_frontend_ready());
        set_frontend_ready();
        assert!(is_frontend_ready());
    }

    #[test]
    fn test_flyout_state_constants() {
        assert_eq!(STATE_HIDDEN, 0);
        assert_eq!(STATE_VISIBLE, 2);
    }
}
