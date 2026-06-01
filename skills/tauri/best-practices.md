# Tauri v2 Best Practices

## Async Commands

Use owned parameters in async commands:

```rust
#[tauri::command]
async fn load_profile(user_id: String) -> Result<Profile, AppError> {
    profile_service::load(user_id).await
}
```

Avoid borrowed parameters:

```rust
#[tauri::command]
async fn load_profile(user_id: &str) -> Result<Profile, AppError> {
    // Invalid: async commands cannot hold borrowed command inputs.
}
```

## Frontend Invoke

Use the Tauri v2 API package:

```ts
import { invoke } from '@tauri-apps/api/core';

const profile = await invoke<Profile>('load_profile', { userId });
```

Do not use the v1 `@tauri-apps/api/tauri` import path in v2 projects. Remember
that frontend argument names are camelCase while Rust struct fields are usually
snake_case.

## Serializable Errors

IPC errors must serialize. A common pattern is `thiserror` plus a custom
`Serialize` implementation:

```rust
#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Not found: {0}")]
    NotFound(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

For richer frontend handling, serialize a tagged shape instead of a string.

## State

The type passed to `.manage(...)` must exactly match the type requested from
`State<T>`:

```rust
struct AppState {
    counter: u32,
}

#[tauri::command]
fn increment(state: tauri::State<'_, std::sync::Mutex<AppState>>) -> Result<u32, String> {
    let mut state = state.lock().map_err(|_| "state poisoned".to_string())?;
    state.counter += 1;
    Ok(state.counter)
}

tauri::Builder::default()
    .manage(std::sync::Mutex::new(AppState { counter: 0 }));
```

Use async-aware locks for async-heavy state, and avoid holding a lock across
slow I/O.

## Events And Channels

Use events for notifications:

```rust
use tauri::Emitter;

#[tauri::command]
fn start_task(app: tauri::AppHandle) -> Result<(), String> {
    app.emit("task-progress", 50).map_err(|error| error.to_string())
}
```

Use channels for typed, high-frequency streams:

```rust
#[derive(Clone, serde::Serialize)]
#[serde(tag = "event", content = "data")]
enum DownloadEvent {
    Progress { percent: u32 },
    Complete { path: String },
}

#[tauri::command]
async fn download(url: String, on_event: tauri::ipc::Channel<DownloadEvent>) -> Result<(), AppError> {
    on_event.send(DownloadEvent::Progress { percent: 1 })?;
    Ok(())
}
```

## Windows And App Handles

Use v2 window APIs:

```rust
use tauri::Manager;

fn focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
```

The v1 `app.get_window()` API is removed. In v2, import `tauri::Manager` and use
`get_webview_window`.

## Paths

Use Tauri path APIs and scoped filesystem permissions instead of hardcoded user
directories:

```rust
let data_dir = app.path().app_local_data_dir()?;
```

When the frontend accesses files, grant the smallest matching fs scope in
capabilities rather than widening access globally.

## Long Work

Do not block command handlers with slow filesystem, network, compression, or
child-process work. Use async I/O when available or spawn work with
`tauri::async_runtime::spawn`, then report progress through events or channels.
