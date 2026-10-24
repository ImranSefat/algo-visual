import {
  generateValues,
  type Cell,
  type GraphInputSpec,
  type GridInputSpec,
  type InputSpec,
  type KnapsackInputSpec,
  type SequenceInputSpec,
  type SequenceOp,
  type SequenceOpName,
} from "./input";
import { mulberry32, randInt } from "./prng";

/** Picks a search target from the generated array most of the time, occasionally a miss. */
export function pickTarget(values: number[], seed: number): number {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  if (values.length === 0 || rng() < 0.2) return randInt(rng, 1, 99);
  return values[randInt(rng, 0, values.length - 1)];
}

/**
 * A random op sequence using the same op names (and index-style) as `template`. A simulated
 * multiset of live values keeps deletes/searches mostly pointing at values that exist.
 */
const WORDS = ["tea", "ten", "ted", "to", "tone", "tonic", "in", "inn", "ink", "car", "cart", "care", "cat", "dog", "dot", "do", "art", "arc"];

export function randomSequence(template: SequenceInputSpec, seed: number): SequenceInputSpec {
  const rng = mulberry32(seed);
  if (template.ops.some((o) => o.word !== undefined)) {
    // Word structures (trie): insert a handful of overlapping words, then search some hits and misses.
    const pool = [...WORDS].sort(() => rng() - 0.5);
    const inserted = pool.slice(0, randInt(rng, 4, 7));
    const searches = [inserted[0], inserted[1].slice(0, -1) || inserted[1], pool[pool.length - 1]];
    return {
      kind: "sequence",
      initial: [],
      ops: [...inserted.map((word) => ({ op: "insert" as const, word })), ...searches.map((word) => ({ op: "search" as const, word }))],
    };
  }
  const names = [...new Set(template.ops.map((o) => o.op))] as SequenceOpName[];
  const indexed = new Set(template.ops.filter((o) => o.index !== undefined).map((o) => o.op));
  const adds: SequenceOpName[] = ["insert", "push", "enqueue"];
  const live = Array.from({ length: randInt(rng, 2, 5) }, () => randInt(rng, 1, 99));
  const initial = [...live];
  const ops: SequenceOp[] = [];
  const count = Math.max(4, Math.min(10, template.ops.length + randInt(rng, -1, 2)));
  for (let k = 0; k < count && names.length > 0; k++) {
    const op = names[randInt(rng, 0, names.length - 1)];
    if (adds.includes(op)) {
      const value = randInt(rng, 1, 99);
      const index = indexed.has(op) ? randInt(rng, 0, live.length) : undefined;
      live.splice(index ?? live.length, 0, value);
      ops.push(index === undefined ? { op, value } : { op, value, index });
    } else if (op === "pop" || op === "dequeue") {
      if (op === "pop") live.pop();
      else live.shift();
      ops.push({ op });
    } else if (indexed.has(op) && op === "delete") {
      if (live.length === 0) continue;
      const index = randInt(rng, 0, live.length - 1);
      live.splice(index, 1);
      ops.push({ op, index });
    } else {
      const hit = live.length > 0 && rng() < 0.8;
      const value = hit ? live[randInt(rng, 0, live.length - 1)] : randInt(rng, 1, 99);
      if (op === "delete" && hit) live.splice(live.indexOf(value), 1);
      ops.push({ op, value });
    }
  }
  return { kind: "sequence", initial, ops };
}

