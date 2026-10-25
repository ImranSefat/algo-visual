import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { edgeId, nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel } from "./shared";

export const source = `function dijkstra(graph: Graph, source: number) {
  const dist = new Array(graph.size).fill(Infinity);
  const prev = new Array<number | null>(graph.size).fill(null);
  const done = new Set<number>();
  dist[source] = 0;
  while (done.size < graph.size) {
    // Settle the unfinished node with the smallest distance.
    const u = argMin(dist, (v) => !done.has(v));
    if (dist[u] === Infinity) break; // the rest is unreachable
    done.add(u);
    for (const { to, weight } of graph.edgesFrom(u)) {
      if (done.has(to)) continue;
      if (dist[u] + weight < dist[to]) {
        dist[to] = dist[u] + weight;
        prev[to] = u;
      }
    }
  }
  return { dist, prev };
}

function pathTo(prev: (number | null)[], target: number) {
  const path = [target];
  while (prev[path[0]] !== null) path.unshift(prev[path[0]]!);
  return path;
}`;

export const pseudocode = `procedure Dijkstra(G, source)
  dist[v] ← ∞ for every node v
  prev[v] ← none for every node v
  done ← ∅
  dist[source] ← 0
  while some node is not done do
    ▷ the closest unfinished node's distance can no longer improve
    u ← the node ∉ done with the smallest dist
    if dist[u] = ∞ then stop    ▷ the rest is unreachable
    add u to done
    for each edge (u, to, weight) do
      if to ∈ done then skip it
      if dist[u] + weight < dist[to] then    ▷ relax the edge
        dist[to] ← dist[u] + weight
        prev[to] ← u
      end if
    end for
  end while
  return dist, prev
end procedure

procedure pathTo(prev, target)
  path ← [target]
  while prev[first of path] ≠ none do prepend it to path
  return path
end procedure`;

