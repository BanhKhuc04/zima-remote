use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow,
};

// Flyout state constants: 0 = HIDDEN, 1 = SHOWING, 2 = VISIBLE, 3 = HIDING
pub const STATE_HIDDEN: u8 = 0;
pub const STATE_SHOWING: u8 = 1;
pub const STATE_VISIBLE: u8 = 2;
pub const STATE_HIDING: u8 = 3;

pub static FLYOUT_STATE: AtomicU8 = AtomicU8::new(STATE_HIDDEN);
pub static LAST_ACTION_TIME: AtomicU64 = AtomicU64::new(0);
pub static OPENING_POPUP_GUARD: AtomicBool = AtomicBool::new(false);
pub static FRONTEND_READY: AtomicBool = AtomicBool::new(false);

pub fn set_frontend_ready() {
    FRONTEND_READY.store(true, Ordering::SeqCst);
}

#[allow(dead_code)]
pub fn is_frontend_ready() -> bool {
    FRONTEND_READY.load(Ordering::SeqCst)
}

fn get_now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(target_os = "windows")]
fn bring_to_foreground_win32(window: &WebviewWindow) {
    if let Ok(hwnd) = window.hwnd() {
        use winapi::shared::windef::HWND;
        use winapi::um::winuser::{
            BringWindowToTop, SetForegroundWindow, SetWindowPos, HWND_TOPMOST, SWP_NOMOVE,
            SWP_NOSIZE, SWP_SHOWWINDOW,
        };
        let raw_hwnd = hwnd.0 as HWND;
        unsafe {
            SetWindowPos(
                raw_hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
            );
            BringWindowToTop(raw_hwnd);
            SetForegroundWindow(raw_hwnd);
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn bring_to_foreground_win32(_window: &WebviewWindow) {}

pub fn is_window_foreground_and_focused(window: &WebviewWindow) -> bool {
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            use winapi::shared::windef::HWND;
            use winapi::um::winuser::GetForegroundWindow;
            let raw_hwnd = hwnd.0 as HWND;
            let fg_hwnd = unsafe { GetForegroundWindow() };
            if raw_hwnd != fg_hwnd {
                return false;
            }
        }
    }
    window.is_focused().unwrap_or(false)
}

pub fn position_window_at_bottom_right(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale_factor = monitor.scale_factor();
        let work_area = monitor.work_area(); // Work area bounds excluding taskbar
        let window_size = window.outer_size().unwrap_or(PhysicalSize::new(392, 520));

        let margin_x = (12.0 * scale_factor) as i32;
        let margin_y = (12.0 * scale_factor) as i32;

        let mut x = work_area.position.x + work_area.size.width as i32
            - window_size.width as i32
            - margin_x;
        let mut y = work_area.position.y + work_area.size.height as i32
            - window_size.height as i32
            - margin_y;

        // Clamp inside work_area bounds
        if x < work_area.position.x {
            x = work_area.position.x;
        }
        if y < work_area.position.y {
            y = work_area.position.y;
        }

        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}

pub fn show_and_activate_popup(window: &WebviewWindow) {
    let now = get_now_ms();
    let current_state = FLYOUT_STATE.load(Ordering::SeqCst);

    println!(
        "[popup_show_requested] State before activation: {}",
        current_state
    );

    if current_state == STATE_SHOWING || current_state == STATE_HIDING {
        println!("[popup_show_requested] Transitioning state -> ignored");
        return;
    }

    FLYOUT_STATE.store(STATE_SHOWING, Ordering::SeqCst);
    OPENING_POPUP_GUARD.store(true, Ordering::SeqCst);
    LAST_ACTION_TIME.store(now, Ordering::SeqCst);

    position_window_at_bottom_right(window);
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    bring_to_foreground_win32(window);
    println!("[popup_bring_to_front] Window unminimized, show and focus called");

    // Notify React frontend that popup is opening
    let _ = window.emit("popup-opening", ());

    let window_clone1 = window.clone();
    tokio::spawn(async move {
        // Secondary focus call after 120ms to compensate for Windows Explorer closing hidden-icons panel
        tokio::time::sleep(Duration::from_millis(120)).await;
        bring_to_foreground_win32(&window_clone1);
        let _ = window_clone1.set_focus();
    });

    let window_clone2 = window.clone();
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_millis(400)).await;
        if FLYOUT_STATE.load(Ordering::SeqCst) == STATE_SHOWING {
            FLYOUT_STATE.store(STATE_VISIBLE, Ordering::SeqCst);
            OPENING_POPUP_GUARD.store(false, Ordering::SeqCst);
            bring_to_foreground_win32(&window_clone2);
        }
    });
}

