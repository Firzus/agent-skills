use crate::native;
use serde_json::{json, Value};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager, Runtime, Webview};
use tokio::sync::oneshot;
use webview2_com::{CallDevToolsProtocolMethodCompletedHandler, CapturePreviewCompletedHandler};
use windows::{
    core::HSTRING,
    Win32::{
        Foundation::HGLOBAL,
        System::Com::{
            StructuredStorage::CreateStreamOnHGlobal, STATFLAG_NONAME, STATSTG, STREAM_SEEK_SET,
        },
    },
};

pub fn attach_console<R: Runtime>(view: &Webview<R>) {
    let Some(records) = view
        .try_state::<Arc<crate::Diagnostics>>()
        .map(|s| s.inner().clone())
    else {
        return;
    };
    let label = view.label().to_string();
    let _ = view.with_webview(move |platform| {
        let result = (|| -> windows::core::Result<()> {
            let core = unsafe { platform.controller().CoreWebView2()? };
            for event in ["Runtime.consoleAPICalled", "Runtime.exceptionThrown"] {
                let receiver = unsafe { core.GetDevToolsProtocolEventReceiver(&HSTRING::from(event))? };
                let records = records.clone(); let label = label.clone();
                let callback = webview2_com::DevToolsProtocolEventReceivedEventHandler::create(Box::new(move |_, args| {
                    if let Some(args) = args {
                        let mut raw = windows::core::PWSTR::null();
                        unsafe { args.ParameterObjectAsJson(&mut raw)?; }
                        let raw = webview2_com::take_pwstr(raw);
                        if let Ok(value) = serde_json::from_str::<Value>(&raw) {
                            records.push("log", json!({"provenance":"webview-console","webviewId":label,"event":event,"level":value["type"],"payload":"omitted"}));
                        }
                    }
                    Ok(())
                }));
                let mut token = 0;
                unsafe { receiver.add_DevToolsProtocolEventReceived(&callback,&mut token)?; }
            }
            let callback = CallDevToolsProtocolMethodCompletedHandler::create(Box::new(|_,_|Ok(())));
            unsafe { core.CallDevToolsProtocolMethod(&HSTRING::from("Runtime.enable"),&HSTRING::from("{}"),&callback)?; }
            Ok(())
        })();
        if let Err(error) = result { records.push("log",json!({"provenance":"rust","message":error.to_string()})); }
    });
}

type Reply = Arc<Mutex<Option<oneshot::Sender<Result<Value, String>>>>>;

fn cancelled(reply: &Reply) -> bool {
    reply
        .lock()
        .map(|tx| tx.as_ref().map(|tx| tx.is_closed()).unwrap_or(true))
        .unwrap_or(true)
}

fn deliver(reply: &Reply, result: Result<Value, String>) {
    if let Ok(mut sender) = reply.lock() {
        if let Some(sender) = sender.take() {
            let _ = sender.send(result);
        }
    }
}

async fn response(receiver: oneshot::Receiver<Result<Value, String>>) -> Result<Value, String> {
    tokio::time::timeout(Duration::from_secs(5), receiver)
        .await
        .map_err(|_| "webview_timeout")?
        .map_err(|_| "webview_closed")?
}

async fn cdp<R: Runtime>(view: &Webview<R>, method: &str, params: Value) -> Result<Value, String> {
    let (tx, rx) = oneshot::channel();
    let reply = Arc::new(Mutex::new(Some(tx)));
    let method = method.to_string();
    view.with_webview(move |platform| {
        if cancelled(&reply) {
            return;
        }
        let callback_reply = reply.clone();
        let callback =
            CallDevToolsProtocolMethodCompletedHandler::create(Box::new(move |status, data| {
                deliver(
                    &callback_reply,
                    status
                        .map_err(|e| e.to_string())
                        .and_then(|_| serde_json::from_str(&data).map_err(|e| e.to_string())),
                );
                Ok(())
            }));
        let result = unsafe {
            platform.controller().CoreWebView2().and_then(|core| {
                core.CallDevToolsProtocolMethod(
                    &HSTRING::from(method),
                    &HSTRING::from(params.to_string()),
                    &callback,
                )
            })
        };
        if let Err(error) = result {
            deliver(&reply, Err(error.to_string()));
        }
    })
    .map_err(|e| e.to_string())?;
    response(rx).await
}

