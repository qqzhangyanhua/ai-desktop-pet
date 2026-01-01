use tauri::{Emitter, Manager};

#[cfg(target_os = "macos")]
use tauri::{
    menu::{CheckMenuItem, MenuBuilder, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Wry,
};

mod scheduler;

#[cfg(target_os = "macos")]
const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("icons/32x32.png");

#[cfg(target_os = "macos")]
struct TrayState {
    click_through_item: CheckMenuItem<Wry>,
    click_through_enabled: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn set_tray_click_through_checked(
    enabled: bool,
    state: tauri::State<'_, TrayState>,
) -> Result<(), String> {
    state
        .click_through_enabled
        .store(enabled, std::sync::atomic::Ordering::Relaxed);
    state
        .click_through_item
        .set_checked(enabled)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(target_os = "macos")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        set_tray_click_through_checked,
        scheduler::scheduler_create_task,
        scheduler::scheduler_get_task,
        scheduler::scheduler_get_all_tasks,
        scheduler::scheduler_update_task,
        scheduler::scheduler_delete_task,
        scheduler::scheduler_enable_task,
        scheduler::scheduler_execute_now,
        scheduler::scheduler_get_executions
    ]);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        scheduler::scheduler_create_task,
        scheduler::scheduler_get_task,
        scheduler::scheduler_get_all_tasks,
        scheduler::scheduler_update_task,
        scheduler::scheduler_delete_task,
        scheduler::scheduler_enable_task,
        scheduler::scheduler_execute_now,
        scheduler::scheduler_get_executions
    ]);

    builder
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // 后台调度器（轮询 due tasks 并发事件给前端）
            let scheduler = scheduler::SchedulerRunner::new(app.handle().clone());
            scheduler.start();
            app.manage(scheduler);

            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            #[cfg(target_os = "macos")]
            {
                let open_settings_item =
                    MenuItem::with_id(app, "tray_open_settings", "设置中心", true, None::<&str>)?;
                let click_through_item = CheckMenuItem::with_id(
                    app,
                    "tray_click_through",
                    "鼠标穿透（点到桌面）",
                    true,
                    false,
                    None::<&str>,
                )?;
                let click_through_enabled =
                    std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
                let toggle_visibility_item = MenuItem::with_id(
                    app,
                    "tray_toggle_visibility",
                    "显示/隐藏",
                    true,
                    None::<&str>,
                )?;
                let quit_item = MenuItem::with_id(app, "tray_quit", "退出", true, None::<&str>)?;

                let tray_menu = MenuBuilder::new(app)
                    .item(&open_settings_item)
                    .item(&click_through_item)
                    .item(&PredefinedMenuItem::separator(app)?)
                    .item(&toggle_visibility_item)
                    .item(&quit_item)
                    .build()?;

                app.manage(TrayState {
                    click_through_item: click_through_item.clone(),
                    click_through_enabled: click_through_enabled.clone(),
                });

                TrayIconBuilder::new()
                    .icon(TRAY_ICON)
                    .icon_as_template(true)
                    .tooltip("AI Desktop Pet")
                    .menu(&tray_menu)
                    .on_menu_event(move |app, event| {
                        let id = event.id().as_ref();
                        let Some(main_window) = app.get_webview_window("main") else {
                            return;
                        };

                        match id {
                            "tray_open_settings" => {
                                // 打开设置前，强制关闭穿透，避免无法操作设置窗口
                                let _ = main_window.set_ignore_cursor_events(false);
                                let _ = click_through_item.set_checked(false);
                                click_through_enabled
                                    .store(false, std::sync::atomic::Ordering::Relaxed);
                                let _ = app.emit(
                                    "click-through-changed",
                                    serde_json::json!({ "enabled": false }),
                                );

                                let _ = main_window.show();
                                let _ = main_window.set_focus();
                                let _ = app.emit("open-settings", ());
                            }
                            "tray_click_through" => {
                                let enabled = !click_through_enabled
                                    .fetch_xor(true, std::sync::atomic::Ordering::Relaxed);
                                let _ = main_window.set_ignore_cursor_events(enabled);
                                let _ = click_through_item.set_checked(enabled);
                                let _ = app.emit(
                                    "click-through-changed",
                                    serde_json::json!({ "enabled": enabled }),
                                );
                            }
                            "tray_toggle_visibility" => {
                                let is_visible = main_window.is_visible().unwrap_or(true);
                                if is_visible {
                                    let _ = main_window.hide();
                                } else {
                                    let _ = main_window.show();
                                    let _ = main_window.set_focus();
                                }
                            }
                            "tray_quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }

            // macOS-specific: Set window to be transparent with vibrancy
            #[cfg(target_os = "macos")]
            {
                // Set the window background to transparent
                window.set_decorations(false)?;

                // Additional macOS-specific transparency settings
                // This ensures the WebView itself is transparent
                let _ = window.eval("document.body.style.background = 'transparent'");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
