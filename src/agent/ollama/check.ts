/**
 * Checks that everything the chat needs is ready, one step at a time, and says how to fix the first problem.
 *
 *   pnpm agent:check
 *   OLLAMA_MODEL=llama3.1:8b pnpm agent:check
 */
import { findTool, planned } from "../tools";
import { capabilities, chat, OllamaError, version } from "./client";
import { OLLAMA } from "./config";
import { toOllamaTools } from "./to-ollama-tools";

const seconds = (start: number) => `${((performance.now() - start) / 1000).toFixed(1)}s`;

async function main(): Promise<number> {
  try {
    console.log(`✓ Ollama ${await version()} is running at ${OLLAMA.host}`);

    const can = await capabilities(OLLAMA.model);
    if (!can.includes("tools")) {
      console.error(`✗ ${OLLAMA.model} can't call tools. Pick one that can (qwen3:8b, llama3.1:8b) with OLLAMA_MODEL.`);
      return 1;
    }
    console.log(`✓ ${OLLAMA.model} is downloaded and can call tools`);

    const tools = toOllamaTools();
    const names = (list: { name: string }[]) => list.map((tool) => tool.name).join(", ");
    console.log(`✓ ${tools.length} tools for the model: ${names(tools.map((tool) => tool.function))} (planned: ${names(planned)})`);

    // The first request loads the model into memory, which can take a while.
    let start = performance.now();
    const hello = await chat({ messages: [{ role: "user", content: "Reply with one word: ready" }] });
    console.log(`✓ ${OLLAMA.model} answered "${hello.content.trim()}" in ${seconds(start)}`);

    start = performance.now();
    const question = "How many swaps does quick-sort make on 50 numbers in reversed order?";
    const reply = await chat({ messages: [{ role: "user", content: question }], tools });
    const call = reply.tool_calls?.[0]?.function;
    if (!call) {
      console.error(`✗ Asked "${question}" with the tools, but it answered without calling one:\n  ${reply.content.trim()}`);
      console.error("  Small models sometimes do this. Try again, or a bigger model with OLLAMA_MODEL.");
      return 1;
    }
    console.log(`✓ It asks for tools in ${seconds(start)}: "${question}"`);
    console.log(`  → ${call.name} ${JSON.stringify(call.arguments)}`);
    const parsed = findTool(call.name)?.input.safeParse(call.arguments);
    if (!parsed?.success) {
      // Not a setup problem: models get arguments wrong sometimes. The loop in ask() sends the error back to fix it.
      console.log(`! Those arguments don't fit the tool's schema, so the tool would refuse them. The model can retry`);
      console.log(`  once ask() sends errors back (#12). If this happens every time, the schema may not reach the model.`);
    }
    console.log("\nReady. Next: build ask() in src/agent/ollama/ask.ts (issue #11).");
    return 0;
  } catch (error) {
    if (!(error instanceof OllamaError)) throw error;
    console.error(`✗ ${error.message}`);
    return 1;
  }
}

main().then((code) => (process.exitCode = code));
