# Scheduler & persistence — events, respawn, time-skip, saves

The event scheduler and serialization. All numbers are **starting points**.
Primary source: the BotW datamine (the best-documented scheduler in the genre).

## The minimal scheduler skeleton (datamined from BotW)

1. **Fixed-hour hooks**: `handleNewDay` at each midnight crossing.
2. **Signal/observer**: `NewDaySignal.emit`.
3. **Two-phase events**: schedule the flag one window ahead (`WM_BloodyDay` set at
   midnight when the timer exceeds threshold) → fire at the next window (the cutscene
   at the following midnight) — with prohibition conditions and postponement (timer
   pushed to the next day).
4. **Skip catch-up**: events crossed by a time-skip fire **exactly once**, in
   catch-up — never replayed N times, never silently dropped (pitfalls #3).

## The blood moon (a case study — three roles on one event)

- A **narrative clock event** (every exactly 7 in-game days of *active* play,
  ~2 h 48).
- The **world's garbage collector** (resets all revival flags → enemies/weapons
  respawn).
- A **memory safety valve**: the *panic* blood moon is real and datamined — a
  per-frame check on resource/physics/spawn heaps (5 % free threshold) or stalled
  tasks triggers the same cutscene with a full system reset at any hour, telemetried
  back to Nintendo. (Myth-killer: the *regular* blood moon is not the GC-under-
  pressure — only the panic one is.)

## Time-skip = instant clock set, zero simulation

Datamined: "the game never speeds up or slows down the flow of time". BotW campfire
→ Morning 05:00 / Noon 12:00 / Night 21:00; bed adds full heal; unavailable in
combat and under rain (no fire). If the skip crosses midnight, a flag forces
`handleNewDay` to run **once**. The pre-rolled weather is not rerolled — skipping
just advances the cursor (players check the forecast and skip to a clear slot —
intended use, not an exploit).

## The three respawn policies

Datamined, all sharing the invariant **the world never mutates on screen**:

- **Event-driven**: enemies/weapons on blood moon only.
- **Periodic-probabilistic**: materials — a 1 % chance per 60 s tick, only while
  the player is in a *different* map area.
- **Fixed-hour conditional**: shops restock at midnight if the player isn't there.

## The server-cron layer (Genshin)

Daily 04:00 / weekly Monday 04:00 server time on fixed no-DST timezones; node
respawns 12/24/48/72 h real time *per node since harvest* (not aligned to the
reset); staggered offsets (ores reset+2 h, ingredients reset−4 h) spread the load
and the player routine. Defining resets in UTC / a fixed documented zone is
mandatory (pitfalls #14 — the 4 AM / DST class).

## Persistence

- **Serialize**: the clock (hour + day counter → moon phase), the pre-rolled
  weather schedule, the active weather state + blend progress + RNG seed, and all
  scheduler timestamps **in game time** (a real-time timestamp breaks under
  time-skip; a game-time one breaks under reload if not saved). BotW serializes
  time, the 3-day forecast, and the blood moon timer — reload rerolls *nothing*.
- **Decide explicitly what rerolls on reload** (default: nothing — weather
  save-scumming is an economy leak), and what the blood moon timer counts (active
  play only: cutscenes, menus, clock-skips excluded).
- Genshin: no local save — diegetic hour, persistent regional weather states
  (post-quest), and resets all live server-side (`save-persistence`
  server-authoritative model).

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Blood moon | exactly 7 in-game days of active play (~2 h 48) | datamine |
| Panic blood moon | 5 % free on specific heaps (NOT "90% RAM") | datamine |
| Material respawn | 1 % chance per 60 s, only off-area | datamine |
| Server resets | daily 04:00 / weekly Mon 04:00, no-DST zones | official |
| Node respawn | 12/24/48/72 h per node since harvest; staggered offsets | wiki |

## Flagged gaps — do NOT invent

Off-screen NPC simulation level · panic blood moon "90 % RAM" folklore (datamine
says 5 % free on specific heaps) · exact node-respawn stagger values beyond the
documented ±2/−4 h.

## Sources

zeldamods (Time, Blood moon, Save Files, Object respawning, Telemetry) · botw
decompilation · Genshin wikis (Reset) + HoYoLAB official · `save-persistence`
(server-authoritative model).