export const meta = {
  slug: "dijkstra-graph",
  name: "Dijkstra (Graph)",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Dijkstra's algorithm grows a set of settled nodes outward from the source, always settling the unfinished node with the smallest tentative distance and then relaxing its edges. With non-negative weights a settled distance can never improve, so when it finishes every reachable node has its shortest distance. This version scans for the minimum, the classic O(V²) form that suits small dense graphs.",
  complexity: {
    time: { best: "O(V²)", average: "O(V²)", worst: "O(V²)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "graph",
    nodes: 8,
    edges: [
      [0, 1, 4],
      [0, 2, 1],
      [1, 2, 2],
      [1, 3, 5],
      [2, 4, 8],
      [3, 4, 2],
      [3, 5, 6],
      [4, 6, 3],
      [4, 7, 7],
      [5, 7, 1],
      [6, 7, 9],
    ],
    directed: false,
    source: 0,
    target: 7,
  },
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"graph">): Generator<Step<GraphState>> {
  const t = createTracer<GraphState>(["visited", "relaxations"]);
  const g = buildGraph(input, { directed: input.directed, weighted: true });
  const { source, directed } = g;
  const target = input.target !== undefined && input.target >= 0 && input.target < g.size ? input.target : null;
  const dist = new Array<number>(g.size).fill(Infinity);
  const prev = new Array<number | null>(g.size).fill(null);
  const done = new Set<number>();
  // Settled nodes, in settle order, so the tree edges come out in the order they were fixed.
  const settled: number[] = [];
  dist[source] = 0;

  const fmt = (d: number) => (d === Infinity ? "∞" : String(d));
  const prevEdge = (v: number) => edgeId(prev[v]!, v, directed);
  const queued = () =>
    dist
      .map((d, v) => ({ d, v }))
      .filter(({ d, v }) => d < Infinity && !done.has(v))
      .sort((a, b) => a.d - b.d || a.v - b.v);
  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    nodeNotes: Object.fromEntries(dist.map((d, v) => [nodeId(v), fmt(d)])),
    table: {
      title: "Priority queue",
      columns: ["Node", "Dist", "Via"],
      rows: queued().map(({ d, v }) => [nodeLabel(v), d, prev[v] === null ? "-" : nodeLabel(prev[v])]),
    },
    output: { title: "Settled", items: settled.map(nodeLabel) },
  });
  const frame = (current: number | null, ...extra: Highlight[]): Highlight[] => [
    hl("visited", ...settled.filter((v) => v !== current).map(nodeId)),
    hl("frontier", ...queued().map(({ v }) => nodeId(v))),
    ...(current === null ? [] : [hl("current", nodeId(current))]),
    hl("path", ...settled.filter((v) => prev[v] !== null).map(prevEdge)),
    ...extra,
  ];

  yield t.step(state(), frame(null), [2, 5], { source: nodeLabel(source) }, `Every distance starts at ∞ except the source ${nodeLabel(source)}, which is 0`);

  while (done.size < g.size) {
    let u = -1;
    for (let v = 0; v < g.size; v++) if (!done.has(v) && (u === -1 || dist[v] < dist[u])) u = v;
    if (dist[u] === Infinity) {
      yield t.step(
        state(),
        frame(null),
        9,
        { settled: done.size },
        `Every unsettled node is still at ∞, so none of them can be reached from ${nodeLabel(source)}`,
      );
      break;
    }
    done.add(u);
    settled.push(u);
    t.count("visited");
    const via = prev[u];
    yield t.step(
      state(),
      frame(u),
      [8, 10],
      { u: nodeLabel(u), "dist[u]": dist[u] },
      via === null
        ? `Settle ${nodeLabel(u)} at distance ${dist[u]}`
        : `Settle ${nodeLabel(u)}: its distance ${dist[u]} (via ${nodeLabel(via)}) is the smallest left, so it is final`,
    );
    for (const link of g.adj[u]) {
      const { to, weight } = link;
      const name = linkName(link, directed);
      const vars = { u: nodeLabel(u), to: nodeLabel(to), "dist[u]": dist[u], weight, "dist[to]": fmt(dist[to]) };
      if (done.has(to)) {
        yield t.step(state(), frame(u, hl("compare", link.id)), [11, 12], vars, `${name}: ${nodeLabel(to)} is already settled, so skip it`);
        continue;
      }
      const alt = dist[u] + weight;
      if (alt < dist[to]) {
        const before = fmt(dist[to]);
        dist[to] = alt;
        prev[to] = u;
        t.count("relaxations");
        yield t.step(
          state(),
          frame(u, hl("compare", link.id)),
          [13, 15],
          { ...vars, "dist[to]": alt },
          `${name}: ${dist[u]} + ${weight} = ${alt} beats ${before}, so ${nodeLabel(to)}'s distance drops to ${alt}`,
        );
      } else {
        yield t.step(
          state(),
          frame(u, hl("compare", link.id)),
          13,
          vars,
          `${name}: ${dist[u]} + ${weight} = ${alt} is no better than ${nodeLabel(to)}'s ${dist[to]}`,
        );
      }
    }
  }

  const reached = settled.length;
  yield t.step(
    state(),
    frame(null),
    19,
    { settled: reached },
    `All ${reached} reachable node${reached === 1 ? " has its" : "s have their"} final shortest distance`,
  );
  if (target === null) return;

  const base: Highlight[] = [hl("visited", ...settled.map(nodeId))];
  if (dist[target] === Infinity) {
    yield t.step(
      state(),
      [...base, hl("notfound", nodeId(target))],
      [22, 25],
      { target: nodeLabel(target), distance: "∞" },
      `${nodeLabel(target)} is unreachable from ${nodeLabel(source)}, so there is no path`,
    );
    return;
  }
  const path = [target];
  while (prev[path[0]] !== null) path.unshift(prev[path[0]]!);
  yield t.step(
    state(),
    [
      ...base,
      hl("path", ...path.map(nodeId), ...path.slice(1).map(prevEdge)),
      hl("found", nodeId(target)),
    ],
    [22, 25],
    { target: nodeLabel(target), distance: dist[target] },
    `Shortest path ${path.map(nodeLabel).join(" → ")} has total weight ${dist[target]}`,
  );
}
