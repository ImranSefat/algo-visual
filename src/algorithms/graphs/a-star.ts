import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { cellId, type GridState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGrid, mazeInput, MinQueue } from "./shared";

export const source = `function aStar(grid: Grid, start: number, end: number) {
  const h = (cell: number) => grid.manhattan(cell, end);
  const g = new Map([[start, 0]]);
  const prev = new Map<number, number>();
  const closed = new Set<number>();
  // Ordered by f = g + h; ties go to the smaller h (closer to the goal).
  const open = new PriorityQueue<number>();
  open.push(start, [h(start), h(start)]);
  while (open.size > 0) {
    const cell = open.pop()!;
    if (closed.has(cell)) continue; // stale: a cheaper copy was already popped
    closed.add(cell);
    if (cell === end) return { cost: g.get(end)!, path: buildPath(prev, end) };
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || closed.has(next)) continue;
      const tentative = g.get(cell)! + grid.cost(next);
      if (tentative < (g.get(next) ?? Infinity)) {
        g.set(next, tentative);
        prev.set(next, cell);
        open.push(next, [tentative + h(next), h(next)]);
      }
    }
  }
  return { cost: Infinity, path: [] };
}

function buildPath(prev: Map<number, number>, end: number) {
  const path = [end];
  while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
  return path;
}`;

export const pseudocode = `procedure AStar(grid, start, end)
  h(cell) ← |row − end.row| + |col − end.col|    ▷ Manhattan distance
  g ← {start: 0}
  prev ← empty map
  closed ← ∅
  ▷ priority (f, h) with f = g + h, compared in that order
  open ← min-priority queue
  insert start into open with priority (h(start), h(start))
  while open is not empty do
    cell ← extract-min(open)
    if cell ∈ closed then skip it
    add cell to closed
    if cell = end then return g[end], buildPath(prev, end)
    for each neighbour next of cell (up, right, down, left) do
      if next is a wall or next ∈ closed then skip it
      tentative ← g[cell] + cost(next)
      if tentative < g[next] (∞ if unset) then
        g[next] ← tentative
        prev[next] ← cell
        insert next into open with priority (tentative + h(next), h(next))
      end if
    end for
  end while
  return ∞, no path
end procedure

procedure buildPath(prev, end)
  path ← [end]
  while prev[first of path] exists do prepend it to path
  return path
end procedure`;

export const meta = {
  slug: "a-star",
  name: "A* Search",
  category: "graphs",
  renderer: "grid-graph",
  description:
    "A* is Dijkstra's algorithm steered by a heuristic: it expands the cell with the smallest f = g + h, where g is the cost so far and h is the Manhattan distance still to go. Because h never overestimates on a 4-connected grid, the first path to the end is still optimal, but far fewer cells are expanded on the way.",
  complexity: {
    time: { best: "O(1)", average: "O((V + E) log V)", worst: "O((V + E) log V)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: mazeInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"grid">): Generator<Step<GridState>> {
  const t = createTracer<GridState>(["visited", "relaxations"]);
  const grid = buildGrid(input, true);
  const { start, end } = grid.layout;
  const h = (cell: number) => grid.manhattan(cell, end);
  const g = new Array<number | null>(grid.size).fill(null);
  const prev = new Map<number, number>();
  const closed = new Set<number>();
  const open = new MinQueue();
  // Cells with a tentative g that are not closed yet: the live part of the queue.
  const live = new Set([start]);
  const closedIds: string[] = [];
  g[start] = 0;
  open.push(start, [h(start), h(start)]);
  const state = (): GridState => ({ ...grid.layout, dist: g });
  const frame = (...extra: Highlight[]): Highlight[] => [
    hl("visited", ...closedIds),
    hl("frontier", ...[...live].map(cellId)),
    ...extra,
  ];

  yield t.step(
    state(),
    frame(),
    [2, 8],
    { g: 0, h: h(start), f: h(start), open: 1 },
    `Start at ${grid.name(start)}: g = 0 and the Manhattan estimate to the end is ${h(start)}`,
  );

  while (open.size > 0) {
    const cell = open.pop()!;
    if (closed.has(cell)) continue;
    closed.add(cell);
    live.delete(cell);
    t.count("visited");
    const gc = g[cell]!;
    const vars = { cell: grid.name(cell), g: gc, h: h(cell), f: gc + h(cell) };
    if (cell === end) {
      yield t.step(
        state(),
        frame(hl("found", cellId(end))),
        13,
        vars,
        `The end ${grid.name(end)} comes off the queue with cost ${gc} — now follow the prev links back`,
      );
      const path = [end];
      while (prev.has(path[0])) {
        const from = path[0];
        path.unshift(prev.get(from)!);
        yield t.step(
          state(),
          frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
          29,
          { cell: grid.name(path[0]), pathLength: path.length },
          `${grid.name(from)} was reached most cheaply from ${grid.name(path[0])}`,
        );
      }
      yield t.step(
        state(),
        frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
        30,
        { pathLength: path.length, cost: gc, visited: closed.size },
        `Optimal path found: ${path.length} cells with a total cost of ${gc}, after expanding ${closed.size} cells`,
      );
      return;
    }

    let improved = 0;
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || closed.has(next)) continue;
      const tentative = gc + grid.cost(next);
      if (tentative < (g[next] ?? Infinity)) {
        g[next] = tentative;
        prev.set(next, cell);
        open.push(next, [tentative + h(next), h(next)]);
        live.add(next);
        t.count("relaxations");
        improved++;
      }
    }
    yield t.step(
      state(),
      frame(hl("current", cellId(cell))),
      [10, 22],
      { ...vars, open: live.size },
      improved > 0
        ? `Expand ${grid.name(cell)} (f = ${gc} + ${h(cell)}) and update ${improved} neighbour${improved === 1 ? "" : "s"}`
        : `Expand ${grid.name(cell)} (f = ${gc} + ${h(cell)}); no neighbour gets cheaper`,
    );
    closedIds.push(cellId(cell));
  }

  yield t.step(
    state(),
    frame(hl("notfound", cellId(end))),
    24,
    { pathLength: 0, cost: "∞" },
    `The open set is empty and ${grid.name(end)} was never reached — there is no path`,
  );
}
