import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(new URL("../server/package.json", import.meta.url));
const { Client } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/client")).href
);
const { StdioClientTransport } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/client/stdio")).href
);
const root = fileURLToPath(new URL("../", import.meta.url));
const client = new Client({ name: "agent-kit-integration-probe", version: "1" });
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${JSON.stringify(result.content)}`);
  return name === "screenshot" ? result : JSON.parse(result.content[0].text);
};
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [root + "server/dist/index.js"],
      env: { ...process.env },
    }),
  );
  const instances = await call("list_instances");
  const matches = instances.filter((value) => value.app === process.argv[2]);
  assert.equal(matches.length, 1, `Expected one matching instance: ${JSON.stringify(instances)}`);
  const instanceId = matches[0].instanceId;
  const targets = await call("list_targets", { instanceId });
  const view = targets.webviews.find((value) => value.webviewId === "main");
  assert.ok(view);
  const target = { instanceId, webviewId: view.webviewId };
  const diagnostic = await call("diagnose", target);
  let snapshot = await call("snapshot", target);
  if (process.argv[3]) {
    const buttons = snapshot.controls.filter(
      (value) => value.tag === "button" && value.name === process.argv[3],
    );
    assert.equal(buttons.length, 1, "Expected one observed button");
    await call("click", {
      ...target,
      reference: buttons[0].reference,
      mode: process.argv[4] ?? "webview",
    });
    snapshot = await call("snapshot", target);
  }
  const zoom = await call("set_zoom", { ...target, factor: 1.1 });
  await call("set_zoom", { ...target, factor: zoom.previous });
  const screenshot = await call("screenshot", target);
  const slug = process.argv[2].replace(/[^a-z0-9-]/gi, "-");
  await mkdir(root + "artifacts", { recursive: true });
  await writeFile(
    root + `artifacts/${slug}.png`,
    Buffer.from(screenshot.content.find((value) => value.type === "image").data, "base64"),
  );
  const result = {
    app: matches[0].app,
    diagnostic,
    controls: snapshot.controls,
    textLength: snapshot.text.length,
    zoomRestored: zoom.previous,
    screenshot: `artifacts/${slug}.png`,
  };
  await writeFile(root + `artifacts/${slug}-probe.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.close();
}
