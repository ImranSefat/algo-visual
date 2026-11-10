# Agent tools

The functions an AI assistant calls to use the visualizer's engine: run an algorithm on an input, measure the work it did, and get a link that plays the same run. Plain TypeScript, no React, no AI library. The MCP server, the Advisor and the LangGraph lab in `docs/ai-integration-plan.md` all wrap this folder.

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

Running an algorithm to the end without keeping its steps is `runToEnd` in `src/algorithms/registry.ts`. The growth chart uses it too.

## Rules the tools follow

- Return raw counters with their names. Never add counters together or convert them into one unit: a swap, a shift and a write are different things. `counters.ts` says what each one measures.
- `animationSteps` is the length of the animation, not a measure of work. The visualizer plays at most 60,000 steps.
- A link is only returned when opening it plays exactly the input that was measured. Arrays above 150 elements run (up to 500) but get no link.
- Bad input throws a `ToolError` with a message the model can act on.

## Next up

Good first tools, in this order, one pull request each. Each file has a `TODO` comment with the steps, and `__tests__/tools.test.ts` has an `it.todo` for each to turn into a real test.

1. `counters.ts`: the rest of the counters table.
2. `tools/list-algorithms.ts`
3. `tools/profile-input.ts`
4. `tools/get-algorithm.ts`

When a tool works, move it from `planned` to `tools` in `tools/index.ts`. `pnpm lint`, `pnpm test` and `pnpm build` must pass before the pull request.
