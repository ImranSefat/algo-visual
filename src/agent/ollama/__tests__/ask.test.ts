import { afterEach, describe, expect, it, vi } from "vitest";
import { ask } from "../ask";
import type { Message } from "../client";
import { OLLAMA } from "../config";
import { SYSTEM_PROMPT } from "../prompt";
import { fakeOllama } from "./fake-ollama";

// Each issue turns its it.todo lines into real tests. `fakeOllama` (./fake-ollama) gives the model's replies, so
// these never need Ollama running; client.test.ts shows how to use it.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ask", () => {
  // #11
  it("sends the system prompt, the history and the question, and returns the model's answer", async () => {
    const history: Message[] = [
      { role: "user", content: "What is a stable sort?" },
      { role: "assistant", content: "One that keeps equal values in their original order." },
    ];
    const { requests } = fakeOllama(["Yes, merge sort is stable."]);

    const result = await ask("Is merge sort stable?", history);

    const sent: Message[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: "Is merge sort stable?" }];
    expect(requests).toEqual([{ path: "/api/chat", body: { model: OLLAMA.model, messages: sent, think: OLLAMA.think, stream: false } }]);
    expect(result.answer).toBe("Yes, merge sort is stable.");
    expect(result.messages).toEqual([...sent, { role: "assistant", content: "Yes, merge sort is stable." }]);
  });

  it("sends the system prompt once when the history comes from an earlier answer", async () => {
    const { requests } = fakeOllama(["One that keeps equal values in their original order.", "Yes."]);

    const first = await ask("What is a stable sort?");
    await ask("Is merge sort stable?", first.messages);

    const sent = requests[1].body?.messages ?? [];
    expect(sent.filter((message) => message.role === "system")).toEqual([{ role: "system", content: SYSTEM_PROMPT }]);
    expect(sent.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
  });

  // #12
  it.todo("runs the tool the model asks for and sends the result back as a tool message");
  it.todo("sends a ToolError or an unknown tool name back to the model instead of throwing");

  // #13
  it.todo("keeps running tools until the model answers in words");
  it.todo("runs every tool call in one reply");
  it.todo("stops after MAX_TURNS and says so");
});

describe("terminal chat", () => {
  // #14
  it.todo("passes the earlier messages as history, so a follow-up question continues the conversation");
});
