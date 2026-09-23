import { describe, expect, it } from "vite-plus/test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { manifests, manifestSchema, proof, request, type Manifest } from "./bridge.js";

const makeManifest = (): Manifest => ({
  version: 1,
  instanceId: randomUUID(),
  pid: process.pid,
  startedAt: Date.now(),
  app: "test",
  endpoint: `\\\\.\\pipe\\tauri-agent-kit-${randomUUID()}`,
  secret: "ab".repeat(32),
  advanced: false,
});

describe("bridge boundary", () => {
  it("rejects non-pipe endpoints and malformed secrets", () => {
    expect(
      manifestSchema.safeParse({ ...makeManifest(), endpoint: "https://remote.test" }).success,
    ).toBe(false);
    expect(manifestSchema.safeParse({ ...makeManifest(), secret: "short" }).success).toBe(false);
  });
  it("separates client and server authentication", () => {
    expect(proof("ab".repeat(32), "nonce:client")).not.toBe(proof("ab".repeat(32), "nonce:server"));
  });
  it("ignores malformed and mismatched registry entries", async () => {
    const directory = await mkdtemp(join(tmpdir(), "agent-kit-test-"));
    const manifest = makeManifest();
    try {
      await writeFile(join(directory, `${manifest.instanceId}.json`), JSON.stringify(manifest));
      await writeFile(join(directory, "bad.json"), "{");
      await writeFile(join(directory, "wrong.json"), JSON.stringify(manifest));
      expect(await manifests(directory)).toEqual([manifest]);
    } finally {
      await rm(directory, { recursive: true });
    }
  });
  it("authenticates before sending a tool request", async () => {
    const manifest = makeManifest();
    let command = "";
    const server = createServer((socket) => {
      let nonce = "";
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        const value = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (!nonce) {
          nonce = value.nonce;
          socket.write(
            JSON.stringify({
              proof: proof(manifest.secret, nonce + ":server"),
              instanceId: manifest.instanceId,
            }) + "\n",
          );
        } else {
          expect(value.auth).toBe(proof(manifest.secret, nonce + ":client"));
          command = value.method;
          socket.end(JSON.stringify({ id: nonce, result: { live: true } }) + "\n");
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(manifest.endpoint, resolve));
    try {
      expect(await request(manifest, "ping", {})).toEqual({ live: true });
      expect(command).toBe("ping");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("refuses a server with an incorrect proof without disclosing credentials", async () => {
    const manifest = makeManifest();
    let received = "";
    const server = createServer((socket) =>
      socket.on("data", (chunk) => {
        received += chunk.toString();
        socket.write(
          JSON.stringify({ proof: "00".repeat(32), instanceId: manifest.instanceId }) + "\n",
        );
      }),
    );
    await new Promise<void>((resolve) => server.listen(manifest.endpoint, resolve));
    try {
      await expect(request(manifest, "evaluate_js", { expression: "secret" })).rejects.toThrow(
        "identity verification",
      );
      expect(received).not.toContain(manifest.secret);
      expect(received).not.toContain("expression");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
