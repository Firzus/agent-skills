#[cfg(windows)]
mod native;
mod records;
#[cfg(windows)]
mod transport;
#[cfg(windows)]
mod webview;

use serde::Deserialize;
use std::sync::Arc;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use records::Diagnostics;

#[derive(Clone, Default)]
pub struct Config {
    pub enabled: bool,
    pub advanced: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IpcRecord {
    command: String,
    duration_ms: f64,
    outcome: String,
}

#[tauri::command]
fn record_ipc<R: Runtime>(webview: tauri::Webview<R>, record: IpcRecord) -> Result<(), String> {
    let state = webview
        .try_state::<Arc<Diagnostics>>()
        .ok_or("diagnostics_disabled")?;
    if record.command.len() > 256
        || !record.duration_ms.is_finite()
        || record.duration_ms < 0.0
        || !["ok", "error"].contains(&record.outcome.as_str())
    {
        return Err("invalid_ipc_record".into());
    }
    state.push("ipc", serde_json::json!({ "command": record.command, "durationMs": record.duration_ms, "outcome": record.outcome, "webviewId": webview.label(), "provenance": "frontend-instrumentation" }));
    Ok(())
}

pub fn init<R: Runtime>(config: Config) -> TauriPlugin<R> {
    Builder::new("agent-kit")
        .invoke_handler(tauri::generate_handler![record_ipc])
        .setup(move |app, _| {
            if !cfg!(debug_assertions) || !config.enabled {
                return Ok(());
            }
            let state = Arc::new(Diagnostics::default());
            app.manage(state.clone());
            #[cfg(windows)]
            transport::start(app.clone(), state, config.advanced)?;
            Ok(())
        })
        .on_webview_ready(|view| {
            #[cfg(windows)]
            if view.try_state::<Arc<Diagnostics>>().is_some() {
                webview::attach_console(&view);
            }
        })
        .on_event(|app, event| {
            #[cfg(windows)]
            if matches!(event, tauri::RunEvent::Exit) {
                transport::cleanup(app);
            }
        })
        .build()
}
