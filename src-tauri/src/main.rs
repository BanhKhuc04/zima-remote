// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod agent_client;
mod config;
mod diagnostics;
mod ssh;
mod status;
mod tests;
mod tray;

use agent_client::{test_agent_health, AgentHealthResponse};
use config::{load_app_config, save_app_config, AppConfig};
use diagnostics::{run_full_diagnostics, DiagnosticReport};
use status::{evaluate_status, CombinedStatusResult};
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tray::{hide_popup_window, show_and_activate_popup};

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
async fn run_diagnostics() -> DiagnosticReport {
    let config = load_app_config();
    run_full_diagnostics(&config).await
}

#[tauri::command]
async fn test_agent_connection(agent_url: String) -> Result<AgentHealthResponse, String> {
    test_agent_health(&agent_url).await
}

#[tauri::command]
fn mark_frontend_ready() {
    tray::set_frontend_ready();
}

#[tauri::command]
fn close_popup_window(window: tauri::WebviewWindow) {
    hide_popup_window(&window);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
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
            run_diagnostics,
            test_agent_connection,
            close_popup_window,
            mark_frontend_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zima Remote application");
}
