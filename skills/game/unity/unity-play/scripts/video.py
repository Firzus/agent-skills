#!/usr/bin/env python3
"""Turn the frames saved by `turn.py install --record DIR` into an MP4 with FFmpeg.

  video.py <frames dir> <out.mp4> [--log turns.jsonl] [--fps 60] [--title TEXT]

The video runs in game time: the pauses between turns produced no frames.
With --log (the file written by `turn.py --log`), each turn's skill or controls
are burned in at the top, and the observation's status fields (hp or
player.hp, objective, lastEvent when present) at the bottom.
"""

import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

SKILLS = {"goto", "face", "attack", "interact", "jump_onto", "wait"}


def ass_time(seconds):
    centis = int(round(seconds * 100))
    return f"{centis // 360000}:{centis // 6000 % 60:02d}:{centis // 100 % 60:02d}.{centis % 100:02d}"


def ass_text(text):
    return text.replace("\\", "/").replace("{", "(").replace("}", ")").replace("\n", " ")


def captions(log, frame_index, fps, title):
    events = []
    previous_end = None
    turn = 0
    for line in pathlib.Path(log).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if entry.get("rc"):
            continue
        reply = json.loads(entry["reply"])
        end = reply.get("frame")
        if end is None:
            continue
        turn += 1
        controls, frames = entry["args"]
        played = reply.get("frames", frames if isinstance(frames, int) else 0) or 0
        start = previous_end if previous_end is not None else end - played
        previous_end = end
        shown = [f for f in frame_index if start < f <= end] or [f for f in frame_index if f == end]
        if not shown:
            continue
        begin = frame_index[shown[0]] / fps
        finish = (frame_index[shown[-1]] + 1) / fps
        obs = reply.get("obs") if isinstance(reply.get("obs"), dict) else {}
        player = obs.get("player") if isinstance(obs.get("player"), dict) else {}
        status = []
        hp = player.get("hp", obs.get("hp"))
        if hp is not None:
            status.append(f"HP {hp}")
        if obs.get("objective"):
            status.append(obs["objective"])
        if obs.get("lastEvent"):
            status.append(obs["lastEvent"])
        words = str(controls).split()
        action = controls if words and words[0].lower() in SKILLS else f"{controls} x {frames} frames"
        top = f"{title}  |  turn {turn}: {action}" if title else f"turn {turn}: {action}"
        events.append(f"Dialogue: 0,{ass_time(begin)},{ass_time(finish)},Top,,0,0,0,,{ass_text(top)}")
        if status:
            events.append(f"Dialogue: 0,{ass_time(begin)},{ass_time(finish)},Bottom,,0,0,0,,{ass_text('  |  '.join(status))}")
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 960
PlayResY: 540

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Top,Arial,22,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,3,2,0,7,12,12,10,1
Style: Bottom,Arial,20,&H0000FFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,3,2,0,1,12,12,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    return header + "\n".join(events) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("frames")
    parser.add_argument("out")
    parser.add_argument("--log")
    parser.add_argument("--fps", type=int, default=60, help="the --fps given to turn.py install")
    parser.add_argument("--title", default="")
    options = parser.parse_args()
    if options.fps <= 0:
        sys.exit("--fps must be the positive frame rate given to turn.py install")
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg not found on PATH")
    images = sorted(pathlib.Path(options.frames).glob("*.jpg"))
    if not images:
        sys.exit("no frames in " + options.frames)
    out = pathlib.Path(options.out).resolve()
    if out.exists():
        sys.exit(f"{out} exists; choose a new name")
    frame_index = {int(p.stem): i for i, p in enumerate(images)}
    with tempfile.TemporaryDirectory() as work:
        work = pathlib.Path(work)
        duration = 1 / options.fps
        listing = "ffconcat version 1.0\n" + "".join(
            f"file '{p.resolve().as_posix()}'\nduration {duration:.6f}\n" for p in images)
        listing += f"file '{images[-1].resolve().as_posix()}'\n"
        (work / "frames.txt").write_text(listing, encoding="utf-8")
        filters = ["scale=960:540"]
        if options.log:
            (work / "captions.ass").write_text(captions(options.log, frame_index, options.fps, options.title), encoding="utf-8")
            filters.append("subtitles=captions.ass")
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0",
                   "-i", "frames.txt", "-vf", ",".join(filters), "-r", str(options.fps),
                   "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-an", str(out)]
        done = subprocess.run(command, cwd=work, capture_output=True, text=True)
        if done.returncode != 0:
            sys.exit(done.stderr)
    print(out)


if __name__ == "__main__":
    main()