// Alias for compatibility
#[allow(dead_code)]
pub fn show_popup_window(window: &WebviewWindow) {
    show_and_activate_popup(window);
}

pub fn hide_popup_window(window: &WebviewWindow) {
    let current_state = FLYOUT_STATE.load(Ordering::SeqCst);
    println!(
        "[popup_hide_requested] State before hide: {}",
        current_state
    );
    if current_state == STATE_HIDDEN || current_state == STATE_HIDING {
        return;
    }

    FLYOUT_STATE.store(STATE_HIDING, Ordering::SeqCst);
    let _ = window.set_always_on_top(false);
    let _ = window.hide();
    FLYOUT_STATE.store(STATE_HIDDEN, Ordering::SeqCst);
    OPENING_POPUP_GUARD.store(false, Ordering::SeqCst);
    LAST_ACTION_TIME.store(get_now_ms(), Ordering::SeqCst);
}

pub fn toggle_popup_window(app: &AppHandle) {
    let now = get_now_ms();
    let last = LAST_ACTION_TIME.load(Ordering::SeqCst);

    // Debounce check 350ms
    if now.saturating_sub(last) < 350 {
        println!("[tray_left_click] Debounce triggered (< 350ms) -> ignoring click");
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        let current_state = FLYOUT_STATE.load(Ordering::SeqCst);
        match current_state {
            STATE_HIDDEN => {
                println!("[tray_left_click] State is HIDDEN -> show_and_activate_popup");
                show_and_activate_popup(&window);
            }
            STATE_VISIBLE => {
                if is_window_foreground_and_focused(&window) {
                    println!("[tray_left_click] State is VISIBLE and FOREGROUND/FOCUSED -> hide_popup_window");
                    hide_popup_window(&window);
                } else {
                    println!("[tray_left_click] State is VISIBLE but NOT foreground/focused -> show_and_activate_popup");
                    show_and_activate_popup(&window);
                }
            }
            _ => {
                println!("[tray_left_click] State is SHOWING/HIDING -> ignoring click");
            } // Ignore during SHOWING or HIDING
        }
    }
}

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Mở Zima Remote", true, None::<&str>)?;
    let check_item = MenuItem::with_id(app, "check", "Kiểm tra trạng thái", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Cài đặt", true, None::<&str>)?;
    let diagnostics_item = MenuItem::with_id(app, "diagnostics", "Chẩn đoán", true, None::<&str>)?;
    let exit_item = MenuItem::with_id(app, "exit", "Thoát hoàn toàn", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &check_item,
            &settings_item,
            &diagnostics_item,
            &exit_item,
        ],
    )?;

    let mut tray_builder = TrayIconBuilder::with_id("zima-remote-tray")
        .tooltip("Zima Remote")
        .menu(&menu);

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    let _tray = tray_builder
        .on_menu_event(|app, event| {
            println!("[tray_right_click] Item triggered: {}", event.id.as_ref());
            match event.id.as_ref() {
                "open" => {
                    toggle_popup_window(app);
                }
                "check" => {
                    if let Some(window) = app.get_webview_window("main") {
                        show_and_activate_popup(&window);
                        let _ = app.emit("tray-check", ());
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        show_and_activate_popup(&window);
                        let _ = app.emit("open-settings", ());
                    }
                }
                "diagnostics" => {
                    if let Some(window) = app.get_webview_window("main") {
                        show_and_activate_popup(&window);
                        let _ = app.emit("open-diagnostics", ());
                    }
                }
                "exit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                println!("[tray_left_click] Event received from tray icon click");
                toggle_popup_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
