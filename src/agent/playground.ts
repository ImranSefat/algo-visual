/**
 * Try the tools from the terminal, the way an AI client would call them.
 *
 *   pnpm agent                                          list the tools and these examples
 *   pnpm agent run_algorithm slug=quick-sort            the algorithm's default input
 *   pnpm agent run_algorithm slug=quick-sort size=100 dist=reversed seed=7
 *   pnpm agent run_algorithm slug=insertion-sort values=5,3,8,1
 *   pnpm agent run_algorithm slug=binary-search values=1,3,5,7,9 target=7
 *   pnpm agent make_link slug=quick-sort compareWith=merge-sort size=50 dist=reversed
 *   pnpm agent run_algorithm '{"slug":"fibonacci","input":{"kind":"scalar","n":10}}'
 *
 * key=value pairs are the tool's fields. Array fields (size, dist, seed, values, target) are folded into `input`
 * for you; any other input kind goes in as JSON, as in the last example.
 */
import type { z } from "zod";
import { callTool, ToolError, type Tool } from "./tool";
import { findTool, planned, tools } from "./tools";

const EXAMPLES = `  pnpm agent run_algorithm slug=quick-sort
  pnpm agent run_algorithm slug=quick-sort size=100 dist=reversed seed=7
  pnpm agent run_algorithm slug=insertion-sort values=5,3,8,1
  pnpm agent run_algorithm slug=binary-search values=1,3,5,7,9 target=7
  pnpm agent make_link slug=quick-sort compareWith=merge-sort size=50 dist=reversed
  pnpm agent run_algorithm '{"slug":"fibonacci","input":{"kind":"scalar","n":10}}'`;

const ALIASES: Record<string, string> = { dist: "distribution", values: "custom" };

/** JSON when it parses, a list of numbers when it is "5,3,8,1", otherwise the text itself. */
function parseValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const parts = text.split(",");
    return parts.length > 1 && parts.every((p) => /^-?\d+$/.test(p.trim())) ? parts.map(Number) : text;
  }
}

/** `key=value` pairs → the tool's input. Keys the tool does not declare become the array or search `input`. */
function argsToInput(tool: Tool, args: string[]): unknown {
  if (args.length === 1 && args[0].trim().startsWith("{")) return parseValue(args[0]);
  const known = new Set(Object.keys((tool.input as z.ZodObject).shape));
  const input: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const arg of args) {
    const eq = arg.indexOf("=");
    if (eq < 0) throw new ToolError(`Expected key=value, got "${arg}".`);
    const key = arg.slice(0, eq);
    const value = parseValue(arg.slice(eq + 1));
    if (known.has(key)) input[key] = value;
    else extra[ALIASES[key] ?? key] = value;
  }
  if (Object.keys(extra).length > 0 && input.input === undefined) {
    const { kind, target, ...fields } = extra;
    input.input = kind ? extra : target !== undefined ? { kind: "search", array: fields, target } : { kind: "array", ...fields };
  }
  return input;
}

/** JSON, indented, with lists of plain values kept on one line so 500 sorted numbers do not take 500 lines. */
function pretty(value: unknown, indent = ""): string {
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) return JSON.stringify(value);
    return `[\n${value.map((v) => `${indent}  ${pretty(v, indent + "  ")}`).join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries.map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${pretty(v, indent + "  ")}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const firstSentence = (text: string) => text.split(". ")[0] + ".";

function main(argv: string[]): number {
  const [name, ...args] = argv;
  if (!name || name === "--help" || name === "-h") {
    console.log("Tools:");
    for (const tool of tools) console.log(`  ${tool.name.padEnd(18)} ${firstSentence(tool.description)}`);
    console.log("\nPlanned (schema and description only, not built yet):");
    for (const tool of planned) console.log(`  ${tool.name.padEnd(18)} ${firstSentence(tool.description)}`);
    console.log(`\nExamples:\n${EXAMPLES}`);
    return 0;
  }
  const tool = findTool(name);
  if (!tool) {
    console.error(`No tool called "${name}". Run pnpm agent to list them.`);
    return 1;
  }
  try {
    console.log(pretty(callTool(tool, argsToInput(tool, args))));
    return 0;
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
}

process.exitCode = main(process.argv.slice(2));
