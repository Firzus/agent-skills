import { expect, it, vi } from "vite-plus/test";
import { instrumentInvoke } from "./index.js";
import type { invoke } from "@tauri-apps/api/core";

it("preserves the result and does not capture payloads", async () => {
  const base = vi.fn().mockResolvedValueOnce("answer").mockResolvedValue(undefined);
  const args = { password: "sensitive" };
  expect(await instrumentInvoke(base as typeof invoke)("echo", args)).toBe("answer");
  expect(base.mock.calls[0]).toEqual(["echo", args, undefined]);
  expect(JSON.stringify(base.mock.calls[1])).not.toContain("sensitive");
});

it("preserves the original rejection even if diagnostics fail", async () => {
  const failure = new Error("original");
  const base = vi.fn().mockRejectedValueOnce(failure).mockRejectedValue(new Error("diagnostics"));
  await expect(instrumentInvoke(base as typeof invoke)("fail")).rejects.toBe(failure);
});
