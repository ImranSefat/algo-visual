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
