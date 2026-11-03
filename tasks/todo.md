# DSA Visualizer — build plan

Source of truth: the build spec pasted at session start (phases 1–6). Decisions there are final.

## Phase 1 — vertical slice
- [x] Scaffold (Next 16, Tailwind 4, shadcn, fonts, theme tokens, dark mode toggle)
- [x] `core/types.ts`, `core/step.ts` (tracer, snapshot, hl), PRNG, input specs
- [x] Registry with bubble sort
- [x] Playback store + clock + keyboard shortcuts
- [x] `ArrayBars` renderer
- [x] Code panel: Shiki `CodeBlock`, sliding highlight, variables, counters, step note
- [x] Transport + scrubber + speed
- [x] `/sorting/bubble-sort` page
- [x] Vitest: line-range invariant + correctness

## Phase 2 — sorting + searching
- [x] Selection, insertion, shell, merge (aux), quick, heap, counting (aux), radix (aux)
- [x] `ArrayBarsAux` renderer (+ `Heap` renderer for heap sort)
- [x] Input controls + nuqs URL state
- [x] Linear, binary, jump search
- [x] Complexity card, landing grid

## Phase 3 — linear structures
- [x] LinkedList, Stack, Queue, HashTable renderers + op builder
- [x] Array ops, singly/doubly list, stack, queue, hash table

## Phase 4 — trees
- [x] Tree renderer (d3-hierarchy), Heap dual renderer
- [x] BST, AVL, min-heap, trie

## Phase 5 — graphs
- [x] GridGraph (wall drawing, drag start/end), NodeGraph (d3-force)
- [x] BFS, DFS, Dijkstra, A*, topological sort, Prim, Kruskal

## Phase 6 — DP + polish
- [x] DPTable + Fibonacci, LCS, knapsack, edit distance
- [x] /compare, ⌘K palette, shortcuts dialog, landing previews, OG images, README
- [ ] Vercel deploy — needs explicit go-ahead (outward-facing)

## Review
- 36 algorithms, 11 renderers, 36 static algorithm pages + `/`, `/compare`, 37 OG images; every route `○`/`●`.
- Tests: 1,600+ Vitest cases — line-range/pseudocode invariants for all algorithms, reference-implementation
  correctness per category, and every algorithm run on randomised versions of its own input.
- Lighthouse (production build, simulated mobile): performance 91–94, accessibility/best-practices/SEO 100.
- Deviations (each justified in commit messages / README): Cache Components off; `snapshot()` shares
  frozen items; colour via CSS transitions; bubble sort has the `swapped` early exit; renderers are
  code-split with `next/dynamic`.
- Graph and DP algorithm modules were drafted by two parallel subagents against shared state types,
  then reviewed and integrated here.

## Phase 7 — AI integration (plan, not started; waiting on the decisions at the end)

Full write-up: `docs/ai-integration-plan.md`.

Pitch: **the agent never guesses a Big O, it runs the experiment.** The engine already has what agent tools need:
36 seeded, deterministic generators with live counters, input validation (`sanitizeSpec`, `LIMITS`, `MAX_STEPS`),
and a shareable URL for every input (`?n&seed&dist&custom&target`, `?in=<json>`, `/compare?a&b`). So every answer
can be backed by measured numbers and end in a link that plays the exact run.

Architecture: one tool layer, three consumers.
- `src/agent/tools.ts`: pure TS + zod schemas, no React; the only place that touches the registry.
- MCP server (`/api/mcp` + stdio): Claude Code, Claude Desktop, Cursor, any MCP client.
- In-site Advisor (`/api/advisor`, Claude API tool runner): chat panel on the site.
- LangGraph agent (loads the same tools through the MCP server): showcase page.

### Step 0 — shared tool layer (needed by everything below)
- [ ] `list_algorithms({ category? })`: slug, name, input kind, complexity (best/avg/worst, space, stable, inPlace), counter names
- [ ] `get_algorithm({ slug, include? })`: description, plus source / pseudocode / python on request
- [ ] `run_algorithm({ slug, input })`: validate with `sanitizeSpec`, exhaust the generator without keeping steps
      (as `finalCounters` in `growth.ts` does), return output, final counters, step count, a few step notes and a deep link
