# FFmpeg capture

## Discover a bounded source

Inspect installed capabilities before constructing a capture command:

```text
ffmpeg -hide_banner -devices
ffmpeg -hide_banner -filters
ffmpeg -hide_banner -encoders
```

On Windows, prefer `gfxcapture` when available. Read
`ffmpeg -hide_banner -h filter=gfxcapture`, then target the observed window by
its exact handle (`hwnd`) where available. Title and executable selectors can
match multiple windows; resolve ambiguity before capture. Leave monitor capture
unset when targeting a window.

Use source crop options for the useful region, accounting for display scaling.
Recheck framing after movement, resizing, or layout changes. Cropping can reduce
encoding work without avoiding capture of the full window internally. Keep the
entire source safe, including browser chrome when recording a browser window.

If `gfxcapture` is unavailable, inspect FFmpeg's installed window-capable
alternatives, such as `gdigrab` on Windows. `ddagrab` captures a display or
region, not an isolated window: it is not a privacy-equivalent automatic fallback.
On other systems, inspect the available platform input and permissions rather
than reusing Windows options. If only broader capture is possible, request a
safe isolated surface or report the blocker; do not silently capture the desktop.

Confirm that required popups, overlays, and dialogs belong to the captured
surface. Keep the rendering mode in which the bug occurs; a windowed run does
not establish behavior for an exclusive-fullscreen issue.

## Configure economical output

Apply the main skill's framing, frame-rate, and audio defaults at capture time
where supported. For `gfxcapture`, inspect `max_framerate`, crop options, and
aspect-preserving resize behavior. A frame-rate cap does not guarantee the
actual delivered frame rate. Omit audio inputs unless the scenario needs them.

Prefer direct H.264 MP4 output to avoid another conversion. Select a hardware
encoder only after a preflight succeeds with the actual source and GPU; an
encoder listed by FFmpeg may lack a usable device or driver. Keep frames on
the GPU when source, filters, and encoder support it. Hardware capture alone
is not proof of zero-copy processing or hardware encoding.

If hardware encoding fails, inspect the cause and test an installed software
encoder, such as `libx264`, at the same safe boundary. Hardware frames may need
an explicit download and pixel-format conversion. Use even output dimensions
and a compatible format such as `yuv420p` for conventional H.264 delivery.
Choose a fast encoding preset with readable output, then check the preflight
for dropped frames, black frames, and visible interference with the application.

For performance claims, collect separate profiler or timing evidence and
disclose capture overhead; a smooth encoded clip is not a frame-time measurement.

## Own the recording lifecycle

Use a unique output path and `-n` to protect existing files. Keep a process
handle, writable stdin, and drained diagnostic output. Set a scenario-appropriate
maximum recording duration as a backstop, plus a startup deadline: a duration
limit alone cannot bound a source that never starts producing frames.

Wait for frame output before interacting. Stop gracefully through FFmpeg's stdin
`q`, then await process exit and container finalization. A forced kill can leave
MP4 incomplete. If startup or shutdown stalls, stop only the task-owned recorder
and classify any artifact as incomplete until verified. A disappearing target
can end the stream early even when the recorder exits without an error.

Inspect the finalized file's video stream, dimensions, duration, and audio
presence with `ffprobe` when installed. Decode it end to end with FFmpeg:

```text
ffmpeg -v error -xerror -i <video-path> -f null -
```

Replace the placeholder with the quoted local path. Require successful decoding
and a duration covering the scenario, then perform the main skill's visual
review. A decodable file can still show the wrong target or a blank scene.

## Sources

- [FFmpeg capture devices](https://ffmpeg.org/ffmpeg-devices.html)
- [FFmpeg gfxcapture](https://ffmpeg.org/ffmpeg-filters.html#gfxcapture)
- [FFmpeg command-line options](https://ffmpeg.org/ffmpeg.html)
