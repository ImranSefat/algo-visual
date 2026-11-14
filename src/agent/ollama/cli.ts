/**
 * Talk to the agent from the terminal.
 *
 *   pnpm agent:ask "How many swaps does quick sort make on 50 reversed numbers?"     one question (#11)
 *   pnpm agent:chat                                                                  a conversation (#14)
 *
 * Run `pnpm agent:check` first if anything fails: it says what is missing.
 */
import { ask } from "./ask";
import { OllamaError } from "./client";

/** Prints the answer to one question, or how to use the command when there is no question. */
async function askOnce(question: string): Promise<void> {
  if (!question) {
    console.log('Ask one question, for example:\n  pnpm agent:ask "What is a stable sort?"');
    return;
  }
  const { answer } = await ask(question);
  console.log(answer);
}

/**
 * TODO (#14): a conversation in the terminal.
 *  1. Read questions with `createInterface` from node:readline/promises until the user types exit (or Ctrl+C).
 *  2. Pass the `messages` from the last answer as `history` to the next `ask`, so follow-ups work.
 *  3. Show which tools ran, for example `→ run_algorithm quick-sort`, so you can see the agent work.
 */
const conversation: () => Promise<void> = async () => {
  throw new Error("pnpm agent:chat is not built yet: see the TODO in src/agent/ollama/cli.ts (issue #14).");
};

async function main([mode, ...words]: string[]): Promise<number> {
  if (mode !== "ask" && mode !== "chat") {
    console.error(`Unknown mode "${mode}". Use pnpm agent:ask or pnpm agent:chat.`);
    return 1;
  }
  try {
    if (mode === "ask") await askOnce(words.join(" ").trim());
    else await conversation();
    return 0;
  } catch (error) {
    // Ollama problems (not running, model missing) are expected; print the fix, not a stack trace.
    if (!(error instanceof OllamaError)) throw error;
    console.error(error.message);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => (process.exitCode = code));
