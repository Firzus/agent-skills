import { expect, it } from "vite-plus/test";
import { spawnSync } from "node:child_process";
import metadata from "../package.json" with { type: "json" };
const { version } = metadata;

it("prints CLI information without starting MCP and rejects unknown arguments", () => {
  const path = new URL("../dist/index.js", import.meta.url);
  for (const [arg, expected] of [
    ["--version", version],
    ["--help", "Usage:"],
  ]) {
    const result = spawnSync(process.execPath, [fileURLToPath(path), arg!], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(expected);
    expect(result.stderr).toBe("");
  }
  const invalid = spawnSync(process.execPath, [fileURLToPath(path), "--invalid"], {
    encoding: "utf8",
    timeout: 5000,
  });
  expect(invalid.status).toBe(1);
  expect(invalid.stdout).toBe("");
});
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "node:url";

it("serves real MCP stdio without exposing advanced tools by default", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env: { LOCALAPPDATA: process.env.LOCALAPPDATA ?? "" },
  });
  const client = new Client({ name: "test", version: "1" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.some((t) => t.name === "screenshot")).toBe(true);
    expect(tools.tools.some((t) => t.name === "evaluate_js")).toBe(false);
    expect(tools.tools.some((t) => t.name === "invoke_command")).toBe(false);
    const result = await client.callTool({ name: "set_zoom", arguments: { factor: 99 } });
    expect(result.isError).toBe(true);
  } finally {
    await client.close();
  }
});
