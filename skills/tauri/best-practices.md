# Tauri v2 Best Practices

Patterns for **owned IPC**, state, events, channels, windows, and long work.
Read this file when adding or changing commands, invoke calls, or shared state.

## Async Commands

Use owned parameters in async commands:

```rust
#[tauri::command]
async fn load_profile(user_id: String) -> Result<Profile, AppError> {
    profile_service::load(user_id).await
}
```

Borrowed command inputs fail in async handlers (`user_id: &str` is invalid).
At the IPC boundary, owned values are required because Tauri deserializes
arguments and async commands may outlive the original call frame. After the
boundary, borrow in plain Rust helpers:

```rust
#[tauri::command]
async fn load_profile(user_id: String) -> Result<Profile, AppError> {
    profile_service::load_profile(&user_id).await
}

mod profile_service {
    pub async fn load_profile(user_id: &str) -> Result<Profile, AppError> {
        repository::load_profile(user_id).await.map_err(AppError::from)
    }
}
```

If a helper only reads a list or string, accept `&[T]` or `&str`; if it must
keep data after the command returns or move it into a task, make ownership
explicit in that helper.

## Frontend Invoke

Import from the v2 package path:

```ts
import { invoke } from '@tauri-apps/api/core';

const profile = await invoke<Profile>('load_profile', { userId });
```

The v1 path `@tauri-apps/api/tauri` is removed in v2. Frontend argument names
are camelCase; Rust struct fields are usually snake_case.

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
Keep command errors typed internally, then convert them at the IPC boundary. Use
`?`, `map_err`, and `ok_or_else` to preserve context without panicking:

```rust
#[tauri::command]
async fn read_config(app: tauri::AppHandle) -> Result<AppConfig, AppError> {
    let path = app.path().app_config_dir()?;
    let text = tokio::fs::read_to_string(path.join("config.json")).await?;
    serde_json::from_str(&text).map_err(AppError::from)
}
```

Return `Result` for missing files, invalid frontend input, plugin failures,
poisoned locks, or unavailable windows — runtime failures the frontend can
usually display or recover from.

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

State used from commands can be accessed concurrently. Prefer thread-safe
primitives that match the access pattern:

- `Mutex<T>` for short exclusive updates.
- `RwLock<T>` for many reads and rare writes.
- async-aware locks when the lock is used inside async-heavy code.
- `Arc<T>` when long-running tasks need shared ownership.
- `OnceLock<T>` or `LazyLock<T>` for process-wide immutable initialization.

Use thread-safe types in managed Tauri state and spawned work (`Rc`/`RefCell`
fight Tauri's async bounds). Copy or clone what you need under the lock, then
release it before filesystem, network, compression, or child-process work:

```rust
#[tauri::command]
async fn save_settings(
    state: tauri::State<'_, std::sync::Mutex<AppState>>,
) -> Result<(), AppError> {
    let settings = {
        let state = state.lock().map_err(|_| AppError::StatePoisoned)?;
        state.settings.clone()
    };

    settings_store::save(&settings).await
}
```

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

Import `tauri::Manager` and use `get_webview_window` (the v1 `get_window` API
is removed).

## Paths

Use Tauri path APIs and scoped filesystem permissions:

```rust
let data_dir = app.path().app_local_data_dir()?;
```

When the frontend accesses files, grant the smallest matching fs scope in
capabilities rather than widening access globally.

## Long Work

Run slow filesystem, network, compression, or child-process work with async I/O
or `tauri::async_runtime::spawn`, then report progress through events or
channels.

When spawning work, move only the data the task needs. Values captured by the
task generally need to be owned and satisfy `Send + 'static`; shared services
should usually be `Arc<T>` or managed Tauri state cloned through a handle:

```rust
use tauri::Emitter;

#[tauri::command]
fn start_indexing(app: tauri::AppHandle, root: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = indexer::run(&root).await {
            let _ = app.emit("indexer-error", error.to_string());
        }
    });

    Ok(())
}
```

Only add `#[expect(clippy::...)]` for Tauri-specific tradeoffs you understand,
and include the reason. Prefer fixing lints such as `redundant_clone`,
`clone_on_copy`, `needless_collect`, and `large_enum_variant` in command,
event, and IPC payload code.
