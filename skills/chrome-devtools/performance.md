# Performance, audits & memory

Use traces for **load performance and Core Web Vitals**, Lighthouse for
**quality audits** (a11y, SEO, best practices), and heap snapshots for **memory
leaks**.

## Performance traces (Core Web Vitals)

Record a trace around a page load or interaction, then read the insights.

```
performance_start_trace { "reload": true, "autoStop": true }
# ...or drive an interaction, then:
performance_stop_trace {}
```

- `reload: true` measures a **cold load** (the most representative for LCP/CLS).
- `autoStop: true` ends the trace automatically once the page settles.
- The stop result lists insights; drill in with `performance_analyze_insight`.

```
performance_analyze_insight { "insightSetId": "<id>", "insightName": "LCPBreakdown" }
```

Core Web Vitals to watch:

| Metric | Measures | Common fixes |
| --- | --- | --- |
| **LCP** | Largest Contentful Paint (load) | Preload the hero image/font, cut render-blocking CSS/JS, server-render above-the-fold. |
| **INP** | Interaction to Next Paint (responsiveness) | Break up long tasks, defer non-critical JS, avoid layout thrash. |
| **CLS** | Cumulative Layout Shift (stability) | Set width/height on media, reserve space for ads/embeds, avoid late font swaps. |

Trace URLs may be sent to the CrUX field-data API for real-user context; disable
with `--no-performance-crux` (see [setup.md](./setup.md)).

## Lighthouse audits

`lighthouse_audit` covers **accessibility, SEO, best practices, and agentic
browsing** — but not performance (use traces for that).

```
lighthouse_audit { "mode": "navigation", "device": "mobile", "outputDirPath": "./reports" }
```

Use it as a pre-ship checklist: read the failed audits and fix the highest-impact
items first. Save full reports to `outputDirPath` to keep the chat lean.

## Memory leaks

```
take_heapsnapshot { "filePath": "./heap-1.heapsnapshot" }
# reproduce the suspected leak (navigate, interact, repeat)
take_heapsnapshot { "filePath": "./heap-2.heapsnapshot" }
```

Compare snapshots to find retained objects that should have been collected — growing
detached DOM nodes, listeners, or closures are typical culprits. Open the
`.heapsnapshot` files in Chrome DevTools' Memory panel for diffing.

## Tips

- Throttle CPU/network with `emulate` before tracing to model low-end devices.
- Run a trace, fix one bottleneck, re-trace — measure each change in isolation.
- For flaky loads, run a couple of traces; treat a single number with suspicion.
