use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentHealthResponse {
    pub status: String,
    pub agent: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentStatusResponse {
    pub online: bool,
    pub latency_ms: Option<u64>,
    pub http_reachable: bool,
    pub ssh_reachable: bool,
    pub checked_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentWakeResponse {
    pub accepted: bool,
    pub request_id: String,
    pub message: String,
}

pub async fn check_agent_status(agent_url: &str) -> Result<AgentStatusResponse, String> {
    let client = Client::builder()
        .timeout(Duration::from_millis(2500))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1/server/status", agent_url.trim_end_matches('/'));
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Lỗi kết nối tới Agent: {}", e))?;

    if resp.status().is_success() {
        let data: AgentStatusResponse = resp
            .json()
            .await
            .map_err(|e| format!("Lỗi parse JSON: {}", e))?;
        Ok(data)
    } else {
        Err(format!("Agent trả về HTTP {}", resp.status()))
    }
}

pub async fn send_remote_wake_packet(
    agent_url: &str,
    token: &str,
    mac: &str,
) -> Result<AgentWakeResponse, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1/server/wake", agent_url.trim_end_matches('/'));
    let body = serde_json::json!({ "mac": mac });

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token.trim()))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Lỗi gọi API Wake tới Agent: {}", e))?;

    let status_code = resp.status();
    if status_code.is_success() {
        let data: AgentWakeResponse = resp
            .json()
            .await
            .map_err(|e| format!("Lỗi parse JSON: {}", e))?;
        Ok(data)
    } else {
        let err_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "Lỗi không xác định".into());
        Err(format!(
            "Agent từ chối request (HTTP {}): {}",
            status_code, err_text
        ))
    }
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
        .map_err(|e| format!("Lỗi kết nối tới Agent: {}", e))?;

    if resp.status().is_success() {
        let data: AgentHealthResponse = resp
            .json()
            .await
            .map_err(|e| format!("Lỗi parse JSON: {}", e))?;
        Ok(data)
    } else {
        Err(format!("Agent HTTP status {}", resp.status()))
    }
}
