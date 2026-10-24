import { describe, expect, it } from "vitest";
import { resolveInput, type GraphInputSpec, type GridInputSpec, type ResolvedInput } from "../core/input";
import { mulberry32, randInt, shuffle } from "../core/prng";
import { collect } from "../core/step";
import { cellId, edgeId, nodeId, type GraphState, type GridState } from "../core/states";
import type { AlgorithmMeta, HighlightKind, Step } from "../core/types";
import { LIMITS } from "../core/validate";
import * as aStar from "../graphs/a-star";
import * as bfsGraph from "../graphs/bfs-graph";
import * as bfsGrid from "../graphs/bfs-grid";
import * as dfsGraph from "../graphs/dfs-graph";
import * as dfsGrid from "../graphs/dfs-grid";
import * as dijkstraGraph from "../graphs/dijkstra-graph";
import * as dijkstraGrid from "../graphs/dijkstra-grid";
import * as kruskal from "../graphs/kruskal";
import * as prim from "../graphs/prim";
import { nodeLabel } from "../graphs/shared";
import * as topologicalSort from "../graphs/topological-sort";

type Module<K extends "grid" | "graph", S> = {
  source: string;
  pseudocode: string;
  meta: AlgorithmMeta & { defaultInput: Extract<GridInputSpec | GraphInputSpec, { kind: K }> };
  run: (input: ResolvedInput<K>) => Generator<Step<S>>;
};
type GridModule = Module<"grid", GridState>;
type GraphModule = Module<"graph", GraphState>;

const gridModules: GridModule[] = [bfsGrid, dfsGrid, dijkstraGrid, aStar];
const graphModules: GraphModule[] = [bfsGraph, dfsGraph, dijkstraGraph, topologicalSort, prim, kruskal];

const runGrid = (m: GridModule, spec: GridInputSpec) => collect(m.run(resolveInput(spec)));
const runGraph = (m: GraphModule, spec: GraphInputSpec) => collect(m.run(resolveInput(spec)));
const lineCount = (text: string) => text.split("\n").length;
const ids = (step: Step<unknown>, kind: HighlightKind) => step.highlights.filter((h) => h.kind === kind).flatMap((h) => h.ids);

// ---------- Invariants on every default input ----------

type Case = {
  meta: AlgorithmMeta & { defaultInput: GridInputSpec | GraphInputSpec };
  source: string;
  pseudocode: string;
  trace: () => Step<GridState | GraphState>[];
};
const allModules: [string, Case][] = [
  ...gridModules.map((m): [string, Case] => [m.meta.slug, { ...m, trace: () => runGrid(m, m.meta.defaultInput) }]),
  ...graphModules.map((m): [string, Case] => [m.meta.slug, { ...m, trace: () => runGraph(m, m.meta.defaultInput) }]),
];

describe.each(allModules)("%s invariants", (slug, m) => {
  const steps = m.trace();
  const max = lineCount(m.source);

  it("is a graphs module with a matching slug and renderer", () => {
    expect(m.meta.slug).toBe(slug);
    expect(m.meta.category).toBe("graphs");
    expect(m.meta.renderer).toBe(m.meta.defaultInput.kind === "grid" ? "grid-graph" : "node-graph");
    expect(m.meta.source).toBe(m.source);
    expect(m.meta.pseudocode).toBe(m.pseudocode);
  });

  it("default input respects LIMITS", () => {
    const spec = m.meta.defaultInput;
    if (spec.kind === "grid") {
      expect(spec.rows).toBeGreaterThanOrEqual(LIMITS.gridRows[0]);
      expect(spec.rows).toBeLessThanOrEqual(LIMITS.gridRows[1]);
      expect(spec.cols).toBeGreaterThanOrEqual(LIMITS.gridCols[0]);
      expect(spec.cols).toBeLessThanOrEqual(LIMITS.gridCols[1]);
    } else {
      expect(spec.nodes).toBeGreaterThanOrEqual(LIMITS.graphNodes[0]);
      expect(spec.nodes).toBeLessThanOrEqual(LIMITS.graphNodes[1]);
    }
  });

  it("yields between 1 and 2000 steps", () => {
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThan(2000);
  });

  it("every line is within the display source", () => {
    for (const [i, step] of steps.entries()) {
      const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
      expect(from, `step ${i} line`).toBeGreaterThanOrEqual(1);
      expect(to, `step ${i} line`).toBeLessThanOrEqual(max);
      expect(from, `step ${i} range`).toBeLessThanOrEqual(to);
    }
  });

  it("pseudocode is line-aligned with the source", () => {
    expect(lineCount(m.pseudocode)).toBe(max);
  });

  it("every step has a note", () => {
    for (const step of steps) expect(step.note.trim().length).toBeGreaterThan(0);
  });

  it("highlights only reference real cells, nodes and edges", () => {
    const state = steps[0].state as GridState | GraphState;
    const valid =
      "rows" in state
        ? new Set(Array.from({ length: state.rows * state.cols }, (_, i) => cellId(i)))
        : new Set([...state.nodes.map((n) => n.id), ...state.edges.map((e) => e.id)]);
    for (const step of steps) for (const h of step.highlights) for (const id of h.ids) expect(valid.has(id), id).toBe(true);
  });

  it("shares frozen layout between steps but never the step state itself", () => {
    if (steps.length < 2) return;
    const [a, b] = steps as Step<GridState | GraphState>[];
    expect(a.state).not.toBe(b.state);
    if ("walls" in a.state && "walls" in b.state) expect(a.state.walls).toBe(b.state.walls);
    if ("nodes" in a.state && "nodes" in b.state) {
      expect(a.state.nodes).toBe(b.state.nodes);
      expect(a.state.edges).toBe(b.state.edges);
    }
  });
});

