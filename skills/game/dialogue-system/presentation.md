# Presentation — typewriter, auto/skip, backlog, accessibility

The display layer. All numbers are **starting points**; accessibility figures are
cert-tag standards where noted. Tagged **[HARD]** enforceable cert criterion /
**[BP]** best practice.

## The dialogue UI

Nameplate + line text (bottom third by convention — no normative figure exists).
BotW: 3 lines max per bubble with manual breaks in the data; Genshin: floating
choice bubbles with typed icons, up to 6 observed.

## Typewriter reveal

Tool conventions 20–60 cps (Pixel Crushers default 50) + an instant option;
expose speed in settings. No measured cps for either reference game (flagged).
Use a rich-text-safe reveal (TMP `maxVisibleCharacters`, not substring — control
tags must not be partially revealed).

## Auto mode

Delay = `max(VO duration, text length × configurable reading speed) + margin`;
pauses on choices. Reading anchors: adults ~238 wpm silent, broadcast subtitles
160–180 wpm, Netflix 20 cps / 42 chars / 2 lines / 5⅚–7 s per event. Auto timing
keyed to *text* length, never just the VO clip (pitfalls #13).

## Skip — the verified chronology (the cautionary tale)

Genshin shipped hangout-repeat skip only (4.5), Quick Start (5.0 — *prerequisite*
skip, not dialogue), a time-skip QoL (5.8) — and still **no general dialogue
skip** after years of documented demand (third-party auto-skip scripts exist).
**HSR 3.4's skip-with-summary is the model to copy.** The rule: skip is a
first-class feature; **world events triggered by dialogue must execute even when
skipped** (pitfalls #2).

## Backlog

The Travel Log model (Genshin v1.2): full transcript + audio replay of completed
story quests, including choice branches, plus an in-session scrollable history
(the community complaint Genshin never fixed at the in-session level).

## Subtitle accessibility (the standards)

Both reference games ship **no text size options** — a gap to beat, not a
precedent. The cert-tag standards (Xbox Accessibility Guidelines, Accessible
Games Initiative Mar 2025):

- **Subtitle vs caption** [HARD]: subtitles = speech only; captions = all audio
  (SFX, music, speaker ID, tone). Offer closed captions.
- **Size** [HARD]: default min **32px @1080p**, scalable to **46px** for the
  "Large & Clear" tag (adjustable to ≥200%); measure ascender-to-descender;
  **sans-serif** option; **mixed case** (not ALL CAPS).
- **Line length / count** [HARD/BP]: avoid >40 chars/line, ≤2 lines (3
  exceptional), manual line breaks at sensible points.
- **Reading speed** [HARD, broadcast]: BBC 160–180 wpm (≥1.5 s gap between subs);
  Netflix 20 cps adult / 17 cps children, 5⅚ s min–7 s max.
- **Speaker identification** [HARD]: name on the line when a *new* speaker
  starts; re-show on speaker change or a pause >1–2 min. **Color only paired with
  another cue** (text) — color-alone fails the Color Alternatives tag.
- **Directional indicators** [HARD]: a visual spatial indicator for off-screen
  sound sources.
- **Background for readability** [HARD]: a solid configurable background container
  with adjustable opacity (white-on-light-sand is the failure).

## Dialogue accessibility beyond subtitles

- **TTS for menus/dialogue** [BP]: self-voicing of menus/notes/dialogue with
  adjustable speed/pitch/volume; "click text to hear it"; pause-while-reading.
- **Dyslexia-friendly fonts** [BP]: offer OpenDyslexic / clean sans-serif; bold
  (not italic/underline) for emphasis; offer the font choice **before** the first
  text.
- **Reading-speed / pacing controls** [BP/HARD-tag]: let players progress text at
  their own pace; auto-advance with adjustable timing; manual replay.
- **Hold-to-skip vs tap** [BP]: prefer hold-to-skip (or confirm) to prevent
  accidental dismissal of unread text; pair with replay.
- **Colorblind-safe speaker coding** [HARD]: never speaker-by-color-alone.
- **Screen-reader support** [BP/HARD-tag]: all UI reachable via the same input as
  gameplay; query platform caption/TTS APIs.
- **Volume separation** [HARD-tag]: independent sliders/mutes for speech, SFX,
  music; no essential info by sound alone.

## Choice UI safety

An input dead-window (~0.2–0.3 s) when choices appear; show choices only after the
reveal completes (or greyed); separate advance and select inputs; explicit
confirmation for consequential choices; typed choice icons (pitfalls #7).

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Typewriter | TMP `maxVisibleCharacters` (zero GC); UITK `PostProcessTextVertices` (6000.2+) | UMG rich text + custom reveal |
| Subtitle scaling | UITK/UGUI with a global size setting bound to a slider | UMG with a text-scale setting; built-in subtitle system is minimal |

## Flagged gaps — do NOT invent

Measured reveal speed (cps) in either game · Genshin auto-mode delay rules (the
"75% listen" figure is unsourced) · dialogue box dimensions as % of screen ·
Xbox XAG version currency (v3.2 dated 2023, may be superseded — verify).

## Sources

Genshin Travel Log datamine · HSR 3.4 patch notes (skip-with-summary) · Xbox
Accessibility Guidelines (XAG) · Accessible Games Initiative Tags (Mar 2025) ·
gameaccessibilityguidelines.com · BBC Subtitle Guidelines · Netflix Timed Text
Style Guide · Brysbaert 2019 (reading rates).
