import { createConnection } from "node:net";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const manifestSchema = z.object({
  version: z.literal(1),
  instanceId: z.string().uuid(),
  pid: z.number().int().positive(),
  startedAt: z.number(),
  app: z.string(),
  endpoint: z.string().startsWith("\\\\.\\pipe\\tauri-agent-kit-"),
  secret: z.string().regex(/^[a-f0-9]{64}$/),
  advanced: z.boolean(),
});
export type Manifest = z.infer<typeof manifestSchema>;
export const MAX_FRAME = 8 * 1024 * 1024;

export function registryDirectory(): string {
  const root = process.env.LOCALAPPDATA;
  if (!root) throw new Error("LOCALAPPDATA is required; Windows is the supported platform");
  return join(root, "tauri-agent-kit", "instances");
}

export async function manifests(directory = registryDirectory()): Promise<Manifest[]> {
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const values = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (file) => {
        try {
          const value = manifestSchema.parse(
            JSON.parse(await readFile(join(directory, file), "utf8")),
          );
          if (file !== `${value.instanceId}.json`) return null;
          return value;
        } catch {
          return null;
        }
      }),
  );
  return values.filter((value): value is Manifest => value !== null);
}

export function proof(secret: string, message: string): string {
  return createHmac("sha256", Buffer.from(secret, "hex")).update(message).digest("hex");
}

export async function request(
  manifest: Manifest,
  method: string,
  params: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(manifest.endpoint);
    const nonce = randomBytes(32).toString("hex");
    let buffer = Buffer.alloc(0);
    let authenticated = false;
    const finish = (error?: Error, value?: unknown) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    const abort = () =>
      finish(new Error("Request cancelled; an already dispatched action may have occurred"));
    const timer = setTimeout(
      () => finish(new Error("Bridge timeout; outcome may be unknown")),
      12_000,
    );
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    socket.once("error", (error) => finish(error));
    socket.once("end", () => finish(new Error("Bridge closed before returning a result")));
    socket.once("connect", () => socket.write(JSON.stringify({ nonce }) + "\n"));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_FRAME) {
        finish(new Error("Bridge response too large"));
        return;
      }
      const end = buffer.indexOf(10);
      if (end < 0) return;
      try {
        const value: unknown = JSON.parse(buffer.subarray(0, end).toString("utf8"));
        buffer = buffer.subarray(end + 1);
        if (!authenticated) {
          const hello = z
            .object({
              proof: z.string().regex(/^[a-f0-9]{64}$/),
              instanceId: z.literal(manifest.instanceId),
            })
            .parse(value);
          if (
            !timingSafeEqual(
              Buffer.from(hello.proof, "hex"),
              Buffer.from(proof(manifest.secret, nonce + ":server"), "hex"),
            )
          )
            throw new Error("Bridge identity verification failed");
          authenticated = true;
          const payload = JSON.stringify({
            id: nonce,
            auth: proof(manifest.secret, nonce + ":client"),
            method,
            params,
          });
          if (Buffer.byteLength(payload) > MAX_FRAME) throw new Error("Request too large");
          socket.write(payload + "\n");
        } else {
          const reply = z
            .object({
              id: z.literal(nonce),
              result: z.unknown().optional(),
              error: z.string().optional(),
            })
            .parse(value);
          finish(reply.error ? new Error(reply.error) : undefined, reply.result);
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Invalid bridge response"));
      }
    });
  });
}

export async function resolveInstance(instanceId: string): Promise<Manifest> {
  const instance = (await manifests()).find((value) => value.instanceId === instanceId);
  if (!instance) throw new Error("Instance not found; refresh list_instances");
  return instance;
}
