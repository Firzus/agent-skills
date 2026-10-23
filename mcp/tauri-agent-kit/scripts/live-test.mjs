import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(new URL("../server/package.json", import.meta.url));
const { Client } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/client")).href
);
const { StdioClientTransport } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/client/stdio")).href
);
const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = spawn(root + "target/debug/agent-kit-fixture.exe", [], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
fixture.stderr.on("data", (chunk) => {
  stderr += chunk;
});
const client = new Client({ name: "agent-kit-live-test", version: "1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [process.env.AGENT_KIT_SERVER_ENTRY ?? root + "server/dist/index.js"],
  env: { ...process.env },
  stderr: "pipe",
});
const outcomes = [];
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${JSON.stringify(result.content)}`);
  return name === "screenshot" ? result : JSON.parse(result.content[0].text);
};
try {
  await client.connect(transport);
  let instance;
  for (let attempt = 0; attempt < 40; attempt++) {
    instance = (await call("list_instances")).find((value) => value.pid === fixture.pid);
    if (instance) break;
    if (fixture.exitCode !== null) throw new Error(`Fixture exited: ${stderr}`);
    await delay(250);
  }
  assert.ok(instance, `Fixture registration missing: ${stderr}`);
  const target = { instanceId: instance.instanceId, webviewId: "main" };
  let targets;
  for (let attempt = 0; attempt < 40; attempt++) {
    targets = await call("list_targets", target);
    if (targets.webviews.length === 2) break;
    await delay(250);
  }
  assert.equal(targets.webviews.length, 2);
  outcomes.push("two same-title windows addressed by exact labels");
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const records = await call("get_ipc_calls", target);
    ready = records.records.some(
      (row) => row.data.command === "fixture_ready" && row.data.webviewId === target.webviewId,
    );
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, `Fixture startup incomplete: ${JSON.stringify(await call("diagnose", target))}`);
  let snapshot;
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (snapshot.controls.some((value) => value.name === "Increment")) break;
    await delay(250);
  }
  assert.ok(snapshot.controls.some((value) => value.name === "Increment"));
  assert.equal(
    snapshot.controls.some((value) => value.value === "fixture-secret"),
    false,
  );
  const button = snapshot.controls.find((value) => value.name === "Increment");
  await call("click", { ...target, reference: button.reference });
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (snapshot.text.includes("Increment1")) break;
    await delay(50);
  }
  assert.match(snapshot.text, /Increment1/);
  const stale = await client.callTool({
    name: "click",
    arguments: { ...target, reference: button.reference },
  });
  assert.equal(stale.isError, true);
  outcomes.push("WebView click observed; stale reference rejected");
  const field = snapshot.controls.find(
    (value) => value.tag === "input" && value.name.includes("Message"),
  );
  await call("type_text", { ...target, reference: field.reference, text: "Bonjour 🦀" });
  snapshot = await call("snapshot", target);
  assert.ok(snapshot.controls.some((value) => value.value === "Bonjour 🦀"));
  await call("click", {
    ...target,
    reference: snapshot.controls.find((value) => value.name === "Echo").reference,
  });
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (snapshot.text.includes("Bonjour 🦀")) break;
    await delay(50);
  }
  assert.match(snapshot.text, /Bonjour 🦀/);
  let ipc;
  for (let attempt = 0; attempt < 40; attempt++) {
    ipc = await call("get_ipc_calls", target);
    if (ipc.records.some((row) => row.data.command === "echo")) break;
    await delay(50);
  }
  assert.ok(ipc.records.some((row) => row.data.command === "echo"));
  outcomes.push("Unicode text, real Tauri IPC, response and instrumentation");
  const initialZoom = await call("set_zoom", { ...target, factor: 1.25 });
  assert.equal(initialZoom.current, 1.25);
  await call("set_zoom", { ...target, factor: initialZoom.previous });
  const capture = await call("screenshot", target);
  const png = Buffer.from(capture.content.find((value) => value.type === "image").data, "base64");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  const captureMetadata = JSON.parse(capture.content.find((value) => value.type === "text").text);
  assert.equal(captureMetadata.width, png.readUInt32BE(16));
  assert.equal(captureMetadata.height, png.readUInt32BE(20));
  assert.ok(captureMetadata.dpiScale > 0);
  await mkdir(root + "artifacts", { recursive: true });
  await writeFile(root + "artifacts/fixture.png", png);
  outcomes.push("controller zoom restored; native WebView PNG captured");
  await call("scroll", { ...target, x: 350, y: 350, deltaY: 600 });
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (snapshot.controls.find((value) => value.name === "Increment").rect.y < 0) break;
    await delay(50);
  }
  assert.ok(snapshot.controls.find((value) => value.name === "Increment").rect.y < 0);
  await call("scroll", { ...target, x: 350, y: 350, deltaY: -600 });
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (
      Math.abs(
        snapshot.controls.find((value) => value.name === "Increment").rect.y - button.rect.y,
      ) < 1
    )
      break;
    await delay(50);
  }
  assert.ok(
    Math.abs(snapshot.controls.find((value) => value.name === "Increment").rect.y - button.rect.y) <
      1,
  );
  outcomes.push("scroll changes observed geometry");
  await call("focus_window", { ...target, windowId: "main" });
  snapshot = await call("snapshot", target);
  const native = await client.callTool({
    name: "click",
    arguments: {
      ...target,
      reference: snapshot.controls.find((value) => value.name === "Increment").reference,
      mode: "windows",
    },
  });
  if (native.isError) {
    assert.ok(
      !process.argv.includes("--require-native"),
      `Native input required: ${JSON.stringify(native.content)}`,
    );
    assert.match(
      JSON.stringify(native.content),
      /native_target_not_foreground|native_webview_not_focused|native_hit_test_rejected|native_input_denied_or_partial/,
    );
    outcomes.push(`native mode refused safely: ${JSON.stringify(native.content)}`);
  } else {
    for (let attempt = 0; attempt < 40; attempt++) {
      snapshot = await call("snapshot", target);
      if (snapshot.text.includes("Increment2")) break;
      await delay(50);
    }
    assert.match(snapshot.text, /Increment2/);
    outcomes.push("Windows click observed");
    await call("type_text", {
      ...target,
      reference: snapshot.controls.find(
        (value) => value.tag === "input" && value.name.includes("Message"),
      ).reference,
      text: "!",
      mode: "windows",
    });
    for (let attempt = 0; attempt < 40; attempt++) {
      snapshot = await call("snapshot", target);
      if (snapshot.controls.some((value) => value.value?.includes("!"))) break;
      await delay(50);
    }
    assert.ok(snapshot.controls.some((value) => value.value?.includes("!")));
    await call("press_key", { ...target, key: "Backspace", mode: "windows" });
    for (let attempt = 0; attempt < 40; attempt++) {
      snapshot = await call("snapshot", target);
      if (snapshot.controls.some((value) => value.value === "Bonjour 🦀")) break;
      await delay(50);
    }
    assert.ok(snapshot.controls.some((value) => value.value === "Bonjour 🦀"));
    outcomes.push("Windows text and Backspace effects observed");
  }
  await writeFile(root + "artifacts/live-results.json", JSON.stringify({ outcomes }, null, 2));
  console.log(JSON.stringify({ outcomes }, null, 2));
} finally {
  await client.close();
  fixture.kill();
  await new Promise((resolve) =>
    fixture.exitCode !== null || fixture.signalCode !== null
      ? resolve()
      : fixture.once("exit", resolve),
  );
}
