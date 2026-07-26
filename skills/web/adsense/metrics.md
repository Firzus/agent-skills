# Metrics

Read this before quoting any number. The three RPMs share a name and differ in denominator, and conflating them turns a healthy change into a false alarm.

## Definitions

| Metric | Formula / definition | Primary levers | Source |
| --- | --- | --- | --- |
| Page view | One view of a page displaying ads; one page view can produce several ad requests and impressions. | Traffic, navigation, pages/session. | [Glossary](https://support.google.com/adsense/answer/6084409) |
| Ad request | A request asking for ads; one request may return zero, one, or several ads by format. | Eligible units, lazy loading, consent, policy, demand. | [Glossary](https://support.google.com/adsense/answer/6084409) |
| Impression | Recorded when one or more ads begin loading for a request; semantics vary by format. | Filled requests, units per page, scroll depth. | [Reporting](https://support.google.com/adsense/answer/6157410) |
| Click | A valid user click. | Legitimate relevance and visibility — never inducement or deceptive placement. | [Policy](https://support.google.com/adsense/answer/48182) |
| CTR | Ad CTR is `clicks / impressions × 100%`; page CTR uses page views as the denominator. | Relevance, viewability, placement, device. A suspicious jump is an IVT investigation, not a win. | [Reporting](https://support.google.com/adsense/answer/6157410) |
| CPC | `Earnings from clicks / valid clicks`. The advertiser auction largely sets the bid. | Commercial intent, advertiser demand, geography, season, quality. | [CPC](https://support.google.com/adsense/answer/116495) |
| CPM | Earnings basis per 1,000 impressions; CPM bidding pays for impressions rather than clicks. | Demand, audience, placement and viewability, season. | [CPM](https://support.google.com/adsense/answer/116225) |
| eCPM | `Estimated earnings / count × 1,000` normalized per thousand. AdSense generally labels publisher-side equivalents as RPM. | Numerator earnings plus denominator volume. | [eCPM](https://support.google.com/adsense/answer/190515) |
| **Page RPM** | `Estimated earnings / page views × 1,000`. | Traffic quality, ads per page, coverage, CPC/CPM, viewability, session behavior. | [Page RPM](https://support.google.com/adsense/answer/112030) |
| **Impression RPM** | `Estimated earnings / ad impressions × 1,000`. | Auction value and impression quality. | [Impression RPM](https://support.google.com/adsense/answer/112032) |
| **Ad request RPM** | `Estimated earnings / ad requests × 1,000`. | Coverage and match, demand, consent, blocking, request quality. | [Request RPM](https://support.google.com/adsense/answer/112031) |
| Coverage | `Requests that returned at least one ad / total requests × 100%`. | Demand eligibility, policy, consent, crawlability, geography, blocked categories, `ads.txt`. | [Coverage](https://support.google.com/adsense/answer/92360?hl=en) |
| Match rate | A GAM metric: matched requests over total requests. | Demand and eligibility. | [GAM](https://support.google.com/admanager/answer/3124536) |
| Fill rate | Industry shorthand for filled impressions over requests; implementations differ, so state the denominator. AdSense's defined near-equivalent is coverage. | Demand, policy, consent, blocking. | [Coverage](https://support.google.com/adsense/answer/92360?hl=en) |
| Active View measurable | Measurable impressions as a share of eligible impressions. | Supported formats, iframe/measurement environment, implementation. | [Active View](https://support.google.com/adsense/answer/3481946?hl=en) |
| Active View **viewable** | Viewable over measurable impressions. Display counts as viewable at 50% of pixels on screen for one continuous second. | Placement, viewport proximity, scroll behavior, load timing. | [Active View](https://support.google.com/adsense/answer/3481946?hl=en) |
| IVT | Clicks or impressions that artificially inflate advertiser cost or publisher earnings. | Acquisition, bots, accidental clicks, self-clicks, implementation. | [IVT](https://support.google.com/adsense/answer/16737) |
| Session RPM | Not an AdSense metric. `Session revenue / sessions × 1,000`, computed from analytics. | Pages per session plus per-page value. | Derived; page RPM baseline: [Page RPM](https://support.google.com/adsense/answer/112030) |

## Interpretation rules

**Revenue decomposes roughly as** `traffic × monetizable page views × ads per page × coverage × value per impression` — but the terms interact. Extra ads can depress viewability, UX, pages per session, and auction value simultaneously, so the product can fall while one factor rises.

**A falling impression RPM is not automatically bad.** Lazy-loading away unseen impressions shrinks the denominator's junk and raises impression quality. Judge total revenue, page RPM, session RPM, viewability, and UX together.

**A rising CTR is not automatically good.** It is also the signature of accidental clicks from a placement too close to controls, and of invalid traffic. Pair every CTR gain with a placement-safety check.

**Never equate a GAM metric with an AdSense metric** when comparing reports. Match rate and coverage are defined against different denominators.

**"Page views RPM" almost always means page RPM.** Use Google's label and formula rather than the colloquial name.

**No trustworthy universal RPM or CPM benchmark exists.** Values vary by country, device, niche, season, format, consent state, and traffic quality. Treat geography and vertical as reporting segments to measure, not multipliers to promise — Google publishes no country RPM table.

## Baseline to capture

Record before changing anything, with the date range stated:

| Dimension | Fields |
| --- | --- |
| Revenue | Estimated earnings, page RPM, impression RPM, ad request RPM |
| Inventory | Ad requests, impressions, coverage, ads per page |
| Quality | Active View measurable and **viewable**, CTR, CPC/CPM |
| Audience | Page views, sessions, pages per session, session RPM |
| Segments | Country, device, page template, traffic source |
| Performance | Field LCP, CLS, INP at the 75th percentile by template and device |

Segment before concluding. An aggregate that looks flat routinely hides a mobile collapse offset by a desktop gain.
