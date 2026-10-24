import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel, traversalInput } from "./shared";

export const source = `function bfs(graph: Graph, source: number) {
  const order: number[] = [];
  const seen = new Set([source]);
  const queue = [source];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of graph.neighbours(node)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return order;
}`;

export const pseudocode = `procedure BFS(G, source)
  order ← []
  seen ← {source}
  queue ← [source]
  while queue is not empty do
    node ← dequeue(queue)
    append node to order
    for each neighbour next of node, in label order do
      if next ∈ seen then skip it
      add next to seen
      enqueue(queue, next)
    end for
  end while
  return order
end procedure`;

export const meta = {
  slug: "bfs-graph",
  name: "BFS (Graph)",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Breadth-first search visits the source, then all of its neighbours, then their unseen neighbours, using a FIFO queue. Nodes come out in order of hop distance from the source, and the edges that discover new nodes form a shortest-path tree.",
  complexity: {
    time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: traversalInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"graph">): Generator<Step<GraphState>> {
  const t = createTracer<GraphState>(["visited", "edgesConsidered"]);
  const g = buildGraph(input, { directed: input.directed, weighted: false });
  const { source } = g;
  const order: number[] = [];
  const seen = new Set([source]);
  const queue = [source];
  let head = 0;
  const depth: number[] = [];
  depth[source] = 0;
  const tree: string[] = [];

  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    nodeNotes: Object.fromEntries([...seen].map((v) => [nodeId(v), String(depth[v])])),
    table: {
      title: "Queue (front first)",
      columns: ["Node", "Hops"],
      rows: queue.slice(head).map((v) => [nodeLabel(v), depth[v]]),
    },
    output: { title: "Visit order", items: order.map(nodeLabel) },
  });
  const frame = (current: number | null, ...extra: Highlight[]): Highlight[] => [
    hl("visited", ...order.filter((v) => v !== current).map(nodeId)),
    hl("frontier", ...queue.slice(head).map(nodeId)),
    ...(current === null ? [] : [hl("current", nodeId(current))]),
    hl("path", ...tree),
    ...extra,
  ];
  const queueVar = () => queue.slice(head).map(nodeLabel).join(" ") || "empty";

  yield t.step(state(), frame(null), [2, 4], { queue: queueVar() }, `Start at ${nodeLabel(source)}: mark it seen and put it in the queue`);

  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    t.count("visited");
    yield t.step(
      state(),
      frame(node),
      [6, 7],
      { node: nodeLabel(node), queue: queueVar() },
      `Dequeue ${nodeLabel(node)} and record it as visit #${order.length}`,
    );
    for (const link of g.adj[node]) {
      const next = link.to;
      t.count("edgesConsidered");
      const name = linkName(link, g.directed);
      if (seen.has(next)) {
        yield t.step(
          state(),
          frame(node, hl("compare", link.id)),
          [8, 9],
          { node: nodeLabel(node), next: nodeLabel(next), queue: queueVar() },
          `${name}: ${nodeLabel(next)} was already seen, so skip it`,
        );
        continue;
      }
      seen.add(next);
      queue.push(next);
      depth[next] = depth[node] + 1;
      tree.push(link.id);
      yield t.step(
        state(),
        frame(node, hl("compare", link.id)),
        [10, 11],
        { node: nodeLabel(node), next: nodeLabel(next), queue: queueVar() },
        `${name}: discover ${nodeLabel(next)}, ${depth[next]} hop${depth[next] === 1 ? "" : "s"} from ${nodeLabel(source)}, and enqueue it`,
      );
    }
  }

  const missed = g.size - order.length;
  yield t.step(
    state(),
    frame(null),
    14,
    { visited: order.length },
    missed === 0
      ? `The queue is empty: all ${order.length} nodes were visited in order ${order.map(nodeLabel).join(" ")}`
      : `The queue is empty: ${order.length} nodes were visited and ${missed} cannot be reached from ${nodeLabel(source)}`,
  );
}
