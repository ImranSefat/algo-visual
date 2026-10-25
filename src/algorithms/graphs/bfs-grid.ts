import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { cellId, type GridState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGrid, mazeInput } from "./shared";

export const source = `function bfs(grid: Grid, start: number, end: number) {
  const prev = new Map<number, number>();
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    if (cell === end) return buildPath(prev, end);
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cell);
      queue.push(next);
    }
  }
  return []; // the queue ran dry: end is unreachable
}

function buildPath(prev: Map<number, number>, end: number) {
  const path = [end];
  while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
  return path;
}`;

export const pseudocode = `procedure BFS(grid, start, end)
  prev ← empty map
  seen ← {start}
  queue ← [start]
  while queue is not empty do
    cell ← dequeue(queue)
    if cell = end then return buildPath(prev, end)
    for each neighbour next of cell (up, right, down, left) do
      if next is a wall or next ∈ seen then skip it
      add next to seen
      prev[next] ← cell
      enqueue(queue, next)
    end for
  end while
  return no path
end procedure

procedure buildPath(prev, end)
  path ← [end]
  while prev[first of path] exists do prepend it to path
  return path
end procedure`;

export const meta = {
  slug: "bfs-grid",
  name: "BFS (Grid)",
  category: "graphs",
  renderer: "grid-graph",
  description:
    "Breadth-first search spreads out from the start one ring at a time using a FIFO queue, so cells are reached in order of their distance in moves. The first time it dequeues the end it has found a shortest path, which it rebuilds by following each cell's prev link back to the start.",
  complexity: {
    time: { best: "O(1)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: mazeInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"grid">): Generator<Step<GridState>> {
  const t = createTracer<GridState>(["visited", "enqueued"]);
  const grid = buildGrid(input, false);
  const { layout } = grid;
  const { start, end } = layout;
  const prev = new Map<number, number>();
  const seen = new Set([start]);
  const queue = [start];
  let head = 0;
  const closed: string[] = [];
  const frame = (...extra: Highlight[]): Highlight[] => [
    hl("visited", ...closed),
    hl("frontier", ...queue.slice(head).map(cellId)),
    ...extra,
  ];

  yield t.step(layout, frame(), [2, 4], { queue: 1 }, `Start at ${grid.name(start)}: it is the only cell in the queue`);

  while (head < queue.length) {
    const cell = queue[head++];
    t.count("visited");
    if (cell === end) {
      yield t.step(
        layout,
        frame(hl("found", cellId(end))),
        7,
        { cell: grid.name(cell), queue: queue.length - head },
        `Dequeued the end ${grid.name(end)} . Now follow the prev links back to the start`,
      );
      const path = [end];
      while (prev.has(path[0])) {
        const from = path[0];
        path.unshift(prev.get(from)!);
        yield t.step(
          layout,
          frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
          20,
          { cell: grid.name(path[0]), pathLength: path.length },
          `${grid.name(from)} was reached from ${grid.name(path[0])}`,
        );
      }
      yield t.step(
        layout,
        frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
        21,
        { pathLength: path.length, visited: closed.length + 1 },
        `Shortest path found: ${path.length} cells, ${path.length - 1} moves`,
      );
      return;
    }

    let added = 0;
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cell);
      queue.push(next);
      t.count("enqueued");
      added++;
    }
    yield t.step(
      layout,
      frame(hl("current", cellId(cell))),
      [6, 12],
      { cell: grid.name(cell), queue: queue.length - head },
      added > 0
        ? `Dequeue ${grid.name(cell)} and enqueue its ${added} unseen neighbour${added === 1 ? "" : "s"}`
        : `Dequeue ${grid.name(cell)}: every neighbour is a wall or already seen`,
    );
    closed.push(cellId(cell));
  }

  yield t.step(
    layout,
    frame(hl("notfound", cellId(end))),
    15,
    { pathLength: 0, visited: closed.length },
    `The queue is empty and ${grid.name(end)} was never reached, so there is no path`,
  );
}
