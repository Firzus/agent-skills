import { binaryInventory } from "./binaryInventory";
import { buildinfo } from "./buildinfo";
import { decompileTool } from "./decompile";
import { electronSurfaceTool } from "./electronSurface";
import { managedTool } from "./managed";
import { read } from "./read";
import { search } from "./search";
import { triage } from "./triage";
import type { Tool } from "./types";

export const tools: Tool[] = [
  triage,
  electronSurfaceTool,
  search,
  read,
  binaryInventory,
  buildinfo,
  decompileTool,
  managedTool,
] as Tool[];
