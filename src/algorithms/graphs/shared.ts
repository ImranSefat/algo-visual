import type { Cell, GraphInputSpec, GridInputSpec, ResolvedInput } from "../core/input";
import { edgeId, nodeId, type GraphEdge, type GraphNode, type GridState } from "../core/states";

// ---------- Grids ----------

/** Cells of the inclusive rectangle from (r0, c0) to (r1, c1); default inputs build walls and mud from these. */
export function block(r0: number, c0: number, r1: number, c1: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.push([r, c]);
  return cells;
}

/**
 * Snaking maze shared by BFS, DFS and A* so they can be compared. The stub at column 13 closes off a
 * pocket that DFS (which tries "up" first) wanders into and has to backtrack out of.
 */
export function mazeInput(): GridInputSpec {
  return {
    kind: "grid",
    rows: 15,
    cols: 29,
    walls: [
      ...block(0, 7, 10, 7),
      ...block(10, 8, 10, 11),
      ...block(0, 13, 2, 13),
      ...block(4, 14, 14, 14),
      ...block(4, 15, 4, 18),
      ...block(0, 21, 10, 21),
      ...block(10, 22, 10, 24),
    ],
    start: [7, 2],
    end: [7, 26],
  };
}

export type Grid = {
  /** Constant layout: `walls` / `weights` are frozen so every step shares them. */
  layout: GridState;
  size: number;
  isWall: (cell: number) => boolean;
  /** Cost to enter `cell` (1 unless the input weights it). */
  cost: (cell: number) => number;
  /** In-bounds neighbours in the order up, right, down, left. Walls are included; callers skip them. */
  neighbours: (cell: number) => number[];
  manhattan: (a: number, b: number) => number;
  /** "(row, col)" for notes and vars. */
  name: (cell: number) => string;
};

export function buildGrid(input: ResolvedInput<"grid">, weighted: boolean): Grid {
  const { rows, cols } = input;
  const size = rows * cols;
  const inBounds = ([r, c]: Cell) => r >= 0 && r < rows && c >= 0 && c < cols;
  const at = ([r, c]: Cell) => r * cols + c;
  const start = at(input.start);
  const end = at(input.end);

  const walls = new Array<boolean>(size).fill(false);
  for (const cell of input.walls) if (inBounds(cell)) walls[at(cell)] = true;
  // An edited input may paint over the endpoints; they always stay open.
  walls[start] = false;
  walls[end] = false;

  let weights: number[] | undefined;
  if (weighted && input.weights && input.weights.length > 0) {
    weights = new Array<number>(size).fill(1);
    for (const [r, c, w] of input.weights) if (inBounds([r, c]) && w >= 1) weights[at([r, c])] = w;
  }

  const layout: GridState = { rows, cols, walls: Object.freeze(walls), start, end };
  if (weights) layout.weights = Object.freeze(weights);

  return {
    layout,
    size,
    isWall: (cell) => walls[cell],
    cost: (cell) => weights?.[cell] ?? 1,
    neighbours(cell) {
      const r = Math.floor(cell / cols);
      const c = cell % cols;
      const out: number[] = [];
      if (r > 0) out.push(cell - cols);
      if (c < cols - 1) out.push(cell + 1);
      if (r < rows - 1) out.push(cell + cols);
      if (c > 0) out.push(cell - 1);
      return out;
    },
    manhattan: (a, b) =>
      Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)),
    name: (cell) => `(${Math.floor(cell / cols)}, ${cell % cols})`,
  };
}

/**
 * Priority queue for the weighted grid searches. Keys compare lexicographically and equal keys pop
 * oldest first, so ties resolve deterministically. A linear scan is plenty for ≤ 1500 cells.
 * Entries are never updated in place: callers push a fresh copy and skip stale ones on pop.
 */
export class MinQueue {
  private entries: { item: number; key: number[]; seq: number }[] = [];
  private seq = 0;

  get size() {
    return this.entries.length;
  }

  push(item: number, key: number[]) {
    this.entries.push({ item, key, seq: this.seq++ });
  }

