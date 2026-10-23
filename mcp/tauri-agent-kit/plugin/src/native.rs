use tauri::{Runtime, Webview};
use windows::Win32::{
    Foundation::POINT,
    UI::{
        Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP,
            KEYEVENTF_UNICODE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEINPUT, VIRTUAL_KEY,
        },
        WindowsAndMessaging::{
            GetAncestor, GetForegroundWindow, GetWindowThreadProcessId, SetCursorPos,
            WindowFromPoint, GA_ROOT,
        },
    },
};

fn foreground<R: Runtime>(view: &Webview<R>) -> Result<(), String> {
    let hwnd = view.window().hwnd().map_err(|e| e.to_string())?;
    if unsafe { GetForegroundWindow() } != hwnd {
        return Err("native_target_not_foreground".into());
    }
    Ok(())
}

fn send(inputs: &[INPUT]) -> Result<(), String> {
    let sent = unsafe { SendInput(inputs, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize != inputs.len() {
        return Err("native_input_denied_or_partial_check_integrity_level".into());
    }
    Ok(())
}

pub fn click<R: Runtime>(view: &Webview<R>, x: f64, y: f64, scale: f64) -> Result<(), String> {
    foreground(view)?;
    let window = view.window();
    let origin = window.inner_position().map_err(|e| e.to_string())?;
    let offset = view
        .bounds()
        .map_err(|e| e.to_string())?
        .position
        .to_physical::<i32>(window.scale_factor().map_err(|e| e.to_string())?);
    let point = POINT {
        x: origin.x + offset.x + (x * scale).round() as i32,
        y: origin.y + offset.y + (y * scale).round() as i32,
    };
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    unsafe {
        let hit = WindowFromPoint(point);
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if GetAncestor(hit, GA_ROOT) != hwnd || pid != std::process::id() {
            return Err("native_hit_test_rejected".into());
        }
        SetCursorPos(point.x, point.y).map_err(|e| e.to_string())?;
    }
    foreground(view)?;
    send(
        &[MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP].map(|flags| INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dwFlags: flags,
                    ..Default::default()
                },
            },
        }),
    )
}

pub fn text<R: Runtime>(view: &Webview<R>, text: &str) -> Result<(), String> {
    foreground(view)?;
    let inputs: Vec<_> = text
        .encode_utf16()
        .flat_map(|unit| {
            [KEYEVENTF_UNICODE, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP].map(|flags| INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wScan: unit,
                        dwFlags: flags,
                        ..Default::default()
                    },
                },
            })
        })
        .collect();
    send(&inputs)
}

pub fn key<R: Runtime>(view: &Webview<R>, code: u16) -> Result<(), String> {
    foreground(view)?;
    send(&[Default::default(), KEYEVENTF_KEYUP].map(|flags| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(code),
                dwFlags: flags,
                ..Default::default()
            },
        },
    }))
}

pub fn key_code(key: &str) -> Option<u16> {
    Some(match key {
        "Enter" => 13,
        "Tab" => 9,
        "Escape" => 27,
        "Backspace" => 8,
        "ArrowLeft" => 37,
        "ArrowUp" => 38,
        "ArrowRight" => 39,
        "ArrowDown" => 40,
        _ => return None,
    })
}
