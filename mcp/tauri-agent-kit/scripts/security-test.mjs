import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
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
  env: { ...process.env, AGENT_KIT_ADVANCED: "1" },
  stdio: "ignore",
});
const secondaryEnvironment = { ...process.env };
delete secondaryEnvironment.AGENT_KIT_ADVANCED;
const secondary = spawn(root + "target/debug/agent-kit-fixture.exe", [], {
  cwd: root,
  windowsHide: true,
  env: secondaryEnvironment,
  stdio: "ignore",
});
const client = new Client({ name: "agent-kit-security-test", version: "1" });
const call = async (name, args = {}, options) => {
  const result = await client.callTool({ name, arguments: args }, options);
  if (result.isError) throw new Error(JSON.stringify(result.content));
  return JSON.parse(result.content[0].text);
};
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [root + "server/dist/index.js", "--advanced"],
      env: { ...process.env },
    }),
  );
  let instance;
  for (let attempt = 0; attempt < 40; attempt++) {
    instance = (await call("list_instances")).find((value) => value.pid === fixture.pid);
    if (instance) break;
    await delay(100);
  }
  assert.ok(instance);
  let other;
  for (let attempt = 0; attempt < 40; attempt++) {
    other = (await call("list_instances")).find((value) => value.pid === secondary.pid);
    if (other) break;
    await delay(100);
  }
  assert.ok(other);
  assert.notEqual(instance.instanceId, other.instanceId);
  const denied = await client.callTool({
    name: "evaluate_js",
    arguments: { instanceId: other.instanceId, webviewId: "main", expression: "true" },
  });
  assert.equal(denied.isError, true);
  const target = { instanceId: instance.instanceId, webviewId: "main" };
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const diagnosis = await call("diagnose", target);
    ready =
      diagnosis.webviews.length === 2 &&
      diagnosis.readiness.every(
        (value) => value.responsive && value.document.readyState === "complete",
      );
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "Fixture document must finish navigating before security probes");
  await call("evaluate_js", { ...target, expression: "document.readyState" });
  const baseline = await call("set_zoom", { ...target, factor: 1 });
  const blocking = call("evaluate_js", {
    ...target,
    expression: "new Promise(resolve=>setTimeout(()=>resolve(true),1500))",
  });
  await delay(100);
  const abort = new AbortController();
  const queued = call("set_zoom", { ...target, factor: 3 }, { signal: abort.signal });
  const rejected = assert.rejects(queued);
  await delay(100);
  abort.abort();
  await rejected;
  await blocking;
  const after = await call("set_zoom", { ...target, factor: baseline.previous });
  assert.equal(after.previous, 1, "Cancelled queued zoom must not execute");
  const snapshot = await call("snapshot", target);
  const field = snapshot.controls.find((value) => value.name.includes("Message"));
  assert.ok(field);
  await call("evaluate_js", {
    ...target,
    expression:
      "window.fixtureClicks=0;document.addEventListener('click',()=>window.fixtureClicks++)",
  });
  const invalid = await client.callTool({
    name: "type_text",
    arguments: { ...target, reference: field.reference, text: "invalid\ntext" },
  });
  assert.equal(invalid.isError, true);
  assert.equal(await call("evaluate_js", { ...target, expression: "window.fixtureClicks" }), 0);
  await call("evaluate_js", {
    ...target,
    expression:
      "(() => { const field=document.querySelector('#message'); field.onmousedown=event=>{event.preventDefault();setTimeout(()=>field.focus(),100)}; return true })()",
  });
  await call("type_text", { ...target, reference: field.reference, text: "delayed" });
  assert.equal(
    await call("evaluate_js", {
      ...target,
      expression: "document.querySelector('#message').value",
    }),
    "delayed",
  );
  await call("evaluate_js", {
    ...target,
    expression:
      "(() => { const field=document.querySelector('#message'); field.blur(); field.onmousedown=event=>event.preventDefault(); return true })()",
  });
  const unfocused = await client.callTool({
    name: "type_text",
    arguments: { ...target, reference: field.reference, text: "forbidden" },
  });
  assert.equal(unfocused.isError, true);
  assert.match(JSON.stringify(unfocused.content), /editable_target_lost_focus/);
  assert.equal(
    await call("evaluate_js", {
      ...target,
      expression: "document.querySelector('#message').value",
    }),
    "delayed",
  );
  const ipc = await call("invoke_command", {
    ...target,
    command: "echo",
    args: { message: "advanced-echo" },
  });
  assert.equal(ipc, "advanced-echo");
  await call("evaluate_js", {
    ...target,
    expression: "setTimeout(()=>{const end=Date.now()+3000;while(Date.now()<end){}},50);true",
  });
  await delay(100);
  const started = Date.now();
  const diagnosis = await call("diagnose", target);
  assert.equal(diagnosis.rustResponsive, true);
  assert.ok(diagnosis.readiness.some((value) => !value.responsive));
  assert.ok(Date.now() - started < 2500);
  console.log(
    JSON.stringify({
      cancelledQueue: "passed",
      invalidTextHasNoClick: "passed",
      advancedIpc: "passed",
      blockedJavaScriptDiagnosis: "passed",
      multiInstance: "passed",
      advancedGate: "passed",
      delayedFocus: "passed",
      unfocusedTextRejected: "passed",
    }),
  );
} finally {
  await client.close();
  fixture.kill();
  secondary.kill();
  await new Promise((resolve) =>
    fixture.exitCode !== null || fixture.signalCode !== null
      ? resolve()
      : fixture.once("exit", resolve),
  );
  await new Promise((resolve) =>
    secondary.exitCode !== null || secondary.signalCode !== null
      ? resolve()
      : secondary.once("exit", resolve),
  );
}
