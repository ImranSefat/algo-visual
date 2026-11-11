import { OLLAMA } from "./config";

/**
 * A small typed client for the parts of Ollama's HTTP API the chat needs. It does the HTTP and turns failures into
 * messages that say what to do; what to send and what to do with the reply is up to the caller (see ask.ts).
 *
 * API reference: https://docs.ollama.com/api/chat, tool calling: https://docs.ollama.com/capabilities/tool-calling
 */

/** A tool the model asked for, with the arguments it chose. Run it with `callTool` from ../tool. */
export type ToolCall = { function: { name: string; arguments: Record<string, unknown> } };

export type SystemMessage = { role: "system"; content: string };
export type UserMessage = { role: "user"; content: string };
/** The model's reply. When it wants tools, `tool_calls` is set and `content` is usually empty. */
export type AssistantMessage = { role: "assistant"; content: string; thinking?: string; tool_calls?: ToolCall[] };
/** A tool's result, sent back to the model. `tool_name` says which call it answers. */
export type ToolMessage = { role: "tool"; tool_name: string; content: string };
export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

/** A tool as Ollama expects it. `toOllamaTools` builds these from the agent's tools. */
export type OllamaTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ChatRequest = {
  messages: Message[];
  /** Leave out for a plain chat; pass `toOllamaTools()` to let the model call tools. */
  tools?: OllamaTool[];
  model?: string;
  think?: boolean;
};

/** Ollama is not running, the model is missing, or Ollama refused the request. The message says what to do. */
export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
  }
}

/** Sends the conversation to the model and returns its reply. One request, no streaming. */
export async function chat({ messages, tools, model = OLLAMA.model, think = OLLAMA.think }: ChatRequest): Promise<AssistantMessage> {
  const reply = await request<{ message: AssistantMessage }>("/api/chat", { model, messages, tools, think, stream: false }, model);
  return reply.message;
}

/** Ollama's version, for `pnpm agent:check`. */
export async function version(): Promise<string> {
  return (await request<{ version: string }>("/api/version")).version;
}

/** What a downloaded model can do, for example ["completion", "tools", "thinking"]. */
export async function capabilities(model: string = OLLAMA.model): Promise<string[]> {
  return (await request<{ capabilities?: string[] }>("/api/show", { model }, model)).capabilities ?? [];
}

async function request<T>(path: string, body?: unknown, model?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA.host}${path}`, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
  } catch {
    throw new OllamaError(
      `Can't reach Ollama at ${OLLAMA.host}. Start the Ollama app (or run \`ollama serve\`), or set OLLAMA_HOST if it runs elsewhere.`,
    );
  }
  if (response.ok) return (await response.json()) as T;
  const error = await response
    .json()
    .then((json: { error?: string }) => json.error ?? "")
    .catch(() => "");
  if (response.status === 404 && model) {
    throw new OllamaError(`The model "${model}" isn't downloaded. Run \`ollama pull ${model}\`, or set OLLAMA_MODEL to one you have.`);
  }
  if (/does not support tools/.test(error)) {
    throw new OllamaError(`The model "${model}" can't call tools. Pick one that can (qwen3:8b, llama3.1:8b) with OLLAMA_MODEL.`);
  }
  throw new OllamaError(`Ollama answered ${response.status}${error ? `: ${error}` : ""}.`);
}
