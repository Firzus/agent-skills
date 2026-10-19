import { defineConfig } from "vite-plus";

const generated = ["dist/**"];

export default defineConfig({
  fmt: {
    ignorePatterns: generated,
    printWidth: 120,
  },
  lint: {
    ignorePatterns: generated,
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 120_000,
  },
  pack: {
    entry: ["src/cli.ts"],
    format: ["esm"],
    platform: "node",
    target: "node24",
    dts: false,
    clean: true,
  },
});
