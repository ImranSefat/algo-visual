import { vi } from "vitest";
import type { AssistantMessage, Message, OllamaTool, ToolCall } from "../client";

/** What the code sent to Ollama, as the tests see it. */
export type FakeRequest = {
  path: string;
  body?: { model: string; messages: Message[]; tools?: OllamaTool[]; think?: boolean; stream?: boolean };
};

/** One reply from the fake model: an answer in words, some tool calls, or a raw HTTP response for error cases. */
export type FakeReply = string | { tool_calls: ToolCall[] } | Response;

/**
 * Replaces `fetch`, so every request to Ollama gets the next reply from `replies` and is recorded in `requests`.
 * Tests never need Ollama running. Call `vi.unstubAllGlobals()` in `afterEach` to put the real fetch back.
 *
 *   const { requests } = fakeOllama([toolCall("run_algorithm", { slug: "quick-sort" }), "It made 12 swaps."]);
 */
export function fakeOllama(replies: FakeReply[]): { requests: FakeRequest[] } {
  const queue = [...replies];
  const requests: FakeRequest[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    requests.push({ path: new URL(url).pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const next = queue.shift();
    if (next === undefined) throw new Error(`fakeOllama ran out of replies after ${replies.length}: the code asked the model more often than the test expected.`);
    if (next instanceof Response) return next;
    const message: AssistantMessage = typeof next === "string" ? { role: "assistant", content: next } : { role: "assistant", content: "", ...next };
    return Response.json({ message, done: true });
  });
  return { requests };
}

/** A tool call the way the model sends it, for fake replies. */
export function toolCall(name: string, args: Record<string, unknown> = {}): { tool_calls: ToolCall[] } {
  return { tool_calls: [{ function: { name, arguments: args } }] };
}
