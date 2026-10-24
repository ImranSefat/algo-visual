# algo·visual

An interactive data-structures and algorithms visualizer. Smooth spring animations, a scrubbable timeline, and the real source code highlighted line by line as each algorithm runs.

![Quick sort mid-partition, with the code panel tracking the active line](docs/screenshots/quick-sort.png)

**36 algorithms** across sorting, searching, data structures, graphs and dynamic programming — every one with a step trace, line-by-line source, pseudocode, live variables, counters, an input editor and a shareable URL.

| | |
|---|---|
| ![A* on a grid](docs/screenshots/a-star.png) | ![AVL tree with balance factors](docs/screenshots/avl-tree.png) |
| ![LCS table](docs/screenshots/lcs.png) | ![BFS vs A* side by side](docs/screenshots/compare.png) |

## What's inside

| Category | Algorithms |
|---|---|
| Sorting | bubble, selection, insertion, shell, merge (bottom-up, aux buffer), quick (Lomuto), heap, counting, radix |
| Searching | linear, binary, jump |
| Structures | dynamic array, singly / doubly linked list, stack, queue, hash table (chaining), BST, AVL (named rotations), min-heap, trie |
| Graphs | BFS and DFS (grid + graph), Dijkstra (weighted grid + graph), A*, topological sort (Kahn), Prim, Kruskal (union-find table) |
| DP | Fibonacci, longest common subsequence, 0/1 knapsack, edit distance |

- **Timeline, not a live run.** Each algorithm is a TypeScript generator. It is exhausted once into an array of steps, so play, pause, scrub, step back and jump-to-end are all just index changes.
- **Compare mode** (`/compare`) runs two algorithms on the same input with one shared clock.
- **⌘K** searches every algorithm; **?** lists the keyboard shortcuts.
- **Shareable state:** `?n=&seed=&dist=&step=` for arrays, `?in=<json>` for everything else.
- Light and dark themes, keyboard navigable, honours `prefers-reduced-motion`. Every page is statically generated, including per-algorithm OG images.

## Keyboard

| Key | Action |
|---|---|
| `Space` | play / pause |
| `→` / `←` | step forward / back |
| `Home` / `End` | first / last step |
| `1`–`6` | speed 0.25× … 8× |
| `R` | randomise the input |
| `⌘K` | search |
| `?` | shortcuts |

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # Vitest: invariants + correctness for every algorithm
pnpm lint
pnpm build      # every route is prerendered (○ / ●)
```

Requires Node 20+ and pnpm.

## Architecture

```
src/algorithms/**            Pure TS. No React, no DOM. Generators yield Step<S>.
        │ runAlgorithm(algo, spec) → Step[]   (exhausted once per input change)
src/store/playback.ts        zustand: steps, index, playing, speed (setTimeout clock)
src/store/input.ts           zustand: the input spec; changes re-run the generator
        │ steps[index]
src/components/renderers/**  Pure functions of a Step; motion animates between steps
src/components/code/**       Shiki (server-only) + a single sliding highlight bar
```

- **`src/algorithms/core`** — `types.ts` (Step, AlgorithmMeta), `step.ts` (tracer, `snapshot`, `hl`), `states.ts` (the state shape each renderer consumes), `input.ts` / `validate.ts` / `randomise.ts` (input specs, sanitising, seeded generators), `prng.ts` (mulberry32).
- **`src/algorithms/registry.ts`** — the single list of algorithms. The landing page, ⌘K, `generateStaticParams` and the OG images all read from it.
- **Renderers** — `ArrayBars`, `ArrayBarsAux`, `Heap`, `LinkedList`, `Stack`, `Queue`, `HashTable`, `Tree` (d3-hierarchy), `GridGraph` (editable), `NodeGraph` (d3-force), `DPTable`. Every element has a stable id; layout animations come from motion's `layout` / `layoutId`.
- **Pages** — `/[category]/[slug]` is one static route for all 36 algorithm pages; `/compare` and `/` are static too. URL state is read on the client inside `<Suspense>`.

### Adding an algorithm

1. Create `src/algorithms/<category>/<slug>.ts` exporting `source`, optional line-aligned `pseudocode`, `meta` (`satisfies AlgorithmMeta`) and `function* run(input)`.
2. Build steps with `createTracer()` — `t.step(state, [hl("compare", id)], line, vars, note)`. `line` refers to `source`.
3. Add it to `modules` in `registry.ts`.
4. `pnpm test` checks that every line is inside `source`, pseudocode is line-aligned, every step has a note, and the algorithm survives randomised inputs. Add a correctness test next to the others.

## Decisions worth knowing

- **Cache Components is off** (`next.config.ts`). Every page is fully static and all URL state is client-only, which is what this app needs.
- **`snapshot()` shares frozen items** instead of `structuredClone`-ing them. Items are `Object.freeze`d at creation, so sharing them between steps is safe. A 150-element bubble sort produces about 17k steps; cloning every item in every step would cost roughly 150 MB.
- **Colour changes are CSS transitions**, not motion values. They follow theme switches instantly and cost nothing per frame; motion handles layout and enter/exit.
- **Animation durations follow the clock:** `min(0.35s, 80% of one tick)`, so 8× playback never lags.
- **The graph and grid display code** names small helpers (`grid.neighbours`, `PriorityQueue`) instead of inlining them, to keep the highlighted source readable.

## Stack

Next.js 16 (App Router, Turbopack, React Compiler) · React 19 · TypeScript (strict) · Tailwind CSS 4 + shadcn/ui · motion · zustand · nuqs · Shiki · d3-hierarchy / d3-force · Vitest.
