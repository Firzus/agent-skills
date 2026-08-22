// Numeric geometry diff for figma-to-code Step 5.
// Run in the rendered page (browser console or MCP evaluate):
//
//   await verifyGeometry({
//     "693:1500": { x: 0, y: 0, width: 1280, height: 720 },
//     "693:1501": { x: 24, y: 32, width: 404, height: 140 },
//   }, { threshold: 1 });
//
// Keys are Figma node ids from get_metadata; each rendered block must carry
// a matching data-node-id attribute. Coordinates are relative to the root
// frame (the first entry, or pass { rootId }). Measures in CSS pixels via
// getBoundingClientRect, so device pixel ratio cannot skew the result.
// Waits for document.fonts.ready before measuring, then reports geometry
// deviations above the threshold, unloaded fonts, and broken images.

async function verifyGeometry(expected, options = {}) {
  const threshold = options.threshold ?? 1;
  const rootId = options.rootId ?? Object.keys(expected)[0];

  await document.fonts.ready;

  const rootEl = document.querySelector(`[data-node-id="${rootId}"]`);
  if (!rootEl) {
    return { pass: false, error: `root node ${rootId} not found in DOM` };
  }
  const origin = rootEl.getBoundingClientRect();
  const originExpected = expected[rootId];

  const deviations = [];
  const missing = [];

  for (const [nodeId, exp] of Object.entries(expected)) {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) {
      missing.push(nodeId);
      continue;
    }
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

  const unloadedFonts = [];
  for (const font of document.fonts) {
    if (font.status !== "loaded") {
      unloadedFonts.push(`${font.family} ${font.weight} (${font.status})`);
    }
  }

  const brokenImages = [...document.images]
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src);

  const measured = Object.keys(expected).length - missing.length;
  const pass =
    deviations.length === 0 &&
    missing.length === 0 &&
    unloadedFonts.length === 0 &&
    brokenImages.length === 0;

  return { pass, threshold, measured, deviations, missing, unloadedFonts, brokenImages };
}

if (typeof module !== "undefined") {
  module.exports = { verifyGeometry };
}
