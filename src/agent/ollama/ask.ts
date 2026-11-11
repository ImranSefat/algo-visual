import type { Message } from "./client";

/** The model's final answer, and the whole conversation so far so a follow-up question can continue it. */
export type AskResult = { answer: string; messages: Message[] };

/**
 * Answers one question with the local model. `history` is the conversation so far (empty for a first question).
 *
 * TODO, one issue at a time. Each step has an `it.todo` in __tests__/ask.test.ts to turn into a real test.
 *
 * #11, ask one question:
 *  1. Build the messages: `{ role: "system", content: SYSTEM_PROMPT }` (./prompt), then `history`, then
 *     `{ role: "user", content: question }`.
 *  2. `await chat({ messages })` from ./client. Return its `content` as the answer, and the messages with the reply
 *     added at the end.
 *
 * #12, let the model call a tool:
 *  3. Pass `tools: toOllamaTools()` (./to-ollama-tools) to `chat`.
 *  4. When the reply has `tool_calls`, add the reply to the messages, then for each call find the tool with
 *     `findTool` (../tools) and run it with `callTool` (../tool). Add the result as
 *     `{ role: "tool", tool_name: call.function.name, content: JSON.stringify(result) }`.
 *     An unknown tool or a ToolError is not a crash: send its message back as the content, so the model can fix
 *     its call.
 *  5. Call `chat` again with the longer messages so the model can answer using the results.
 *
 * #13, keep going until the model answers:
 *  6. Repeat steps 4 and 5 until a reply has no `tool_calls`, at most MAX_TURNS times (say 8). If it hits the
 *     limit, return an answer that says so instead of looping forever.
 */
export const ask: (question: string, history?: Message[]) => Promise<AskResult> = async () => {
  throw new Error("ask is not built yet: see the TODO in src/agent/ollama/ask.ts (issue #11).");
};
