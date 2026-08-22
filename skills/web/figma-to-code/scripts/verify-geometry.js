// Numeric geometry diff for figma-to-code Step 5.
// Run in the rendered page (browser console or MCP evaluate):
//
//   await verifyGeometry({
//     "693:1500": { x: 0, y: 0, width: 1280, height: 720 },
//     "693:1501": { x: 24, y: 32, width: 404, height: 140 },
//   }, { threshold: 1 });
//
// Keys are Figma node ids from get_metadata; each rendered block must carry
// a matching data-node-id attribute. Coordinates may sit in any space (page
// absolute or root-relative) as long as every entry shares it; the first
// entry — or options.rootId — anchors the origin. Returns { pass, measured,
// deviations, missing, unloadedFonts, brokenImages }.

async function verifyGeometry(expected, options = {}) {
  const threshold = options.threshold ?? 1;
  const rootId = options.rootId ?? Object.keys(expected)[0];
  const originExpected = expected[rootId];
  if (!originExpected) {
    return { pass: false, error: `rootId ${rootId} has no entry in the expected table` };
  }

  await document.fonts.ready;

  const rootEl = document.querySelector(`[data-node-id="${rootId}"]`);
  if (!rootEl) {
    return { pass: false, error: `root node ${rootId} not found in DOM` };
  }
  const origin = rootEl.getBoundingClientRect();

  const deviations = [];
  const missing = [];
  const measuredElements = [];

  for (const [nodeId, exp] of Object.entries(expected)) {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) {
      missing.push(nodeId);
      continue;
    }
    measuredElements.push(el);
    const r = el.getBoundingClientRect();
    const actual = {
      x: r.left - origin.left + originExpected.x,
      y: r.top - origin.top + originExpected.y,
      width: r.width,
      height: r.height,
    };
    for (const prop of ["x", "y", "width", "height"]) {
      const delta = actual[prop] - exp[prop];
      if (Math.abs(delta) > threshold) {
        deviations.push({
          nodeId,
          prop,
          expected: exp[prop],
          actual: Math.round(actual[prop] * 100) / 100,
          delta: Math.round(delta * 100) / 100,
        });
      }
    }
  }

  const usedFamilies = new Set();
  for (const el of measuredElements) {
    for (const family of getComputedStyle(el).fontFamily.split(",")) {
      usedFamilies.add(family.trim().replace(/^["']|["']$/g, "").toLowerCase());
    }
  }
  const unloadedFonts = [];
  for (const font of document.fonts) {
    if (font.status !== "loaded" && usedFamilies.has(font.family.replace(/^["']|["']$/g, "").toLowerCase())) {
      unloadedFonts.push(`${font.family} ${font.weight} (${font.status})`);
    }
  }

  const images = [...document.images];
  await Promise.all(
    images.map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            setTimeout(resolve, options.imageTimeoutMs ?? 5000);
          }),
    ),
  );
  const brokenImages = images
    .filter((img) => img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src);

  const measured = Object.keys(expected).length - missing.length;
  const pass =
    deviations.length === 0 &&
    missing.length === 0 &&
    unloadedFonts.length === 0 &&
    brokenImages.length === 0;

  return { pass, threshold, measured, deviations, missing, unloadedFonts, brokenImages };
}
