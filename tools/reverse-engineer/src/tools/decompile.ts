import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { artifactPath, cacheRoot, exists, sha256File } from "../core/cache";
import { launcherSafePath, type RunResult, runTool } from "../core/process";
import { toolDirs, toolEnv, toolsRoot } from "../core/thirdParty";
import { defineTool } from "./types";

/** Finds a Ghidra install: GHIDRA_INSTALL_DIR, the tools root, then usual parent directories (newest version first). */
export async function findGhidra(): Promise<string | undefined> {
  const launcher = process.platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless";
  const ok = (dir: string) => existsSync(join(dir, "support", launcher));
  const env = process.env.GHIDRA_INSTALL_DIR;
  if (env && ok(env)) return env;
  const installed = toolDirs(/^ghidra/i).find(ok);
  if (installed) return installed;
  const parents = [
    join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Programs"),
    process.env.ProgramFiles ?? "C:\\Program Files",
    "C:\\",
    homedir(),
    join(homedir(), "Applications"),
    "/Applications",
    "/opt",
    "/usr/local/opt",
    "/usr/share",
  ];
  const found: string[] = [];
  for (const parent of parents) {
    let names: string[] = [];
    try {
      names = await readdir(parent);
    } catch {
      continue;
    }
    for (const name of names) {
      if (/^ghidra/i.test(name) && ok(join(parent, name))) found.push(join(parent, name));
    }
  }
  // Homebrew formula: <prefix>/opt/ghidra/libexec
  for (const prefix of ["/opt/homebrew", "/usr/local", "/home/linuxbrew/.linuxbrew"]) {
    const dir = join(prefix, "opt", "ghidra", "libexec");
    if (ok(dir)) found.push(dir);
  }
  // Homebrew cask (older installs): /opt/homebrew/Caskroom/ghidra/<version>/ghidra_<version>_PUBLIC
  for (const cask of ["/opt/homebrew/Caskroom/ghidra", "/usr/local/Caskroom/ghidra"]) {
    try {
      for (const version of await readdir(cask)) {
        for (const name of await readdir(join(cask, version)))
          if (ok(join(cask, version, name))) found.push(join(cask, version, name));
      }
    } catch {
      // not installed there
    }
  }
  // Newest version first, wherever it is installed; an install path without a version comes last.
  const version = (dir: string) => /(\d+(?:\.\d+)+)/.exec(basename(dir))?.[1] ?? "0";
  return found.sort((a, b) => version(b).localeCompare(version(a), undefined, { numeric: true }))[0];
}

/**
 * Ghidra rejects project and script paths with an element starting with "."
 * (for example ~/.cache or ~/.npm/_npx). Such paths move to a per-user folder in the
 * system temp directory; the analysis results themselves stay in the cache.
 */
export function ghidraWorkRoot(): string {
  const root = cacheRoot();
  if (!root.split(/[\\/]/).some((part) => part.startsWith(".") && part !== "." && part !== "..")) return root;
  const uid = process.getuid?.();
  return join(tmpdir(), uid === undefined ? "reverse-engineer-ghidra" : `reverse-engineer-ghidra-${uid}`);
}

/**
 * Creates the work root before anything inside it. The cache root is the user's own folder.
 * The temp fallback is shared: another user could create it first and swap the post script,
 * so on Unix it must be our own, private, real directory.
 */