- [ ] `compare_algorithms({ slugs, input })`: counters side by side + `/compare` link (the page has two panes, so link pairs)
- [ ] `profile_input({ values })`: size, sortedness (inversion ratio), duplicate ratio, range, so the agent can describe real data
- [ ] `measure_growth({ slug, sizes?, distributions? })`: generalise `measureGrowth` from PR #6 beyond Quick Sort (array kinds)
- [ ] `make_link({ slug | [a, b], input, step? })`: built on `queryFromSpec`
- [ ] Counter caveat: counters differ (comparisons/swaps vs shifts vs reads/writes; hops/relinks vs probes/collisions).
      Return raw counters + step count; tool descriptions say not to compare unlike counters
- [ ] Limits: reuse `LIMITS`/`MAX_STEPS`; experiments may go past 150 (no animation) up to a hard cap + time budget
- [ ] Vitest: schemas, limits, every deep link round-trips through `specFromQuery`

### Phase A — MCP server (headline; costs nothing to run, the user's AI client pays)
- [ ] Read the Next 16 route-handler docs in `node_modules/next/dist/docs/` first
- [ ] Remote: Streamable HTTP at `src/app/api/mcp/route.ts` with `@modelcontextprotocol/sdk` (or Vercel's `mcp-handler`
      wrapper; check which is current). Stateless, read-only, no auth
- [ ] Local: stdio entry (`pnpm mcp`) for Claude Desktop
- [ ] Tools from step 0; resources `algo://{slug}/source|pseudocode|python`; prompts "pick-a-sort", "explain-this-step"
- [ ] Test with MCP Inspector, then `claude mcp add --transport http algo-visual https://algo-visual-iota.vercel.app/api/mcp`
- [ ] Rate limit `/api/mcp` (Vercel firewall) on top of the input caps
- [ ] README + About section: "Use it from your AI assistant"
- Demo: "~10k nearly-sorted records, lots of duplicates, must be stable: which sort?" → Claude profiles, shortlists,
  runs them, answers with measured counts and a `/compare` link

### Phase B — in-site Algorithm Advisor (uses Imran's API key)
- [ ] `/api/advisor`: Anthropic TS SDK tool runner (`betaZodTool` + `client.beta.messages.toolRunner`) over the step-0 tools, streamed
- [ ] Model `claude-opus-5-5`, effort `low` for chat; `fallbacks: "default"` for refusals; cache the system prompt + tools
- [ ] UI: "Ask" in the ⌘K palette + side panel; answer cards with "Watch it" links into the visualizer / compare mode
- [ ] "Explain this step" button: sends the step note, vars, code line and meta; one short call
- [ ] Guardrails: per-IP rate limit, token caps, monthly spend cap, `ANTHROPIC_API_KEY` only in Vercel env, kill-switch flag
- [ ] Eval: ~20 "which algorithm / data structure" scenarios with answers computed by the engine (deterministic ground truth)

### Phase C — LangGraph showcase (`/lab`)
- [ ] `@langchain/langgraph` + `@langchain/anthropic`; tools loaded from the MCP server via `@langchain/mcp-adapters`
- [ ] Advisor graph: understand (structured constraints) → shortlist (stable? in-place? input kind? op mix) →
      experiment (fan-out, one branch per candidate) → judge (measured counters + theory) → explain with links;
      `interrupt()` before experiment so the user can paste their own sample data
- [ ] Worst-case hunter graph: propose input → run → measure → refine until the counter stops rising
      (e.g. rediscovers that sorted/reversed input is Quick Sort's worst case with a last-element pivot)
- [ ] Render the agent's own graph with the site's NodeGraph renderer and light up nodes as the run streams
- Note: Phase B works fine with plain tool use. LangGraph earns its place only for the fan-out, the interrupt and the visible graph

### Phase D — stretch: MCP Apps
- [ ] Serve the visualizer as an interactive MCP UI resource so it plays inside Claude / ChatGPT. Check the current
      MCP Apps spec and host support before starting

### Decisions needed before any code
1. Who pays for hosted AI: MCP only (free to run) / Advisor with rate limit + monthly cap / bring-your-own-key
2. Model for the Advisor: `claude-opus-5-5` (default) or a cheaper one (e.g. `claude-haiku-5-5`)
3. LangGraph: build `/lab`, or stop after the MCP server + Advisor
