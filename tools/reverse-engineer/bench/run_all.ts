// Runs a benchmark grid, arms side by side (as in leanrea's run_all.sh):
//   node bench/run_all.ts [--tasks electron,native,go,deep] [--arms none,leanrea,rea,re] [--reps 3] [--start 1]
import { runCell } from "./run.ts";

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const tasks = option("tasks", "electron,native,go,deep").split(",");
const arms = option("arms", "none,leanrea,rea,re").split(",");
const reps = Number(option("reps", "3"));
const start = Number(option("start", "1"));

for (let rep = start; rep < start + reps; rep++) {
  for (const task of tasks) {
    const rows = await Promise.all(arms.map((arm) => runCell(arm, task, String(rep))));
    for (const row of rows) {
      console.log(
        `${row.task} ${row.arm} rep${row.rep}: ${row.wall_s}s turns=${row.turns} cost=${row.cost} score=${row.score} mcp=${row.mcp_calls} bash=${row.bash_calls}${row.err ? " ERROR" : ""}`,
      );
    }
  }
}
