import type { Tool } from "./tools/types";

/** Type of a schema field after unwrapping optional and default wrappers. */
function fieldType(tool: Tool, key: string): string | undefined {
  let field = (tool.schema.shape as Record<string, { _zod: { def: { type: string; innerType?: unknown } } }>)[key];
  while (field && (field._zod.def.type === "optional" || field._zod.def.type === "default")) {
    field = field._zod.def.innerType as typeof field;
  }
  return field?._zod.def.type;
}

export function parseArgs(tool: Tool, argv: string[]): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [rawKey, inline] = token.slice(2).split(/=(.*)/s, 2) as [string, string | undefined];
    const key = rawKey.replace(/-/g, "_");
    const type = fieldType(tool, key);
    if (type === undefined) throw new Error(`unknown option --${rawKey} for ${tool.name}`);
    let value: string | undefined = inline;
    // A boolean takes the next token only when it is an explicit true or false, never a path.
    if (value === undefined && type === "boolean")
      value = /^(true|false)$/.test(argv[i + 1] ?? "") ? argv[++i] : "true";
    if (value === undefined) value = argv[++i];
    if (value === undefined) throw new Error(`missing value for --${rawKey}`);
    args[key] = type === "number" ? Number(value) : type === "boolean" ? value !== "false" : value;
  }
  if (positional[0] !== undefined && args.path === undefined) args.path = positional[0];
  return args;
}
