#!/usr/bin/env python3
"""Play a Unity game in Editor Play Mode, one call per turn.

  turn.py install --project P --observe "<C# expression>" [--adapter FILE] [--fps 60] [--record DIR]
  turn.py --project P [--log FILE] '<skill> <target>' [max frames]
  turn.py --project P [--log FILE] '<controls>' <frames>
  turn.py finish --project P

`install` sends driver.cs once per Play Mode session; --adapter adds a C#
file that tells the skills where the player and targets are.

A skill turn steers with real keyboard and mouse input until an event ends it,
then pauses and prints {"event": ..., "frames": n, "obs": ...}. Skills: goto,
face, attack, interact, jump_onto, each followed by a target id, and
`wait` followed by nothing (max frames sets the wait).

A controls turn holds <controls> for exactly <frames> frames: "-" for none,
otherwise tokens joined by "+": Input System key names (W, Space, LeftArrow),
mouse buttons (mouse.left, mouse.right), a pointer position "@x,y" in screen
pixels from the bottom-left, and a mouse movement "~dx,dy" applied on every
frame of the turn. Example: turn.py --project P 'W+LeftShift+~5,0' 30

Each call reaches the Editor over its local HTTP server, with the token from
<project>/Library/Pipeline/.unity-pipeline-port, and falls back to
`unity command eval` when that file is missing or the server refuses.
--record saves every played frame of the main camera to DIR for video.py.
`finish` releases held input and restores the project's input settings.
--log appends one JSON line per turn (start, end, args, exit code, reply)
for benchmark/stats.py.
"""

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

DRIVER = pathlib.Path(__file__).with_name("driver.cs")
SKILLS = {"goto", "face", "attack", "interact", "jump_onto", "wait"}


def delegate_call(name, signature, arguments):
    return (
        f'var call = ({signature})System.AppDomain.CurrentDomain.GetData("unity-play.{name}");'
        'if (call == null) throw new System.InvalidOperationException("driver not installed: run turn.py install");'
        f"return await call({arguments});"
    )


def via_http(project, code, timeout):
    """Returns (exit code, reply), or None when HTTP is unavailable and the CLI should be used.

    Falls back only when the request cannot have run: a turn is not idempotent, so a reply lost
    after the Editor received the request is an error rather than a second attempt.
    """
    descriptor = pathlib.Path(project) / "Library" / "Pipeline" / ".unity-pipeline-port"
    try:
        info = json.loads(descriptor.read_text(encoding="utf-8"))
        url = f"http://127.0.0.1:{int(info['port'])}/api/exec"
        token = info["evalToken"]
    except (OSError, ValueError, KeyError, TypeError):
        return None
    body = json.dumps({"command": "script eval", "parameters": {"code": code, "timeout": timeout}}).encode()
    request = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout + 15) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        if error.code in (401, 404):
            return None
        raw = error.read()
    except urllib.error.URLError as error:
        if isinstance(error.reason, ConnectionRefusedError):
            return None
        return 1, json.dumps({"error": f"no reply from the Editor: {error.reason}"})
    except (ConnectionError, TimeoutError) as error:
        return 1, json.dumps({"error": f"no reply from the Editor: {error!r}"})
    try:
        reply = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        return 1, json.dumps({"error": "unexpected reply from the Editor", "body": raw[:500].decode("utf-8", "replace")})
    if reply.get("success"):
        result = reply.get("result")
        return 0, result if isinstance(result, str) else json.dumps(result)
    return 1, json.dumps({key: reply.get(key) for key in ("error", "errorDetails", "message") if reply.get(key)})


