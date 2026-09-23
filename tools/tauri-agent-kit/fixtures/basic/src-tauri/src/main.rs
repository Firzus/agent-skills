#[tauri::command]
fn echo(message: String) -> String {
    message
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_agent_kit::init(
            tauri_plugin_agent_kit::Config {
                enabled: true,
                advanced: std::env::var_os("AGENT_KIT_ADVANCED").is_some(),
            },
        ))
        .invoke_handler(tauri::generate_handler![echo])
        .run(tauri::generate_context!())
        .expect("fixture failed");
}
