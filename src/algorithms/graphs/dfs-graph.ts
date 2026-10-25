import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { nodeId, type GraphState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGraph, linkName, nodeLabel, traversalInput } from "./shared";

export const source = `function dfs(graph: Graph, source: number) {
  const order: number[] = [];
  const seen = new Set<number>();
  visit(source);
  return order;

  function visit(node: number) {
    seen.add(node);
    order.push(node);
    for (const next of graph.neighbours(node)) {
      if (seen.has(next)) continue;
      visit(next);
    }
  }
}`;

export const pseudocode = `procedure DFS(G, source)
  order ← []
  seen ← ∅
  visit(source)
  return order

  procedure visit(node)
    add node to seen
    append node to order
    for each neighbour next of node, in label order do
      if next ∈ seen then skip it
      visit(next)    ▷ go deeper before trying the next neighbour
    end for
  end procedure
end procedure`;

export const meta = {
  slug: "dfs-graph",
  name: "DFS (Graph)",
  category: "graphs",
  renderer: "node-graph",
  description:
    "Depth-first search follows one branch as deep as it can before backing up to the most recent node that still has an unexplored neighbour. The recursion's call stack remembers the way back, and the edges that lead to new nodes form a depth-first tree.",
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
  const order: number[] = [];
  const seen = new Set<number>();
  // The call stack, bottom first, with how many neighbours each frame has checked so far.
  const stack: { node: number; checked: number }[] = [];
  const finished: number[] = [];
  const tree: string[] = [];

  const state = (): GraphState => ({
    nodes: g.nodes,
    edges: g.edges,
    table: {
      title: "Call stack (top first)",
      columns: ["Node", "Neighbours checked"],
      rows: [...stack].reverse().map(({ node, checked }) => [nodeLabel(node), `${checked} / ${g.adj[node].length}`]),
    },
    output: { title: "Visit order", items: order.map(nodeLabel) },
  });
  const frame = (current: number | null, ...extra: Highlight[]): Highlight[] => [
    hl("visited", ...finished.map(nodeId)),
    hl("frontier", ...stack.filter((f) => f.node !== current).map((f) => nodeId(f.node))),
    ...(current === null ? [] : [hl("current", nodeId(current))]),
    hl("path", ...tree),
    ...extra,
  ];
  const stackVar = () => stack.map((f) => nodeLabel(f.node)).join(" ") || "empty";

  function* visit(node: number): Generator<Step<GraphState>, void> {
    seen.add(node);
    order.push(node);
    const frameInfo = { node, checked: 0 };
    stack.push(frameInfo);
    t.count("visited");
    yield t.step(
      state(),
      frame(node),
      [8, 9],
      { node: nodeLabel(node), stack: stackVar() },
      `Visit ${nodeLabel(node)} (#${order.length}) and push it on the call stack`,
    );
    for (const link of g.adj[node]) {
      const next = link.to;
      frameInfo.checked++;
      t.count("edgesConsidered");
      const name = linkName(link, g.directed);
      if (seen.has(next)) {
        yield t.step(
          state(),
          frame(node, hl("compare", link.id)),
          [10, 11],
          { node: nodeLabel(node), next: nodeLabel(next), stack: stackVar() },
          `${name}: ${nodeLabel(next)} is already visited, so skip it`,
        );
        continue;
      }
      tree.push(link.id);
      yield t.step(
        state(),
        frame(node, hl("compare", link.id)),
        12,
        { node: nodeLabel(node), next: nodeLabel(next), stack: stackVar() },
        `${name}: ${nodeLabel(next)} is new, so go deeper into it`,
      );
      yield* visit(next);
    }
    stack.pop();
    const parent = stack.at(-1);
    yield t.step(
      state(),
      frame(node),
      [13, 14],
      { node: nodeLabel(node), stack: stackVar() },
      parent
        ? `Every neighbour of ${nodeLabel(node)} is done, so backtrack to ${nodeLabel(parent.node)}`
        : `Every neighbour of ${nodeLabel(node)} is done and the call stack is empty`,
    );
    finished.push(node);
  }

  yield t.step(state(), frame(null), [2, 4], { stack: "empty" }, `Start the depth-first search at ${nodeLabel(g.source)}`);
  yield* visit(g.source);

  const missed = g.size - order.length;
  yield t.step(
    state(),
    frame(null),
    5,
    { visited: order.length },
    missed === 0
      ? `Done: all ${order.length} nodes were visited in order ${order.map(nodeLabel).join(" ")}`
      : `Done: ${order.length} nodes were visited and ${missed} cannot be reached from ${nodeLabel(g.source)}`,
  );
}
