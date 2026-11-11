import { z } from "zod";
import type { Tool } from "../tool";
import { tools as workingTools } from "../tools";
import type { OllamaTool } from "./client";

/**
 * The agent's tools in the shape Ollama expects: name, description and the zod input schema as JSON Schema. Only
 * the working tools by default, so a tool shows up in the chat as soon as it moves from `planned` to `tools`.
 */
export function toOllamaTools(tools: Tool[] = workingTools): OllamaTool[] {
  return tools.map((tool) => {
    // `io: "input"` describes what the model may send (optional fields stay optional). `$schema` is dropped: the
    // model doesn't need it and every token counts on a small model.
    const parameters = z.toJSONSchema(tool.input, { io: "input" });
    delete parameters.$schema;
    return { type: "function", function: { name: tool.name, description: tool.description, parameters: forOllama(parameters) } };
  });
}

/**
 * Ollama passes a tool's schema to the model through a fixed set of fields (`ToolProperty` in its api/types.go:
 * anyOf, type, items, description, enum, properties, required) and silently drops the rest. Two of the dropped
 * ones matter here, so they are rewritten into kept ones that say the same thing:
 *
 *  - `oneOf` → `anyOf`. Our input union (`inputSpec`) is a oneOf; without the rewrite the model saw a bare
 *    description and made up fields.
 *  - `const: "array"` → `enum: ["array"]`, so the model still sees which `kind` each input variant needs.
 *
 * Limits (minimum, maxItems...) are dropped too, which is why the zod `describe` strings repeat them in words.
 * Measured on qwen3:8b: without the rewrite 0 of 9 tool calls had valid arguments; with it, 24 of 24 across six
 * input kinds.
 */
function forOllama<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map(forOllama) as T;
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "oneOf") out.anyOf = forOllama(value);
    else if (key === "const") out.enum = [value];
    // Keys under `properties` are field names, not schema keywords: rewrite the schemas, keep the names.
    else if (key === "properties") out.properties = Object.fromEntries(Object.entries(value).map(([name, field]) => [name, forOllama(field)]));
    else out[key] = forOllama(value);
  }
  return out as T;
}
