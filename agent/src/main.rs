use chrono::Utc;
use http_body_util::{combinators::BoxBody, BodyExt, Empty, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::net::{SocketAddr, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use uuid::Uuid;

const EXPECTED_MAC: &str = "fc:aa:14:6a:4c:bb";
const BROADCAST_IP: &str = "192.168.0.255";
const WOL_PORT: u16 = 9;
const TARGET_IP: &str = "192.168.0.110";

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    agent: String,
    version: String,
}

#[derive(Serialize)]
struct StatusResponse {
    online: bool,
    latency_ms: Option<u64>,
    http_reachable: bool,
    ssh_reachable: bool,
    checked_at: String,
}

#[derive(Deserialize)]
struct WakeRequest {
    mac: String,
}

#[derive(Serialize)]
struct WakeResponse {
    accepted: bool,
    request_id: String,
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
        let t = content.trim().to_string();
        if !t.is_empty() {
            return t;
        }
    }

    // Fallback default secure token placeholder if unconfigured
    "default_zima_agent_secure_token_change_me_32bytes".to_string()
}

fn send_wol(mac: &str) -> Result<(), String> {
    let clean = mac.replace([':', '-'], "");
    if clean.len() != 12 {
        return Err("Invalid MAC length".into());
    }

    let mut mac_bytes = [0u8; 6];
    for i in 0..6 {
        mac_bytes[i] = u8::from_str_radix(&clean[i * 2..i * 2 + 2], 16)
            .map_err(|_| "Invalid hex".to_string())?;
    }

    let mut packet = Vec::with_capacity(102);
    packet.extend_from_slice(&[0xFF; 6]);
    for _ in 0..16 {
        packet.extend_from_slice(&mac_bytes);
    }

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.set_broadcast(true).map_err(|e| e.to_string())?;
    let dest = format!("{}:{}", BROADCAST_IP, WOL_PORT);

    // Send packet 3 times
    for _ in 0..3 {
        socket.send_to(&packet, &dest).map_err(|e| e.to_string())?;
        std::thread::sleep(Duration::from_millis(100));
    }

    Ok(())
}

fn check_lan_server() -> StatusResponse {
    let start = Instant::now();
    let timeout_dur = Duration::from_millis(1200);

    let http_addr: Option<SocketAddr> = format!("{}:80", TARGET_IP).parse().ok();
    let ssh_addr: Option<SocketAddr> = format!("{}:22", TARGET_IP).parse().ok();

    let http_ok = http_addr.map_or(false, |a| TcpStream::connect_timeout(&a, timeout_dur).is_ok());
    let ssh_ok = ssh_addr.map_or(false, |a| TcpStream::connect_timeout(&a, timeout_dur).is_ok());

    let online = http_ok || ssh_ok;
    let latency = if online {
        Some(start.elapsed().as_millis() as u64)
    } else {
        None
    };

    StatusResponse {
        online,
        latency_ms: latency,
        http_reachable: http_ok,
        ssh_reachable: ssh_ok,
        checked_at: Utc::now().to_rfc3339(),
    }
}

