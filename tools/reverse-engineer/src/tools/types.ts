import type * as z from "zod";

export interface Tool<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  schema: S;
  run(args: z.output<S>): Promise<string>;
}

export function defineTool<S extends z.ZodObject>(tool: Tool<S>): Tool<S> {
  return tool;
}