/** True when `end` can be reached from `start` through open cells (4-connected). */
function reachable(rows: number, cols: number, blocked: Set<number>, start: number, end: number): boolean {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell === end) return true;
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    for (const [nr, nc] of [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]]) {
      const next = nr * cols + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || blocked.has(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/** Scattered walls (and, for weighted grids, patches of costly cells), always leaving a route from start to end. */
export function randomGrid(spec: GridInputSpec, seed: number): GridInputSpec {
  const { rows, cols, start, end } = spec;
  const s = start[0] * cols + start[1];
  const e = end[0] * cols + end[1];
  for (let attempt = 0; attempt < 20; attempt++) {
    const rng = mulberry32(seed + attempt * 7919);
    const blocked = new Set<number>();
    for (let i = 0; i < rows * cols; i++) if (i !== s && i !== e && rng() < 0.27) blocked.add(i);
    if (!reachable(rows, cols, blocked, s, e)) continue;
    const toCell = (i: number): Cell => [Math.floor(i / cols), i % cols];
    const next: GridInputSpec = { ...spec, walls: [...blocked].map(toCell) };
    if (spec.weights) {
      const weights: [number, number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const r0 = randInt(rng, 0, rows - 4);
        const c0 = randInt(rng, 0, cols - 6);
        for (let r = r0; r < r0 + 4; r++) {
          for (let c = c0; c < c0 + 6; c++) {
            const i = r * cols + c;
            if (!blocked.has(i) && i !== s && i !== e) weights.push([r, c, 5]);
          }
        }
      }
      next.weights = weights;
    }
    return next;
  }
  return { ...spec, walls: [] };
}

/**
 * A connected random graph with the same node count, direction and weightedness. Directed graphs
 * only get edges from lower to higher index, so they are always acyclic (topological sort needs that).
 */
export function randomGraph(spec: GraphInputSpec, seed: number, nodes = spec.nodes): GraphInputSpec {
  const rng = mulberry32(seed);
  const weighted = spec.edges.some((edge) => edge[2] !== undefined);
  const keys = new Set<string>();
  const edges: GraphInputSpec["edges"] = [];
  const add = (a: number, b: number) => {
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    const key = `${from}-${to}`;
    if (from === to || keys.has(key)) return;
    keys.add(key);
    edges.push(weighted ? [from, to, randInt(rng, 1, 9)] : [from, to]);
  };
  // A random spanning tree keeps every node reachable from node 0…
  for (let i = 1; i < nodes; i++) add(randInt(rng, Math.max(0, i - 3), i - 1), i);
  // …plus a few extra edges for alternative routes.
  const extra = Math.round(nodes * 0.7);
  for (let k = 0; k < extra * 4 && edges.length < nodes - 1 + extra; k++) {
    const a = randInt(rng, 0, nodes - 1);
    const b = randInt(rng, 0, nodes - 1);
    if (Math.abs(a - b) <= 3) add(a, b);
  }
  return {
    ...spec,
    nodes,
    edges,
    source: 0,
    ...(spec.target !== undefined ? { target: nodes - 1 } : {}),
  };
}

const STRING_PAIRS: [string, string][] = [
  ["AGGTAB", "GXTXAYB"],
  ["KITTEN", "SITTING"],
  ["SUNDAY", "SATURDAY"],
  ["ABCBDAB", "BDCABA"],
  ["INTENTION", "EXECUTION"],
  ["HORSE", "ROS"],
  ["STONE", "LONGEST"],
  ["DYNAMIC", "PROGRAMMING"],
];

export function randomKnapsack(spec: KnapsackInputSpec, seed: number): KnapsackInputSpec {
  const rng = mulberry32(seed);
  const n = randInt(rng, 4, 6);
  const weights = Array.from({ length: n }, () => randInt(rng, 1, 7));
  const values = weights.map((w) => w + randInt(rng, 0, 6));
  return { kind: "knapsack", weights, values, capacity: randInt(rng, 7, 12) };
}

/** Same input shape, new random content derived from `seed`. Kinds without randomness are returned as-is. */
export function randomiseSpec(spec: InputSpec, seed: number): InputSpec {
  switch (spec.kind) {
    case "array":
      return { ...spec, seed, distribution: spec.distribution === "custom" ? "random" : spec.distribution };
    case "search": {
      const array = { ...spec.array, seed, distribution: spec.array.distribution === "custom" ? "random" : spec.array.distribution } as const;
      return { ...spec, array, target: pickTarget(generateValues(array), seed) };
    }
    case "sequence":
      return randomSequence(spec, seed);
    case "grid":
      return randomGrid(spec, seed);
    case "graph":
      return randomGraph(spec, seed);
    case "strings": {
      const [a, b] = STRING_PAIRS[seed % STRING_PAIRS.length];
      return { kind: "strings", a, b };
    }
    case "knapsack":
      return randomKnapsack(spec, seed);
    case "scalar":
      return { kind: "scalar", n: 5 + (seed % 16) };
  }
}
