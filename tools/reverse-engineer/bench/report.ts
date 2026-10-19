// Summarizes a results file as Markdown: node bench/report.ts [results.jsonl]
// Median wall time; means for turns, cost and tokens; summed score; tool calls by kind.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Row {
  arm: string;
  task: string;
  wall_s: number;
  turns: number;
  cost: number;
  in: number;
  cache_w: number;
  cache_r: number;
  out: number;
  score: string;
  err: boolean;
  mcp_calls: number;
  bash_calls: number;
  tools: string[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? join(HERE, "results", "results.jsonl");
const rows = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line) as Row);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
};
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
const tokens = (r: Row): number => r.in + r.cache_w + r.cache_r + r.out;
const score = (list: Row[]): string => {
  const [got, total] = list.reduce(
    ([g, t], r) => {
      const [a, b] = r.score.split("/").map(Number);
      return [g + (a ?? 0), t + (b ?? 0)];
    },
    [0, 0],
  );
  return `${got}/${total}`;
};
// MCP tool calls / shell calls (Bash and PowerShell) / other built-in tools (Read, Grep, Glob, ...).
const share = (list: Row[]): string => {
  const mcp = list.reduce((n, r) => n + r.mcp_calls, 0);
  const all = list.flatMap((r) => r.tools);
  const shell = all.filter((t) => t.startsWith("Bash") || t.startsWith("PowerShell")).length;
  const other = all.filter(
    (t) => !t.startsWith("mcp__") && !t.startsWith("Bash") && !t.startsWith("PowerShell"),
  ).length;
  return `${mcp}/${shell}/${other}`;
};

const groups = new Map<string, Row[]>();
for (const row of rows) groups.set(`${row.task}|${row.arm}`, [...(groups.get(`${row.task}|${row.arm}`) ?? []), row]);

console.log(
  "| task | arm | n | wall s (median) | turns | cost $ | tokens k | score | MCP/shell/other calls | errors |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const [key, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const [task, arm] = key.split("|");
  console.log(
    `| ${task} | ${arm} | ${list.length} | ${median(list.map((r) => r.wall_s)).toFixed(1)} | ${mean(list.map((r) => r.turns)).toFixed(1)} | ${mean(list.map((r) => r.cost)).toFixed(3)} | ${(mean(list.map(tokens)) / 1000).toFixed(0)} | ${score(list)} | ${share(list)} | ${list.filter((r) => r.err).length} |`,
  );
}

const arms = new Map<string, Row[]>();
for (const row of rows) arms.set(row.arm, [...(arms.get(row.arm) ?? []), row]);
console.log(
  "\n| arm | runs | wall s (sum) | cost $ (sum) | turns (sum) | tokens M (sum) | score | MCP/shell/other calls |",
);
console.log("|---|---|---|---|---|---|---|---|");
for (const [arm, list] of [...arms.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const sum = (f: (r: Row) => number) => list.reduce((n, r) => n + f(r), 0);
  console.log(
    `| ${arm} | ${list.length} | ${sum((r) => r.wall_s).toFixed(0)} | ${sum((r) => r.cost).toFixed(2)} | ${sum((r) => r.turns)} | ${(sum(tokens) / 1e6).toFixed(2)} | ${score(list)} | ${share(list)} |`,
  );
}
