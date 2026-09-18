// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod agent_client;
mod config;
mod diagnostics;
mod ssh;
mod status;
mod tests;
mod tray;
mod wol;

use agent_client::{
    send_remote_wake_packet, test_agent_health, AgentHealthResponse, AgentWakeResponse,
};
use config::{load_app_config, save_app_config, AppConfig};
use diagnostics::{run_full_diagnostics, DiagnosticReport};
use ssh::execute_ssh_cmd;
use status::{evaluate_status, CombinedStatusResult};
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tray::{hide_popup_window, show_and_activate_popup};
use wol::send_wol_packet;

#[tauri::command]
fn get_config() -> AppConfig {
    load_app_config()
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    save_app_config(&config)
}

#[tauri::command]
async fn check_server_status(
    mode: String,
    ip: String,
    ssh_user: String,
    ssh_port: u16,
    ssh_key_path: String,
    agent_url: String,
    zerotier_ip: String,
) -> CombinedStatusResult {
    evaluate_status(
        &mode,
        &ip,
        &ssh_user,
        ssh_port,
        &ssh_key_path,
        &agent_url,
        &zerotier_ip,
    )
    .await
}

#[tauri::command]
fn send_wake_packet(mac: String, broadcast_ip: String, port: u16) -> Result<(), String> {
    send_wol_packet(&mac, &broadcast_ip, port)
}

#[tauri::command]
async fn execute_ssh_shutdown(
    ip: String,
    user: String,
    port: u16,
    key_path: String,
) -> Result<String, String> {
    execute_ssh_cmd(
        &ip,
        &user,
        port,
        &key_path,
        "sudo -n /usr/bin/systemctl poweroff",
        8,
    )
    .await
}

#[tauri::command]
async fn execute_ssh_reboot(
    ip: String,
    user: String,
    port: u16,
    key_path: String,
) -> Result<String, String> {
    execute_ssh_cmd(
        &ip,
        &user,
        port,
        &key_path,
        "sudo -n /usr/bin/systemctl reboot",
        8,
    )
    .await
}

#[tauri::command]
async fn run_diagnostics() -> DiagnosticReport {
    let config = load_app_config();
    run_full_diagnostics(&config).await
}

#[tauri::command]
async fn test_agent_connection(agent_url: String) -> Result<AgentHealthResponse, String> {
    test_agent_health(&agent_url).await
}

#[tauri::command]
async fn send_remote_wake(
    agent_url: String,
    token: String,
    mac: String,
) -> Result<AgentWakeResponse, String> {
    send_remote_wake_packet(&agent_url, &token, &mac).await
}

#[tauri::command]
fn mark_frontend_ready() {
    tray::set_frontend_ready();
}

#[tauri::command]
fn close_popup_window(window: tauri::WebviewWindow) {
    hide_popup_window(&window);
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            println!("[single_instance_activation] Shortcut clicked from Start Menu/Search while app is running");
            if let Some(window) = app.get_webview_window("main") {
                show_and_activate_popup(&window);
            }
        }))
        .setup(|app| {
            tray::setup_system_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(w) = window.app_handle().get_webview_window("main") {
                    hide_popup_window(&w);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            check_server_status,
            send_wake_packet,
            execute_ssh_shutdown,
            execute_ssh_reboot,
            run_diagnostics,
            test_agent_connection,
            send_remote_wake,
            close_popup_window,
            open_external_url,
            mark_frontend_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zima Remote application");
}
