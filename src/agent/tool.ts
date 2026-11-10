import { z } from "zod";

/**
 * A tool is a function an AI model can call: a name and description the model reads, a zod schema for the input
 * it accepts, and the function that runs it. Every consumer (MCP server, Advisor, LangGraph) wraps this one shape.
 */
export type Tool<I extends z.ZodType = z.ZodType, O = unknown> = {
  /** snake_case, as models expect. */
  name: string;
  /** Written for the model: what the tool measures, what it returns, and what not to conclude from it. */
  description: string;
  input: I;
  run(input: z.output<I>): O;
};

/** Identity function that pins down the generic types, so `run` gets a typed input. */
export function defineTool<I extends z.ZodType, O>(tool: Tool<I, O>): Tool<I, O> {
  return tool;
}

/** A problem the model should see and recover from (unknown slug, input out of range), as opposed to a bug. */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/** Validates `raw` against the tool's schema and runs it. Bad input throws a ToolError that says what is wrong. */
export function callTool<I extends z.ZodType, O>(tool: Tool<I, O>, raw: unknown): O {
  const parsed = tool.input.safeParse(raw);
  if (!parsed.success) throw new ToolError(`Bad input for ${tool.name}:\n${z.prettifyError(parsed.error)}`);
  return tool.run(parsed.data);
}
