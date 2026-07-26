---
name: adsense
description: >-
  AdSense publisher monetization — improve ad revenue on a website without
  risking the account. Use when the user wants to raise AdSense revenue or RPM,
  place ad units or choose between Auto ads and manual units, diagnose an
  earnings, coverage, or ads-not-showing problem, integrate or fix ad code in a
  React/Next.js or SPA codebase, clear an AdSense policy, consent/CMP, ads.txt,
  or account-approval blocker, reduce ad-caused CLS/LCP damage, or judge a move
  to Ad Manager or a managed ad network.
---

# AdSense

Monetize a site through AdSense at the highest revenue the layout, traffic, and policy surface honestly support. Revenue work is a **gate** first and an optimization second: a restricted account earns nothing that a clever placement can recover.

Leading words for this skill:

- **gate** — policy, traffic validity, consent, and `ads.txt` are checked before any revenue idea is entertained. A failed gate outranks every optimization in the backlog.
- **demand** — most "lost revenue" is lost *demand* (unfilled requests, suppressed consent signals, unauthorized seller, over-blocking), not bad placement. Chase the missing bidders before adding ad slots.
- **viewable** — an impression only earns its keep when it had a real chance of being seen: 50% of pixels, one continuous second. Prefer fewer **viewable** impressions to many unseen ones.
- **fail-open** — a render-path condition that *guesses* whether an ad will succeed should fail toward serving; one that asks whether a page *may* carry an ad stays. Defined once, with its exceptions and its status as a field-test heuristic, in [frameworks.md](./frameworks.md).
- **provenance** — every rule carries the product it came from. A Google Publisher Tag or Ad Manager capability is *not* an AdSense permission. Ad refresh is the canonical trap.
- **experiment** — placement and density claims are settled by a controlled experiment, never by a before/after anecdote across two different weeks.

## When not to use

- App/in-game monetization → AdMob, not AdSense.
- Ad Manager trafficking, direct-sold line items, header bidding/Prebid, or Open Bidding setup → a GAM/ad-ops path; this skill only marks the boundary and when to cross it.
- The advertiser side (buying Google Ads, campaign ROAS).
- Pure SEO/traffic growth with no ad work, and legal advice on privacy law — surface the obligation, defer the interpretation.
- Generic page-speed work with no ad involvement → a web performance/assets skill.

## Hard rules

These are account-survival rules. Treat a request to break one as a request to explain the risk instead.

- Verify ad rendering by inspecting the page; leave live ads unclicked. Self-clicks and "just testing" clicks are invalid traffic.
- Keep click solicitation out of the page: no "support us by clicking", no arrows or labels pointing at ads, no reward for viewing or clicking.
- Keep publisher content dominant on every screen — never more ads or paid promotional material than content.
- Serve ads only on real content pages. Empty, under-construction, alert/navigation-only, error, login, and replicated-without-added-value screens stay unmonetized.
- Keep ads visually and physically separate from navigation, buttons, pagination, form controls, and game/tool inputs.
- Ship the generated ad code with only Google-permitted modifications; leave the ad iframe, creative, and "Ads by Google" disclosure intact.
- Sort every render-path condition with the **fail-open** audit in [frameworks.md](./frameworks.md), and leave ad-blocker handling to Google Ad Blocking Recovery.
- Standard AdSense units refresh only on a user-requested refresh — honor **provenance** and keep GPT `refresh()` patterns out of AdSense pages.
- Reserve space for every slot so ads cannot shift content into a user's tap.
- Serving personalized ads to EEA/UK/Swiss users requires a Google-certified CMP; consent is never inferred from silence or inactivity.
- Child-directed requests carry the child-directed treatment signal, and that signal is not a substitute for COPPA analysis.
- After a disablement, use the official appeal path — it is the only route back, and a replacement account compounds the enforcement.

## Branches

