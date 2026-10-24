# DSA Visualizer — build plan

Source of truth: the build spec pasted at session start (phases 1–6). Decisions there are final.

## Phase 1 — vertical slice
- [ ] Scaffold (Next 16, Tailwind 4, shadcn, fonts, theme tokens, dark mode toggle)
- [ ] `core/types.ts`, `core/step.ts` (tracer, snapshot, hl), PRNG, input specs
- [ ] Registry with bubble sort
- [ ] Playback store + clock + keyboard shortcuts
- [ ] `ArrayBars` renderer
- [ ] Code panel: Shiki `CodeBlock`, sliding highlight, variables, counters, step note
- [ ] Transport + scrubber + speed
- [ ] `/sorting/bubble-sort` page
- [ ] Vitest: line-range invariant + correctness

## Phase 2 — sorting + searching
- [ ] Selection, insertion, shell, merge (aux), quick, heap, counting (aux), radix (aux)
- [ ] `ArrayBarsAux` renderer
- [ ] Input controls + nuqs URL state
- [ ] Linear, binary, jump search
- [ ] Complexity card, landing grid

## Phase 3 — linear structures
- [ ] LinkedList, Stack, Queue, HashTable renderers + op builder
- [ ] Array ops, singly/doubly list, stack, queue, hash table

## Phase 4 — trees
- [ ] Tree renderer (d3-hierarchy), Heap dual renderer
- [ ] BST, AVL, min-heap, trie

## Phase 5 — graphs
- [ ] GridGraph (wall drawing, drag start/end), NodeGraph (d3-force)
- [ ] BFS, DFS, Dijkstra, A*, topological sort, Prim, Kruskal

## Phase 6 — DP + polish
- [ ] DPTable + Fibonacci, LCS, knapsack, edit distance
- [ ] /compare, ⌘K palette, shortcuts dialog, landing previews, OG images, README
- [ ] Vercel deploy — needs explicit go-ahead (outward-facing)

## Review
_(filled in at the end)_
