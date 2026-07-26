# Revenue optimization

Work the levers in order of materiality. Publishers routinely reach for slot count first, when the money is usually sitting in slots that never render, templates with no inventory, and unviewed impressions.

Before the table below, settle two questions that outrank every lever in it, because both produce *zero* revenue on affected pages without raising an alarm in AdSense reporting:

1. **Do the slots render?** Classify every render-path condition with the audit in [frameworks.md](./frameworks.md).
2. **Does every template have inventory?** A template serving no ads contributes no ad-serving page views, so it is largely *absent* from AdSense reporting rather than dragging an average down. Cross-reference analytics traffic by template against AdSense page views to find the gap, and check breakpoints while you are there.

## Levers by likely materiality

| # | Lever | Mechanism and action | Source |
| ---: | --- | --- | --- |
| 0 | Slots that render, on every template | A suppressed slot and an unmonetized template both earn nothing, and neither announces itself in AdSense reporting. Run the render-path audit, then mark every template and breakpoint monetized or deliberately not. | [Render-path audit](./frameworks.md) |
| 1 | Valid, high-intent traffic | More legitimate users and deeper useful sessions expand monetizable inventory; invalid or incentivized traffic erases earnings and can disable the account. Audit acquisition before touching ads. | [IVT](https://support.google.com/adsense/answer/16737) |
| 2 | Audience geography | Auction demand and purchasing power vary by location. Segment reports rather than assuming a multiplier — no official universal country RPM table exists. | [Auction](https://support.google.com/adsense/answer/160525) |
| 3 | Commercial intent / vertical | Finance, legal, software, insurance, and purchase-research content can attract stronger bids, but topic alone guarantees no CPC. Build useful content, not high-CPC keyword filler. | [Auction](https://support.google.com/adsense/answer/160525) |
| 4 | Viewability | Advertisers value impressions with a genuine chance of being seen, and Google says brand advertisers typically pay higher RPMs for **viewable** impressions. Move or re-time low-viewability units. | [Active View](https://support.google.com/adsense/answer/3481946?hl=en) |
| 5 | Coverage and consent | Diagnose unfilled requests, `ads.txt`, policy, consent signals, and over-blocking before adding inventory. | [Coverage](https://support.google.com/adsense/answer/92360?hl=en) |
| 6 | UX-safe density | Add placements only while incremental revenue beats the cost in clutter, speed, engagement, and viewability. Never exceed publisher content. | [Placement](https://support.google.com/adsense/answer/1282097?hl=en) |
| 7 | Performance / CWV | Faster, stable pages let content and ads load and sessions continue. Reserve space, lazy-load deep units. | [Minimize layout shift](https://developers.google.com/publisher-tag/guides/minimize-layout-shift) |
| 8 | Formats and sizes | Responsive and multi-size inventory broadens creative competition; test anchor, vignette, native, and multiplex per template. | [Ad sizes](https://support.google.com/adsense/answer/6002621) |
| 9 | Blocking hygiene | Every broad block removes bidders and can lower earnings. Block for legal, UX, or brand-safety reasons — not because one ad "looks low-paying". | [Blocking controls](https://support.google.com/adsense/answer/180609) |
| 10 | Experiments | Settle Auto ads, ad load, and blocking questions with controlled experiments instead of before/after anecdotes. | [Experiments](https://support.google.com/adsense/answer/6321907?hl=en) |

## Recovering lost demand

Run this list before proposing a single new slot. Each item removes eligible bidders while leaving the layout looking perfectly healthy.

| Leak | Check | Effect when broken |
| --- | --- | --- |
| Custom render gates | Every render-path condition passes the [fail-open audit](./frameworks.md). | Zero ads, silently, for every affected user. |
| Missing templates | Every page template carries inventory or is deliberately excluded — checked at mobile widths too. | Whole templates earn nothing, and contribute no page views to notice. |
| Container width | Slot parents are wide enough for the sizes you want; a 250px container excludes the 300px family. | Fewer eligible creatives and bidders. |
| Site availability | The URL resolves publicly, is crawlable, and is not behind robots or auth. | Requests fail or inventory is ineligible. |
| `ads.txt` authorization | Exact publisher ID and `DIRECT` relationship served at the root domain without redirect or auth errors. Allow crawl propagation before judging. | Buyers may decline to bid; the seller may read as unauthorized. |
| Consent signals | A certified CMP appears across all EEA/UK/Swiss regions, stores and passes valid signals, and does not accidentally suppress all requests. | Personalized ads become ineligible, or requests stop entirely. |
| Policy restrictions | Policy Center for restricted inventory; restricted content categories draw limited demand by design. | Low coverage on affected pages. |
| Blocking breadth | Category, sensitive-category, advertiser, network, and URL blocks accumulated over time. | Fewer auction participants. |
| Responsive containers | Slot parents have a calculable non-zero width at every breakpoint. | Ads fail to render at all. |
| Duplicate or altered loaders | The account script loads exactly once, unmodified. | Unpredictable behavior. |

## Specific issues

**Ad refresh.** Standard AdSense publishers may not refresh a page or page element without a user request, including timer-based refresh of placements. GPT's `refresh()` API and GAM refresh declarations govern GAM inventory and grant no permission for AdSense tags. This is the canonical **provenance** trap: copying a GPT refresh example into an AdSense page is a policy violation dressed up as an official code sample. Default to no automatic refresh, and explain GAM separately if asked. ([Placement policies](https://support.google.com/adsense/answer/1346295?hl=en), [GPT loading](https://developers.google.com/publisher-tag/guides/control-ad-loading))

**Lazy loading.** Defer below-fold requests until near the viewport, and keep the fetch margin wide enough that each slot renders before the user reaches it — a margin too narrow delivers the creative after the slot is already on screen, which costs viewability. ([GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))

**Blocking controls.** URL, general category, sensitive category, advertiser, and network controls exist for brand safety. Use them for that, and measure when using them for revenue. ([Blocking](https://support.google.com/adsense/answer/180609))

**Ad Review Center.** Search and filter creatives, destination URLs, advertisers, categories, countries, and sizes. Reach for it on concrete brand-safety problems rather than routine mass blocking. ([Ad Review Center](https://support.google.com/adsense/answer/13547010?hl=en))

**Blocking "low-paying ads" is obsolete as a generic strategy.** The auction already selects for value among eligible demand, and visible creative appearance is not a CPC readout. If a user believes otherwise, settle it with an experiment. ([Experiments](https://support.google.com/adsense/answer/6321907?hl=en))

**Seasonality.** Advertiser demand typically rises around major retail periods and falls after them. Compare a Q4-to-Q1 drop year-over-year and by geography and device before diagnosing anything. ([Reporting](https://support.google.com/adsense/answer/6155974))

**Traffic source.** Search, direct, social, referral, and paid traffic differ in intent and session depth. Paid traffic is not categorically forbidden — but traffic purchased to generate ad interactions, traffic exchanges, bots, and incentivized visits are invalid. ([Traffic sources](https://support.google.com/adsense/answer/1348722))

**Session RPM.** Page RPM ignores pages per session, so a layout that lifts page RPM while shortening sessions can reduce total value. For product decisions compute `session revenue / sessions × 1,000` from analytics. ([Page RPM](https://support.google.com/adsense/answer/112030))

## Anti-patterns

Yield mistakes only — the ones that cost money while staying inside policy. Account-ending behaviour lives in the hard rules and [policy-gate.md](./policy-gate.md); render-path mistakes live in [frameworks.md](./frameworks.md).

| Anti-pattern | Consequence | Source |
| --- | --- | --- |
| Sizing a container below the sizes you want served | A 250px container cannot serve `300x250` or `300x600`, shrinking the bidder pool for no design reason. | [Ad sizes](https://support.google.com/adsense/answer/6002621) |
| `adFormat="fluid"` on a display slot with no layout key | `fluid` is for native in-feed and in-article units and expects the generated `data-ad-layout-key`. | [In-feed](https://support.google.com/adsense/answer/9189560) |
| Eager-loading every deep slot | Wasted network and main-thread work, many unseen impressions. | [GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en) |
| Blocking every low-looking ad or category | Shrinks auction competition; can lower coverage and revenue. | [Blocking](https://support.google.com/adsense/answer/180609) |
| Optimizing CTR alone | Rewards risky placement and ignores CPM, viewability, session value, UX, and IVT. | [Active View](https://support.google.com/adsense/answer/3481946?hl=en) |
| Adding slots to answer a revenue drop | Masks the real cause and raises policy risk. Diagnose first: [diagnostics.md](./diagnostics.md). | [Placement](https://support.google.com/adsense/answer/1282097?hl=en) |

## SEO interaction

Google Search evaluates page experience and runs intrusive-interstitial and spam systems, but publishes no universal ranking penalty at a specific ad count. Ad-heavy layouts can still harm CWV, engagement, accessibility, and content prominence indirectly.

So make no causal SEO promises in either direction. Enforce Publisher Policies, then measure CWV and Search performance. ([Page experience](https://developers.google.com/search/docs/appearance/page-experience), [intrusive interstitials](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials))
