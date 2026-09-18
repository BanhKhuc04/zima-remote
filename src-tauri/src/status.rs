use crate::agent_client::check_agent_status;
use crate::ssh::execute_ssh_cmd;
use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};
use tokio::time::timeout;

#[derive(Debug, Serialize)]
pub struct CombinedStatusResult {
    pub online: bool,
    pub active_mode: String, // "LOCAL", "REMOTE", "UNREACHABLE"
    pub latency_ms: Option<u64>,
    pub uptime: Option<String>,
    pub error_message: Option<String>,
}

pub async fn evaluate_status(
    connection_mode: &str,
    ip: &str,
    ssh_user: &str,
    ssh_port: u16,
    ssh_key_path: &str,
    agent_url: &str,
    zerotier_ip: &str,
) -> CombinedStatusResult {
    let mode_upper = connection_mode.to_uppercase();

    match mode_upper.as_str() {
        "LOCAL" => probe_local_lan(ip, ssh_user, ssh_port, ssh_key_path).await,
        "REMOTE" => {
            probe_remote_agent(agent_url, zerotier_ip, ssh_user, ssh_port, ssh_key_path).await
        }
        _ => {
            // AUTO Mode: Probe Local LAN first, fallback to Remote Agent
            let local_res = probe_local_lan(ip, ssh_user, ssh_port, ssh_key_path).await;
            if local_res.online {
                local_res
            } else if !agent_url.trim().is_empty() {
                let remote_res =
                    probe_remote_agent(agent_url, zerotier_ip, ssh_user, ssh_port, ssh_key_path)
                        .await;
                if remote_res.active_mode == "REMOTE" {
                    remote_res
                } else {
                    local_res
                }
            } else {
                local_res
            }
        }
    }
}

async fn probe_local_lan(
    ip: &str,
    ssh_user: &str,
    ssh_port: u16,
    ssh_key_path: &str,
) -> CombinedStatusResult {
    let start = Instant::now();
    let timeout_dur = Duration::from_millis(1500);

    let http_addr: Option<SocketAddr> = format!("{}:80", ip).parse().ok();
    let ssh_addr: Option<SocketAddr> = format!("{}:{}", ip, ssh_port).parse().ok();

    let mut is_online = false;
    let mut measured_latency: Option<u64> = None;

    if let Some(addr) = http_addr {
        let res = tokio::task::spawn_blocking(move || {
            TcpStream::connect_timeout(&addr, timeout_dur).is_ok()
        })
        .await;
        if let Ok(true) = res {
            is_online = true;
            measured_latency = Some(start.elapsed().as_millis() as u64);
        }
    }

    if !is_online {
        if let Some(addr) = ssh_addr {
            let res = tokio::task::spawn_blocking(move || {
                TcpStream::connect_timeout(&addr, timeout_dur).is_ok()
            })
            .await;
            if let Ok(true) = res {
                is_online = true;
                measured_latency = Some(start.elapsed().as_millis() as u64);
            }
        }
    }

    if !is_online {
        return CombinedStatusResult {
            online: false,
            active_mode: "UNREACHABLE".into(),
            latency_ms: None,
            uptime: None,
            error_message: None,
        };
    }

    // Optional Uptime Fetch
    let uptime_res = timeout(
        Duration::from_secs(2),
        execute_ssh_cmd(ip, ssh_user, ssh_port, ssh_key_path, "uptime -p", 2),
    )
    .await;

    let uptime_str = match uptime_res {
        Ok(Ok(stdout)) if !stdout.is_empty() => Some(stdout),
        _ => None,
    };

    CombinedStatusResult {
        online: true,
        active_mode: "LOCAL".into(),
        latency_ms: measured_latency,
        uptime: uptime_str,
        error_message: None,
    }
}

async fn probe_remote_agent(
    agent_url: &str,
    zerotier_ip: &str,
    ssh_user: &str,
    ssh_port: u16,
    ssh_key_path: &str,
) -> CombinedStatusResult {
    if agent_url.trim().is_empty() {
        return CombinedStatusResult {
            online: false,
            active_mode: "UNREACHABLE".into(),
            latency_ms: None,
            uptime: None,
            error_message: Some("Chưa cấu hình URL Orange Pi Agent".into()),
        };
    }

    match check_agent_status(agent_url).await {
        Ok(agent_res) => {
            let mut uptime_str: Option<String> = None;

            // If ZimaOS ZeroTier IP configured and online, try fetching uptime
            if agent_res.online && !zerotier_ip.trim().is_empty() {
                let uptime_res = timeout(
                    Duration::from_secs(2),
                    execute_ssh_cmd(
                        zerotier_ip,
                        ssh_user,
                        ssh_port,
                        ssh_key_path,
                        "uptime -p",
                        2,
                    ),
                )
                .await;
                if let Ok(Ok(stdout)) = uptime_res {
                    if !stdout.is_empty() {
                        uptime_str = Some(stdout);
                    }
                }
            }

            CombinedStatusResult {
                online: agent_res.online,
                active_mode: "REMOTE".into(),
                latency_ms: agent_res.latency_ms,
                uptime: uptime_str,
                error_message: None,
            }
        }
        Err(err) => CombinedStatusResult {
            online: false,
            active_mode: "UNREACHABLE".into(),
            latency_ms: None,
            uptime: None,
            error_message: Some(err),
        },
    }
}
