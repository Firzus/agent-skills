import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "vite-plus-smoke-"));
const logs = mkdtempSync(join(tmpdir(), "vite-plus-smoke-logs-"));
const results = [];
const vp = process.platform === "win32" ? "vp.exe" : "vp";
console.log(`Fixture: ${root}`);
console.log(`Logs: ${logs}`);

function write(path, content) {
  writeFileSync(join(root, path), content);
}

function run(label, command, args, expected = 0, pattern) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, CI: "true", NO_COLOR: "1" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(join(logs, `${label}.log`), output);
  assert.ifError(result.error);
  assert.equal(result.status, expected, `${label}: ${output}`);
  if (pattern) assert.match(output, pattern, label);
  results.push({ label, command: [command, ...args].join(" "), exit: result.status });
  console.log(`PASS ${label}`);
  return output;
}

mkdirSync(join(root, "src"));
write("package.json", JSON.stringify({
  name: "vite-plus-smoke",
  private: true,
  type: "module",
  scripts: { build: "node -e \"console.log('SCRIPT_BUILD')\"" },
  devDependencies: { "vite-plus": "0.3.2", typescript: "5.9.3" },
}));
write(".gitignore", "node_modules/\ndist-app/\ndist-lib/\n");
write("tsconfig.json", JSON.stringify({
  compilerOptions: {
    target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
    strict: true, skipLibCheck: true, noEmit: true,
  },
  include: ["src"],
}));
const config = `import { defineConfig } from "vite-plus";
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: { singleQuote: true },
  test: { include: ["src/**/*.test.ts"] },
  build: { outDir: "dist-app" },
  pack: { entry: ["src/index.ts"], dts: true, format: ["esm", "cjs"], outDir: "dist-lib" },
  run: { tasks: { verify: { command: "vp test", cache: false } } },
});
`;
write("vite.config.ts", config);
const source = "export const add = (a: number, b: number): number => a + b;\n";
const test = `import { expect, test } from "vite-plus/test";
import { add } from "./index";
test("adds", () => { expect(add(2, 3)).toBe(5); });
`;
write("src/index.ts", source);
write("src/index.test.ts", test);
write("index.html", '<!doctype html><html><head><title>Smoke</title></head><body><script type="module" src="/src/index.ts"></script></body></html>');

if (process.platform === "win32") {
  run("install", process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm install --no-audit --no-fund"]);
} else {
  run("install", "npm", ["install", "--no-audit", "--no-fund"]);
}
run("versions", vp, ["--version"], 0, /vite-plus\s+v0\.3\.2/);
run("format", vp, ["fmt"]);
run("check", vp, ["check"]);
run("test", vp, ["test"], 0, /1 passed/);
run("build", vp, ["build"]);
assert.ok(existsSync(join(root, "dist-app/index.html")));
run("script-dispatch", vp, ["run", "build"], 0, /SCRIPT_BUILD/);
run("pack", vp, ["pack"]);
for (const file of ["index.mjs", "index.cjs", "index.d.mts", "index.d.cts"]) {
  assert.ok(existsSync(join(root, "dist-lib", file)), file);
}
run("esm-consumer", process.execPath, ["--input-type=module", "-e", "import {add} from './dist-lib/index.mjs'; if(add(2,3)!==5) process.exit(1)"]);
run("cjs-consumer", process.execPath, ["-e", "if(require('./dist-lib/index.cjs').add(2,3)!==5) process.exit(1)"]);
run("configured-task", vp, ["run", "verify"], 0, /1 passed/);

const formattedSource = readFileSync(join(root, "src/index.ts"), "utf8");
write("src/index.ts", "export const add=(a:number,b:number):number=>a+b");
run("reject-format", vp, ["check"], 1, /format/i);
write("src/index.ts", formattedSource);
write("src/type-error.ts", 'export const broken: number = "wrong";\n');
run("reject-types", vp, ["check", "--no-fmt", "--no-lint"], 1, /TS2322/);
write("src/type-error.ts", "export const broken: number = 1;\n");
write("src/index.test.ts", test.replace("toBe(5)", "toBe(6)"));
run("reject-test", vp, ["test"], 1, /1 failed/);
write("src/index.test.ts", test);
run("restore-format", vp, ["fmt"]);
run("restore-check", vp, ["check"]);
run("restore-test", vp, ["test"], 0, /1 passed/);
write("vite.config.ts", config.replace(", cache: false", ""));
run("cache-fill", vp, ["run", "verify"], 0, /1 passed/);
run("cache-hit", vp, ["run", "verify"], 0, /cache hit/);
write("src/index.ts", source.replace("a + b", "a - b"));
run("cache-invalidation", vp, ["run", "verify"], 1, /1 failed/);
write("src/index.ts", formattedSource);
run("cache-bypass", vp, ["run", "--no-cache", "verify"], 0, /cache disabled/);
run("reject-empty-filter", vp, ["run", "--filter", "missing-package", "--fail-if-no-match", "build"], 1, /No packages matched/);
run("final-format", vp, ["fmt"]);
run("final-check", vp, ["check"]);
writeFileSync(join(logs, "results.json"), JSON.stringify(results, null, 2));
console.log(`${results.length} command checks passed. Fixture and logs retained.`);
