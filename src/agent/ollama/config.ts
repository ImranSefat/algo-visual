/**
 * Where Ollama runs and which model answers. Override with environment variables:
 *
 *   OLLAMA_MODEL=llama3.1:8b pnpm agent:check
 *   OLLAMA_HOST=http://192.168.1.20:11434 pnpm agent:chat
 */
export const OLLAMA = {
  host: normaliseHost(process.env.OLLAMA_HOST ?? "localhost:11434"),
  /** Needs the "tools" capability. qwen3:8b calls tools reliably and runs on a laptop with 16 GB of memory. */
  model: process.env.OLLAMA_MODEL || "qwen3:8b",
  /**
   * Thinking models (qwen3, deepseek-r1) can reason before they answer: slower, sometimes better tool choices.
   * Off by default so answers come back quickly. Worth trying both in #15.
   */
  think: false,
};

/**
 * OLLAMA_HOST is also the variable Ollama's own server reads, where it is often just "0.0.0.0" or "host:port".
 * Fill in the scheme and Ollama's default port so both forms work.
 */
export function normaliseHost(host: string): string {
  const url = new URL(/^https?:\/\//.test(host) ? host : `http://${host}`);
  if (!url.port && url.protocol === "http:") url.port = "11434";
  return url.origin;
}
