# Settings & screens — settings, modals, loading, cert

The data-driven settings system, the screens, and the cert basics. All numbers are
**starting points**. References: Lyra GameSettings, GoW Ragnarök, Xbox cert.

## Settings architecture

- **Settings as data**: `{id, localized name, type (toggle/enum/slider/bind), range,
  default, category, apply policy, platform visibility, save target}`. The UI generates
  rows from definitions (one row widget per type). Search, presets, reset-all, and
  changed-indicators all come free from data. **Lyra's GameSettings registry** (edit
  conditions, change tracker) is the reference.
- **Pending vs live**: edits mutate a pending set; Apply copies pending→live + persists;
  Back-with-changes prompts a discard-confirm.
- **Apply policies**: immediate (volume — feedback is the point), on-apply (quality),
  needs-confirm (display: apply + **15 s countdown + auto-revert** — protects against
  unusable display states, pitfalls #8), needs-restart (labeled, never silent).
- **Rebind flow**: row → listening overlay (modal, ~5 s timeout, Esc/B cancels) →
  conflict check (swap/replace prompt) → reserved-key validation (**UI navigation keys
  are not rebindable** — pitfalls #9) → pending until Apply. Per-device binding sets.
- **Persistence split** (the `save-persistence` contract): machine settings (resolution,
  quality) → engine config, not cloud-synced; player preferences (subtitles,
  accessibility, language) → the per-user profile save.
- **Accessibility category aggregates** settings living elsewhere (the GoW Ragnarök
  pattern); presets (vision/hearing/motor) bulk-set values that stay individually
  editable. The full accessibility treatment is in [accessibility.md](./accessibility.md).

## The screens

- **Pause**: a vertical list, Resume = pop = Back's path, KeepAlive, instant.
- **Settings**: the same screen pushed from pause and main menu — context passed as a
  parameter (some settings hidden in-run).
- **Inventory grid (navigation case only)**: auto nav inside the grid + explicit edges;
  focus memory on index; detail panel follows focus (pad) or hover (mouse); compare
  popup anchored to the focused slot; hold-to-act for destructive actions on pad. (The
  inventory *system* lives in `inventory-equipment`.)
- **Quest journal**: master-detail; detail updates on focus, not confirm.

## The modal API

Promise-style, never caller-built widgets:

```
ShowDialog({title, body, buttons:[{label, style, result}]}) → result
```

Pushed on the Modal layer; traps focus; default focus on the **non-destructive**
button; Back maps to Cancel; **resolves exactly once** (default Cancelled on any
teardown — a scene change clears the stack and resolves pending modals, pitfalls #6);
supports confirm-with-timeout.

## Loading & attract

- **Loading screens**: a layer above everything; swallows all input; a minimum display
  time against one-frame flashes.
- **Attract/title**: "press any button" identifies and binds the active controller/user
  (Xbox XR-112 — failure is Critical severity); handle controller disconnect anywhere
  in menus: pause + a system prompt on the Modal layer, focus restored on reconnect
  (pitfalls #14). The boot-flow design treatment is in [juice-diegetic.md](./juice-diegetic.md).

## Localization & cert basics

- **+30% text expansion** budget (German/Russian/French); CJK shrinks but reverses the
  problem if the source is JP/CN. No fixed-width text containers; auto-size + a min-font
  floor + an ellipsis policy per element; a pseudo-loc pass (pitfalls #12).
- **CJK font fallback chain** (a missing glyph = tofu = an LQA/cert flag); locale-aware
  line breaking (CJK breaks between most characters).
- **Glyph correctness per platform** is cert-relevant (never Xbox glyphs on PS; "options
  button" not "Start" — pitfalls #10). Bake the glyph service in from day one.
- **Safe area**: the menu root is the single place applying platform insets (the ~90%
  rule as a fallback, pitfalls #13).
- Declared languages must render fully — untranslated string IDs and truncation are a
  standard cert-failure class.
- **NDA wall**: TRC/XR full texts aren't public — any "cert requires N seconds" claim
  must be flagged as unverified.

## Flagged gaps — do NOT invent

Items-per-page caps, console boot-time cert limits, exact rebind timeout (ship a range)
· NDA'd cert timings.

## Sources

Lyra GameSettings plugin · GoW Ragnarök accessibility/UI deep dives (PlayStation,
CanIPlayThat, 80.lv) · Microsoft GDK XR-112 + 10-foot design · Unity 6 docs
(Localization + UITK) · Epic forums (CommonGameDialog / MessagingSubsystem).
