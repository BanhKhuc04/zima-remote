#[cfg(test)]
mod tests {
    use crate::config::AppConfig;
    use crate::tray::{is_frontend_ready, set_frontend_ready, STATE_HIDDEN, STATE_VISIBLE};

    #[test]
    fn test_app_config_defaults_are_host_agnostic() {
        let cfg = AppConfig::default();
        assert_eq!(cfg.server_name, "Home Linux Server");
        assert_eq!(cfg.hostname, "linux-server");
        assert_eq!(cfg.ip_address, "192.168.1.50");
        assert_eq!(cfg.mac_address, "");
        assert_eq!(cfg.ssh_user, "");
        assert_eq!(cfg.ssh_port, 22);
        assert!(cfg.remote_enabled);
    }

    #[test]
    fn test_frontend_ready_state() {
        set_frontend_ready();
        assert!(is_frontend_ready());
    }

    #[test]
    fn test_flyout_state_constants() {
        assert_eq!(STATE_HIDDEN, 0);
        assert_eq!(STATE_VISIBLE, 2);
    }

    #[test]
    fn test_status_only_design_has_no_embedded_secret_defaults() {
        let cfg = AppConfig::default();
        assert!(cfg.agent_token.is_empty());
        assert!(cfg.ssh_key_path.is_empty());
    }
}