async fn evaluate<R: Runtime>(view: &Webview<R>, expression: String) -> Result<Value, String> {
    let result = cdp(
        view,
        "Runtime.evaluate",
        json!({"expression":expression,"returnByValue":true,"awaitPromise":true}),
    )
    .await?;
    if result.get("exceptionDetails").is_some() {
        let description = result["exceptionDetails"]["exception"]["description"]
            .as_str()
            .unwrap_or("");
        for code in [
            "stale_reference",
            "target_not_allowed",
            "not_editable",
            "outside_viewport",
            "occluded",
        ] {
            if description.starts_with(&format!("Error: {code}")) {
                return Err(code.into());
            }
        }
        return Err("javascript_exception".into());
    }
    Ok(result["result"]["value"].clone())
}

async fn zoom<R: Runtime>(view: &Webview<R>, factor: Option<f64>) -> Result<Value, String> {
    let (tx, rx) = oneshot::channel();
    view.with_webview(move |platform| {
        if tx.is_closed() {
            return;
        }
        let result = (|| -> windows::core::Result<Value> {
            let controller = platform.controller();
            let mut old = 0.0;
            unsafe {
                controller.ZoomFactor(&mut old)?;
                if let Some(value) = factor {
                    controller.SetZoomFactor(value)?;
                }
            }
            Ok(json!({"previous":old,"current":factor.unwrap_or(old)}))
        })();
        let _ = tx.send(result.map_err(|e| e.to_string()));
    })
    .map_err(|e| e.to_string())?;
    response(rx).await
}

async fn native_focus<R: Runtime>(view: &Webview<R>) -> Result<(), String> {
    let tree = cdp(view, "Page.getFrameTree", json!({})).await?;
    let frame = tree["frameTree"]["frame"]["id"]
        .as_str()
        .ok_or("frame_unavailable")?;
    let context = cdp(
        view,
        "Page.createIsolatedWorld",
        json!({"frameId":frame,"worldName":"tauri-agent-kit-focus"}),
    )
    .await?;
    let result=cdp(view,"Runtime.evaluate",json!({"expression":"document.hasFocus()","contextId":context["executionContextId"],"returnByValue":true})).await?;
    if result["result"]["value"] != true {
        return Err("native_webview_not_focused".into());
    }
    Ok(())
}

async fn screenshot<R: Runtime>(view: &Webview<R>) -> Result<Value, String> {
    let factor = zoom(view, None).await?["current"].as_f64().unwrap_or(1.0);
    let dpi_scale = view.window().scale_factor().map_err(|e| e.to_string())?;
    let (tx, rx) = oneshot::channel();
    let reply = Arc::new(Mutex::new(Some(tx)));
    view.with_webview(move |platform| {
        if cancelled(&reply) { return; }
        let result = (|| -> windows::core::Result<()> {
            let core = unsafe { platform.controller().CoreWebView2()? };
            let stream = unsafe { CreateStreamOnHGlobal(HGLOBAL::default(), true)? };
            let output = stream.clone();
            let callback_reply = reply.clone();
            let callback = CapturePreviewCompletedHandler::create(Box::new(move |status| {
                let result = (|| -> Result<Value, String> {
                    status.map_err(|e| e.to_string())?;
                    let mut stat = STATSTG::default();
                    unsafe { output.Stat(&mut stat, STATFLAG_NONAME).map_err(|e| e.to_string())?; output.Seek(0, STREAM_SEEK_SET, None).map_err(|e| e.to_string())?; }
                    if stat.cbSize > 5 * 1024 * 1024 { return Err("screenshot_too_large".into()); }
                    let mut bytes = vec![0u8; stat.cbSize as usize];
                    let mut read = 0;
                    unsafe { output.Read(bytes.as_mut_ptr().cast(), bytes.len() as u32, Some(&mut read)).ok().map_err(|e| e.to_string())?; }
                    if read as usize != bytes.len() { return Err("incomplete_screenshot".into()); }
                    if bytes.len() < 24 { return Err("invalid_screenshot".into()); }
                    let width=u32::from_be_bytes(bytes[16..20].try_into().map_err(|_|"invalid_screenshot")?);
                    let height=u32::from_be_bytes(bytes[20..24].try_into().map_err(|_|"invalid_screenshot")?);
                    use base64::Engine;
                    Ok(json!({"data":base64::engine::general_purpose::STANDARD.encode(bytes),"source":"webview2-capture-preview","zoom":factor,"width":width,"height":height,"dpiScale":dpi_scale}))
                })();
                deliver(&callback_reply, result);
                Ok(())
            }));
            unsafe { core.CapturePreview(webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG, &stream, &callback) }
        })();
        if let Err(error) = result { deliver(&reply, Err(error.to_string())); }
    }).map_err(|e| e.to_string())?;
    response(rx).await
}

