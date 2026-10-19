import { readFile, stat } from "node:fs/promises";
import * as z from "zod";
import { sha256File } from "../core/cache";
import { formatSize, hex } from "../core/files";
import { type BinaryView, loadBinary } from "../formats/binary";
import { type FoundString, NOTABLE_STRING, STRING_LIMIT, scanStrings } from "../formats/strings";
import { defineTool } from "./types";

const MAX_FILE = 1024 * 1024 * 1024;

/** Where a file offset lands: `section+0x..` and the virtual address, for citations. */
function locate(view: BinaryView, offset: number): string {
  const va = view.offsetToVa(offset);
  if (va === undefined) return hex(offset);
  const section = view.sections.find((s) => va >= s.va && va < s.va + BigInt(s.size));
  return `${hex(offset)} ${section?.name ?? "?"} va 0x${va.toString(16)}`;
}

/** True when an offset falls in a code section: byte runs there are instructions, not strings. */
function inCode(view: BinaryView, offset: number): boolean {
  const va = view.offsetToVa(offset);
  const section = va === undefined ? undefined : view.sections.find((s) => va >= s.va && va < s.va + BigInt(s.size));
  return section !== undefined && /^(\.text|\.init|\.fini|\.plt|__TEXT,__text|__TEXT,__stubs)/.test(section.name);
}

const isAddon = (view: BinaryView): boolean =>
  view.exports.some((e) => e.startsWith("napi_register_module_v") || e.startsWith("node_register_module_v")) ||
  view.imports.some((g) => g.names.some((n) => n.startsWith("napi_")));

/** camelCase identifiers: in a Node addon these are the names it registers on its exports at runtime. */
const JS_NAME = /^[a-z]{2,}(?:[A-Z]+[a-z0-9]*)+$/;

function page<T>(items: T[], skip: number, max: number, render: (item: T) => string, label: string): string[] {
  const slice = items.slice(skip, skip + max);
  const lines = slice.map(render);
  const rest = items.length - skip - slice.length;
  lines.push(
    `${label}: ${items.length} total, showing ${skip}..${skip + slice.length - 1}${rest > 0 ? `; next: skip=${skip + slice.length}` : ""}`,
  );
  return lines;
}

const inventorySchema = z.object({
  path: z.string(),
  part: z.enum(["summary", "sections", "imports", "exports", "strings", "resources"]).default("summary"),
  filter: z.string().optional().describe("Case-insensitive regex on names or strings"),
  skip: z.number().int().min(0).default(0),
  max: z.number().int().min(1).max(2000).default(200),
});

export type InventoryOptions = Omit<z.output<typeof inventorySchema>, "path">;

const capNote = `string scan stopped at the ${STRING_LIMIT}-match cap; later strings are missing, narrow with filter=REGEX`;

export async function inventory(path: string, options: InventoryOptions): Promise<string> {
  const info = await stat(path);
  if (info.size > MAX_FILE) return `${path}: ${formatSize(info.size)} is over the 1 GB limit`;
  const buf = await readFile(path);
  const view = loadBinary(buf);
  if (!view) return `${path}: not a PE, ELF or Mach-O file; use triage(path)`;
  const filter = options.filter ? new RegExp(options.filter, "i") : undefined;
  const keep = (text: string) => !filter || filter.test(text);
  const out: string[] = [];
  const { part, skip, max } = options;

  if (part === "summary") {
    out.push(
      `file: ${path}`,
      `size: ${formatSize(info.size)}  sha256: ${await sha256File(path)}`,
      `format: ${view.format}`,
    );
    for (const note of view.notes) out.push(`note: ${note}`);
    out.push(
      `sections (${view.sections.length}): ${view.sections
        .slice(0, 40)
        .map((s) => `${s.name} ${formatSize(s.size)}`)
        .join(", ")}`,
    );
    out.push(`libraries (${view.libraries.length}):`);
    for (const group of view.imports.length > 0
      ? view.imports
      : view.libraries.map((l) => ({ library: l, names: [] }))) {
      const names = group.names.filter(keep);
      out.push(
        `  ${group.library}${names.length > 0 ? ` (${names.length}): ${names.slice(0, 30).join(" ")}${names.length > 30 ? " …" : ""}` : ""}`,
      );
    }
    const exports = view.exports.filter(keep);
    out.push(`exports (${exports.length}): ${exports.slice(0, 40).join(" ")}${exports.length > 40 ? " …" : ""}`);
    // Filtering during the scan applies the string cap to these matches, not to every string in the file.
    const addon = isAddon(view);
    const scan = scanStrings(buf, {
      filter: (text) => (addon && JS_NAME.test(text)) || (NOTABLE_STRING.test(text) && keep(text)),
    });
    const strings = scan.strings;
    if (addon) {
      const seen = new Set<string>();
      const names = strings.filter(
        (s) => !s.wide && JS_NAME.test(s.text) && !inCode(view, s.offset) && !seen.has(s.text) && seen.add(s.text),
      );
      out.push(`node addon: camelCase strings, usually the JS-visible names it registers (${names.length}):`);
      out.push(
        `  ${names
          .slice(0, 80)
          .map((s) => `${s.text}@${hex(s.offset)}`)
          .join(" ")}`,
      );
    }
    const notable = strings.filter((s) => NOTABLE_STRING.test(s.text) && keep(s.text));
    out.push(`strings: ${scan.total} (ASCII and UTF-16LE). Notable (${notable.length}):`);
    for (const s of notable.slice(0, 50))
      out.push(`  @${hex(s.offset)}${s.wide ? " u16" : ""} ${s.text.slice(0, 160)}`);
    if (scan.truncated) out.push(`note: ${capNote}`);
    out.push("next: part=imports|exports|strings with filter=REGEX; decompile(path, containing=STRING) for logic");
    return out.join("\n");
  }
  if (part === "sections") {
    return page(
      view.sections,
      skip,
      max,
      (s) =>
        `${s.name} va 0x${s.va.toString(16)} size ${hex(s.size)} file ${hex(view.base + s.offset)}+${hex(s.fileSize)}`,
      "sections",
    ).join("\n");
  }
  if (part === "imports") {
    const rows = view.imports.flatMap((g) =>
      g.names.filter((n) => keep(n) || keep(g.library)).map((n) => `${g.library} ${n}`),
    );
    return page(rows, skip, max, (r) => r, "imports").join("\n");
  }
  if (part === "exports") return page(view.exports.filter(keep), skip, max, (e) => e, "exports").join("\n");
  if (part === "resources") {
    const resources = (view.resources ?? []).filter((r) => keep(`${r.type} ${r.name}`));
    return page(
      resources,
      skip,
      max,
      (r) => `${r.type}/${r.name} ${formatSize(r.size)} @${hex(r.offset)}`,
      "resources",
    ).join("\n");
  }
  const scan = scanStrings(buf, { filter: keep });
  const lines = page(
    scan.strings,
    skip,
    max,
    (s: FoundString) => `@${locate(view, s.offset)}${s.wide ? " u16" : ""} ${s.text.slice(0, 300)}`,
    "strings",
  );
  if (scan.truncated) lines.push(capNote);
  return lines.join("\n");
}

export const binaryInventory = defineTool({
  name: "binary_inventory",
  description:
    "PE, ELF or Mach-O inventory. part=summary (default): format, sections, libraries with imports, exports, Node addon names, notable strings. Other parts list one table, paged with skip and filtered by a regex.",
  schema: inventorySchema,
  run({ path, ...options }) {
    return inventory(path, options);
  },
});
