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
const client = new Client({ name: "agent-kit-input-probe", version: "1" });
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  return JSON.parse(result.content[0].text);
};
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("../server/dist/index.js", import.meta.url))],
      env: { ...process.env },
    }),
  );
  const matches = (await call("list_instances")).filter((value) => value.app === process.argv[2]);
  assert.equal(matches.length, 1);
  const target = { instanceId: matches[0].instanceId, webviewId: "main" };
  let snapshot = await call("snapshot", target);
  const fields = snapshot.controls.filter((value) => value.name === process.argv[3]);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].value, "", "Refuse to overwrite existing input");
  await call("type_text", { ...target, reference: fields[0].reference, text: process.argv[4] });
  snapshot = await call("snapshot", target);
  assert.ok(
    snapshot.controls.some(
      (value) => value.name === process.argv[3] && value.value === process.argv[4],
    ),
  );
  await call("press_key", { ...target, key: "Enter" });
  for (let attempt = 0; attempt < 40; attempt++) {
    snapshot = await call("snapshot", target);
    if (snapshot.text.includes(process.argv[5])) break;
    await delay(50);
  }
  assert.ok(snapshot.text.includes(process.argv[5]), "Expected response not observed");
  console.log(JSON.stringify({ app: matches[0].app, inputVerified: true, responseVerified: true }));
} finally {
  await client.close();
}