fn string<'a>(params: &'a Value, key: &str) -> Result<&'a str, String> {
    params[key].as_str().ok_or_else(|| format!("missing_{key}"))
}

async fn point<R: Runtime>(
    view: &Webview<R>,
    reference: &str,
    editable: bool,
) -> Result<Value, String> {
    let expression = format!("(() => {{ const s=window.__tauriAgentKitObservation; const entry=s?.entries.get({}); const e=entry?.element; if(!e || !e.isConnected) throw Error('stale_reference'); if(e.disabled || e.type==='password') throw Error('target_not_allowed'); if({editable} && !(e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e.isContentEditable)) throw Error('not_editable'); const r=e.getBoundingClientRect(); if(['x','y','width','height'].some(k=>Math.abs(r[k]-entry[k])>1) || entry.signature!==JSON.stringify([e.tagName,e.type,e.getAttribute('role'),e.getAttribute('aria-label'),e.textContent])) throw Error('stale_reference'); const x=r.x+r.width/2,y=r.y+r.height/2; if(x<0||y<0||x>=innerWidth||y>=innerHeight) throw Error('outside_viewport'); const hit=document.elementFromPoint(x,y); if(hit!==e && !e.contains(hit)) throw Error('occluded'); return {{x,y,devicePixelRatio}}; }})()", serde_json::to_string(reference).map_err(|e|e.to_string())?);
    evaluate(view, expression).await
}

