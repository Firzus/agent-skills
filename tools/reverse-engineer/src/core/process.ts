import { spawn, spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";

export interface RunResult {
  code: number;
  log: string;
  timedOut: boolean;
}

// Detached tools do not die with the server: stop the ones still running when it exits or when a
// signal stops it (on a signal, Node exits without running exit handlers unless one is installed).
const running = new Set<number>();
let hooked = false;
function stopRunningOnExit(): void {
  if (hooked) return;
  hooked = true;
  // A signal stops them, then exits, which runs this again: clear the set so nothing is killed twice.
  const stopAll = () => {
    for (const pid of running) killTree(pid, true);
    running.clear();
  };
  process.on("exit", stopAll);
  for (const [signal, number] of [
    ["SIGINT", 2],
    ["SIGTERM", 15],
    ["SIGHUP", 1],
  ] as const) {
    process.once(signal, () => {
      stopAll();
      process.exit(128 + number);
    });
  }
}

/** Quotes one argument for `cmd.exe /s /c "..."`. */
function quote(arg: string): string {
  return /[\s"&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg;
}

/**
 * Runs a third-party tool (never the target) and keeps the tail of its output.
 * `.bat` and `.cmd` launchers go through cmd.exe. A timeout kills the whole process
 * tree: launcher scripts start java or dotnet as a child that would otherwise survive.
 */
export function runTool(
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; timeoutMs: number; keep?: number },
): Promise<RunResult> {
  const win = process.platform === "win32";
  const child =
    win && /\.(cmd|bat)$/i.test(command)
      ? spawn("cmd.exe", ["/d", "/s", "/c", `"${[command, ...args].map(quote).join(" ")}"`], {
          env: options.env,
          windowsVerbatimArguments: true,
          windowsHide: true,
        })
      : spawn(command, args, { env: options.env, windowsHide: true, detached: !win });
  const keep = options.keep ?? 4000;
  let log = "";
  const append = (d: Buffer) => {
    log = (log + d.toString()).slice(-keep);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  stopRunningOnExit();
  if (child.pid !== undefined) running.add(child.pid);
  return new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, options.timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      if (child.pid !== undefined) running.delete(child.pid);
      resolve({ code: -1, log: `${log}\n${String(error)}`, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (child.pid !== undefined) running.delete(child.pid);
      resolve({ code: code ?? -1, log, timedOut });
    });
  });
}

/** Kills a process and its descendants; `sync` for the exit handler, where nothing asynchronous runs. */
function killTree(pid: number | undefined, sync = false): void {
  if (pid === undefined) return;
  try {
    if (process.platform === "win32") {
      const taskkill = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
      const args = ["/pid", String(pid), "/T", "/F"];
      if (sync) spawnSync(taskkill, args, { windowsHide: true });
      else spawn(taskkill, args, { windowsHide: true }).on("error", () => {});
    }
    // The child leads its own process group (detached), so the group id kills its descendants too.
    else process.kill(-pid, "SIGKILL");
  } catch {
    // already gone
  }
}

/**
 * cmd.exe and Ghidra's batch launcher expand `%` and `!` and eat `^` even inside quotes.
 * On Windows, a target whose name holds one of them is copied under a plain name first.
 */
export async function launcherSafePath(path: string, stagingDir: string): Promise<string> {
  if (process.platform !== "win32" || !/[%!^]/.test(basename(path))) return path;
  await mkdir(stagingDir, { recursive: true });
  const staged = join(stagingDir, basename(path).replace(/[%!^]/g, "_"));
  await copyFile(path, staged);
  return staged;
}
