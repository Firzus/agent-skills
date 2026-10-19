// Runs one benchmark cell: node bench/run.ts <arm> <task> <rep>
// Arms: none | leanrea | rea | re. Needs `node bench/setup.ts` and a built dist/cli.mjs.
// Adapted from leanrea's bench/run.py for Windows, plus an isolated Claude Code configuration.
import { spawn } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const WORK = process.env.RE_BENCH_WORK ?? join(HERE, "work");
const MODEL = process.env.BENCH_MODEL ?? "sonnet";
const RESULTS = process.env.BENCH_RESULTS ?? join(HERE, "results", "results.jsonl");

interface Task {
  id: string;
  targets: string[];
  prompt: string;
  key: Record<string, string>;
}

export interface CellResult {
  arm: string;
  task: string;
  rep: string;
  model: string;
  wall_s: number;
  turns: number;
  cost: number;
  in: number;
  cache_w: number;
  cache_r: number;
  out: number;
  score: string;
  miss: string[];
  err: boolean;
  mcp_calls: number;
  bash_calls: number;
  tools: string[];
}

interface Arm {
  skill?: { name: string; source: string };
  mcp?: (ws: string) => string;
}

const ARMS: Record<string, Arm> = {
  none: {},
  leanrea: { skill: { name: "leanrea", source: join(WORK, "skills", "leanrea") } },
  rea: {
    skill: { name: "reverse-engineer-anything", source: join(WORK, "skills", "reverse-engineer-anything") },
    mcp: () => join(WORK, "rea-mcp.json"),
  },
  re: {
    skill: { name: "reverse-engineer", source: join(REPO, "..", "..", "skills", "engineering", "reverse-engineer") },
    // A cache inside the run directory: every run starts cold.
    mcp: (ws) => {
      const config = join(ws, ".mcp-re.json");
      const server = {
        command: "node",
        args: [join(REPO, "dist", "cli.mjs"), "mcp"],
        env: { REVERSE_ENGINEER_CACHE: join(ws, ".re-cache") },
      };
      writeFileSync(config, JSON.stringify({ mcpServers: { "reverse-engineer": server } }));
      return config;
    },
  },
};

/** The parent session's variables would make the child a nested session. */
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key === "CLAUDECODE" || key.startsWith("CLAUDE_CODE_") || key.startsWith("CLAUDE_") || key.startsWith("MCP_"))
      continue;
    env[key] = value;
  }
  // No user CLAUDE.md, no auto memory: user skills are excluded by --setting-sources below.
  env.CLAUDE_CODE_DISABLE_CLAUDE_MDS = "1";
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = "1";
  return env;
}

function runClaude(args: string[], prompt: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("claude", args, { cwd, env: cleanEnv(), shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 1_500_000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => {
      clearTimeout(timer);
      resolve({ stdout, stderr });
    });
    child.stdin.end(prompt);
  });
}

function toolLabel(name: string, input: Record<string, unknown>): string {
  if (name === "Bash" && typeof input.command === "string") return `Bash:${input.command.trim().split(/\s+/)[0]}`;
  return name;
}