| Ask | Path |
| --- | --- |
| "Increase my AdSense revenue" (open-ended) | Full workflow, Steps 1–7. |
| Revenue/RPM/coverage dropped | Steps 1–2, then [diagnostics.md](./diagnostics.md); fix the identified cause and verify. |
| Policy notice, ad serving limit, disabled account, or approval rejection | Step 1 only, driven by [policy-gate.md](./policy-gate.md). Remediate the root cause before any revenue work. |
| Where do I put ads / review my layout | Steps 1–4 with [placement.md](./placement.md). |
| Auto ads or manual units? | Step 5 with [placement.md](./placement.md) Auto-ads section; settle it as an **experiment**. |
| Ads hurt my Core Web Vitals | Steps 1–2, then [implementation.md](./implementation.md). |
| First-time setup / get approved / payments | Step 1 with [policy-gate.md](./policy-gate.md) setup and payments sections. |
| Should I move to Ad Manager, Ezoic, Mediavine, Raptive? | Step 7 with [ecosystem.md](./ecosystem.md). |
| Implement or fix ad code in a codebase | [implementation.md](./implementation.md), then [frameworks.md](./frameworks.md) for React/Next.js, SPA, infinite scroll, and service-worker specifics. |
| "Ads stopped showing" / ads render on some templates but not others | Steps 1–3, treating the render path as the prime suspect: [frameworks.md](./frameworks.md) render-path audit before any placement work. |

## Workflow

Track with this checklist:

```text
- [ ] 1. Clear the policy gate
- [ ] 2. Establish measurement
- [ ] 3. Recover lost and unrequested demand
- [ ] 4. Raise impression quality
- [ ] 5. Test inventory changes as experiments
- [ ] 6. Verify performance and compliance
- [ ] 7. Report, and judge the platform question
```

### Step 1 — Clear the **gate**

Run every gate in [policy-gate.md](./policy-gate.md): content eligibility, placement safety, invalid-traffic exposure, privacy/CMP, `ads.txt`, and account surfaces (Policy Center, ad serving limits, payment holds).

A failed gate becomes the whole task. State it plainly, fix the root cause, and use the review/appeal path Google offers rather than layering optimizations on restricted inventory.

Done when: every gate is marked pass, fail, or unverifiable-without-account-access, and each failure has a named remediation.

### Step 2 — Establish measurement

Read the metric definitions and formulas in [metrics.md](./metrics.md) before quoting any number, so page RPM, impression RPM, ad request RPM, and coverage are never conflated.

Record the baseline: earnings, page views, sessions and pages/session, page RPM, impression RPM, coverage, Active View measurable and **viewable**, segmented by country, device, template, and traffic source, plus field Core Web Vitals at the 75th percentile.

Where account data is unavailable, say which metrics the user must pull, and hold the recommendations that depend on them.

Done when: a baseline table exists with its date range and segments, or the missing-data list is explicit and the analysis is scoped to what the page source alone can show.

### Step 3 — Recover lost and unrequested **demand**

Three distinct losses hide here, in descending order of how often they are missed.

**Slots that never render.** Audit the render path first, because a slot suppressed in code produces no request, no impression, and no reporting anomaly beyond a coverage figure nobody segmented. Trace every condition between "component mounts" and "`<ins>` in the DOM", then classify each against the table in [frameworks.md](./frameworks.md): consent and policy conditions stay, custom technical gates go.

**Templates with no inventory at all.** Enumerate every page template and mark which carry ads. Long-form editorial with zero slots is the most valuable gap a site can have, and AdSense reporting cannot show it: a template serving no ads produces no ad-serving page views, so it is absent from the account rather than visible as a weak number. Compare analytics traffic per template against AdSense page views to find it, and check breakpoints — a slot rendered only above `lg` leaves mobile traffic unmonetized.

**Requests that go unfilled.** Work the demand list in [optimization.md](./optimization.md): site availability and crawlability, `ads.txt` authorization, consent signals by region, policy restrictions on specific inventory, over-broad category/advertiser/URL blocking, and containers too narrow or collapsed to carry standard sizes.

Done when: every render-path condition is sorted by the fail-open audit, every template and breakpoint is marked monetized or deliberately not, and every demand leak is fixed or named with the metric it should move — ad requests for a slot that never rendered or a template with no inventory, coverage for a request that goes unfilled.

### Step 4 — Raise impression quality

Make the impressions the site already serves worth more, using [placement.md](./placement.md) for slot decisions and [implementation.md](./implementation.md) for loading and space reservation.

Prioritize: reserve space on every slot, put inventory where scroll depth actually reaches, lazy-load deep slots near the viewport, and retire clutter that produces unseen impressions. Adding low-**viewable** inventory can raise total revenue while degrading impression RPM, session depth, and UX — judge those together, not one alone.