// ---------- Grid references ----------

type GridRef = { rows: number; cols: number; wall: boolean[]; cost: number[]; start: number; end: number };

function gridRef(spec: GridInputSpec, weighted: boolean): GridRef {
  const at = (r: number, c: number) => r * spec.cols + c;
  const wall = new Array<boolean>(spec.rows * spec.cols).fill(false);
  for (const [r, c] of spec.walls) wall[at(r, c)] = true;
  const cost = new Array<number>(spec.rows * spec.cols).fill(1);
  if (weighted) for (const [r, c, w] of spec.weights ?? []) cost[at(r, c)] = w;
  const start = at(...spec.start);
  const end = at(...spec.end);
  wall[start] = wall[end] = false;
  return { rows: spec.rows, cols: spec.cols, wall, cost, start, end };
}

function openNeighbours(g: GridRef, i: number): number[] {
  const r = Math.floor(i / g.cols);
  const c = i % g.cols;
  const out: number[] = [];
  if (r > 0) out.push(i - g.cols);
  if (r < g.rows - 1) out.push(i + g.cols);
  if (c > 0) out.push(i - 1);
  if (c < g.cols - 1) out.push(i + 1);
  return out.filter((j) => !g.wall[j]);
}

/** Cells on a shortest path (incl. both ends), or 0 when unreachable. */
function refBfsLength(g: GridRef): number {
  const depth = new Map([[g.start, 1]]);
  const queue = [g.start];
  for (let k = 0; k < queue.length; k++) {
    const cell = queue[k];
    if (cell === g.end) return depth.get(cell)!;
    for (const next of openNeighbours(g, cell)) {
      if (depth.has(next)) continue;
      depth.set(next, depth.get(cell)! + 1);
      queue.push(next);
    }
  }
  return 0;
}

/** Cheapest cost to the end (entering a cell costs its weight), or null when unreachable. Plain O(V²) scan. */
function refDijkstraCost(g: GridRef): number | null {
  const dist = new Array<number>(g.wall.length).fill(Infinity);
  const done = new Array<boolean>(g.wall.length).fill(false);
  dist[g.start] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < Infinity && (u === -1 || dist[i] < dist[u])) u = i;
    if (u === -1) return null;
    if (u === g.end) return dist[u];
    done[u] = true;
    for (const v of openNeighbours(g, u)) dist[v] = Math.min(dist[v], dist[u] + g.cost[v]);
  }
}

function randomGrid(seed: number, weighted: boolean): GridInputSpec {
  const rng = mulberry32(seed);
  const rows = randInt(rng, 5, 18);
  const cols = randInt(rng, 5, 28);
  const density = 0.1 + rng() * 0.3;
  const start: [number, number] = [randInt(rng, 0, rows - 1), randInt(rng, 0, cols - 1)];
  const end: [number, number] = [randInt(rng, 0, rows - 1), randInt(rng, 0, cols - 1)];
  const walls: [number, number][] = [];
  const weights: [number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isEnd = (r === start[0] && c === start[1]) || (r === end[0] && c === end[1]);
      if (!isEnd && rng() < density) walls.push([r, c]);
      else if (weighted && rng() < 0.3) weights.push([r, c, randInt(rng, 2, 9)]);
    }
  }
  return { kind: "grid", rows, cols, walls, start, end, ...(weighted ? { weights } : {}) };
}

