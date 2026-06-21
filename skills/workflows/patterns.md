# Quality patterns

Reusable orchestration shapes. Pick by task and compose freely — they stack.
All pseudo-code describes which subagents to launch and when to wait; it is not
runnable. See [execution-model.md](./execution-model.md) for how independent vs
barrier dispatch maps to the host Task tool.

## Adversarial verify

Don't accept a finding at face value. Spawn N independent skeptics per finding,
each prompted to **refute** it. Keep the finding only if a majority fail to
refute. This kills plausible-but-wrong findings before they reach the user.

```text
for the claim, launch 3 skeptics (independent):
  "Try to refute: <claim>. Default to refuted=true if uncertain."
keep the claim if at least 2 of 3 fail to refute it
```

Bias the skeptics toward refusal (`refuted=true` when unsure) so only
well-supported claims survive.

## Perspective-diverse verify

When a finding can fail in more than one way, give each verifier a **distinct
lens** instead of N identical skeptics. Diversity catches failure modes that
redundancy misses.

```text
launch one verifier per lens: correctness, security, perf, does-it-reproduce
keep the finding if >= 2 lenses confirm it's real
```

Use this over plain adversarial verify when the finding's validity depends on
context only some lenses can see.

## Judge panel

For open-ended problems with a wide solution space, generate several
**independent attempts** from different angles, score them, and synthesize.

```text
launch N attempts from distinct framings: MVP-first, risk-first, user-first
launch judges to score each attempt on agreed criteria
synthesize from the winner, grafting the best ideas from the runners-up
```

Beats one-attempt-iterated when there's no obvious single starting point.

## Loop-until-dry

For unknown-size discovery (bugs, edge cases, issues), a fixed count misses the
tail. Keep spawning finders until **K consecutive rounds** surface nothing new.

```text
seen = {} ; dryRounds = 0
while dryRounds < 2:
  found = launch a batch of finders            # wait for the batch
  fresh = found minus everything in `seen`     # dedup vs ALL seen, not just kept
  if fresh is empty: dryRounds += 1 ; continue
  dryRounds = 0 ; add fresh to seen
  verify fresh (adversarial or diverse-lens) ; keep the real ones
```

Dedup against everything **seen**, not only what you kept — otherwise
judge-rejected findings reappear each round and the loop never converges.

## Multi-modal sweep

One search angle rarely finds everything. Launch parallel agents that each
search a **different way** — by container, by content, by entity, by time. Each
is blind to what the others surface, so together they cover more.

```text
launch in parallel:
  search by file/module structure
  search by content/keyword
  search by entity/symbol
  search by recency/history
merge and dedup the results
```

## Completeness critic

End a sweep with one agent whose only job is to ask **"what's missing?"** — a
modality not run, a claim left unverified, a source unread. What it finds becomes
the next round of work.

```text
launch a critic over the collected results:
  "What did this miss? Unread sources, unrun search modes, unverified claims?"
feed its answer back as the next batch of dispatches
```

## Composing them

A thorough audit often chains several: multi-modal sweep to find -> dedup vs
seen -> diverse-lens panel to verify -> loop-until-dry to exhaust the tail ->
completeness critic as a final gate. Match the depth to the request: a quick
`find any bugs` needs a couple of finders and a single verify pass; `be
comprehensive` warrants the full chain.

If any stage bounds coverage (top-N, sampling, no retry), state what was dropped
— silent truncation reads as "covered everything" when it didn't.