export async function ensureWorkRoot(): Promise<string> {
  const root = ghidraWorkRoot();
  if (root === cacheRoot()) {
    await mkdir(root, { recursive: true });
    return root;
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const uid = process.getuid?.();
  if (uid !== undefined) {
    const info = await lstat(root);
    if (!info.isDirectory() || info.uid !== uid || (info.mode & 0o077) !== 0)
      throw new Error(`${root} is not a private directory owned by this user; remove it or set REVERSE_ENGINEER_CACHE`);
  }
  return root;
}

/** Copies the post script next to the projects, outside any dotted path. */
async function stagedScriptDir(): Promise<string> {
  const dir = join(await ensureWorkRoot(), "ghidra-scripts");
  await mkdir(dir, { recursive: true });
  await copyFile(join(packagedScriptDir(), "ExportDecompiled.java"), join(dir, "ExportDecompiled.java"));
  return dir;
}

/** The directory shipping ExportDecompiled.java, both from dist/ and from src/tools/. */
function packagedScriptDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(dir, "ghidra", "ExportDecompiled.java"))) return join(dir, "ghidra");
    dir = dirname(dir);
  }
  throw new Error("ghidra/ExportDecompiled.java not found next to the package");
}

async function runHeadless(ghidra: string, args: string[], timeoutMs: number): Promise<RunResult> {
  const env = toolEnv();
  const home = join(cacheRoot(), "ghidra-home");
  // Keep Ghidra's own settings, compiled scripts and logs inside our cache when the path allows it.
  if (!/\s/.test(home)) {
    await mkdir(home, { recursive: true });
    env._JAVA_OPTIONS = `-Duser.home=${home}`;
  }
  const launcher = join(ghidra, "support", process.platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless");
  return runTool(launcher, args, { env, timeoutMs, keep: 6000 });
}

/** Imports and analyzes the file into a new project, exporting every function (and `extra` addresses). */
async function importAndExport(
  ghidra: string,
  path: string,
  projectDir: string,
  outDir: string,
  extra: string[] = [],
): Promise<RunResult> {
  await ensureWorkRoot();
  await rm(projectDir, { recursive: true, force: true });
  await mkdir(projectDir, { recursive: true });
  const budget = process.env.REVERSE_ENGINEER_DECOMPILE_BUDGET ?? "150";
  const input = await launcherSafePath(path, join(dirname(projectDir), "input"));
  return runHeadless(
    ghidra,
    [
      projectDir,
      "re",
      "-import",
      input,
      "-scriptPath",
      await stagedScriptDir(),
      "-postScript",
      "ExportDecompiled.java",
      outDir,
      budget,
      ...extra,
      "-analysisTimeoutPerFile",
      "600",
    ],
    900_000,
  );
}

interface FunctionRow {
  address: string;
  name: string;
  size: number;
  kind: string;
  signature: string;
}

interface Analysis {
  dir: string;
  outDir: string;
  projectDir: string;
  functions: FunctionRow[];
  seconds: number;
  fresh: boolean;
}

const pending = new Map<string, Promise<Analysis>>();

async function analyze(path: string): Promise<Analysis> {
  const sha = await sha256File(path);
  const running = pending.get(sha);
  if (running) return running;
  const job = (async (): Promise<Analysis> => {
    const dir = artifactPath(sha, "ghidra");
    const outDir = join(dir, "out");
    const projectDir = join(ghidraWorkRoot(), sha.slice(0, 16), "ghidra-project");
    const index = join(outDir, "functions.tsv");
    let seconds = 0;
    const fresh = !(await exists(join(outDir, "status.txt")));
    if (fresh) {
      const ghidra = await findGhidra();
      if (!ghidra)
        throw new Error(
          `Ghidra not found. Install Ghidra and JDK 21 into ${toolsRoot()} (references/install-tools.md in the reverse-engineer skill), or set GHIDRA_INSTALL_DIR. Meanwhile use binary_inventory.`,
        );
      await rm(dir, { recursive: true, force: true });
      const started = Date.now();
      const { code, log, timedOut } = await importAndExport(ghidra, path, projectDir, outDir);
      seconds = (Date.now() - started) / 1000;
      if (!(await exists(join(outDir, "status.txt")))) {
        throw new Error(
          `Ghidra headless ${timedOut ? "timed out" : `failed (exit ${code})`}. Log tail:\n${log.slice(-1500)}`,
        );
      }
    }
    const functions = (await readFile(index, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [address = "", name = "", size = "0", kind = "", signature = ""] = line.split("\t");
        return { address, name, size: Number(size), kind, signature };
      });
    return { dir, outDir, projectDir, functions, seconds, fresh };
  })();
  pending.set(sha, job);
  try {
    return await job;
  } finally {
    pending.delete(sha);
  }
}

interface Decompiled {
  address: string;
  name: string;
  file: string;
  line: number;
  text: string;
}

async function loadDecompiled(outDir: string): Promise<Map<string, Decompiled>> {
  const map = new Map<string, Decompiled>();
  for (const name of ["decompiled.c", "extra.c"]) {
    const file = join(outDir, name);
    if (!(await exists(file))) continue;
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    let current: Decompiled | undefined;
    lines.forEach((line, i) => {
      const header = /^\/\/ ==== (\S+) (.*) ====$/.exec(line);
      if (header) {
        current = { address: header[1] as string, name: header[2] as string, file, line: i + 1, text: "" };
        map.set(current.address, current);
      } else if (current) current.text += `${line}\n`;
    });
  }
  return map;
}

const normalizeAddress = (text: string): string => text.toLowerCase().replace(/^0x/, "").replace(/^0+/, "");

function resolveFunction(functions: FunctionRow[], query: string): FunctionRow[] {
  const q = query.trim();
  const byAddress = functions.filter((f) => normalizeAddress(f.address) === normalizeAddress(q));
  if (byAddress.length > 0) return byAddress;
  const fun = /^FUN_([0-9a-f]+)$/i.exec(q);
  if (fun) return functions.filter((f) => normalizeAddress(f.address) === normalizeAddress(fun[1] as string));
  const exact = functions.filter((f) => f.name === q || f.name.endsWith(`::${q}`));
  if (exact.length > 0) return exact;
  return functions.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
}

const decompileSchema = z.object({
  path: z.string(),
  function: z.string().optional().describe("Function name, FUN_xxx or address"),
  containing: z.string().optional().describe("Find functions that reference this string"),
  skip: z.number().int().min(0).default(0),
  max: z.number().int().min(1).max(500).default(60),
});

export type DecompileOptions = Omit<z.output<typeof decompileSchema>, "path">;

const projectQueue = new Map<string, Promise<unknown>>();

/** Runs Ghidra jobs on one project one at a time: an open project is locked, and a rebuild deletes it. */
function inProjectQueue<T>(projectDir: string, job: () => Promise<T>): Promise<T> {
  const next = (projectQueue.get(projectDir) ?? Promise.resolve()).catch(() => undefined).then(job);
  projectQueue.set(projectDir, next);
  // The last job of a project removes its entry, so the map does not keep every result.
  const settle = () => {
    if (projectQueue.get(projectDir) === next) projectQueue.delete(projectDir);
  };
  next.then(settle, settle);
  return next;
}

/** One function's C: from the exported files, else from a new Ghidra run on the project. */
async function decompileOne(path: string, analysis: Analysis, address: string): Promise<Decompiled> {
  // An earlier queued call may have exported it already.
  const exported = (await loadDecompiled(analysis.outDir)).get(address);
  if (exported) return exported;
  const ghidra = await findGhidra();
  if (!ghidra) throw new Error("Ghidra not found");
  // The project can be gone while the exported results remain (a cleared temp directory): rebuild it.
  // `-process` without a name runs on the only program, whatever name it was imported under.
  const { code, log } = (await exists(join(analysis.projectDir, "re.gpr")))
    ? await runHeadless(
        ghidra,
        [
          analysis.projectDir,
          "re",
          "-process",
          "-noanalysis",
          "-readOnly",
          "-scriptPath",
          await stagedScriptDir(),
          "-postScript",
          "ExportDecompiled.java",
          analysis.outDir,
          "60",
          address,
        ],
        300_000,
      )
    : await importAndExport(ghidra, path, analysis.projectDir, analysis.outDir, [address]);
  const decompiled = (await loadDecompiled(analysis.outDir)).get(address);
  if (!decompiled) throw new Error(`decompilation of ${address} failed (exit ${code}):\n${log.slice(-1200)}`);
  return decompiled;
}

export async function decompile(path: string, options: DecompileOptions): Promise<string> {
  const analysis = await analyze(path);
  const out: string[] = [];
  const code = analysis.functions.filter((f) => f.kind === "code");
  if (analysis.fresh) {
    const status = (await readFile(join(analysis.outDir, "status.txt"), "utf8")).trim();
    out.push(
      `ghidra: analyzed ${basename(path)} in ${analysis.seconds.toFixed(0)} s; ${code.length} functions; ${status}; cache ${analysis.outDir}`,
    );
  }

  if (options.function) {
    const matches = resolveFunction(analysis.functions, options.function);
    if (matches.length === 0)
      return [
        ...out,
        `no function matches "${options.function}"; call with containing=STRING or no argument to list functions`,
      ].join("\n");
    if (matches.length > 1 && !matches.some((m) => m.name === options.function)) {
      out.push(`${matches.length} functions match "${options.function}":`);
      for (const m of matches.slice(0, 30)) out.push(`  ${m.address} ${m.name} (${m.size} B)`);
      return out.join("\n");
    }
    const target = matches.find((m) => m.name === options.function) ?? (matches[0] as FunctionRow);
    const decompiled = await inProjectQueue(analysis.projectDir, () => decompileOne(path, analysis, target.address));
    out.push(`// ${target.address} ${target.name} | ${target.signature} | ${decompiled.file}:${decompiled.line}`);
    out.push(decompiled.text.trimEnd());
    return out.join("\n");
  }

  if (options.containing) {
    const needle = options.containing.toLowerCase();
    const rows = (await readFile(join(analysis.outDir, "strings.tsv"), "utf8")).split(/\r?\n/).filter(Boolean);
    const hits = rows.filter((r) => (r.split("\t")[1] ?? "").toLowerCase().includes(needle));
    out.push(`strings containing "${options.containing}" (${hits.length}):`);
    for (const row of hits.slice(0, 30)) {
      const [address, value, users] = row.split("\t");
      out.push(`  ${address} ${value?.slice(0, 160)} <- ${users || "no code reference found"}`);
    }
    const inCode: string[] = [];
    for (const d of (await loadDecompiled(analysis.outDir)).values()) {
      if (d.text.toLowerCase().includes(needle)) inCode.push(`  ${d.address} ${d.name} (${d.file}:${d.line})`);
    }
    out.push(`decompiled functions mentioning it (${inCode.length}):`, ...inCode.slice(0, 30));
    out.push("next: decompile(path, function=ADDRESS)");
    return out.join("\n");
  }

  const sorted = [...code].sort((a, b) => b.size - a.size);
  const slice = sorted.slice(options.skip, options.skip + options.max);
  out.push(
    `functions (${code.length} with code, largest first, showing ${options.skip}..${options.skip + slice.length - 1}):`,
  );
  for (const f of slice) out.push(`  ${f.address} ${f.name} ${f.size} B  ${f.signature.slice(0, 120)}`);
  out.push(
    `full index: ${join(analysis.outDir, "functions.tsv")}; all decompiled C: ${join(analysis.outDir, "decompiled.c")} (use search on it)`,
  );
  return out.join("\n");
}

export const decompileTool = defineTool({
  name: "decompile",
  description:
    "Ghidra headless decompilation, cached per file. First call analyzes the binary (can take minutes). function=NAME|ADDRESS returns its C; containing=TEXT lists functions that reference a string; neither lists functions.",
  schema: decompileSchema,
  run({ path, ...options }) {
    return decompile(path, options);
  },
});
