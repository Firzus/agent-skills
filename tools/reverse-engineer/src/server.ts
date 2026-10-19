import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { fit } from "./core/budget";
import { tools } from "./tools/index";

const INSTRUCTIONS =
  "Read-only reverse engineering of local files. Start with triage(path). Responses are capped; when truncated, the footer names a cache file to page with read or filter with search. Every fact cites file:line:col, file@offset, a symbol or a string.";

export async function serve(version: string): Promise<void> {
  const server = new McpServer({ name: "reverse-engineer", version }, { instructions: INSTRUCTIONS });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
        // The catalog is small (about 6 KB for 8 tools), so Claude Code can load it up front instead of deferring it.
        _meta: { "anthropic/alwaysLoad": true },
      },
      async (args: unknown) => {
        try {
          const text = await fit(await tool.run(args as never), tool.name);
          return { content: [{ type: "text", text }] };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `${tool.name} failed: ${message}` }], isError: true };
        }
      },
    );
  }
  await server.connect(new StdioServerTransport());
  // The client closing stdin ends the session: exit, which also stops any running third-party tool.
  process.stdin.once("end", () => process.exit(0));
}
