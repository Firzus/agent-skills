use crate::{webview, Diagnostics};
use hmac::{Hmac, Mac};
use serde_json::{json, Value};
use sha2::Sha256;
use std::{
    ffi::c_void,
    fs,
    path::PathBuf,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, Runtime};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    net::windows::named_pipe::{NamedPipeServer, ServerOptions},
};
use windows::{
    core::HSTRING,
    Win32::{
        Foundation::{CloseHandle, LocalFree, HANDLE, HLOCAL},
        Security::{
            Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW,
            GetTokenInformation, SetFileSecurityW, TokenUser, DACL_SECURITY_INFORMATION,
            PROTECTED_DACL_SECURITY_INFORMATION, PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES,
            TOKEN_QUERY, TOKEN_USER,
        },
        Storage::FileSystem::CreateDirectoryW,
        System::Threading::{GetCurrentProcess, OpenProcessToken},
    },
};

const MAX_FRAME: u64 = 8 * 1024 * 1024;

struct Security(PSECURITY_DESCRIPTOR);
impl Drop for Security {
    fn drop(&mut self) {
        unsafe {
            let _ = LocalFree(Some(HLOCAL(self.0 .0)));
        }
    }
}

fn security() -> Result<Security, Box<dyn std::error::Error>> {
    unsafe {
        let mut token = HANDLE::default();
        OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token)?;
        let mut length = 0;
        let _ = GetTokenInformation(token, TokenUser, None, 0, &mut length);
        let mut data = vec![0u64; (length as usize).div_ceil(8)];
        let read = GetTokenInformation(
            token,
            TokenUser,
            Some(data.as_mut_ptr().cast()),
            length,
            &mut length,
        );
        let _ = CloseHandle(token);
        read?;
        let user = &*(data.as_ptr() as *const TOKEN_USER);
        let mut sid = windows::core::PWSTR::null();
        windows::Win32::Security::Authorization::ConvertSidToStringSidW(user.User.Sid, &mut sid)?;
        let sid_text = sid.to_string()?;
        let _ = LocalFree(Some(HLOCAL(sid.0.cast())));
        let mut descriptor = PSECURITY_DESCRIPTOR::default();
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            &HSTRING::from(format!("D:P(A;OICI;GA;;;{sid_text})")),
            1,
            &mut descriptor,
            None,
        )?;
        Ok(Security(descriptor))
    }
}

fn attributes(descriptor: &Security) -> SECURITY_ATTRIBUTES {
    SECURITY_ATTRIBUTES {
        nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor.0 .0,
        bInheritHandle: false.into(),
    }
}

struct RegistryFile(PathBuf);
impl Drop for RegistryFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

pub fn cleanup<R: Runtime>(app: &AppHandle<R>) {
    if let Some(file) = app.try_state::<RegistryFile>() {
        let _ = fs::remove_file(&file.0);
    }
}

pub fn start<R: Runtime>(
    app: AppHandle<R>,
    records: Arc<Diagnostics>,
    advanced: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let instance = uuid::Uuid::new_v4().to_string();
    let secret = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let endpoint = format!(r"\\.\pipe\tauri-agent-kit-{instance}");
    let root = PathBuf::from(std::env::var("LOCALAPPDATA")?).join("tauri-agent-kit");
    let directory = root.join("instances");
    let descriptor = security()?;
    let attrs = attributes(&descriptor);
    for path in [&root, &directory] {
        if path.is_symlink() {
            return Err("registry_symlink_rejected".into());
        }
        if !path.exists() {
            unsafe {
                CreateDirectoryW(&HSTRING::from(path.as_os_str()), Some(&attrs))?;
            }
        }
        unsafe {
            SetFileSecurityW(
                &HSTRING::from(path.as_os_str()),
                DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION,
                descriptor.0,
            )
            .ok()?;
        }
    }
    let make_pipe = |first: bool| -> std::io::Result<NamedPipeServer> {
        unsafe {
            ServerOptions::new()
                .first_pipe_instance(first)
                .reject_remote_clients(true)
                .create_with_security_attributes_raw(&endpoint, &attrs as *const _ as *mut c_void)
        }
    };
    let runtime = tauri::async_runtime::handle();
    let guard = runtime.inner().enter();
    let first = make_pipe(true)?;
    drop(guard);
    let manifest_path = directory.join(format!("{instance}.json"));
    fs::write(
        &manifest_path,
        serde_json::to_vec(
            &json!({ "version": 1, "instanceId": instance, "pid": std::process::id(), "startedAt": SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis(), "app": app.package_info().name, "endpoint": endpoint, "secret": secret, "advanced": advanced }),
        )?,
    )?;
    app.manage(RegistryFile(manifest_path));
    records.push(
        "log",
        json!({"provenance":"rust", "message":"diagnostics-ready"}),
    );
    tauri::async_runtime::spawn(async move {
        let mut pipe = first;
        loop {
            if pipe.connect().await.is_err() {
                break;
            }
            let next = match security().and_then(|descriptor| {
                let attrs = attributes(&descriptor);
                unsafe {
                    ServerOptions::new()
                        .reject_remote_clients(true)
                        .create_with_security_attributes_raw(
                            &endpoint,
                            &attrs as *const _ as *mut c_void,
                        )
                        .map_err(Into::into)
                }
            }) {
                Ok(next) => next,
                Err(_) => break,
            };
            let current = pipe;
            pipe = next;
            let app = app.clone();
            let records = records.clone();
            let secret = secret.clone();
            let instance = instance.clone();
            tauri::async_runtime::spawn(async move {
                let _ = tokio::time::timeout(
                    Duration::from_secs(15),
                    serve(current, app, records, secret, instance, advanced),
                )
                .await;
            });
        }
    });
    Ok(())
}