def via_cli(project, code, timeout):
    unity = shutil.which("unity")
    if unity is None:
        sys.exit("unity CLI not found on PATH")
    # The driver is too long for a Windows command line once an adapter is added: pass it as a file.
    with tempfile.TemporaryDirectory() as work:
        source = pathlib.Path(work) / "eval.cs"
        source.write_text(code, encoding="utf-8")
        command = [unity, "command", "eval", "--file", str(source), "--result-only", "--timeout", str(timeout)]
        if project:
            command += ["--project-path", project]
        done = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
    out = done.stdout.strip()
    if done.returncode != 0:
        return done.returncode, out + done.stderr
    # --result-only prints the C# string as a JSON string literal.
    try:
        value = json.loads(out)
    except json.JSONDecodeError:
        return 0, out
    return 0, value if isinstance(value, str) else json.dumps(value)


def run_eval(options, code, timeout):
    """Returns (exit code, reply text)."""
    if options.project and options.transport == "http":
        answer = via_http(options.project, code, timeout)
        if answer is not None:
            return answer
    return via_cli(options.project, code, timeout)


def report(code, reply):
    (sys.stdout if code == 0 else sys.stderr).write(reply + "\n")
    if code:
        sys.exit(code)


def install(options):
    source = DRIVER.read_text(encoding="utf-8")
    adapter = pathlib.Path(options.adapter).read_text(encoding="utf-8") if options.adapter else ""
    record = str(pathlib.Path(options.record).resolve()) if options.record else ""
    source = (source.replace("OBSERVE_EXPRESSION", options.observe)
                    .replace("FRAMES_PER_SECOND", str(options.fps))
                    .replace("RECORD_FOLDER", json.dumps(record))
                    .replace("ADAPTER_CODE", adapter))
    report(*run_eval(options, source, 60))


def play(options):
    action = options.action.strip()
    # Models often write "~ -10,0" or a typographic minus; both would reject the turn.
    action = re.sub(r"([~@])\s+", r"\1", action.replace("−", "-"))
    words = action.split()
    if words and words[0].lower() in SKILLS:
        verb = words[0].lower()
        target = " ".join(words[1:])
        if verb != "wait" and not target:
            sys.exit(f"{verb} needs a target id")
        limit = options.frames if options.frames is not None else 600
        code = delegate_call("skill", "System.Func<string, string, int, System.Threading.Tasks.Task<string>>",
                             f"{json.dumps(verb)}, {json.dumps(target)}, {limit}")
        timeout = 30 + limit // 10
    else:
        if options.frames is None or options.frames < 0:
            sys.exit("a controls turn needs a frame count of 0 or more")
        controls = "" if action == "-" else action
        code = delegate_call("turn", "System.Func<string, int, System.Threading.Tasks.Task<string>>",
                             f"{json.dumps(controls)}, {options.frames}")
        timeout = 30 + options.frames // 10
    start = time.time()
    status, reply = run_eval(options, code, timeout)
    if options.log:
        entry = {"start": start, "end": time.time(), "args": [options.action, options.frames], "rc": status, "reply": reply[:2000]}
        with open(options.log, "a", encoding="utf-8") as log:
            log.write(json.dumps(entry) + "\n")
    report(status, reply)


def main():
    argv = sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", help="Unity project path; needed for HTTP and when several Editors run")
    parser.add_argument("--transport", choices=["http", "cli"], default="http")
    if argv and argv[0] == "finish":
        options = parser.parse_args(argv[1:])
        report(*run_eval(options, delegate_call("finish", "System.Func<string>", "").replace("await ", ""), 30))
    elif argv and argv[0] == "install":
        parser.add_argument("--observe", required=True, help="C# expression returning the observation")
        parser.add_argument("--adapter", help="C# file setting the skill adapter (see SKILL.md)")
        parser.add_argument("--fps", type=int, default=60, help="fixed frames per game second; 0 keeps the game's own frame time")
        parser.add_argument("--record", help="folder receiving one JPEG per played frame")
        install(parser.parse_args(argv[1:]))
    else:
        parser.add_argument("--log", help="append one JSON line per turn to this file")
        parser.add_argument("action", help="'<skill> <target>' or '<controls>'")
        parser.add_argument("frames", type=int, nargs="?", help="frames for controls; maximum frames for a skill")
        play(parser.parse_args(argv))


if __name__ == "__main__":
    main()
