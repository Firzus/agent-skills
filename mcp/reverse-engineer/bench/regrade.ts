// Re-scores saved answers with the current answer keys: node bench/regrade.ts [results.jsonl]
// Rewrites the score and miss fields in place; each answer is read from runs/<arm>-<task>-<rep>.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WORK = process.env.RE_BENCH_WORK ?? join(HERE, "work");
const file = process.argv[2] ?? join(HERE, "results", "results.jsonl");
const tasks = JSON.parse(readFileSync(join(HERE, "tasks.windows.json"), "utf8")) as {
  id: string;
  key: Record<string, string>;
}[];

const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
const out = lines.map((line) => {
  const row = JSON.parse(line) as { arm: string; task: string; rep: string; score: string; miss: string[] };
  const saved = join(WORK, "runs", `${row.arm}-${row.task}-${row.rep}.json`);
  const task = tasks.find((t) => t.id === row.task);
  if (!task || !existsSync(saved)) return line;
  const answer = (JSON.parse(readFileSync(saved, "utf8")) as { answer: string }).answer;
  const hits = Object.entries(task.key).map(([k, re]) => [k, new RegExp(re, "i").test(answer)] as const);
  const score = `${hits.filter(([, v]) => v).length}/${hits.length}`;
  if (score !== row.score) console.log(`${row.task} ${row.arm} rep${row.rep}: ${row.score} -> ${score}`);
  return JSON.stringify({ ...row, score, miss: hits.filter(([, v]) => !v).map(([k]) => k) });
});
writeFileSync(file, `${out.join("\n")}\n`);
