---
name: video-report
description: >-
  Record video evidence with FFmpeg after a visual bug fix or when asked for
  a recorded demo of a web page, native application, or game.
---

# Video report

Use FFmpeg for every recording. Capture the smallest useful surface while the
existing interaction tool drives the application. Deliver observed behavior,
not a substitute for tests or separate performance measurements.

## 1. Define the proof

Identify the application and version or working state, initial conditions,
reproduction steps, and expected visible result. Exercise the real interaction
path: click the affected button rather than calling its handler directly. Use
test data and obtain required approval before consequential actions.

Record the corrected state by default. Include the faulty state only if already
recorded or safely accessible without disturbing the working tree. Label the
comparison before/after or after-only; distinguish fixtures from product runs.

Done when the scenario has concrete actions and an observable success criterion.

## 2. Resolve capture and interaction

Inspect installed FFmpeg capabilities and the tools available to interact with
the application. Read [FFmpeg capture](ffmpeg-capture.md) to select the source,
encoder, and process lifecycle. Follow the host's tool and permission rules.

Target the same application instance for recording and interaction. For web
pages, use a visible browser window or an existing isolated graphical display
that FFmpeg can capture. A headless browser without a capturable display is not
sufficient; its built-in video recorder is not the capture path for this skill.

Use the installed FFmpeg without adding packages or changing user configuration.
If FFmpeg, a safe capture source, or interaction support is unavailable, stop
and report the missing capability and required intervention. Still images are
not a completed video report.

Done when both the FFmpeg capture path and the interaction path are available.

## 3. Prepare and preflight

Choose a window-scoped source, narrowed to the useful region where supported.
Keep the whole source free of credentials, personal data, private URLs,
notifications, and unrelated content: output cropping is not a privacy boundary.
Include overlays or dialogs only when needed to demonstrate the result. Leave
microphone and system audio off unless required for the scenario.

Use a unique local output path outside tracked source files, following existing
artifact conventions. Preserve earlier recordings and keep publication separate
from local delivery. Pause for intervention if safe capture needs permission.

Default to 30 fps and a readable size no larger than 1920 × 1080, preserving
aspect ratio. Use 60 fps for fast motion or higher resolution for necessary
visual detail. Keep the clip limited to the scenario, with readable initial and
final states. These settings are starting points, not proof of low overhead.

For a new capture configuration, record and review a brief preflight of the
safe target. Verify framing, relevant overlays, readability, audio absence,
encoding, and finalization. Then restore the scenario's initial state.

Done when a reviewed preflight or an already verified configuration covers the
intended surface and the scenario is ready.

## 4. Record and finalize

Confirm FFmpeg is producing frames before the first relevant action. Execute
the scenario, wait for observable application state, and hold the result long
enough to read. Keep the evidence continuous at normal speed; retain failures
as observed outcomes rather than editing them into apparent success.

Use a guaranteed cleanup path, including on failed assertions: stop recording
gracefully, await finalization, then release only task-owned resources. Keep the
capture target available until recording ends. Report interruption or early
termination instead of treating process success as scenario success.

Done when a finalized local video exists, or the specific failure is reported.

## 5. Verify and deliver

Inspect the output and decode the complete video as described in the FFmpeg
reference. Review the recording itself for the intended target, actions,
result, readability, and sensitive content. Metadata or application assertions
alone do not verify what was filmed.

When playback is unavailable, inspect timestamped frames from the decoded video
covering the initial state, each action and result, and the final state. Disclose
frame-based review: it cannot establish smooth motion or rule out brief defects.
If the claim depends on those properties, report the verification gap.

Retry unusable capture only after identifying and correcting its cause. Withhold
unsafe recordings from delivery and request intervention for safe handling.

Deliver the local video through a supported preview or attachment, otherwise
provide its absolute path. Summarize the scenario, expected and observed result,
tests actually run, and limitations, including after-only, fixture, or partial
review status. A separate report file is optional.

Done when the safe video and summary are delivered, or the exact blocker or
verification limit is stated without claiming success.
