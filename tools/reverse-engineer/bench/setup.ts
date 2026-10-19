// Prepares bench/work: target copies, the leanrea skill, rea-agents@6.5.0 and MCP configs.
// Run with: node bench/setup.ts
// Inputs (env): NOTION_DIR (default %LOCALAPPDATA%/Programs/Notion), GH_EXE (default: gh on PATH),
//               LEANREA_DIR (a leanrea clone; default: git clone into work/leanrea).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const WORK = process.env.RE_BENCH_WORK ?? join(HERE, "work");
const shell = process.platform === "win32";

const run = (cmd: string, args: string[], cwd?: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", shell, stdio: ["ignore", "pipe", "inherit"] }).trim();

function copyTargets(): void {
  const targets = join(WORK, "targets");
  mkdirSync(targets, { recursive: true });
  const notion = process.env.NOTION_DIR ?? join(process.env.LOCALAPPDATA ?? "", "Programs", "Notion");
  const resources = join(notion, "resources");
  if (!existsSync(join(resources, "app.asar"))) throw new Error(`Notion not found: ${resources}`);
  cpSync(join(resources, "app.asar"), join(targets, "app.asar"));
  cpSync(join(resources, "app.asar.unpacked"), join(targets, "app.asar.unpacked"), { recursive: true });
  const addon = join(
    resources,
    "app.asar.unpacked",
    "node_modules",
    "@notionhq",
    "desktop-native",
    "build",
    "Release",
    "win_utils.node",
  );
  cpSync(addon, join(targets, "win_utils.node"));
  const gh = process.env.GH_EXE ?? run(shell ? "where" : "which", ["gh"]).split(/\r?\n/)[0];
  if (!gh || !existsSync(gh)) throw new Error("gh not found; set GH_EXE");
  cpSync(gh, join(targets, "gh.exe"));
}

function leanrea(): string {
  let dir = process.env.LEANREA_DIR;
  if (!dir) {
    dir = join(WORK, "leanrea");
    if (!existsSync(dir)) run("git", ["clone", "--depth", "1", "https://github.com/aicodeking/leanrea", dir]);
  }
  const skill = join(dir, "leanrea");
  if (!existsSync(join(skill, "SKILL.md"))) throw new Error(`leanrea skill not found in ${dir}`);
  cpSync(skill, join(WORK, "skills", "leanrea"), { recursive: true });
  return run("git", ["-C", dir, "rev-parse", "HEAD"]);
}

function rea(): string {
  const install = join(WORK, "rea-install");
  const pkg = join(install, "node_modules", "rea-agents");
  if (!existsSync(pkg)) {
    mkdirSync(install, { recursive: true });
    run("npm", ["init", "-y"], install);
    run("npm", ["install", "rea-agents@6.5.0", "--ignore-scripts"], install);
  }
  cpSync(join(pkg, "skills", "reverse-engineer-anything"), join(WORK, "skills", "reverse-engineer-anything"), {
    recursive: true,
  });
  writeFileSync(
    join(WORK, "rea-mcp.json"),
    JSON.stringify({ mcpServers: { rea: { command: "node", args: [join(pkg, "scripts", "rea.mjs"), "--mcp"] } } }),
  );
  return "rea-agents@6.5.0";
}

function self(): string {
  const cli = join(REPO, "dist", "cli.mjs");
  if (!existsSync(cli)) throw new Error("dist/cli.mjs missing; run `vp pack` first");
  return run("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]);
}

mkdirSync(join(WORK, "skills"), { recursive: true });
copyTargets();
const versions = { leanrea: leanrea(), rea: rea(), "reverse-engineer": self() };
writeFileSync(join(WORK, "versions.json"), JSON.stringify(versions, null, 2));
console.log(`ready: ${WORK}`);
console.log(versions);
