import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineTool } from "../../tool";
import { planned, runAlgorithmTool, tools } from "../../tools";
import { chat, OllamaError } from "../client";
import { normaliseHost, OLLAMA } from "../config";
import { toOllamaTools } from "../to-ollama-tools";
import { fakeOllama, toolCall } from "./fake-ollama";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat", () => {
  it("sends the conversation to /api/chat and returns the model's reply", async () => {
    const { requests } = fakeOllama(["Hello."]);
    const reply = await chat({ messages: [{ role: "user", content: "Hi" }] });
    expect(reply).toEqual({ role: "assistant", content: "Hello." });
    expect(requests).toEqual([
      {
        path: "/api/chat",
        body: { model: OLLAMA.model, messages: [{ role: "user", content: "Hi" }], think: false, stream: false },
      },
    ]);
  });

  it("sends the tools when given, and returns the tool calls the model makes", async () => {
    const { requests } = fakeOllama([toolCall("run_algorithm", { slug: "quick-sort" })]);
    const reply = await chat({ messages: [{ role: "user", content: "Run quick sort" }], tools: toOllamaTools() });
    expect(reply.tool_calls).toEqual([{ function: { name: "run_algorithm", arguments: { slug: "quick-sort" } } }]);
    expect(requests[0].body?.tools?.map((tool) => tool.function.name)).toEqual(tools.map((tool) => tool.name));
  });

  it("says how to start Ollama when it can't be reached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(chat({ messages: [] })).rejects.toBeInstanceOf(OllamaError);
    await expect(chat({ messages: [] })).rejects.toThrow(`Can't reach Ollama at ${OLLAMA.host}. Start the Ollama app (or run \`ollama serve\`)`);
  });

  it("says how to download a missing model", async () => {
    fakeOllama([Response.json({ error: `model '${OLLAMA.model}' not found` }, { status: 404 })]);
    await expect(chat({ messages: [] })).rejects.toThrow(`Run \`ollama pull ${OLLAMA.model}\``);
  });

  it("says when the model can't call tools", async () => {
    fakeOllama([Response.json({ error: `registry.ollama.ai/library/${OLLAMA.model} does not support tools` }, { status: 400 })]);
    await expect(chat({ messages: [], tools: toOllamaTools() })).rejects.toThrow(/can't call tools/);
  });

  it("passes on any other error from Ollama", async () => {
    fakeOllama([Response.json({ error: "out of memory" }, { status: 500 })]);
    await expect(chat({ messages: [] })).rejects.toThrow("Ollama answered 500: out of memory.");
  });
});

describe("toOllamaTools", () => {
  it("describes every working tool as a function with JSON Schema parameters", () => {
    const converted = toOllamaTools();
    expect(converted.map((tool) => tool.function.name)).toEqual(tools.map((tool) => tool.name));
    for (const tool of converted) {
      expect(tool.type).toBe("function");
      expect(tool.function.description.length, tool.function.name).toBeGreaterThan(20);
      expect(tool.function.parameters.type, tool.function.name).toBe("object");
      expect(tool.function.parameters, tool.function.name).not.toHaveProperty("$schema");
    }
  });

  it("converts the planned tools too, so moving one to `tools` never breaks the chat", () => {
    expect(toOllamaTools(planned)).toHaveLength(planned.length);
  });

  it("uses only schema keywords Ollama keeps: anyOf instead of oneOf, enum instead of const", () => {
    const json = JSON.stringify(toOllamaTools([...tools, ...planned]));
    expect(json).not.toContain('"oneOf"');
    expect(json).not.toContain('"const"');
    const input = toOllamaTools([runAlgorithmTool])[0].function.parameters.properties as Record<string, { anyOf: unknown[] }>;
    expect(input.input.anyOf).toContainEqual(
      expect.objectContaining({ properties: expect.objectContaining({ kind: { type: "string", enum: ["array"] } }) }),
    );
  });

  it("keeps field names that look like keywords", () => {
    const tool = defineTool({ name: "t", description: "A tool with odd field names.", input: z.object({ const: z.literal(1) }), run: () => 0 });
    expect(toOllamaTools([tool])[0].function.parameters.properties).toEqual({ const: { type: "number", enum: [1] } });
  });
});

describe("normaliseHost", () => {
  it("accepts the forms OLLAMA_HOST is usually set to", () => {
    expect(normaliseHost("localhost:11434")).toBe("http://localhost:11434");
    expect(normaliseHost("0.0.0.0")).toBe("http://0.0.0.0:11434");
    expect(normaliseHost("http://192.168.1.20:8080/")).toBe("http://192.168.1.20:8080");
    expect(normaliseHost("https://ollama.example.com")).toBe("https://ollama.example.com");
  });
});
