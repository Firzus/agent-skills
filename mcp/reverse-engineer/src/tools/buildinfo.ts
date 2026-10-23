import { readFile } from "node:fs/promises";
import * as z from "zod";
import { hex } from "../core/files";
import { loadBinary } from "../formats/binary";
import { readGoBuildInfo } from "../formats/gobuild";
import { readRustInfo } from "../formats/rustaudit";
import { defineTool } from "./types";

export async function buildInfo(path: string, filter?: string): Promise<string> {
  const buf = await readFile(path);
  const view = loadBinary(buf);
  const keep = filter ? new RegExp(filter, "i") : undefined;
  const out: string[] = [];
  const go = readGoBuildInfo(buf, view);
  if (go) {
    const where = view?.offsetToVa(go.offset);
    out.push(
      `go: ${go.goVersion}  (buildinfo @${hex(go.offset)}${where === undefined ? "" : ` va 0x${where.toString(16)}`})`,
    );
    if (go.path) out.push(`path: ${go.path}`);
    if (go.main) out.push(`main module: ${go.main.path} ${go.main.version}${go.main.sum ? ` ${go.main.sum}` : ""}`);
    if (go.settings.length > 0) out.push(`build: ${go.settings.map(([k, v]) => (v ? `${k}=${v}` : k)).join(" ")}`);
    const deps = go.deps.filter((d) => !keep || keep.test(d.path));
    out.push(`deps (${deps.length}${keep ? ` matching /${filter}/ of ${go.deps.length}` : ""}):`);
    for (const d of deps) {
      out.push(`  ${d.path} ${d.version}${d.replace ? ` => ${d.replace.path} ${d.replace.version}` : ""}`);
    }
  }
  const rust = readRustInfo(buf, view);
  if (rust) {
    if (rust.section) {
      const packages = rust.packages.filter((p) => !keep || keep.test(p.name));
      const root = rust.packages.find((p) => p.root);
      out.push(`rust: cargo-auditable section ${rust.section.name} @${hex(rust.section.offset)}`);
      if (root) out.push(`root package: ${root.name} ${root.version}`);
      out.push(`packages (${packages.length}${keep ? ` matching /${filter}/` : ""}):`);
      for (const p of packages)
        out.push(`  ${p.name} ${p.version}${p.kind && p.kind !== "runtime" ? ` (${p.kind})` : ""}`);
    } else {
      out.push("rust: no cargo-auditable section; crate names below come from embedded source paths (inferred)");
      const hints = rust.crateHints.filter((h) => !keep || keep.test(h));
      out.push(`crates (${hints.length}): ${hints.join(" ")}`);
    }
    if (rust.rustcCommits.length > 0)
      out.push(`rustc commit: ${rust.rustcCommits.join(", ")} (map the hash to a release)`);
  }
  if (out.length === 0) return `${path}: no Go build info and no Rust markers found`;
  return out.join("\n");
}

export const buildinfo = defineTool({
  name: "buildinfo",
  description:
    "Go build info (toolchain, main package, module, build settings, dependency versions) and Rust cargo-auditable dependencies, parsed from the binary without running it.",
  schema: z.object({
    path: z.string(),
    filter: z.string().optional().describe("Regex on dependency paths or crate names"),
  }),
  run({ path, filter }) {
    return buildInfo(path, filter);
  },
});