  pop(): number | undefined {
    if (this.entries.length === 0) return undefined;
    let best = 0;
    for (let i = 1; i < this.entries.length; i++) if (before(this.entries[i], this.entries[best])) best = i;
    return this.entries.splice(best, 1)[0].item;
  }
}

function before(a: { key: number[]; seq: number }, b: { key: number[]; seq: number }): boolean {
  for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] < b.key[i];
  return a.seq < b.seq;
}

// ---------- Node graphs ----------

/** Undirected, unweighted and connected, labelled so the BFS order is not simply alphabetical. */
export function traversalInput(): GraphInputSpec {
  return {
    kind: "graph",
    nodes: 8,
    edges: [
      [0, 1],
      [0, 3],
      [0, 5],
      [1, 2],
      [1, 6],
      [2, 3],
      [2, 7],
      [4, 5],
      [4, 7],
      [6, 7],
    ],
    directed: false,
    source: 0,
  };
}

/**
 * Weighted graph shared by Prim and Kruskal: both find total weight 23, but in different orders,
 * and Kruskal has to reject two cycle-closing edges (B-C and D-F).
 */
export function spanningInput(): GraphInputSpec {
  return {
    kind: "graph",
    nodes: 8,
    edges: [
      [0, 1, 4],
      [0, 2, 3],
      [1, 2, 5],
      [1, 3, 6],
      [1, 5, 8],
      [2, 3, 7],
      [2, 4, 8],
      [3, 4, 2],
      [3, 5, 5],
      [4, 5, 4],
      [4, 6, 9],
      [5, 6, 3],
      [5, 7, 7],
      [6, 7, 1],
    ],
    directed: false,
    source: 0,
  };
}

export const nodeLabel = (i: number) => String.fromCharCode(65 + i);

/** An edge seen from one endpoint: `from` is the node whose adjacency list holds it. */
export type Link = { readonly from: number; readonly to: number; readonly weight: number; readonly id: string };

export type Graph = {
  size: number;
  directed: boolean;
  /** Input source, clamped into range. */
  source: number;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  /** One entry per edge, in input order (duplicates dropped). */
  links: readonly Link[];
  /** Outgoing links per node, both directions when undirected, ascending by neighbour. */
  adj: readonly (readonly Link[])[];
};

/**
 * Frozen node / edge lists plus index-based adjacency. Unweighted graphs drop edge weights so the
 * renderer does not label them; weighted ones default a missing weight to 1.
 */
export function buildGraph(
  input: ResolvedInput<"graph">,
  { directed, weighted }: { directed: boolean; weighted: boolean },
): Graph {
  const size = input.nodes;
  const nodes = Object.freeze(
    Array.from({ length: size }, (_, i) => Object.freeze({ id: nodeId(i), label: nodeLabel(i) })),
  );
  const links: Link[] = [];
  const edges: GraphEdge[] = [];
  const adj: Link[][] = Array.from({ length: size }, () => []);
  const ids = new Set<string>();
  for (const [a, b, w] of input.edges) {
    if (a === b || a < 0 || b < 0 || a >= size || b >= size) continue;
    const [from, to] = directed || a < b ? [a, b] : [b, a];
    const id = edgeId(from, to, directed);
    if (ids.has(id)) continue;
    ids.add(id);
    const weight = weighted ? (w ?? 1) : 1;
    const link = Object.freeze({ from, to, weight, id });
    links.push(link);
    edges.push(
      Object.freeze({ id, from: nodeId(from), to: nodeId(to), directed, ...(weighted ? { weight } : {}) }),
    );
    adj[from].push(link);
    if (!directed) adj[to].push(Object.freeze({ from: to, to: from, weight, id }));
  }
  for (const list of adj) list.sort((x, y) => x.to - y.to);
  return {
    size,
    directed,
    source: Math.min(Math.max(input.source, 0), size - 1),
    nodes,
    edges: Object.freeze(edges),
    links: Object.freeze(links),
    adj: Object.freeze(adj.map((list) => Object.freeze(list))),
  };
}

/** "A-B" for undirected edges, "A → B" for directed ones. */
export const linkName = (link: Pick<Link, "from" | "to">, directed: boolean) =>
  `${nodeLabel(link.from)}${directed ? " → " : "-"}${nodeLabel(link.to)}`;
