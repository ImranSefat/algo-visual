import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel, spanningInput, type Link } from "./shared";

export const source = `function kruskal(graph: Graph) {
  const parent = graph.nodes.map((v) => v); // every node starts as its own set
  const find = (v: number): number => (parent[v] === v ? v : (parent[v] = find(parent[v])));
  const edges = [...graph.edges].sort((a, b) => a.weight - b.weight);
  const mst: Edge[] = [];
  for (const edge of edges) {
    const a = find(edge.from);
    const b = find(edge.to);
    if (a === b) continue; // same set already: this edge would close a cycle
    parent[b] = a; // union: hang b's tree under a's root
    mst.push(edge);
    if (mst.length === graph.size - 1) break;
  }
  return mst;
}`;

export const pseudocode = `procedure Kruskal(G)
  parent[v] ← v for every node v    ▷ n singleton sets
  find(v): follow parent to the root, pointing visited nodes straight at it
  sort the edges by weight, lightest first
  mst ← []
  for each edge (u, v) in sorted order do
    a ← find(u)
    b ← find(v)
    if a = b then skip it    ▷ u and v are already connected
    parent[b] ← a    ▷ union the two sets
    add (u, v) to mst
    if mst has n − 1 edges then stop
  end for
  return mst
end procedure`;

export const meta = {
  slug: "kruskal",
  name: "Kruskal's MST",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Kruskal's algorithm considers edges from lightest to heaviest and keeps each one that joins two different components, skipping any edge that would close a cycle. A union-find structure answers \"are these already connected?\" in near-constant time, so sorting the edges dominates the cost.",
  complexity: {
    time: { best: "O(E log E)", average: "O(E log E)", worst: "O(E log E)" },
    space: "O(V + E)",
  },
  source,
  pseudocode,
  defaultInput: spanningInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"graph">): Generator<Step<GraphState>> {
  const t = createTracer<GraphState>(["edgesConsidered", "unions"]);
  // A spanning tree ignores direction, so edges are always treated as undirected.
  const g = buildGraph(input, { directed: false, weighted: true });
  const parent = g.nodes.map((_, v) => v);
  const find = (v: number): number => (parent[v] === v ? v : (parent[v] = find(parent[v])));
  // Read-only root lookup for the table, so drawing it never compresses paths.
  const rootOf = (v: number): number => (parent[v] === v ? v : rootOf(parent[v]));
  const edges = [...g.links].sort((a, b) => a.weight - b.weight);
  const mst: Link[] = [];
  const rejected: string[] = [];

  const edgeName = (link: Link) => `${linkName(link, false)} (${link.weight})`;
  const total = () => mst.reduce((sum, link) => sum + link.weight, 0);
  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    table: {
      title: "Union-find",
      columns: ["Node", "Parent", "Root"],
      rows: parent.map((p, v) => [nodeLabel(v), nodeLabel(p), nodeLabel(rootOf(v))]),
    },
    output: { title: "MST edges", items: mst.map(edgeName) },
  });
  const inTree = () => [...new Set(mst.flatMap((link) => [link.from, link.to]))].map(nodeId);
  const frame = (...extra: Highlight[]): Highlight[] => [
    hl("visited", ...inTree()),
    hl("path", ...mst.map((link) => link.id)),
    hl("delete", ...rejected),
    ...extra,
  ];

  yield t.step(state(), frame(), [2, 3], { sets: g.size }, `Each of the ${g.size} nodes starts in its own set: it is its own parent`);
  yield t.step(
    state(),
    frame(),
    [4, 5],
    { edges: edges.length },
    edges.length > 0
      ? `Sort the ${edges.length} edges by weight: ${edges.map((e) => e.weight).join(", ")}`
      : "There are no edges to sort",
  );

  for (const link of edges) {
    t.count("edgesConsidered");
    const a = find(link.from);
    const b = find(link.to);
    const ends = hl("current", nodeId(link.from), nodeId(link.to));
    const vars = { edge: edgeName(link), "find(u)": nodeLabel(a), "find(v)": nodeLabel(b), totalWeight: total() };
    yield t.step(
      state(),
      frame(ends, hl("compare", link.id)),
      [7, 8],
      vars,
      `${edgeName(link)}: ${nodeLabel(link.from)}'s root is ${nodeLabel(a)} and ${nodeLabel(link.to)}'s root is ${nodeLabel(b)}`,
    );
    if (a === b) {
      rejected.push(link.id);
      yield t.step(
        state(),
        frame(ends),
        9,
        vars,
        `Same root ${nodeLabel(a)}: ${nodeLabel(link.from)} and ${nodeLabel(link.to)} are already connected, so ${linkName(link, false)} would close a cycle`,
      );
      continue;
    }
    parent[b] = a;
    mst.push(link);
    t.count("unions");
    yield t.step(
      state(),
      frame(ends),
      [10, 11],
      { ...vars, totalWeight: total() },
      `Different sets: point ${nodeLabel(b)} at ${nodeLabel(a)} to merge them, and keep ${edgeName(link)}`,
    );
    if (mst.length === g.size - 1) {
      yield t.step(
        state(),
        frame(),
        12,
        { totalWeight: total(), edges: mst.length },
        `The tree has ${mst.length} edges, one fewer than the ${g.size} nodes, so every node is connected`,
      );
      break;
    }
  }

  const spanning = mst.length === g.size - 1;
  yield t.step(
    state(),
    frame(),
    14,
    { totalWeight: total(), edges: mst.length },
    spanning
      ? `Minimum spanning tree complete: ${mst.length} edges with total weight ${total()}`
      : `The graph is disconnected: this spanning forest has ${mst.length} edges with total weight ${total()}`,
  );
}
