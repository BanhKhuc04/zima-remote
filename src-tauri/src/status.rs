use crate::agent_client::check_agent_status;
use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

#[derive(Debug, Serialize)]
pub struct CombinedStatusResult {
    pub online: bool,
    pub active_mode: String,
    pub latency_ms: Option<u64>,
    pub uptime: Option<String>,
    pub uptime_seconds: Option<u64>,
    pub hostname: Option<String>,
    pub cpu_temp_c: Option<f32>,
    pub load_1: Option<f32>,
    pub memory_total_mb: Option<u64>,
    pub memory_used_mb: Option<u64>,
    pub disk_total_gb: Option<f64>,
    pub disk_used_gb: Option<f64>,
    pub ip_addresses: Vec<String>,
    pub error_message: Option<String>,
}

fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86_400;
    let hours = (seconds % 86_400) / 3_600;
    let minutes = (seconds % 3_600) / 60;

    if days > 0 {
        format!("{}d {}h {}m", days, hours, minutes)
    } else if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

pub async fn evaluate_status(
    connection_mode: &str,
    ip: &str,
    _ssh_user: &str,
    ssh_port: u16,
    _ssh_key_path: &str,
    agent_url: &str,
    _zerotier_ip: &str,
) -> CombinedStatusResult {
    let mode = connection_mode.to_uppercase();

    if mode != "LOCAL" && !agent_url.trim().is_empty() {
        let remote = probe_agent(agent_url).await;
        if remote.online || mode == "REMOTE" {
            return remote;
        }
    }

    probe_local_lan(ip, ssh_port).await
}

async fn probe_agent(agent_url: &str) -> CombinedStatusResult {
    match check_agent_status(agent_url).await {
        Ok(status) => CombinedStatusResult {
            online: status.online,
            active_mode: "REMOTE".into(),
            latency_ms: status.latency_ms,
            uptime: Some(format_uptime(status.uptime_seconds)),
            uptime_seconds: Some(status.uptime_seconds),
            hostname: Some(status.hostname),
            cpu_temp_c: status.cpu_temp_c,
            load_1: status.load_1,
            memory_total_mb: status.memory_total_mb,
            memory_used_mb: status.memory_used_mb,
            disk_total_gb: status.disk_total_gb,
            disk_used_gb: status.disk_used_gb,
            ip_addresses: status.ip_addresses,
            error_message: None,
        },
        Err(err) => CombinedStatusResult {
            online: false,
            active_mode: "UNREACHABLE".into(),
            latency_ms: None,
            uptime: None,
            uptime_seconds: None,
            hostname: None,
            cpu_temp_c: None,
            load_1: None,
            memory_total_mb: None,
            memory_used_mb: None,
            disk_total_gb: None,
            disk_used_gb: None,
            ip_addresses: Vec::new(),
            error_message: Some(err),
        },
    }
}

async fn probe_local_lan(ip: &str, ssh_port: u16) -> CombinedStatusResult {
    let start = Instant::now();
    let timeout_dur = Duration::from_millis(1200);
    let ssh_addr: Option<SocketAddr> = format!("{}:{}", ip, ssh_port).parse().ok();

    let online = if let Some(addr) = ssh_addr {
        tokio::task::spawn_blocking(move || TcpStream::connect_timeout(&addr, timeout_dur).is_ok())
            .await
            .unwrap_or(false)
    } else {
        false
    };

    CombinedStatusResult {
        online,
        active_mode: if online { "LOCAL".into() } else { "UNREACHABLE".into() },
        latency_ms: online.then(|| start.elapsed().as_millis() as u64),
        uptime: None,
        uptime_seconds: None,
        hostname: None,
        cpu_temp_c: None,
        load_1: None,
        memory_total_mb: None,
        memory_used_mb: None,
        disk_total_gb: None,
        disk_used_gb: None,
        ip_addresses: Vec::new(),
        error_message: None,
    }
}