/** Checks the final path is a contiguous, wall-free start→end walk and returns its cells. */
function checkPath(steps: Step<GridState>[], g: GridRef): number[] {
  const last = steps.at(-1)!;
  const path = ids(last, "path").map((id) => Number(id.slice(1)));
  expect(path.length).toBe(last.vars.pathLength);
  expect(path[0]).toBe(g.start);
  expect(path.at(-1)).toBe(g.end);
  expect(new Set(path).size).toBe(path.length);
  for (let k = 0; k < path.length; k++) {
    expect(g.wall[path[k]], `path cell ${path[k]} is a wall`).toBe(false);
    if (k > 0) expect(openNeighbours(g, path[k - 1])).toContain(path[k]);
  }
  expect(ids(last, "found")).toEqual([cellId(g.end)]);
  return path;
}

function expectNotFound(steps: Step<GridState>[], end: number) {
  const last = steps.at(-1)!;
  expect(last.vars.pathLength).toBe(0);
  expect(ids(last, "notfound")).toContain(cellId(end));
  expect(ids(last, "path")).toEqual([]);
}

const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

describe("bfs-grid", () => {
  it("default maze matches the reference shortest path", () => {
    const spec = bfsGrid.meta.defaultInput;
    const g = gridRef(spec, false);
    const steps = runGrid(bfsGrid, spec);
    expect(steps.at(-1)!.vars.pathLength).toBe(refBfsLength(g));
    checkPath(steps, g);
  });

  it.each(seeds)("seed %i: path length equals a reference BFS", (seed) => {
    const spec = randomGrid(seed, false);
    const g = gridRef(spec, false);
    const steps = runGrid(bfsGrid, spec);
    const expected = refBfsLength(g);
    expect(steps.at(-1)!.vars.pathLength).toBe(expected);
    if (expected === 0) expectNotFound(steps, g.end);
    else checkPath(steps, g);
  });

  it("start equal to end is a one-cell path", () => {
    const spec: GridInputSpec = { kind: "grid", rows: 5, cols: 5, walls: [], start: [2, 2], end: [2, 2] };
    expect(runGrid(bfsGrid, spec).at(-1)!.vars.pathLength).toBe(1);
  });

  it("stays fast and bounded on the largest grid", () => {
    const spec: GridInputSpec = { kind: "grid", rows: 30, cols: 50, walls: [], start: [0, 0], end: [29, 49] };
    const steps = runGrid(bfsGrid, spec);
    expect(steps.at(-1)!.vars.pathLength).toBe(30 + 50 - 1);
    expect(steps.length).toBeLessThan(30 * 50 + 100);
  });
});

describe("dfs-grid", () => {
  it.each(seeds)("seed %i: finds a valid path exactly when one exists", (seed) => {
    const spec = randomGrid(seed, false);
    const g = gridRef(spec, false);
    const steps = runGrid(dfsGrid, spec);
    if (refBfsLength(g) === 0) expectNotFound(steps, g.end);
    else expect(checkPath(steps, g).length).toBeGreaterThanOrEqual(refBfsLength(g));
  });

  it("backtracks out of a dead end on the default maze", () => {
    const last = runGrid(dfsGrid, dfsGrid.meta.defaultInput).at(-1)!;
    expect(last.vars.visited as number).toBeGreaterThan(last.vars.pathLength as number);
  });
});

describe.each([dijkstraGrid, aStar] as GridModule[])("$meta.slug", (m) => {
  it("default input cost equals a reference Dijkstra", () => {
    const spec = m.meta.defaultInput;
    const g = gridRef(spec, true);
    const steps = runGrid(m, spec);
    expect(steps.at(-1)!.vars.cost).toBe(refDijkstraCost(g));
    checkPath(steps, g);
  });

  it.each(seeds)("seed %i: cost equals a reference Dijkstra and the path really costs that", (seed) => {
    const spec = randomGrid(seed, true);
    const g = gridRef(spec, true);
    const steps = runGrid(m, spec);
    const expected = refDijkstraCost(g);
    if (expected === null) {
      expectNotFound(steps, g.end);
      return;
    }
    const last = steps.at(-1)!;
    expect(last.vars.cost).toBe(expected);
    const path = checkPath(steps, g);
    expect(path.slice(1).reduce((sum, cell) => sum + g.cost[cell], 0)).toBe(expected);
    expect(last.state.dist?.[g.end]).toBe(expected);
  });
});

