# Agent tools

The functions an AI assistant calls to use the visualizer's engine: run an algorithm on an input, measure the work it did, and get a link that plays the same run. Plain TypeScript, no React, no AI library. The MCP server, the Advisor and the LangGraph lab in `docs/ai-integration-plan.md` all wrap this folder. The first one being built is a local chat on Ollama, in `ollama/` (see [Ollama chat](#ollama-chat) below).

## Try it

```bash
pnpm agent                                          # list the tools and more examples
pnpm agent run_algorithm slug=quick-sort            # the algorithm's default input
pnpm agent run_algorithm slug=quick-sort size=100 dist=reversed
pnpm agent run_algorithm slug=insertion-sort values=5,3,8,1
pnpm agent make_link slug=quick-sort compareWith=merge-sort size=50 dist=reversed
pnpm test src/agent                                 # the tests for this folder
```

## What is here

| File | What it does |
| --- | --- |
| `tool.ts` | The shape of a tool (name, description, zod schema, `run`), plus `defineTool`, `callTool` and `ToolError` |
| `schemas.ts` | zod schemas for every input kind, with the limits and the descriptions the model reads |
| `input.ts` | Turns a tool input into the engine's `InputSpec`, filling in the algorithm's defaults |
| `links.ts` | Builds visualizer and compare-mode links with the same parsers the pages use |
| `limits.ts` | What the animation can play versus what an experiment may run |
| `counters.ts` | What each counter measures (the counters table) |
| `tools/run-algorithm.ts` | The complete worked example. Copy its shape for a new tool |
| `tools/make-link.ts` | The second complete tool |
| `tools/list-algorithms.ts`, `tools/get-algorithm.ts`, `tools/profile-input.ts` | Planned: schema and description done, body marked `TODO` |
| `tools/index.ts` | `tools` (working) and `planned` (not yet) |
| `playground.ts` | What `pnpm agent` runs |
| `ollama/` | The local chat that lets a model call these tools. See [Ollama chat](#ollama-chat) |

Running an algorithm to the end without keeping its steps is `runToEnd` in `src/algorithms/registry.ts`. The growth chart uses it too.

## Rules the tools follow

- Return raw counters with their names. Never add counters together or convert them into one unit: a swap, a shift and a write are different things. `counters.ts` says what each one measures.
- `animationSteps` is the length of the animation, not a measure of work. The visualizer plays at most 60,000 steps.
- A link is only returned when opening it plays exactly the input that was measured. Arrays above 150 elements run (up to 500) but get no link.
- Bad input throws a `ToolError` with a message the model can act on.

## Next up

Good first tools, one pull request each. Each file has a `TODO` comment with the steps, and `__tests__/tools.test.ts` has an `it.todo` for each to turn into a real test. Everything is tracked in issue #9.

1. `counters.ts`: the rest of the counters table (#16).
2. `tools/list-algorithms.ts` (#17)
3. `tools/profile-input.ts` (#18)
4. `tools/get-algorithm.ts` (#19)
5. New tools: `compare_algorithms` (#20) and `measure_growth` (#21)

When a tool works, move it from `planned` to `tools` in `tools/index.ts`. `pnpm lint`, `pnpm test` and `pnpm build` must pass before the pull request.

## Ollama chat

A chat in the terminal where a model running on your own machine answers questions by calling the tools above. No cloud, no API key. The setup is done; the chat itself is built in steps, one issue each:

1. Ask one question and print the answer (#11)
2. Let the model call a tool (#12)
3. Keep going until the model answers (#13)
4. A terminal chat with `pnpm agent:chat` (#14)
5. Write and tune the system prompt (#15)

### Setup

1. Install [Ollama](https://ollama.com/download) and open it (or run `ollama serve`).
2. `ollama pull qwen3:8b` (about 5 GB; it needs a machine with 16 GB of memory).
3. `pnpm agent:check` checks each piece and says how to fix the first problem it finds. It ends by asking the model a question with the tools, so you see a real tool call.

```bash
pnpm agent:check                          # is everything ready?
pnpm agent:ask "What is a stable sort?"   # one question (#11)
pnpm agent:chat                           # a conversation (#14)
OLLAMA_MODEL=llama3.1:8b pnpm agent:check # another model; OLLAMA_HOST if Ollama runs elsewhere
```

### What is here

| File | What it does |
| --- | --- |
| `ollama/config.ts` | Where Ollama runs and which model answers (`OLLAMA_HOST`, `OLLAMA_MODEL`), and whether thinking is on |
| `ollama/client.ts` | `chat({ messages, tools })`: sends the conversation to Ollama and returns the model's reply, with errors that say what to do. Also the message types |
| `ollama/to-ollama-tools.ts` | The working tools in the format Ollama expects |
| `ollama/check.ts` | What `pnpm agent:check` runs |
| `ollama/ask.ts` | **To build:** `ask(question)`, the agent loop. The `TODO` has the steps for #11 to #13 |
| `ollama/cli.ts` | **To build:** what `pnpm agent:ask` and `pnpm agent:chat` run (#11, #14) |
| `ollama/prompt.ts` | **To tune:** the system prompt (#15) |
| `ollama/__tests__/fake-ollama.ts` | A fake Ollama for tests: give it the model's replies, and it records what was sent. `client.test.ts` shows how to use it |

### Good to know

- Tests never call the real Ollama. Use `fakeOllama`, so `pnpm test` passes on any machine, CI included.
- Ollama passes only some JSON Schema fields to the model and drops the rest (`oneOf`, `const`, limits). `to-ollama-tools.ts` rewrites the ones that matter. Without that, `qwen3:8b` sent wrong arguments in all 9 test questions; with it, right in all 24 (six input kinds). If a new tool's arguments keep coming back wrong, look there first.
- Models still get arguments wrong sometimes. That's expected: the tool throws a `ToolError` that says what is wrong, and from #12 on `ask()` sends it back so the model can fix its call.
- The first request after a while is slow (several seconds) because Ollama loads the model into memory. Later ones are quick.
- Ollama's docs: [chat API](https://docs.ollama.com/api/chat), [tool calling](https://docs.ollama.com/capabilities/tool-calling).
