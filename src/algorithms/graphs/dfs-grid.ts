import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { cellId, type GridState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { buildGrid, mazeInput } from "./shared";

export const source = `function dfs(grid: Grid, start: number, end: number) {
  const prev = new Map<number, number>();
  const seen = new Set<number>();
  const stack = [start];
  while (stack.length > 0) {
    const cell = stack.pop()!;
    if (seen.has(cell)) continue; // a stale copy: already explored
    seen.add(cell);
    if (cell === end) return buildPath(prev, end);
    // Push in reverse so the first neighbour (up) is popped first.
    for (const next of grid.neighbours(cell).reverse()) {
      if (grid.isWall(next) || seen.has(next)) continue;
      prev.set(next, cell);
      stack.push(next);
    }
  }
  return []; // the stack ran dry: end is unreachable
}

function buildPath(prev: Map<number, number>, end: number) {
  const path = [end];
  while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
  return path;
}`;

export const pseudocode = `procedure DFS(grid, start, end)
  prev ← empty map
  seen ← ∅
  stack ← [start]
  while stack is not empty do
    cell ← pop(stack)
    if cell ∈ seen then skip it
    add cell to seen
    if cell = end then return buildPath(prev, end)
    ▷ reversed, so "up" ends on top of the stack
    for each neighbour next of cell (left, down, right, up) do
      if next is a wall or next ∈ seen then skip it
      prev[next] ← cell
      push(stack, next)
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
  slug: "dfs-grid",
  name: "DFS (Grid)",
  category: "graphs",
  renderer: "grid-graph",
  description:
    "Depth-first search keeps going in one direction (up first, then right, down and left) and only backtracks to the most recent unexplored cell on its stack when it hits a dead end. It always finds a path if one exists, but usually a long, winding one rather than the shortest.",
  complexity: {
    time: { best: "O(1)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V + E)",
  },
  source,
  pseudocode,
  defaultInput: mazeInput(),
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"grid">): Generator<Step<GridState>> {
  const t = createTracer<GridState>(["visited", "pushed"]);
  const grid = buildGrid(input, false);
  const { layout } = grid;
  const { start, end } = layout;
  const prev = new Map<number, number>();
  const seen = new Set<number>();
  const stack = [start];
  const closed: string[] = [];
  // The stack may hold stale copies of explored cells; only the live ones are the frontier.
  const frontier = () => [...new Set(stack.filter((c) => !seen.has(c)))].map(cellId);
  const frame = (...extra: Highlight[]): Highlight[] => [hl("visited", ...closed), hl("frontier", ...frontier()), ...extra];

  yield t.step(layout, frame(), [2, 4], { stack: 1 }, `Start at ${grid.name(start)}: it is the only cell on the stack`);

  while (stack.length > 0) {
    const cell = stack.pop()!;
    if (seen.has(cell)) continue;
    seen.add(cell);
    t.count("visited");
    if (cell === end) {
      yield t.step(
        layout,
        frame(hl("found", cellId(end))),
        9,
        { cell: grid.name(cell), stack: stack.length },
        `Popped the end ${grid.name(end)} . Now follow the prev links back to the start`,
      );
      const path = [end];
      while (prev.has(path[0])) {
        const from = path[0];
        path.unshift(prev.get(from)!);
        yield t.step(
          layout,
          frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
          22,
          { cell: grid.name(path[0]), pathLength: path.length },
          `${grid.name(from)} was pushed by ${grid.name(path[0])}`,
        );
      }
      yield t.step(
        layout,
        frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
        23,
        { pathLength: path.length, visited: closed.length + 1 },
        `DFS found a path of ${path.length} cells. It is a valid route, but not necessarily the shortest`,
      );
      return;
    }

    let pushed = 0;
    for (const next of grid.neighbours(cell).reverse()) {
      if (grid.isWall(next) || seen.has(next)) continue;
      prev.set(next, cell);
      stack.push(next);
      t.count("pushed");
      pushed++;
    }
    yield t.step(
      layout,
      frame(hl("current", cellId(cell))),
      [6, 14],
      { cell: grid.name(cell), stack: stack.length },
      pushed > 0
        ? `Pop ${grid.name(cell)} and push its ${pushed} unexplored neighbour${pushed === 1 ? "" : "s"}`
        : `Pop ${grid.name(cell)}: a dead end, so the search backtracks to the top of the stack`,
    );
    closed.push(cellId(cell));
  }

  yield t.step(
    layout,
    frame(hl("notfound", cellId(end))),
    17,
    { pathLength: 0, visited: closed.length },
    `The stack is empty and ${grid.name(end)} was never reached, so there is no path`,
  );
}
