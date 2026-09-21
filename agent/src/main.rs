use chrono::Utc;
use http_body_util::{combinators::BoxBody, BodyExt, Empty, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use serde::Serialize;
use std::env;
use std::fs;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;

const AGENT_VERSION: &str = "4.0.0";

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    agent: String,
    version: String,
}

#[derive(Serialize)]
struct MachineStatusResponse {
    online: bool,
    hostname: String,
    uptime_seconds: u64,
    cpu_temp_c: Option<f32>,
    load_1: Option<f32>,
    memory_total_mb: Option<u64>,
    memory_used_mb: Option<u64>,
    disk_total_gb: Option<f64>,
    disk_used_gb: Option<f64>,
    ip_addresses: Vec<String>,
    checked_at: String,
}

#[derive(Serialize)]
struct ActionResponse {
    accepted: bool,
    action: String,
    message: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

struct AgentConfig {
    bearer_token: String,
}

fn load_token() -> String {
    if let Ok(env_token) = env::var("AGENT_BEARER_TOKEN") {
        if !env_token.trim().is_empty() {
            return env_token.trim().to_string();
        }
    }

    let mut token_path = PathBuf::from("/etc/zima-remote-agent/token");
    if !token_path.exists() {
        token_path = PathBuf::from("agent_token.txt");
    }

    if let Ok(content) = fs::read_to_string(&token_path) {
        let token = content.trim().to_string();
        if !token.is_empty() {
            return token;
        }
    }

    eprintln!(
        "WARNING: no AGENT_BEARER_TOKEN configured; using an insecure development fallback"
    );
    "change-me-zima-agent-token".to_string()
}

fn read_uptime_seconds() -> u64 {
    fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|s| s.split_whitespace().next()?.parse::<f64>().ok())
        .map(|v| v.max(0.0) as u64)
        .unwrap_or(0)
}

fn read_load_1() -> Option<f32> {
    fs::read_to_string("/proc/loadavg")
        .ok()
        .and_then(|s| s.split_whitespace().next()?.parse::<f32>().ok())
}

fn read_memory_mb() -> (Option<u64>, Option<u64>) {
    let content = match fs::read_to_string("/proc/meminfo") {
        Ok(v) => v,
        Err(_) => return (None, None),
    };

    let mut total_kb: Option<u64> = None;
    let mut available_kb: Option<u64> = None;

    for line in content.lines() {
        if let Some(value) = line.strip_prefix("MemTotal:") {
            total_kb = value
                .split_whitespace()
                .next()
                .and_then(|v| v.parse::<u64>().ok());
        } else if let Some(value) = line.strip_prefix("MemAvailable:") {
            available_kb = value
                .split_whitespace()
                .next()
                .and_then(|v| v.parse::<u64>().ok());
        }
    }

    match (total_kb, available_kb) {
        (Some(total), Some(available)) => {
            let total_mb = total / 1024;
            let used_mb = total.saturating_sub(available) / 1024;
            (Some(total_mb), Some(used_mb))
        }
        _ => (None, None),
    }
}

