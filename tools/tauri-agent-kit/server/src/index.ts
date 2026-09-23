#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";
import metadata from "../package.json" with { type: "json" };
const { version } = metadata;

const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write(
    `tauri-agent-kit ${version}\nUsage: tauri-agent-kit [--advanced]\nWindows x64 and Tauri 2.11.5 development builds only.\nDefault: MCP over stdio. --advanced enables privileged tools; the app must also opt in.\n--help     Show this help and exit\n--version  Show the version and exit\n`,
  );
} else if (args.includes("--version")) {
  process.stdout.write(`${version}\n`);
} else if (args.some((arg) => arg !== "--advanced")) {
  process.stderr.write("Unknown argument. Use --help.\n");
  process.exitCode = 1;
} else {
  serveStdio(() => createServer(args.includes("--advanced")));
}
