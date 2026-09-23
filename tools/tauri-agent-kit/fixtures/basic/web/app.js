let count = 0;
document.addEventListener("pointerdown", (event) => {
  document.querySelector("#pointer").textContent = JSON.stringify({
    target: event.target.id,
    x: event.clientX,
    y: event.clientY,
    trusted: event.isTrusted,
  });
});
document.querySelector("#increment").addEventListener("click", (event) => {
  document.querySelector("#count").textContent = String(++count);
  document.querySelector("#count").dataset.trusted = String(event.isTrusted);
});
document.querySelector("#send").addEventListener("click", async () => {
  const started = performance.now();
  const answer = await window.__TAURI__.core.invoke("echo", {
    message: document.querySelector("#message").value,
  });
  document.querySelector("#answer").textContent = answer;
  await window.__TAURI__.core.invoke("plugin:agent-kit|record_ipc", {
    record: { command: "echo", durationMs: performance.now() - started, outcome: "ok" },
  });
});
document.querySelector("#block").addEventListener("click", () => {
  const end = performance.now() + 5000;
  while (performance.now() < end) {}
});
console.info("fixture-ready");
void window.__TAURI__.core.invoke("plugin:agent-kit|record_ipc", {
  record: { command: "fixture_ready", durationMs: performance.now(), outcome: "ok" },
});