async fn handle_request(
    req: Request<hyper::body::Incoming>,
    config: Arc<AgentConfig>,
) -> Result<Response<BoxBody<Bytes, hyper::Error>>, hyper::Error> {
    let path = req.uri().path();
    let method = req.method();

    if method == Method::GET && path == "/v1/health" {
        let resp = HealthResponse {
            status: "ok".into(),
            agent: "zima-remote-agent".into(),
            version: "1.0.0".into(),
        };
        let body = serde_json::to_string(&resp).unwrap();
        return Ok(Response::builder()
            .header("Content-Type", "application/json")
            .body(Full::new(Bytes::from(body)).map_err(|e| match e {}).boxed())
            .unwrap());
    }

    if method == Method::GET && path == "/v1/server/status" {
        let status = check_lan_server();
        let body = serde_json::to_string(&status).unwrap();
        return Ok(Response::builder()
            .header("Content-Type", "application/json")
            .body(Full::new(Bytes::from(body)).map_err(|e| match e {}).boxed())
            .unwrap());
    }

    if method == Method::POST && path == "/v1/server/wake" {
        // Bearer auth check
        let auth_hdr = req
            .headers()
            .get("Authorization")
            .and_then(|h| h.to_str().ok());

        let expected_header = format!("Bearer {}", config.bearer_token);
        if auth_hdr != Some(&expected_header) {
            let err_body = serde_json::to_string(&ErrorResponse {
                error: "Unauthorized".into(),
            })
            .unwrap();
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body(Full::new(Bytes::from(err_body)).map_err(|e| match e {}).boxed())
                .unwrap());
        }

        // Collect body bytes safely
        let body_bytes = req.into_body().collect().await?.to_bytes();
        let wake_req: Result<WakeRequest, _> = serde_json::from_slice(&body_bytes);

        match wake_req {
            Ok(data) => {
                let clean_req_mac = data.mac.replace([':', '-'], "").to_lowercase();
                let clean_exp_mac = EXPECTED_MAC.replace([':', '-'], "").to_lowercase();

                if clean_req_mac != clean_exp_mac {
                    let err_body = serde_json::to_string(&ErrorResponse {
                        error: "Target MAC not in allowlist".into(),
                    })
                    .unwrap();
                    return Ok(Response::builder()
                        .status(StatusCode::FORBIDDEN)
                        .header("Content-Type", "application/json")
                        .body(Full::new(Bytes::from(err_body)).map_err(|e| match e {}).boxed())
                        .unwrap());
                }

                if let Err(e) = send_wol(&EXPECTED_MAC) {
                    let err_body = serde_json::to_string(&ErrorResponse { error: e }).unwrap();
                    return Ok(Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header("Content-Type", "application/json")
                        .body(Full::new(Bytes::from(err_body)).map_err(|e| match e {}).boxed())
                        .unwrap());
                }

                let resp = WakeResponse {
                    accepted: true,
                    request_id: Uuid::new_v4().to_string(),
                    message: "Magic Packet sent 3x to 192.168.0.255:9".into(),
                };
                let body_str = serde_json::to_string(&resp).unwrap();
                return Ok(Response::builder()
                    .header("Content-Type", "application/json")
                    .body(Full::new(Bytes::from(body_str)).map_err(|e| match e {}).boxed())
                    .unwrap());
            }
            Err(_) => {
                let err_body = serde_json::to_string(&ErrorResponse {
                    error: "Invalid JSON body".into(),
                })
                .unwrap();
                return Ok(Response::builder()
                    .status(StatusCode::BAD_REQUEST)
                    .header("Content-Type", "application/json")
                    .body(Full::new(Bytes::from(err_body)).map_err(|e| match e {}).boxed())
                    .unwrap());
            }
        }
    }

    Ok(Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Empty::<Bytes>::new().map_err(|e| match e {}).boxed())
        .unwrap())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let token = load_token();
    let config = Arc::new(AgentConfig {
        bearer_token: token,
    });

    let port: u16 = env::var("AGENT_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8090);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr).await?;
    println!("zima-remote-agent v1.0.0 listening on http://{}", addr);

    loop {
        let (stream, _) = listener.accept().await?;
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
                eprintln!("Error serving connection: {:?}", err);
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mac_validation() {
        let valid = "fc:aa:14:6a:4c:bb";
        let clean_v = valid.replace([':', '-'], "").to_lowercase();
        let clean_e = EXPECTED_MAC.replace([':', '-'], "").to_lowercase();
        assert_eq!(clean_v, clean_e);
    }

    #[test]
    fn test_health_response() {
        let resp = HealthResponse {
            status: "ok".into(),
            agent: "zima-remote-agent".into(),
            version: "1.0.0".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("zima-remote-agent"));
    }
}
