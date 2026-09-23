(() => {
  const key = "__tauriAgentKitObservation";
  if (!window[key]) {
    const state = { entries: new Map(), snapshot: "" };
    Object.defineProperty(window, key, { value: state, configurable: true });
  }
  const state = window[key];
  state.entries.clear();
  state.snapshot = crypto.randomUUID();
  const elements = [
    ...document.querySelectorAll(
      'button,input,textarea,select,a[href],[role],[contenteditable="true"]',
    ),
  ]
    .filter((element) => element.getClientRects().length > 0)
    .slice(0, 300);
  const controls = elements.map((element, index) => {
    const reference = `${state.snapshot}:${index}`;
    const rect = element.getBoundingClientRect();
    const signature = JSON.stringify([
      element.tagName,
      element.type,
      element.getAttribute("role"),
      element.getAttribute("aria-label"),
      element.textContent,
    ]);
    state.entries.set(reference, {
      element,
      signature,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
    return {
      reference,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      name: (
        element.getAttribute("aria-label") ||
        element.labels?.[0]?.innerText ||
        element.innerText ||
        element.getAttribute("placeholder") ||
        ""
      ).slice(0, 256),
      value: element.type === "password" ? "[redacted]" : (element.value ?? "").slice(0, 256),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      disabled: Boolean(element.disabled),
    };
  });
  return {
    snapshotId: state.snapshot,
    controls,
    text: document.body?.innerText.slice(0, 12000) || "",
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    scope: "top-level-document",
  };
})();