export async function runCell(armName: string, taskId: string, rep: string): Promise<CellResult> {
  const arm = ARMS[armName];
  if (!arm) throw new Error(`unknown arm ${armName}`);
  const tasks = JSON.parse(readFileSync(join(HERE, "tasks.windows.json"), "utf8")) as Task[];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`unknown task ${taskId}`);
  const ws = join(WORK, "runs", `${armName}-${taskId}-${rep}`);
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  for (const target of task.targets) cpSync(join(WORK, "targets", target), join(ws, target), { recursive: true });

  const args = [
    "-p",
    "--model",
    MODEL,
    "--output-format",
    "stream-json",
    "--verbose",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--setting-sources",
    "project,local",
    "--max-budget-usd",
    "4",
    "--allowedTools",
    "Bash,Read,Grep,Glob,Write,Skill,mcp__rea,mcp__reverse-engineer",
  ];
  let prompt = task.prompt;
  if (arm.skill) {
    cpSync(arm.skill.source, join(ws, ".claude", "skills", arm.skill.name), { recursive: true });
    prompt = `/${arm.skill.name} ${prompt}`;
  }
  if (arm.mcp) args.push("--mcp-config", arm.mcp(ws));

  const started = Date.now();
  const { stdout, stderr } = await runClaude(args, prompt, ws);
  const wall = (Date.now() - started) / 1000;

  writeFileSync(join(ws, "stream.jsonl"), stdout);
  // A background shell task that ends after the answer triggers one more turn, whose short
  // reply would replace the answer: grade the text of every result event, keep the last metrics.
  const results: Record<string, unknown>[] = [];
  let result: Record<string, unknown> = { result: `${stdout.slice(-2000)}${stderr.slice(-2000)}`, is_error: true };
  const tools: string[] = [];
  const calls: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    let event: {
      type?: string;
      message?: { content?: { type: string; name: string; input: Record<string, unknown> }[] };
    };
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "result") {
      result = event as Record<string, unknown>;
      results.push(result);
    }
    if (event.type === "assistant") {
      for (const block of event.message?.content ?? []) {
        if (block.type === "tool_use") {
          tools.push(toolLabel(block.name, block.input ?? {}));
          calls.push(`${block.name} ${JSON.stringify(block.input ?? {}).slice(0, 300)}`);
        }
      }
    }
  }
  const answer =
    results.length > 0
      ? results.map((r) => (typeof r.result === "string" ? r.result : "")).join("\n\n---\n\n")
      : typeof result.result === "string"
        ? result.result
        : "";
  const hits = Object.fromEntries(Object.entries(task.key).map(([k, re]) => [k, new RegExp(re, "i").test(answer)]));
  // Each result event reports the turns and token usage of its own segment; total_cost_usd is cumulative.
  const segmentsOf = results.length > 0 ? results : [result];
  const usage: Record<string, number> = {};
  for (const segment of segmentsOf) {
    for (const [k, v] of Object.entries((segment.usage ?? {}) as Record<string, unknown>)) {
      if (typeof v === "number") usage[k] = (usage[k] ?? 0) + v;
    }
  }
  const turns = segmentsOf.reduce((n, segment) => n + Number(segment.num_turns ?? 0), 0);
  const mcpCalls = tools.filter((t) => t.startsWith("mcp__")).length;
  const bashCalls = tools.filter((t) => t.startsWith("Bash")).length;
  const row: CellResult = {
    arm: armName,
    task: taskId,
    rep,
    model: MODEL,
    wall_s: Math.round(wall * 10) / 10,
    turns,
    cost: Number(result.total_cost_usd ?? 0),
    in: usage.input_tokens ?? 0,
    cache_w: usage.cache_creation_input_tokens ?? 0,
    cache_r: usage.cache_read_input_tokens ?? 0,
    out: usage.output_tokens ?? 0,
    score: `${Object.values(hits).filter(Boolean).length}/${Object.keys(hits).length}`,
    miss: Object.entries(hits)
      .filter(([, v]) => !v)
      .map(([k]) => k),
    err: result.is_error === true,
    mcp_calls: mcpCalls,
    bash_calls: bashCalls,
    tools,
  };
  const segments = results.map((r) => ({ turns: r.num_turns, cost: r.total_cost_usd, usage: r.usage }));
  writeFileSync(
    `${ws}.json`,
    JSON.stringify({ ...row, result_events: results.length, segments, calls, answer }, null, 1),
  );
  mkdirSync(dirname(RESULTS), { recursive: true });
  appendFileSync(RESULTS, `${JSON.stringify(row)}\n`);
  return row;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [arm, task, rep] = process.argv.slice(2);
  if (!arm || !task || !rep) {
    console.error("usage: node bench/run.ts <none|leanrea|rea|re> <task> <rep>");
    process.exit(2);
  }
  console.log(JSON.stringify(await runCell(arm, task, rep)));
}
