import metadata from "../package.json" with { type: "json" };
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { manifests, request, resolveInstance } from "./bridge.js";

const instance = { instanceId: z.string().uuid() };
const target = { ...instance, webviewId: z.string().min(1) };
const reference = {
  ...target,
  reference: z.string().min(1),
  mode: z.enum(["webview", "windows"]).default("webview"),
};

export function createServer(advanced = false): McpServer {
  const server = new McpServer({ name: "tauri-agent-kit", version: metadata.version });
  server.registerTool(
    "list_instances",
    {
      description: "Discover authenticated live Tauri instances. No applications are launched.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const results = await Promise.all(
        (await manifests()).map(async (manifest) => {
          try {
            await request(manifest, "ping", {});
            return {
              instanceId: manifest.instanceId,
              app: manifest.app,
              pid: manifest.pid,
              startedAt: manifest.startedAt,
              advanced: manifest.advanced,
            };
          } catch {
            return null;
          }
        }),
      );
      return { content: [{ type: "text", text: JSON.stringify(results.filter(Boolean)) }] };
    },
  );
  const register = (name: string, description: string, shape: z.ZodRawShape, readOnly: boolean) => {
    server.registerTool(
      name,
      {
        description,
        inputSchema: z.object(shape),
        annotations: {
          readOnlyHint: readOnly,
          destructiveHint: !readOnly,
          openWorldHint: !readOnly,
        },
      },
      async (args, context) => {
        try {
          const manifest = await resolveInstance(String(args.instanceId));
          if (
            (name === "evaluate_js" || name === "invoke_command") &&
            (!advanced || !manifest.advanced)
          )
            throw new Error("Advanced tools require explicit enablement in both processes");
          const result = await request(manifest, name, args, context.mcpReq.signal);
          if (name === "screenshot") {
            const capture = z
              .object({
                data: z.string(),
                source: z.string(),
                zoom: z.number(),
                width: z.number(),
                height: z.number(),
                dpiScale: z.number(),
              })
              .parse(result);
            return {
              content: [
                { type: "image", data: capture.data, mimeType: "image/png" },
                {
                  type: "text",
                  text: JSON.stringify({
                    source: capture.source,
                    zoom: capture.zoom,
                    width: capture.width,
                    height: capture.height,
                    dpiScale: capture.dpiScale,
                  }),
                },
              ],
            };
          }
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: error instanceof Error ? error.message : "Unknown bridge error",
              },
            ],
          };
        }
      },
    );
  };
  register(
    "list_targets",
    "List exact windows and WebViews; titles are never used as identifiers.",
    instance,
    true,
  );
  register(
    "diagnose",
    "Read Rust state independently of JavaScript, plus bounded WebView responsiveness.",
    instance,
    true,
  );
  register(
    "snapshot",
    "Observe bounded DOM controls and text; fresh references are required after mutations.",
    target,
    true,
  );
  register(
    "screenshot",
    "Capture actual WebView viewport pixels, not desktop composition.",
    target,
    true,
  );
  register(
    "click",
    "Click a fresh observed element; Windows mode rejects another foreground target.",
    reference,
    false,
  );
  register(
    "type_text",
    "Enter literal text in an observed editable element. Does not submit.",
    { ...reference, text: z.string().max(16384) },
    false,
  );
  register(
    "press_key",
    "Press Enter, Tab, Escape, Backspace, or arrow keys in the selected WebView.",
    {
      ...target,
      key: z.enum([
        "Enter",
        "Tab",
        "Escape",
        "Backspace",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ]),
      mode: reference.mode,
    },
    false,
  );
  register(
    "scroll",
    "Scroll the WebView at viewport coordinates.",
    {
      ...target,
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
      deltaY: z.number().min(-2000).max(2000),
    },
    false,
  );
  register(
    "set_zoom",
    "Set WebView controller zoom; returns previous and current factors.",
    { ...target, factor: z.number().min(0.25).max(5) },
    false,
  );
  register(
    "focus_window",
    "Explicitly focus an existing window; never launches an application.",
    { ...instance, windowId: z.string() },
    false,
  );
  for (const name of ["get_logs", "get_ipc_calls"])
    register(
      name,
      "Read bounded metadata records. IPC history contains only explicitly instrumented calls.",
      {
        ...instance,
        after: z.number().int().nonnegative().default(0),
        limit: z.number().int().min(1).max(200).default(50),
      },
      true,
    );
  if (advanced) {
    register(
      "evaluate_js",
      "ADVANCED: execute arbitrary JavaScript with the privileges of this WebView. Not a sandbox.",
      { ...target, expression: z.string().max(65536) },
      false,
    );
    register(
      "invoke_command",
      "ADVANCED: invoke a Tauri command through the real frontend IPC and existing capabilities.",
      {
        ...target,
        command: z.string().min(1),
        args: z.record(z.string(), z.unknown()).default({}),
      },
      false,
    );
  }
  return server;
}