it("dijkstra-grid's default mud makes the cheapest path detour", () => {
  const spec = dijkstraGrid.meta.defaultInput;
  const weighted = runGrid(dijkstraGrid, spec).at(-1)!;
  expect(weighted.vars.pathLength as number).toBeGreaterThan(refBfsLength(gridRef(spec, false)));
  const g = gridRef(spec, true);
  expect(ids(weighted, "path").some((id) => g.cost[Number(id.slice(1))] > 1)).toBe(false);
});

it("a-star expands fewer cells than BFS on the shared maze", () => {
  const astar = runGrid(aStar, aStar.meta.defaultInput).at(-1)!;
  const bfs = runGrid(bfsGrid, bfsGrid.meta.defaultInput).at(-1)!;
  expect(astar.vars.visited as number).toBeLessThan(bfs.vars.visited as number);
  expect(astar.vars.pathLength).toBe(bfs.vars.pathLength);
});

describe.each(gridModules)("$meta.slug with an unreachable end", (m) => {
  it("ends with notfound and pathLength 0", () => {
    // The end at (4, 8) is boxed in by walls on all four sides.
    const spec: GridInputSpec = {
      kind: "grid",
      rows: 6,
      cols: 10,
      walls: [
        [3, 8],
        [5, 8],
        [4, 7],
        [4, 9],
      ],
      start: [0, 0],
      end: [4, 8],
    };
    expectNotFound(runGrid(m, spec), 4 * 10 + 8);
  });

  it("keeps walls painted over the start and end open", () => {
    const spec: GridInputSpec = { kind: "grid", rows: 5, cols: 5, walls: [[0, 0], [4, 4]], start: [0, 0], end: [4, 4] };
    const length = runGrid(m, spec).at(-1)!.vars.pathLength;
    // DFS finds a path, just not necessarily a shortest one.
    if (m === dfsGrid) expect(length).toBeGreaterThanOrEqual(9);
    else expect(length).toBe(9);
  });
});

// ---------- Node-graph references ----------

function adjacency(n: number, edges: GraphInputSpec["edges"], directed: boolean) {
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const [a, b, w = 1] of edges) {
    adj[a].push({ to: b, w });
    if (!directed) adj[b].push({ to: a, w });
  }
  return adj;
}

function reachable(spec: GraphInputSpec): Set<number> {
  const adj = adjacency(spec.nodes, spec.edges, spec.directed);
  const seen = new Set([spec.source]);
  const stack = [spec.source];
  while (stack.length > 0) {
    for (const { to } of adj[stack.pop()!]) {
      if (seen.has(to)) continue;
      seen.add(to);
      stack.push(to);
    }
  }
  return seen;
}

/** Bellman–Ford: an independent check on Dijkstra's distances. */
function refDistances(spec: GraphInputSpec): number[] {
  const dist = new Array<number>(spec.nodes).fill(Infinity);
  dist[spec.source] = 0;
  const arcs = spec.edges.flatMap(([a, b, w = 1]) => (spec.directed ? [[a, b, w]] : [[a, b, w], [b, a, w]]));
  for (let k = 0; k < spec.nodes; k++) for (const [a, b, w] of arcs) if (dist[a] + w < dist[b]) dist[b] = dist[a] + w;
  return dist;
}

/** Kruskal with a naive "already connected?" search instead of union-find. */
function refMstWeight(spec: GraphInputSpec): number {
  const chosen: [number, number, number?][] = [];
  let total = 0;
  for (const [a, b, w = 1] of [...spec.edges].sort((x, y) => (x[2] ?? 1) - (y[2] ?? 1))) {
    const connected = reachable({ ...spec, edges: chosen, directed: false, source: a }).has(b);
    if (connected) continue;
    chosen.push([a, b, w]);
    total += w;
  }
  return total;
}

