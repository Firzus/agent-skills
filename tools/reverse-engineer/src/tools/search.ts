import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import * as z from "zod";
import { excerpt, formatSize, hex, lineLocator, looksText, walk } from "../core/files";
import { extractAsar } from "../formats/asar";
import { defineTool } from "./types";

const MAX_FILE = 256 * 1024 * 1024;

/** Translates a glob (`*`, `**`, `?`, `{a,b}`) into a regex; patterns without a slash match the base name. */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] as string;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
        if (glob[i + 1] === "/") i++;
      } else out += "[^/]*";
    } else if (c === "?") out += "[^/]";
    else if (c === "{") out += "(?:";
    else if (c === "}") out += ")";
    else if (c === ",") out += "|";
    else out += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

/** Resolves an .asar path to its cached extraction so it can be searched like a directory. */
export async function resolveSearchRoot(path: string): Promise<string> {
  if (extname(path).toLowerCase() === ".asar" && (await stat(path)).isFile()) return (await extractAsar(path)).root;
  return path;
}

export interface SearchOptions {
  pattern: string;
  regex?: boolean;
  ignoreCase?: boolean;
  glob?: string;
  context?: number;
  max?: number;
  includeDeps?: boolean;
}

export function compilePattern(pattern: string, regex: boolean, ignoreCase: boolean): RegExp {
  const source = regex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(source, ignoreCase ? "gi" : "g");
}

export async function searchPath(path: string, options: SearchOptions): Promise<string> {
  const root = await resolveSearchRoot(path);
  const re = compilePattern(options.pattern, options.regex ?? false, options.ignoreCase ?? false);
  const context = options.context ?? 120;
  const max = options.max ?? 40;
  const glob = options.glob ? globToRegExp(options.glob) : undefined;
  const globOnPath = options.glob?.includes("/") ?? false;
  const hits: string[] = [];
  let total = 0;
  let filesWithHits = 0;
  let binarySkipped = 0;

  const scan = (text: string, label: string, binary: boolean): void => {
    re.lastIndex = 0;
    let fileHits = 0;
    let locate: ((offset: number) => { line: number; col: number }) | undefined;
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      if (m[0].length === 0) re.lastIndex++;
      total++;
      fileHits++;
      if (hits.length < max) {
        let where: string;
        if (binary) where = `${label}@${hex(m.index)}`;
        else {
          locate ??= lineLocator(text);
          const { line, col } = locate(m.index);
          where = `${label}:${line}:${col}`;
        }
        const snippet = binary
          ? text.slice(Math.max(0, m.index - context), m.index + m[0].length + context).replace(/[^\x20-\x7e]+/g, "·")
          : excerpt(text, m.index, m.index + m[0].length, context);
        hits.push(`${where}: ${snippet}`);
      }
    }
    if (fileHits > 0) filesWithHits++;
  };

  const info = await stat(root);
  if (info.isFile()) {
    // Beyond V8's string limit (~512 MB) the file cannot be scanned as one string.
    if (info.size > 256 * 1024 * 1024)
      return `${root}: ${formatSize(info.size)} is too large to search as one file; use binary_inventory(path, part=strings, filter=RE)`;
    const data = await readFile(root);
    const text = looksText(data.subarray(0, 8192));
    scan(data.toString(text ? "utf8" : "latin1"), basename(root), !text);
  } else {
    for await (const entry of walk(root, options.includeDeps ?? false)) {
      if (glob && !glob.test(globOnPath ? entry.rel : basename(entry.rel))) continue;
      if (entry.size > MAX_FILE) continue;
      const data = await readFile(entry.path);
      if (!looksText(data.subarray(0, 8192))) {
        binarySkipped++;
        continue;
      }
      scan(data.toString("utf8"), entry.rel, false);
    }
  }
  const lines = [`root: ${root}`, ...hits];
  const more = total - hits.length;
  lines.push(
    `${total} matches in ${filesWithHits} files${more > 0 ? `; ${more} not shown (raise max, add glob, or tighten the pattern)` : ""}${binarySkipped > 0 ? `; ${binarySkipped} binary files skipped (search one binary file directly)` : ""}`,
  );
  return lines.join("\n");
}

export const search = defineTool({
  name: "search",
  description:
    "Search a directory, an extracted app, a .asar (auto-extracted) or one file. Hidden folders included, node_modules skipped by default. Returns file:line:col (or file@offset for binaries) with a short excerpt.",
  schema: z.object({
    path: z.string().describe("Directory, .asar or file"),
    pattern: z.string().min(1).describe("Literal text, or a JavaScript regex when regex=true"),
    regex: z.boolean().default(false),
    ignore_case: z.boolean().default(false),
    glob: z.string().optional().describe("Filter, e.g. *.js or .webpack/**/*.js"),
    context: z.number().int().min(0).max(1000).default(120).describe("Characters of context on each side"),
    max: z.number().int().min(1).max(500).default(40),
    include_deps: z.boolean().default(false).describe("Also search node_modules"),
  }),
  run(args) {
    return searchPath(args.path, {
      pattern: args.pattern,
      regex: args.regex,
      ignoreCase: args.ignore_case,
      glob: args.glob,
      context: args.context,
      max: args.max,
      includeDeps: args.include_deps,
    });
  },
});
