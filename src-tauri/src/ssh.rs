use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;

const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Executes an SSH command on target host cleanly without flashing any CLI window.
pub async fn execute_ssh_cmd(
    ip: &str,
    user: &str,
    port: u16,
    key_path: &str,
    command: &str,
    timeout_secs: u64,
) -> Result<String, String> {
    let destination = format!("{}@{}", user, ip);
    let port_str = port.to_string();

    let mut cmd = Command::new("ssh");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.args([
        "-i",
        key_path,
        "-p",
        &port_str,
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "ConnectTimeout=4",
        &destination,
        command,
    ]);

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let result = timeout(Duration::from_secs(timeout_secs), cmd.output()).await;

    match result {
        Ok(Ok(output)) => {
            let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr_str = String::from_utf8_lossy(&output.stderr).trim().to_string();

            if output.status.success() {
                Ok(stdout_str)
            } else {
                let err_msg = if !stderr_str.is_empty() {
                    stderr_str
                } else if !stdout_str.is_empty() {
                    stdout_str
                } else {
                    format!("Exit code: {}", output.status.code().unwrap_or(-1))
                };
                Err(err_msg)
            }
        }
        Ok(Err(e)) => Err(format!("Lỗi thực thi lệnh SSH: {}", e)),
        Err(_) => Err(format!("SSH Command timeout sau {} giây", timeout_secs)),
    }
}