function randomGraph(seed: number, { directed, connected }: { directed: boolean; connected: boolean }): GraphInputSpec {
  const rng = mulberry32(seed);
  const n = randInt(rng, 2, 14);
  const keys = new Set<string>();
  const edges: [number, number, number][] = [];
  const add = (a: number, b: number) => {
    const key = directed ? `${a}-${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || keys.has(key)) return;
    keys.add(key);
    edges.push([a, b, randInt(rng, 1, 9)]);
  };
  if (connected) for (let v = 1; v < n; v++) add(randInt(rng, 0, v - 1), v);
  const extra = randInt(rng, 0, n * 2);
  for (let k = 0; k < extra; k++) add(randInt(rng, 0, n - 1), randInt(rng, 0, n - 1));
  return { kind: "graph", nodes: n, edges, directed, source: randInt(rng, 0, n - 1), target: randInt(rng, 0, n - 1) };
}

const labelsToIndices = (items: string[]) => items.map((label) => label.charCodeAt(0) - 65);

describe.each([bfsGraph, dfsGraph] as GraphModule[])("$meta.slug", (m) => {
  const cases = seeds.map((seed) => randomGraph(seed, { directed: seed % 3 === 0, connected: seed % 2 === 0 }));

  it.each(cases.map((spec, i) => [i + 1, spec] as const))("graph %i: visits every reachable node exactly once", (_i, spec) => {
    const last = runGraph(m, spec).at(-1)!;
    const order = labelsToIndices(last.state.output!.items);
    expect(new Set(order).size).toBe(order.length);
    expect(new Set(order)).toEqual(reachable(spec));
    expect(order[0]).toBe(spec.source);
    expect(last.vars.visited).toBe(order.length);
  });

  it("default graph is connected and fully visited", () => {
    const spec = m.meta.defaultInput;
    expect(runGraph(m, spec).at(-1)!.vars.visited).toBe(spec.nodes);
  });
});

it("bfs-graph visits nodes in non-decreasing hop distance", () => {
  for (const seed of seeds) {
    const spec = randomGraph(seed, { directed: false, connected: true });
    const hops = refDistances({ ...spec, edges: spec.edges.map(([a, b]) => [a, b, 1]) });
    const order = labelsToIndices(runGraph(bfsGraph, spec).at(-1)!.state.output!.items);
    for (let k = 1; k < order.length; k++) expect(hops[order[k]]).toBeGreaterThanOrEqual(hops[order[k - 1]]);
  }
});

describe("topological-sort", () => {
  const dags = seeds.map((seed): GraphInputSpec => {
    const rng = mulberry32(seed * 7919);
    const n = randInt(rng, 2, 14);
    const rank = shuffle(rng, Array.from({ length: n }, (_, i) => i));
    const edges: [number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (rank[a] < rank[b] && rng() < 0.3) edges.push([a, b]);
    return { kind: "graph", nodes: n, edges, directed: true, source: 0 };
  });

  it.each([topologicalSort.meta.defaultInput, ...dags].map((spec, i) => [i, spec] as const))("DAG %i: order respects every edge", (_i, spec) => {
    const last = runGraph(topologicalSort, spec).at(-1)!;
    const order = labelsToIndices(last.state.output!.items);
    expect(order).toHaveLength(spec.nodes);
    const pos = new Map(order.map((v, k) => [v, k]));
    for (const [a, b] of spec.edges) expect(pos.get(a)!).toBeLessThan(pos.get(b)!);
    expect(last.vars.order).toBe(order.map(nodeLabel).join(" "));
    expect(ids(last, "notfound")).toEqual([]);
  });

  it("reports a cycle instead of an order", () => {
    const spec: GraphInputSpec = { kind: "graph", nodes: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 1]], directed: true, source: 0 };
    const last = runGraph(topologicalSort, spec).at(-1)!;
    expect(last.vars.cycle).toBe(true);
    expect(last.state.output!.items).toEqual(["A"]);
    expect(new Set(ids(last, "notfound"))).toEqual(new Set([1, 2, 3].map(nodeId)));
  });
});

describe.each([prim, kruskal] as GraphModule[])("$meta.slug", (m) => {
  const cases = [m.meta.defaultInput, ...seeds.map((seed) => randomGraph(seed * 31, { directed: false, connected: true }))];

  it.each(cases.map((spec, i) => [i, spec] as const))("graph %i: total weight equals a reference MST with n − 1 edges", (_i, spec) => {
    const last = runGraph(m, spec).at(-1)!;
    expect(last.vars.totalWeight).toBe(refMstWeight(spec));
    expect(last.vars.edges).toBe(spec.nodes - 1);
    expect(last.state.output!.items).toHaveLength(spec.nodes - 1);
    // The highlighted tree edges really connect every node.
    const tree = spec.edges.filter(([a, b]) => ids(last, "path").includes(edgeId(a, b, false)));
    expect(tree).toHaveLength(spec.nodes - 1);
    expect(reachable({ ...spec, edges: tree, source: 0 }).size).toBe(spec.nodes);
  });
});

it("kruskal shows a union-find table that changes on every union and rejects cycle edges", () => {
  const steps = runGraph(kruskal, kruskal.meta.defaultInput);
  for (const step of steps) {
    expect(step.state.table?.title).toBe("Union-find");
    expect(step.state.table?.rows).toHaveLength(kruskal.meta.defaultInput.nodes);
  }
  const unions = steps.flatMap((s, i) => (JSON.stringify(s.line) === "[10,11]" ? [i] : []));
  expect(unions).toHaveLength(kruskal.meta.defaultInput.nodes - 1);
  for (const i of unions) expect(steps[i].state.table!.rows).not.toEqual(steps[i - 1].state.table!.rows);
  const last = steps.at(-1)!;
  expect(new Set(last.state.table!.rows.map((row) => row[2])).size).toBe(1);
  expect(ids(last, "delete").length).toBeGreaterThan(0);
});

describe("dijkstra-graph", () => {
  const cases = [
    dijkstraGraph.meta.defaultInput,
    ...seeds.map((seed) => randomGraph(seed * 101, { directed: seed % 2 === 1, connected: seed % 3 !== 0 })),
  ];

  it.each(cases.map((spec, i) => [i, spec] as const))("graph %i: distances match Bellman–Ford", (_i, spec) => {
    const last = runGraph(dijkstraGraph, spec).at(-1)!;
    const expected = refDistances(spec).map((d) => (d === Infinity ? "∞" : String(d)));
    expect(Array.from({ length: spec.nodes }, (_, v) => last.state.nodeNotes?.[nodeId(v)])).toEqual(expected);
    expect(String(last.vars.distance)).toBe(expected[spec.target!]);
    if (expected[spec.target!] === "∞") expect(ids(last, "notfound")).toEqual([nodeId(spec.target!)]);
    else expect(ids(last, "found")).toEqual([nodeId(spec.target!)]);
  });

  it("default target is reached by a non-greedy path", () => {
    const last = runGraph(dijkstraGraph, dijkstraGraph.meta.defaultInput).at(-1)!;
    expect(last.vars.distance).toBe(15);
    // A → C → B beats the direct A–B edge.
    expect(ids(last, "path")).toContain(edgeId(1, 2, false));
    expect(ids(last, "path")).not.toContain(edgeId(0, 1, false));
  });
});

// ---------- Inputs an editor can produce ----------

function expectWellFormed(steps: Step<unknown>[], source: string) {
  const max = lineCount(source);
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) {
    const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
    expect(from).toBeGreaterThanOrEqual(1);
    expect(to).toBeLessThanOrEqual(max);
    expect(step.note.trim().length).toBeGreaterThan(0);
  }
}

describe("edge-case inputs stay well-formed", () => {
  const graphs: GraphInputSpec[] = [
    { kind: "graph", nodes: 2, edges: [], directed: false, source: 0, target: 1 },
    // A duplicate edge (the first copy wins) and a missing weight (treated as 1).
    { kind: "graph", nodes: 3, edges: [[0, 1, 3], [1, 0, 5], [1, 2]], directed: false, source: 2, target: 0 },
    { kind: "graph", nodes: 4, edges: [[0, 1, 2], [1, 2, 2], [2, 0, 2], [2, 3, 1]], directed: true, source: 0, target: 3 },
    { kind: "graph", nodes: 14, edges: Array.from({ length: 13 }, (_, i): [number, number, number] => [i, i + 1, (i % 9) + 1]), directed: false, source: 13 },
  ];
  const grids: GridInputSpec[] = [
    { kind: "grid", rows: 5, cols: 5, walls: [], start: [2, 2], end: [2, 2] },
    { kind: "grid", rows: 5, cols: 5, walls: [[0, 1], [1, 0]], start: [0, 0], end: [4, 4] },
    { kind: "grid", rows: 5, cols: 6, walls: [], start: [4, 5], end: [0, 0], weights: [[2, 2, 99]] },
  ];

  it.each(graphModules.map((m) => [m.meta.slug, m] as const))("%s", (_slug, m) => {
    for (const spec of graphs) expectWellFormed(runGraph(m, spec), m.source);
  });

  it.each(gridModules.map((m) => [m.meta.slug, m] as const))("%s", (_slug, m) => {
    const [same, walledIn, weighted] = grids.map((spec) => runGrid(m, spec));
    for (const steps of [same, walledIn, weighted]) expectWellFormed(steps, m.source);
    expect(same.at(-1)!.vars.pathLength).toBe(1);
    expectNotFound(walledIn, 24);
    expect(weighted.at(-1)!.vars.pathLength).toBeGreaterThan(0);
  });
});
