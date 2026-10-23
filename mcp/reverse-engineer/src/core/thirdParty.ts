import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

/**
 * Per-user folder where the skill installs optional third-party tools (JDK, Ghidra, jadx, ilspycmd).
 * Installing there needs no admin rights and no PATH change: the tools look here directly.
 */
export function toolsRoot(): string {
  const override = process.env.REVERSE_ENGINEER_TOOLS;
  if (override) return override;
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(local, "reverse-engineer", "tools");
  }
  if (process.platform === "darwin")
    return join(homedir(), "Library", "Application Support", "reverse-engineer", "tools");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "reverse-engineer", "tools");
}

/** Subfolders of the tools root whose name matches, newest version first. */
export function toolDirs(pattern: RegExp): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(toolsRoot());
  } catch {
    return [];
  }
  return names
    .filter((name) => pattern.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((name) => join(toolsRoot(), name));
}

/** A JDK installed in the tools root (macOS archives nest it under Contents/Home). */
export function findToolsJdk(): string | undefined {
  const java = process.platform === "win32" ? "java.exe" : "java";
  for (const dir of toolDirs(/^jdk-?21/i)) {
    for (const home of [dir, join(dir, "Contents", "Home")]) if (existsSync(join(home, "bin", java))) return home;
  }
  return undefined;
}

/** The environment for third-party tools: the tools-root JDK and .NET come first when present. */
export function toolEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const prepend: string[] = [];
  const jdk = findToolsJdk();
  if (jdk) {
    env.JAVA_HOME = jdk;
    prepend.push(join(jdk, "bin"));
  }
  const dotnet = join(toolsRoot(), "dotnet");
  if (existsSync(join(dotnet, process.platform === "win32" ? "dotnet.exe" : "dotnet"))) {
    env.DOTNET_ROOT = dotnet;
    prepend.push(dotnet);
  }
  if (prepend.length > 0) env[pathKey] = [...prepend, env[pathKey] ?? ""].join(delimiter);
  return env;
}
