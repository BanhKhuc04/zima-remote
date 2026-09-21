use crate::agent_client::test_agent_health;
use crate::config::AppConfig;
use chrono::Utc;
use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

#[derive(Debug, Serialize)]
pub struct DiagnosticItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Serialize)]
pub struct DiagnosticReport {
    pub timestamp: String,
    pub app_version: String,
    pub os: String,
    pub items: Vec<DiagnosticItem>,
    pub pass_count: usize,
    pub warning_count: usize,
    pub fail_count: usize,
    pub not_configured_count: usize,
}

pub async fn run_full_diagnostics(config: &AppConfig) -> DiagnosticReport {
    let mut items = Vec::new();

    items.push(DiagnosticItem {
        id: "CONFIG_READ".into(),
        name: "Cấu hình ứng dụng".into(),
        category: "System".into(),
        status: "PASS".into(),
        detail: "Đã nạp cấu hình Zima Remote.".into(),
    });

    let ip_valid = config.ip_address.parse::<std::net::Ipv4Addr>().is_ok();
    items.push(DiagnosticItem {
        id: "LAN_IP".into(),
        name: "LAN IP".into(),
        category: "Network".into(),
        status: if ip_valid { "PASS" } else { "WARNING" }.into(),
        detail: if ip_valid {
            format!("LAN IP {} hợp lệ.", config.ip_address)
        } else {
            "LAN IP chưa được cấu hình đúng; remote Agent vẫn có thể hoạt động.".into()
        },
    });

    if config.agent_url.trim().is_empty() {
        items.push(DiagnosticItem {
            id: "AGENT_URL".into(),
            name: "Linux Agent".into(),
            category: "Remote".into(),
            status: "NOT_CONFIGURED".into(),
            detail: "Chưa cấu hình Linux Agent URL.".into(),
        });
    } else {
        match test_agent_health(&config.agent_url).await {
            Ok(health) => items.push(DiagnosticItem {
                id: "AGENT_HEALTH".into(),
                name: "Linux Agent".into(),
                category: "Remote".into(),
                status: "PASS".into(),
                detail: format!(
                    "Kết nối thành công tới {} v{}.",
                    health.agent, health.version
                ),
            }),
            Err(err) => items.push(DiagnosticItem {
                id: "AGENT_HEALTH".into(),
                name: "Linux Agent".into(),
                category: "Remote".into(),
                status: "FAIL".into(),
                detail: err,
            }),
        }
    }

    if ip_valid {
        let address: Option<SocketAddr> =
            format!("{}:{}", config.ip_address, config.ssh_port).parse().ok();
        let reachable = address
            .map(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(1200)).is_ok())
            .unwrap_or(false);

        items.push(DiagnosticItem {
            id: "LAN_SSH".into(),
            name: "SSH LAN".into(),
            category: "Network".into(),
            status: if reachable { "PASS" } else { "WARNING" }.into(),
            detail: if reachable {
                format!("SSH {}:{} có thể kết nối.", config.ip_address, config.ssh_port)
            } else {
                "Không thấy SSH qua LAN. Nếu laptop đang ở ngoài nhà thì đây có thể là bình thường."
                    .into()
            },
        });
    }

    items.push(DiagnosticItem {
        id: "POWER_CONTROL".into(),
        name: "Power control".into(),
        category: "Security".into(),
        status: "PASS".into(),
        detail: "Desktop app v4 không chứa lệnh bật/tắt máy; power control nằm ở ESP8266 + Discord."
            .into(),
    });

    let pass_count = items.iter().filter(|x| x.status == "PASS").count();
    let warning_count = items.iter().filter(|x| x.status == "WARNING").count();
    let fail_count = items.iter().filter(|x| x.status == "FAIL").count();
    let not_configured_count = items
        .iter()
        .filter(|x| x.status == "NOT_CONFIGURED")
        .count();

    DiagnosticReport {
        timestamp: Utc::now().to_rfc3339(),
        app_version: "4.0.0".into(),
        os: std::env::consts::OS.into(),
        items,
        pass_count,
        warning_count,
        fail_count,
        not_configured_count,
    }
}