Done when: every slot on the audited templates has a stated role, reserved dimensions that hold at every breakpoint, a loading policy, and a recorded Active View **viewable** rate — or, where account data is unavailable, the slot's viewport position and the measurement the user must pull.

### Step 5 — Test inventory changes as **experiments**

Density, format, and Auto-ads-versus-manual questions have no universal answer, so run them as controlled experiments (AdSense Experiments for Auto ads settings, ad load, and blocking) and compare whole-site outcomes.

Measure total revenue, page RPM, session RPM, viewability, engagement, Core Web Vitals, and UX/policy incidents together. One metric moving alone is not a result.

Done when: every proposed change is accounted for — each is live behind an experiment with a named success metric and guardrail metric, or explicitly deferred with the reason it cannot run yet. An untested hypothesis is not a result, so report it as pending rather than as an improvement.

### Step 6 — Verify performance and compliance

Re-walk the hard rules against the changed pages, then run the verification checklist in [implementation.md](./implementation.md): reserved space holds at every breakpoint, no slot overlaps content or controls, deep slots stay deferred, the account script loads once, and CWV did not regress by template and device.

Done when: every hard rule passes on each modified template, and field CWV at the 75th percentile is compared against the Step 2 baseline per template and device with no unexplained regression — or, where field data is unavailable, the lab measurement used instead is named alongside the field check the user must run after deploy.

### Step 7 — Report and judge the platform question

Deliver the report below. When the user asks about Ad Manager or a managed network, answer from [ecosystem.md](./ecosystem.md): justify a move by operational need — direct sales, multiple demand sources competing, trafficking and reporting depth, ad-ops scale — and check live first-party eligibility pages rather than repeating remembered thresholds. Promise no RPM multiple.

Done when: every section of the report that applies to the branch taken is filled, with the rest marked not applicable, and every recommendation carries its evidence basis plus either the metric it should move or, for a policy, appeal, or platform recommendation, the outcome that would settle it.

## Output format

```markdown
## AdSense audit summary

- Scope: <site/templates reviewed, data available vs missing>
- Gate status: <pass / failures that outrank optimization>
- Baseline: <page RPM, coverage, Active View, CWV, date range>
- Biggest opportunity: <one sentence>

## Gate results

| Gate | Status | Finding | Remediation |
| --- | --- | --- | --- |

## Demand leaks

| Leak | Evidence | Expected effect | Fix |
| --- | --- | --- | --- |

## Placement plan

| Template | Slot | Format/size | Role | Loading policy | Reserved space | Viewable expectation |
| --- | --- | --- | --- | --- | --- | --- |

## Experiments queued

| Hypothesis | Change | Success metric | Guardrail metric |
| --- | --- | --- | --- |

## Changes made

- <file/template> → <change>

## Verification

- <hard-rule pass, CWV comparison, rendering checks>

## Notes / follow-ups

- <account-side actions only the user can take, live pages to re-check, contested calls>
```

## Reference files

- [policy-gate.md](./policy-gate.md) — eligibility and approval, Publisher Policies and Restrictions, invalid traffic, privacy/CMP/COPPA, prohibited placements, enforcement ladder and appeals, setup, `ads.txt`, payments.
- [metrics.md](./metrics.md) — every metric with its formula, the levers that move it, and the conflations to avoid.
- [placement.md](./placement.md) — formats, sizes, placement principles and layout requirements, patterns per content type, Auto ads versus manual and how to constrain Auto ads.
- [optimization.md](./optimization.md) — revenue levers ordered by materiality, demand recovery, refresh rules, blocking hygiene, seasonality, traffic sources, session RPM.
- [implementation.md](./implementation.md) — ad code, responsive behavior, space reservation, lazy loading, LCP/INP/CLS, AMP, SPA, GPT boundary, verification checklist.
- [frameworks.md](./frameworks.md) — the render-path audit, React/Next.js App Router integration, slot lifecycle across navigation and infinite scroll, service workers and CSP.
- [diagnostics.md](./diagnostics.md) — the revenue-drop decision tree and its ordered checklist.
- [ecosystem.md](./ecosystem.md) — AdSense versus Ad Manager, AdMob, AdX, header bidding, managed networks, and when a move is justified.
