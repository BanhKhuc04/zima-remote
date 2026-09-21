use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentHealthResponse {
    pub status: String,
    pub agent: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentStatusResponse {
    pub online: bool,
    pub hostname: String,
    pub uptime_seconds: u64,
    pub cpu_temp_c: Option<f32>,
    pub load_1: Option<f32>,
    pub memory_total_mb: Option<u64>,
    pub memory_used_mb: Option<u64>,
    pub disk_total_gb: Option<f64>,
    pub disk_used_gb: Option<f64>,
    pub ip_addresses: Vec<String>,
    pub checked_at: String,
    #[serde(default)]
    pub latency_ms: Option<u64>,
}

pub async fn check_agent_status(agent_url: &str) -> Result<AgentStatusResponse, String> {
    let client = Client::builder()
        .timeout(Duration::from_millis(3000))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1/status", agent_url.trim_end_matches('/'));
    let start = Instant::now();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Lỗi kết nối tới Linux Agent: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Linux Agent trả về HTTP {}", resp.status()));
    }

    let mut data: AgentStatusResponse = resp
        .json()
        .await
        .map_err(|e| format!("Lỗi parse JSON: {}", e))?;
    data.latency_ms = Some(start.elapsed().as_millis() as u64);
    Ok(data)
}

pub async fn test_agent_health(agent_url: &str) -> Result<AgentHealthResponse, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1/health", agent_url.trim_end_matches('/'));
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Lỗi kết nối tới Linux Agent: {}", e))?;

    if resp.status().is_success() {
        resp.json()
            .await
            .map_err(|e| format!("Lỗi parse JSON: {}", e))
    } else {
        Err(format!("Linux Agent HTTP status {}", resp.status()))
    }
}