pub async fn dispatch<R: Runtime>(
    app: AppHandle<R>,
    method: &str,
    params: Value,
) -> Result<Value, String> {
    if method == "list_targets" || method == "diagnose" {
        let inventory_app = app.clone();
        let windows = tokio::time::timeout(Duration::from_millis(750), tauri::async_runtime::spawn_blocking(move || {
            inventory_app.windows().into_iter().map(|(id,w)| json!({"windowId":id,"title":w.title().ok(),"visible":w.is_visible().ok(),"focused":w.is_focused().ok(),"minimized":w.is_minimized().ok(),"size":w.inner_size().ok(),"dpiScale":w.scale_factor().ok()})).collect::<Vec<_>>()
        })).await;
        let windows = match windows {
            Ok(Ok(windows)) => json!(windows),
            _ => json!({"error":"native_inventory_timeout"}),
        };
        let views: Vec<_> = app
            .webviews()
            .into_iter()
            .map(|(id, w)| json!({"webviewId":id,"windowId":w.window().label()}))
            .collect();
        let mut result = json!({"rustResponsive":true,"windows":windows,"webviews":views,"ipcCoverage":"explicit-instrumentation","platform":"windows"});
        if method == "diagnose" {
            let mut checks = Vec::new();
            for (id, view) in app.webviews() {
                let check = tokio::time::timeout(Duration::from_millis(500), evaluate(&view, "({readyState:document.readyState,visibility:document.visibilityState,focused:document.hasFocus()})".into())).await;
                checks.push(match check { Ok(Ok(value)) => json!({"webviewId":id,"responsive":true,"document":value}), _ => json!({"webviewId":id,"responsive":false,"reason":"probe_timeout_or_failure"}) });
            }
            result["readiness"] = json!(checks);
        }
        return Ok(result);
    }
    if method == "focus_window" {
        let window = app
            .get_window(string(&params, "windowId")?)
            .ok_or("window_not_found")?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(json!({"focused":window.is_focused().map_err(|e|e.to_string())?}));
    }
    let view = app
        .get_webview(string(&params, "webviewId")?)
        .ok_or("webview_not_found")?;
    match method {
        "snapshot" => evaluate(&view, include_str!("observe.js").into()).await,
        "screenshot" => screenshot(&view).await,
        "set_zoom" => {
            let factor = params["factor"]
                .as_f64()
                .filter(|v| (0.25..=5.0).contains(v))
                .ok_or("invalid_zoom")?;
            zoom(&view, Some(factor)).await
        }
        "evaluate_js" => evaluate(&view, string(&params, "expression")?.into()).await,
        "invoke_command" => {
            let command =
                serde_json::to_string(string(&params, "command")?).map_err(|e| e.to_string())?;
            evaluate(
                &view,
                format!(
                    "window.__TAURI_INTERNALS__.invoke({command},{})",
                    params["args"]
                ),
            )
            .await
        }
        "click" | "type_text" => {
            if !matches!(params["mode"].as_str(), Some("windows" | "webview") | None) {
                return Err("invalid_input_mode".into());
            }
            if method == "type_text" {
                let text = string(&params, "text")?;
                if text.len() > 65536 || text.contains(['\r', '\n']) {
                    return Err("literal_single_line_text_required".into());
                }
            }
            let point = point(&view, string(&params, "reference")?, method == "type_text").await?;
            let x = point["x"].as_f64().ok_or("invalid_point")?;
            let y = point["y"].as_f64().ok_or("invalid_point")?;
            if params["mode"] == "windows" {
                native::click(
                    &view,
                    x,
                    y,
                    point["devicePixelRatio"].as_f64().ok_or("invalid_scale")?,
                )?;
            } else {
                cdp(
                    &view,
                    "Input.dispatchMouseEvent",
                    json!({"type":"mousePressed","x":x,"y":y,"button":"left","clickCount":1}),
                )
                .await?;
                cdp(
                    &view,
                    "Input.dispatchMouseEvent",
                    json!({"type":"mouseReleased","x":x,"y":y,"button":"left","clickCount":1}),
                )
                .await?;
            }
            if method == "type_text" {
                let text = string(&params, "text")?;
                let reference = serde_json::to_string(string(&params, "reference")?)
                    .map_err(|e| e.to_string())?;
                tokio::time::timeout(Duration::from_secs(1), async {
                    loop {
                        let focused=evaluate(&view,format!("window.__tauriAgentKitObservation?.entries.get({reference})?.element===document.activeElement")).await?;
                        if focused == true {
                            return Ok::<(), String>(());
                        }
                        tokio::time::sleep(Duration::from_millis(20)).await;
                    }
                })
                .await
                .map_err(|_| "editable_target_lost_focus".to_string())??;
                if params["mode"] == "windows" {
                    native_focus(&view).await?;
                    native::text(&view, text)?;
                } else {
                    cdp(&view, "Input.insertText", json!({"text":text})).await?;
                }
            }
            Ok(
                json!({"dispatched":true,"mode":params["mode"],"verification":"take_a_fresh_snapshot"}),
            )
        }
        "press_key" => {
            let key = string(&params, "key")?;
            let code = native::key_code(key).ok_or("unsupported_key")?;
            if params["mode"] == "windows" {
                native_focus(&view).await?;
                native::key(&view, code)?;
            } else {
                cdp(&view,"Input.dispatchKeyEvent",json!({"type":"keyDown","key":key,"windowsVirtualKeyCode":code,"text":if key=="Enter" {"\r"} else {""}})).await?;
                cdp(
                    &view,
                    "Input.dispatchKeyEvent",
                    json!({"type":"keyUp","key":key,"windowsVirtualKeyCode":code}),
                )
                .await?;
            }
            Ok(json!({"dispatched":true,"mode":params["mode"]}))
        }
        "scroll" => {
            let x = params["x"].as_f64().ok_or("invalid_x")?;
            let y = params["y"].as_f64().ok_or("invalid_y")?;
            let delta = params["deltaY"]
                .as_f64()
                .filter(|v| v.abs() <= 2000.0)
                .ok_or("invalid_delta")?;
            cdp(
                &view,
                "Input.dispatchMouseEvent",
                json!({"type":"mouseWheel","x":x,"y":y,"deltaX":0,"deltaY":delta}),
            )
            .await
        }
        _ => Err("unknown_method".into()),
    }
}
