use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub server_name: String,
    pub hostname: String,
    pub ip_address: String,
    pub mac_address: String,
    pub broadcast_address: String,
    pub wol_port: u16,
    pub dashboard_url: String,
    pub ssh_user: String,
    pub ssh_port: u16,
    pub ssh_key_path: String,
    pub status_interval_seconds: u64,
    pub start_with_windows: bool,
    pub minimize_to_tray: bool,
    pub language: String,

    // Remote Access fields
    #[serde(default = "default_connection_mode")]
    pub connection_mode: String,
    #[serde(default)]
    pub remote_enabled: bool,
    #[serde(default)]
    pub agent_url: String,
    #[serde(default)]
    pub agent_token: String,
    #[serde(default)]
    pub zerotier_ip: String,
    #[serde(default = "default_theme")]
    pub theme: String,
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_connection_mode() -> String {
    "AUTO".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server_name: "Home Server".to_string(),
            hostname: "ZimaOS".to_string(),
            ip_address: "192.168.0.110".to_string(),
            mac_address: "fc:aa:14:6a:4c:bb".to_string(),
            broadcast_address: "192.168.0.255".to_string(),
            wol_port: 9,
            dashboard_url: "http://192.168.0.110".to_string(),
            ssh_user: "vanhkhuc".to_string(),
            ssh_port: 22,
            ssh_key_path: r"C:\Users\khucv\.ssh\zima_remote".to_string(),
            status_interval_seconds: 5,
            start_with_windows: true,
            minimize_to_tray: true,
            language: "vi".to_string(),
            connection_mode: "AUTO".to_string(),
            remote_enabled: false,
            agent_url: "".to_string(),
            agent_token: "".to_string(),
            zerotier_ip: "".to_string(),
            theme: "dark".to_string(),
        }
    }
}

fn get_config_path() -> PathBuf {
    let mut path = dirs_next::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("ZimaRemote");
    fs::create_dir_all(&path).ok();
    path.push("config.json");
    path
}

pub fn load_app_config() -> AppConfig {
    let path = get_config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                return config;
            }
        }
    }

    // Check legacy config paths if main config doesn't exist
    if let Some(base) = dirs_next::config_dir() {
        let legacy_paths = vec![
            base.join("zima_remote").join("config.json"),
            base.join("Zima").join("config.json"),
        ];
        for old_p in legacy_paths {
            if old_p.exists() {
                if let Ok(content) = fs::read_to_string(&old_p) {
                    if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                        let _ = save_app_config(&config);
                        return config;
                    }
                }
            }
        }
    }

    let default_cfg = AppConfig::default();
    let _ = save_app_config(&default_cfg);
    default_cfg
}

pub fn save_app_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path();
    let content =
        serde_json::to_string_pretty(config).map_err(|e| format!("Lỗi serialize config: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Lỗi ghi config file: {}", e))?;
    Ok(())
}