fn read_disk_gb() -> (Option<f64>, Option<f64>) {
    let output = match Command::new("df").args(["-Pk", "/"]).output() {
        Ok(v) if v.status.success() => v,
        _ => return (None, None),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = match stdout.lines().nth(1) {
        Some(v) => v,
        None => return (None, None),
    };
    let cols: Vec<&str> = line.split_whitespace().collect();
    if cols.len() < 3 {
        return (None, None);
    }

    let total_kb = cols[1].parse::<f64>().ok();
    let used_kb = cols[2].parse::<f64>().ok();
    match (total_kb, used_kb) {
        (Some(total), Some(used)) => (
            Some(total / 1024.0 / 1024.0),
            Some(used / 1024.0 / 1024.0),
        ),
        _ => (None, None),
    }
}

fn read_temp_value(path: &Path) -> Option<f32> {
    let raw = fs::read_to_string(path).ok()?;
    let mut value = raw.trim().parse::<f32>().ok()?;
    if value > 500.0 {
        value /= 1000.0;
    }
    if (-20.0..=130.0).contains(&value) {
        Some(value)
    } else {
        None
    }
}

fn read_cpu_temperature_c() -> Option<f32> {
    let mut values: Vec<f32> = Vec::new();

    if let Ok(entries) = fs::read_dir("/sys/class/thermal") {
        for entry in entries.flatten() {
            let path = entry.path().join("temp");
            if let Some(v) = read_temp_value(&path) {
                values.push(v);
            }
        }
    }

    if let Ok(hwmons) = fs::read_dir("/sys/class/hwmon") {
        for hwmon in hwmons.flatten() {
            if let Ok(files) = fs::read_dir(hwmon.path()) {
                for file in files.flatten() {
                    let name = file.file_name();
                    let name = name.to_string_lossy();
                    if name.starts_with("temp") && name.ends_with("_input") {
                        if let Some(v) = read_temp_value(&file.path()) {
                            values.push(v);
                        }
                    }
                }
            }
        }
    }

    values.into_iter().reduce(f32::max)
}

fn read_ip_addresses() -> Vec<String> {
    let output = match Command::new("hostname").arg("-I").output() {
        Ok(v) if v.status.success() => v,
        _ => return Vec::new(),
    };

    String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

fn read_hostname() -> String {
    fs::read_to_string("/etc/hostname")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| env::var("HOSTNAME").ok())
        .unwrap_or_else(|| "linux-server".to_string())
}

fn collect_machine_status() -> MachineStatusResponse {
    let (memory_total_mb, memory_used_mb) = read_memory_mb();
    let (disk_total_gb, disk_used_gb) = read_disk_gb();

    MachineStatusResponse {
        online: true,
        hostname: read_hostname(),
        uptime_seconds: read_uptime_seconds(),
        cpu_temp_c: read_cpu_temperature_c(),
        load_1: read_load_1(),
        memory_total_mb,
        memory_used_mb,
        disk_total_gb,
        disk_used_gb,
        ip_addresses: read_ip_addresses(),
        checked_at: Utc::now().to_rfc3339(),
    }
}

fn is_authorized(req: &Request<hyper::body::Incoming>, config: &AgentConfig) -> bool {
    let expected = format!("Bearer {}", config.bearer_token);
    req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        == Some(expected.as_str())
}

fn boxed_text(body: String) -> BoxBody<Bytes, hyper::Error> {
    Full::new(Bytes::from(body))
        .map_err(|never| match never {})
        .boxed()
}

fn json_response<T: Serialize>(status: StatusCode, value: &T) -> Response<BoxBody<Bytes, hyper::Error>> {
    let body = serde_json::to_string(value).unwrap_or_else(|_| "{\"error\":\"serialization failure\"}".to_string());
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Cache-Control", "no-store")
        .body(boxed_text(body))
        .unwrap()
}

fn schedule_system_action(action: &'static str) {
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_millis(750)).await;
        if let Err(err) = Command::new("systemctl").arg(action).status() {
            eprintln!("systemctl {} failed: {}", action, err);
        }
    });
}

async fn handle_request(
    req: Request<hyper::body::Incoming>,
    config: Arc<AgentConfig>,
) -> Result<Response<BoxBody<Bytes, hyper::Error>>, hyper::Error> {
    let path = req.uri().path();
    let method = req.method();

    if method == Method::GET && path == "/v1/health" {
        return Ok(json_response(
            StatusCode::OK,
            &HealthResponse {
                status: "ok".into(),
                agent: "zima-remote-agent".into(),
                version: AGENT_VERSION.into(),
            },
        ));
    }

    if method == Method::GET && (path == "/v1/status" || path == "/v1/server/status") {
        return Ok(json_response(StatusCode::OK, &collect_machine_status()));
    }

    if method == Method::POST
        && (path == "/v1/system/poweroff" || path == "/v1/system/reboot")
    {
        if !is_authorized(&req, &config) {
            return Ok(json_response(
                StatusCode::UNAUTHORIZED,
                &ErrorResponse {
                    error: "Unauthorized".into(),
                },
            ));
        }

        let (action, message) = if path.ends_with("poweroff") {
            ("poweroff", "Graceful poweroff scheduled")
        } else {
            ("reboot", "Graceful reboot scheduled")
        };

        schedule_system_action(action);
        return Ok(json_response(
            StatusCode::ACCEPTED,
            &ActionResponse {
                accepted: true,
                action: action.to_string(),
                message: message.to_string(),
            },
        ));
    }

    Ok(Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Empty::<Bytes>::new().map_err(|never| match never {}).boxed())
        .unwrap())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = Arc::new(AgentConfig {
        bearer_token: load_token(),
    });

    let port: u16 = env::var("AGENT_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8090);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr).await?;
    println!(
        "zima-remote-agent v{} listening on http://{}",
        AGENT_VERSION, addr
    );

    loop {
        let (stream, peer) = listener.accept().await?;
        let io = TokioIo::new(stream);
        let config_clone = Arc::clone(&config);

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |req| handle_request(req, Arc::clone(&config_clone))),
                )
                .await
            {
                eprintln!("connection from {} failed: {:?}", peer, err);
            }
        });
    }
}
