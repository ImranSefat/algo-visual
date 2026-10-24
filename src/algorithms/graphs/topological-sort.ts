import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel } from "./shared";

export const source = `function topologicalSort(graph: Graph) {
  const indegree = new Array(graph.size).fill(0);
  for (const { to } of graph.edges) indegree[to]++;
  const queue = graph.nodes.filter((v) => indegree[v] === 0);
  const order: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of graph.neighbours(node)) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  // Leftover nodes all wait on each other: they sit on a cycle.
  if (order.length < graph.size) throw new Error("graph has a cycle");
  return order;
}`;

export const pseudocode = `procedure TopologicalSort(G)    ▷ Kahn's algorithm
  indegree[v] ← 0 for every node v
  for each edge (u → v) do indegree[v] ← indegree[v] + 1
  queue ← every node with indegree 0
  order ← []
  while queue is not empty do
    node ← dequeue(queue)
    append node to order
    for each edge (node → next) do    ▷ remove the edge
      indegree[next] ← indegree[next] − 1
      if indegree[next] = 0 then enqueue(queue, next)
    end for
  end while
  ▷ leftover nodes wait on each other: a cycle
  if order is missing nodes then fail: G has a cycle
  return order
end procedure`;

export const meta = {
  slug: "topological-sort",
  name: "Topological Sort",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Kahn's algorithm orders a directed acyclic graph so every edge points forward: it repeatedly outputs a node with no remaining incoming edges and deletes that node's outgoing edges. Each in-degree that drops to zero releases a new node into the queue; if the queue empties early, the graph has a cycle.",
  complexity: {
    time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "graph",
    nodes: 8,
    edges: [
      [1, 4],
      [1, 0],
      [4, 2],
      [0, 2],
      [0, 6],
      [4, 3],
      [2, 5],
      [6, 5],
      [3, 7],
      [5, 7],
      [6, 7],
    ],
    directed: true,
    source: 0,
  },
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"graph">): Generator<Step<GraphState>> {
  const t = createTracer<GraphState>(["processed", "edgesRemoved"]);
  // Topological order only makes sense for directed edges, whatever the input flag says.
  const g = buildGraph(input, { directed: true, weighted: false });
  const indegree = new Array<number>(g.size).fill(0);
  const queue: number[] = [];
  let head = 0;
  const order: number[] = [];

  const status = (v: number) => {
    const at = order.indexOf(v);
    if (at >= 0) return `#${at + 1}`;
    return queue.indexOf(v, head) >= 0 ? "queued" : "waiting";
  };
  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    nodeNotes: Object.fromEntries(indegree.map((d, v) => [nodeId(v), String(d)])),
    table: {
      title: "In-degrees",
      columns: ["Node", "In-degree", "Status"],
      rows: indegree.map((d, v) => [nodeLabel(v), d, status(v)]),
    },
    output: { title: "Topological order", items: order.map(nodeLabel) },
  });
  const frame = (current: number | null, ...extra: Highlight[]): Highlight[] => [
    hl("visited", ...order.filter((v) => v !== current).map(nodeId)),
    hl("frontier", ...queue.slice(head).map(nodeId)),
    ...(current === null ? [] : [hl("current", nodeId(current))]),
    ...extra,
  ];
  const queueVar = () => queue.slice(head).map(nodeLabel).join(" ") || "empty";
  const orderVar = () => order.map(nodeLabel).join(" ");

  yield t.step(state(), frame(null), 2, {}, "Start every in-degree at 0, then count each node's incoming edges");
  for (const link of g.links) {
    indegree[link.to]++;
    yield t.step(
      state(),
      frame(null, hl("compare", link.id)),
      3,
      { edge: linkName(link, true), [`indegree[${nodeLabel(link.to)}]`]: indegree[link.to] },
      `${linkName(link, true)}: ${nodeLabel(link.to)} now has ${indegree[link.to]} incoming edge${indegree[link.to] === 1 ? "" : "s"}`,
    );
  }

  for (let v = 0; v < g.size; v++) if (indegree[v] === 0) queue.push(v);
  const sources = queue.map(nodeLabel);
  yield t.step(
    state(),
    frame(null),
    [4, 5],
    { queue: queueVar() },
    sources.length === 0
      ? "No node is free of incoming edges, so nothing can go first"
      : `${sources.join(", ")} ${sources.length === 1 ? "has" : "have"} no incoming edges and can go first`,
  );

  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    t.count("processed");
    yield t.step(
      state(),
      frame(node),
      [7, 8],
      { node: nodeLabel(node), queue: queueVar(), order: orderVar() },
      `Dequeue ${nodeLabel(node)}: nothing points into it any more, so it takes position ${order.length}`,
    );
    for (const link of g.adj[node]) {
      const next = link.to;
      indegree[next]--;
      t.count("edgesRemoved");
      const freed = indegree[next] === 0;
      if (freed) queue.push(next);
      yield t.step(
        state(),
        frame(node, hl("compare", link.id)),
        [10, 11],
        { node: nodeLabel(node), next: nodeLabel(next), [`indegree[${nodeLabel(next)}]`]: indegree[next], queue: queueVar() },
        freed
          ? `Remove ${linkName(link, true)}: ${nodeLabel(next)} has no incoming edges left, so it joins the queue`
          : `Remove ${linkName(link, true)}: ${nodeLabel(next)} still waits on ${indegree[next]} more edge${indegree[next] === 1 ? "" : "s"}`,
      );
    }
  }

  if (order.length < g.size) {
    const stuck = indegree.flatMap((_, v) => (order.includes(v) ? [] : [v]));
    yield t.step(
      state(),
      frame(null, hl("notfound", ...stuck.map(nodeId))),
      15,
      { order: orderVar(), cycle: true },
      `${stuck.map(nodeLabel).join(", ")} still wait on each other — the graph has a cycle, so no topological order exists`,
    );
    return;
  }
  yield t.step(
    state(),
    frame(null),
    16,
    { order: orderVar() },
    `Every edge points forward in the order ${orderVar()}`,
  );
}
