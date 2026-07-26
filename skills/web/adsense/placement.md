# Formats and placement

Placement decides both **viewable** rate and policy exposure, so every slot gets a deliberate role rather than a spot that happened to be free in the template.

## Formats

| Format | What it does | Best fit / tradeoff | Source |
| --- | --- | --- | --- |
| Display | Responsive or fixed unit supporting text, image, or rich media. | General purpose; responsive survives breakpoints, fixed gives layout certainty but narrows eligible creatives. | [Ad units](https://support.google.com/adsense/answer/9183549?hl=en-1) |
| In-feed | Native unit shaped to a list or feed. | Between feed items; must stay distinguishable as an ad. | [In-feed](https://support.google.com/adsense/answer/9189560) |
| In-article | Native unit for placement between paragraphs. | Long-form editorial; respect reading flow. | [In-article](https://support.google.com/adsense/answer/9189561) |
| Multiplex | Grid of content-style ad recommendations. | Often near the end of content; consumes real visual space, so content dominance still governs. | [Multiplex](https://support.google.com/adsense/answer/11101665) |
| AdSense for Search | Search-result ads tied to user queries. | Sites with genuine search utility; extra AFS policies apply. | [AFS](https://support.google.com/adsense/answer/9879) |
| Auto ads: in-page | Google picks eligible in-content placements. | Fast coverage and automated testing; less editorial determinism. | [Auto ads](https://support.google.com/adsense/answer/9261805) |
| Auto ads: anchor | Dismissible overlay fixed to a viewport edge. | High viewability; monitor UX intrusion. | [Auto ads](https://support.google.com/adsense/answer/9261805) |
| Auto ads: vignette | Full-screen ad between page loads, frequency-capped and dismissible. | High impact; wrong where interruption breaks task completion. | [Auto ads](https://support.google.com/adsense/answer/9261805) |
| Auto ads: side rail | Desktop ads in widescreen side margins. | Uses otherwise empty margin; only on eligible layouts. | [Auto ads](https://support.google.com/adsense/answer/9261805) |

Anchor and vignette exist only as Auto ads formats — there is no manual unit for them. A publisher wanting those formats is choosing Auto ads for at least part of the site.

## Responsive versus fixed

Google recommends responsive units: they adapt to layout and device, and multiple eligible sizes widen auction competition. ([Ad sizes](https://support.google.com/adsense/answer/6002621), [GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))

Historically strong display sizes are `300×250`, `336×280`, `728×90`, `300×600`, and mobile `320×100`. Their strength comes from broad creative demand and prominent usable area — treat them as common inventory, not guaranteed winners for a given layout.

| Size | Typical placement | Caution |
| --- | --- | --- |
| `300×250` medium rectangle | In-content or sidebar; broad compatibility. | Accidental-click risk near buttons and navigation. |
| `336×280` large rectangle | Desktop/tablet in-content. | Overflows narrow containers; responsive is safer. |
| `728×90` leaderboard | Desktop header or between sections. | Poor mobile fit, and a sticky implementation at this width breaks the [sticky requirements](https://support.google.com/adsense/answer/10734935?hl=en). |
| `300×600` half-page | Desktop sidebar. | Large footprint; content must still outweigh ads. |
| `320×100` large mobile banner | Mobile header/footer or content boundary. | Reserve space and stay clear of tap targets. |

The **contested** call: fixed slots make space reservation deterministic, responsive slots broaden device and creative eligibility. Default to responsive with explicit per-breakpoint space reservation; choose fixed only where the design is genuinely constrained. ([Ad sizes](https://support.google.com/adsense/answer/6002621))

## Governing principles

- Place ads where users can see them without confusing them for content or controls. Viewability requires an opportunity to be seen; it never licenses intrusion. ([Active View](https://support.google.com/adsense/answer/3481946?hl=en))
- Above-the-fold ads gain early visibility, but an ad-heavy first viewport obscures content and can breach content dominance. ([Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en))
- Lazy-load below-fold units shortly before they approach the viewport; requesting every deep unit at load wastes bandwidth and manufactures unviewed impressions. ([GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))
- Less can be more: Google warns that clutter drives users away even where the formal content-to-ads ratio passes. ([Placement best practices](https://support.google.com/adsense/answer/1282097?hl=en))
- Sticky ads are permitted only within technical constraints: width no greater than 300px, no overlap or underlap, and adequate separation from content, navigation, scrollbars, and other ads. ([Sticky requirements](https://support.google.com/adsense/answer/10734935?hl=en))

## Layout requirements

Each row states the layout to build; the middle column names the violation it forecloses, so a review can check both directions.

| Build this | Forecloses | Policy basis |
| --- | --- | --- |
| Clear separation between ads and navigation, buttons, and action items. | Unintended interaction | [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en) |
| Content that keeps its position and remains readable once ads load. | Overlay, content pushed off-screen | [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en) |
| An exit from every screen that requires no ad interaction. | Dead-end screens | [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en) |
| Ads that read as ads, with their disclosure label intact. | Disguised or deceptively labeled units | [Placement policies](https://support.google.com/adsense/answer/1346295?hl=en) |
| Copy that stands on its own, with attention drawn to content rather than ads. | Encouraged clicks | [Encouraging clicks](https://support.google.com/adsense/answer/48182) |
| Publisher content outweighing ads and paid promotion on every screen. | Inventory-value violation | [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en) |
| Ad requests tied to a user-requested refresh or a genuine content change. | Automatic refresh | [Placement policies](https://support.google.com/adsense/answer/1346295?hl=en) |

## Patterns by content type

Starting hypotheses to **experiment** against, not policy guarantees or performance promises.

| Content type | Starting pattern | Why / guardrail |
| --- | --- | --- |
| Long-form blog | One responsive unit after the introduction, in-article units at natural section boundaries, optional end-of-article multiplex, eligible anchor. | Aligns inventory with scroll depth; keep paragraph interruption moderate and judge session RPM. |
| News | A fast above-fold slot that does not displace headline or lead, lazy in-article placements, optional side rail on wide screens. | Depth varies per story; prioritize LCP and viewability. |
| Listing / e-commerce | Units between coherent item groups — never beside filters, add-to-cart, pagination, or product controls. | Interactive density makes accidental clicks the dominant risk. |
| Forum | Ads between public posts and threads with clear separation; none in private messages or live chat. | Ads are prohibited where private communication is the primary focus. |
| SPA / tool | Request ads only on meaningful route or content changes; leave loading, error, modal-only, and no-content states unmonetized. | Dead-end, no-content, background, and refresh rules all still apply. |
| Infinite-scroll list or grid | An interval-based rule with an explicit lead-in of real content, and a ratio that holds across a long scroll rather than only the first screen. | Density has no natural ceiling here; ads sharing a clickable card's footprint make accidental clicks the dominant risk. See [frameworks.md](./frameworks.md). |

**Cover every template, and every breakpoint.** Before tuning any placement, list the site's page templates and mark each monetized or deliberately not. Editorial long-form with no inventory is the most common and most valuable omission, and a slot rendered only above a desktop breakpoint leaves mobile traffic generating no ad request at all. Neither gap shows up in AdSense reporting, since a template serving no ads contributes no ad-serving page views — find both by comparing analytics traffic per template against AdSense page views.

## Auto ads versus manual

| Dimension | Auto ads | Manual units |
| --- | --- | --- |
| Placement | Google selects eligible placements. | Publisher picks exact location and unit type. |
| Control | Format toggles, ad load, excluded areas, page exclusions. | Full editorial and layout control — and full ownership of policy compliance and breakpoint behavior. |
| Formats | Includes anchor, vignette, side rail. | Display and native units only. |
| Best fit | New or small team, heterogeneous templates, or an experiment baseline. | Branded editorial layouts, tools, sensitive interactions, mature analytics. |

Both can coexist. ([Auto vs manual](https://support.google.com/adsense/answer/7037624?hl=en))

**Constraining Auto ads.** The setup offers an "Existing ads" control deciding whether Google may optimize existing units, plus per-format toggles for overlay and in-page formats, an in-page ad load setting, area exclusions, and exact page or URL-section exclusions. ([Setup and controls](https://support.google.com/adsense/answer/9261307?hl=en-GB), [page exclusions](https://support.google.com/adsense/answer/9262311?hl=en))

**Prefer neither by doctrine** — this is a genuinely **contested** question, with Google emphasizing automation and coverage while experienced publishers value template-specific editorial control. Establish a manual baseline, test Auto ads on representative templates, and compare total revenue, page and session RPM, viewability, CWV, engagement, and UX/policy incidents. Auto ads experiments compare settings or on/off without code changes and report whole-site impact including manual units. ([Experiments](https://support.google.com/adsense/answer/9726342?hl=en))

## Density

Google sets a hard qualitative ceiling — no more paid material than publisher content — and publishes no numeric optimum. Practitioner optima differ by device, content depth, and audience tolerance, so inventing an "ads per 1,000 words" rule would be fabrication.

Start sparse and add marginal placements only while incremental revenue exceeds the losses from clutter, slower pages, lower engagement, and lower viewability. ([Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en), [placement best practices](https://support.google.com/adsense/answer/1282097?hl=en))

In an infinite scroll the ceiling has no natural stopping point, so express density as a rule you can test — an interval plus a lead-in — and verify the content-to-ads ratio over a long scroll, not just the first viewport. Interactive card grids deserve the sparsest setting: the ad occupies the same footprint as a clickable card, which is exactly the configuration Google's placement policy treats as accidental-click risk.
