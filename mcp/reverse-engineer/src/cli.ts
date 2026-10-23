#!/usr/bin/env node
import { fit } from "./core/budget";
import { serve } from "./server";
import { tools } from "./tools/index";
import pkg from "../package.json" with { type: "json" };
import { parseArgs } from "./args";

// Bundled at build time, so the version has one source: package.json.
const { version: VERSION } = pkg;

function usage(): string {
  return [
    `reverse-engineer ${VERSION}`,
    "usage: reverse-engineer mcp                     start the MCP server on stdio",
    "       reverse-engineer <tool> <path> [--key value ...]",
    `tools: ${tools.map((t) => t.name).join(", ")}`,
    "example: reverse-engineer search ./app.asar --pattern exposeInMainWorld --glob '*.js'",
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === undefined || command === "-h" || command === "--help") {
    console.log(usage());
    return command === undefined ? 1 : 0;
  }
  if (command === "--version") {
    console.log(VERSION);
    return 0;
  }
  if (command === "mcp") {
    await serve(VERSION);
    return -1;
  }
  const tool = tools.find((t) => t.name === command || t.name === command.replace(/-/g, "_"));
  if (!tool) {
    console.error(`unknown tool: ${command}\n${usage()}`);
    return 2;
  }
  const parsed = tool.schema.safeParse(parseArgs(tool, rest));
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("\n"));
    return 2;
  }
  console.log(await fit(await tool.run(parsed.data), tool.name));
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code >= 0) process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