fn proof(secret: &str, message: &str) -> Result<String, String> {
    let bytes = hex::decode(secret).map_err(|_| "invalid_secret")?;
    let mut mac = Hmac::<Sha256>::new_from_slice(&bytes).map_err(|_| "invalid_secret")?;
    mac.update(message.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

async fn frame(reader: &mut BufReader<NamedPipeServer>) -> Result<Value, String> {
    use tokio::io::AsyncReadExt;
    let mut line = Vec::new();
    let length = reader
        .take(MAX_FRAME + 1)
        .read_until(b'\n', &mut line)
        .await
        .map_err(|_| "read_failed")?;
    if length == 0 || length as u64 > MAX_FRAME || line.last() != Some(&b'\n') {
        return Err("invalid_frame".into());
    }
    serde_json::from_slice(&line).map_err(|_| "invalid_json".into())
}

async fn send(reader: &mut BufReader<NamedPipeServer>, value: Value) -> Result<(), String> {
    let mut bytes = serde_json::to_vec(&value).map_err(|_| "invalid_result")?;
    if bytes.len() as u64 >= MAX_FRAME {
        return Err("result_too_large".into());
    }
    bytes.push(b'\n');
    reader
        .get_mut()
        .write_all(&bytes)
        .await
        .map_err(|_| "write_failed".into())
}

async fn serve<R: Runtime>(
    pipe: NamedPipeServer,
    app: AppHandle<R>,
    records: Arc<Diagnostics>,
    secret: String,
    instance: String,
    advanced: bool,
) -> Result<(), String> {
    let mut reader = BufReader::new(pipe);
    let hello = frame(&mut reader).await?;
    let nonce = hello["nonce"]
        .as_str()
        .filter(|n| n.len() == 64 && n.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or("invalid_nonce")?;
    send(
        &mut reader,
        json!({ "proof": proof(&secret, &format!("{nonce}:server"))?, "instanceId": instance }),
    )
    .await?;
    let call = frame(&mut reader).await?;
    let mut mac =
        Hmac::<Sha256>::new_from_slice(&hex::decode(&secret).map_err(|_| "invalid_secret")?)
            .map_err(|_| "invalid_secret")?;
    mac.update(format!("{nonce}:client").as_bytes());
    mac.verify_slice(
        &hex::decode(call["auth"].as_str().ok_or("authentication_required")?)
            .map_err(|_| "authentication_failed")?,
    )
    .map_err(|_| "authentication_failed")?;
    if call["id"] != nonce {
        return Err("invalid_request_id".into());
    }
    let method = call["method"].as_str().ok_or("method_required")?;
    let params = &call["params"];
    if method != "ping" && params["instanceId"] != instance {
        return Err("wrong_instance".into());
    }
    let _operation = if matches!(method, "ping" | "diagnose" | "get_logs" | "get_ipc_calls") {
        None
    } else {
        Some(tokio::select! {
            _ = reader.fill_buf() => return Err("connection_closed_or_extra_data".into()),
            guard = records.operations.lock() => guard,
        })
    };
    let result = match method {
        "ping" => Ok(json!({"instanceId":instance})),
        "get_logs" | "get_ipc_calls" => Ok(records.read(
            if method == "get_logs" { "log" } else { "ipc" },
            params["after"].as_u64().unwrap_or(0),
            params["limit"].as_u64().unwrap_or(50).min(200) as usize,
        )),
        "evaluate_js" | "invoke_command" if !advanced => Err("advanced_disabled".into()),
        _ => tokio::select! {
            _ = reader.fill_buf() => return Err("connection_closed_or_extra_data".into()),
            result = webview::dispatch(app, method, params.clone()) => result,
        },
    };
    send(
        &mut reader,
        match result {
            Ok(value) => json!({ "id": nonce, "result": value }),
            Err(error) => json!({ "id": nonce, "error": error }),
        },
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn authentication_separates_roles() {
        let secret = "11".repeat(32);
        assert_ne!(
            proof(&secret, "nonce:client").unwrap(),
            proof(&secret, "nonce:server").unwrap()
        );
        assert_eq!(proof(&secret, "nonce:client").unwrap().len(), 64);
    }
}
