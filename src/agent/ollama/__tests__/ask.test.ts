import { afterEach, describe, it, vi } from "vitest";

// Each issue turns its it.todo lines into real tests. `fakeOllama` (./fake-ollama) gives the model's replies, so
// these never need Ollama running; client.test.ts shows how to use it.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ask", () => {
  // #11
  it.todo("sends the system prompt, the history and the question, and returns the model's answer");

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
