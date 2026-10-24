import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel, spanningInput, type Link } from "./shared";

export const source = `function prim(graph: Graph, source: number) {
  const key = new Array(graph.size).fill(Infinity);
  const parent = new Array<number | null>(graph.size).fill(null);
  const inTree = new Set<number>();
  const mst: [number, number][] = [];
  key[source] = 0;
  while (inTree.size < graph.size) {
    // The cheapest known edge into the tree picks the next node.
    const u = argMin(key, (v) => !inTree.has(v));
    if (key[u] === Infinity) break; // disconnected: the rest can't be reached
    inTree.add(u);
    if (parent[u] !== null) mst.push([parent[u], u]);
    for (const { to, weight } of graph.edgesFrom(u)) {
      if (inTree.has(to) || weight >= key[to]) continue;
      key[to] = weight;
      parent[to] = u;
    }
  }
  return mst;
}`;

export const pseudocode = `procedure Prim(G, source)
  key[v] ← ∞ for every node v    ▷ cheapest edge seen into v
  parent[v] ← none for every node v
  inTree ← ∅
  mst ← []
  key[source] ← 0
  while some node is not in the tree do
    ▷ grow the tree by its cheapest outgoing edge
    u ← the node ∉ inTree with the smallest key
    if key[u] = ∞ then stop    ▷ G is disconnected
    add u to inTree
    if parent[u] exists then add edge (parent[u], u) to mst
    for each edge (u, to, weight) do
      if to ∈ inTree or weight ≥ key[to] then skip it
      key[to] ← weight
      parent[to] ← u
    end for
  end while
  return mst
end procedure`;

export const meta = {
  slug: "prim",
  name: "Prim's MST",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Prim's algorithm grows a minimum spanning tree from a single node, each round adding the cheapest edge that connects the tree to a node outside it. Every node keeps the weight of its cheapest known link to the tree (its key), so picking the next edge means picking the smallest key. This version scans the keys, the O(V²) form that suits small dense graphs.",
  complexity: {
    time: { best: "O(V²)", average: "O(V²)", worst: "O(V²)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: spanningInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"graph">): Generator<Step<GraphState>> {
  const t = createTracer<GraphState>(["edgesConsidered", "keyUpdates"]);
  // A spanning tree ignores direction, so edges are always treated as undirected.
  const g = buildGraph(input, { directed: false, weighted: true });
  const key = new Array<number>(g.size).fill(Infinity);
  const parent = new Array<Link | null>(g.size).fill(null);
  const inTree = new Set<number>();
  const mst: Link[] = [];
  key[g.source] = 0;

  const fmt = (k: number) => (k === Infinity ? "∞" : String(k));
  const edgeName = (link: Link) => `${linkName(link, false)} (${link.weight})`;
  const total = () => mst.reduce((sum, link) => sum + link.weight, 0);
  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    nodeNotes: Object.fromEntries(key.map((k, v) => [nodeId(v), fmt(k)])),
    table: {
      title: "Keys",
      columns: ["Node", "Key", "Parent", "In tree"],
      rows: key.map((k, v) => [nodeLabel(v), fmt(k), parent[v] ? nodeLabel(parent[v].from) : "—", inTree.has(v) ? "✓" : ""]),
    },
    output: { title: "MST edges", items: mst.map(edgeName) },
  });
  const frame = (current: number | null, ...extra: Highlight[]): Highlight[] => [
    hl("visited", ...[...inTree].filter((v) => v !== current).map(nodeId)),
    hl("frontier", ...key.flatMap((k, v) => (k < Infinity && !inTree.has(v) ? [nodeId(v)] : []))),
    ...(current === null ? [] : [hl("current", nodeId(current))]),
    hl("path", ...mst.map((link) => link.id)),
    ...extra,
  ];

  yield t.step(state(), frame(null), [2, 6], {}, `Grow the tree from ${nodeLabel(g.source)}: its key is 0 and every other key is ∞`);

  while (inTree.size < g.size) {
    let u = -1;
    for (let v = 0; v < g.size; v++) if (!inTree.has(v) && (u === -1 || key[v] < key[u])) u = v;
    if (key[u] === Infinity) {
      yield t.step(
        state(),
        frame(null),
        10,
        { totalWeight: total(), edges: mst.length },
        `The remaining nodes have no edge to the tree — the graph is disconnected`,
      );
      break;
    }
    inTree.add(u);
    const via = parent[u];
    if (via) mst.push(via);
    yield t.step(
      state(),
      frame(u),
      [9, 12],
      { u: nodeLabel(u), key: key[u], totalWeight: total() },
      via
        ? `${nodeLabel(u)} has the smallest key, so add ${edgeName(via)} to the tree`
        : `Start the tree with ${nodeLabel(u)}`,
    );
    for (const link of g.adj[u]) {
      const { to, weight } = link;
      t.count("edgesConsidered");
      const vars = { u: nodeLabel(u), to: nodeLabel(to), weight, [`key[${nodeLabel(to)}]`]: fmt(key[to]) };
      if (inTree.has(to)) {
        yield t.step(state(), frame(u, hl("compare", link.id)), [13, 14], vars, `${edgeName(link)}: ${nodeLabel(to)} is already in the tree, so skip it`);
        continue;
      }
      if (weight >= key[to]) {
        yield t.step(
          state(),
          frame(u, hl("compare", link.id)),
          [13, 14],
          vars,
          `${edgeName(link)} is no cheaper than ${nodeLabel(to)}'s current key ${key[to]}`,
        );
        continue;
      }
      const before = fmt(key[to]);
      key[to] = weight;
      parent[to] = link;
      t.count("keyUpdates");
      yield t.step(
        state(),
        frame(u, hl("compare", link.id)),
        [15, 16],
        { ...vars, [`key[${nodeLabel(to)}]`]: weight },
        `${edgeName(link)} is ${nodeLabel(to)}'s cheapest link to the tree so far: key ${before} → ${weight}`,
      );
    }
  }

  const spanning = mst.length === g.size - 1;
  yield t.step(
    state(),
    frame(null),
    19,
    { totalWeight: total(), edges: mst.length },
    spanning
      ? `Minimum spanning tree complete: ${mst.length} edges with total weight ${total()}`
      : `Tree covers ${inTree.size} of ${g.size} nodes: ${mst.length} edges with total weight ${total()}`,
  );
}
