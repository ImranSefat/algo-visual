import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { cellId, type GridState } from "../core/states";
import type { AlgorithmMeta, Highlight, Step } from "../core/types";
import { block, buildGrid, MinQueue } from "./shared";

export const source = `function dijkstra(grid: Grid, start: number, end: number) {
  const dist = new Map([[start, 0]]);
  const prev = new Map<number, number>();
  const done = new Set<number>();
  const open = new PriorityQueue<number>(); // pops the smallest distance first
  open.push(start, 0);
  while (open.size > 0) {
    const cell = open.pop()!;
    if (done.has(cell)) continue; // stale: a cheaper copy was already popped
    done.add(cell);
    if (cell === end) return { cost: dist.get(end)!, path: buildPath(prev, end) };
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || done.has(next)) continue;
      const alt = dist.get(cell)! + grid.cost(next);
      if (alt < (dist.get(next) ?? Infinity)) {
        dist.set(next, alt);
        prev.set(next, cell);
        open.push(next, alt);
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

export const pseudocode = `procedure Dijkstra(grid, start, end)
  dist ← {start: 0}
  prev ← empty map
  done ← ∅
  open ← min-priority queue
  insert start into open with priority 0
  while open is not empty do
    cell ← extract-min(open)
    if cell ∈ done then skip it
    add cell to done    ▷ dist[cell] is now final
    if cell = end then return dist[end], buildPath(prev, end)
    for each neighbour next of cell (up, right, down, left) do
      if next is a wall or next ∈ done then skip it
      alt ← dist[cell] + cost(next)
      if alt < dist[next] (∞ if unset) then
        dist[next] ← alt
        prev[next] ← cell
        insert next into open with priority alt
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
  slug: "dijkstra-grid",
  name: "Dijkstra (Grid)",
  category: "graphs",
  renderer: "grid-graph",
  description:
    "Dijkstra's algorithm always expands the open cell with the smallest known distance, so on a weighted grid it finds the cheapest path rather than the one with fewest moves. Entering a cell costs its weight (the mud patches here cost 5), and the optimal route detours around them when that is cheaper.",
  complexity: {
    time: { best: "O(1)", average: "O((V + E) log V)", worst: "O((V + E) log V)" },
    space: "O(V)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "grid",
    rows: 15,
    cols: 29,
    walls: [...block(0, 9, 9, 9), ...block(5, 22, 14, 22)],
    start: [7, 2],
    end: [7, 26],
    weights: block(3, 14, 14, 18).map(([r, c]): [number, number, number] => [r, c, 5]),
  },
} satisfies AlgorithmMeta;

export function* run(input: ResolvedInput<"grid">): Generator<Step<GridState>> {
  const t = createTracer<GridState>(["visited", "relaxations"]);
  const grid = buildGrid(input, true);
  const { start, end } = grid.layout;
  const dist = new Array<number | null>(grid.size).fill(null);
  const prev = new Map<number, number>();
  const done = new Set<number>();
  const open = new MinQueue();
  // Cells with a tentative distance that are not settled yet: the live part of the queue.
  const live = new Set([start]);
  const closed: string[] = [];
  dist[start] = 0;
  open.push(start, [0]);
  const state = (): GridState => ({ ...grid.layout, dist });
  const frame = (...extra: Highlight[]): Highlight[] => [
    hl("visited", ...closed),
    hl("frontier", ...[...live].map(cellId)),
    ...extra,
  ];

  yield t.step(state(), frame(), [2, 6], { open: 1 }, `Start at ${grid.name(start)} with distance 0; every other cell is unknown (∞)`);

  while (open.size > 0) {
    const cell = open.pop()!;
    if (done.has(cell)) continue;
    done.add(cell);
    live.delete(cell);
    t.count("visited");
    const d = dist[cell]!;
    if (cell === end) {
      yield t.step(
        state(),
        frame(hl("found", cellId(end))),
        11,
        { cell: grid.name(cell), dist: d },
        `The end ${grid.name(end)} is settled at cost ${d}. Now follow the prev links back`,
      );
      const path = [end];
      while (prev.has(path[0])) {
        const from = path[0];
        path.unshift(prev.get(from)!);
        yield t.step(
          state(),
          frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
          27,
          { cell: grid.name(path[0]), pathLength: path.length },
          `${grid.name(from)} was reached most cheaply from ${grid.name(path[0])}`,
        );
      }
      yield t.step(
        state(),
        frame(hl("path", ...path.map(cellId)), hl("found", cellId(end))),
        28,
        { pathLength: path.length, cost: d },
        `Cheapest path found: ${path.length} cells with a total cost of ${d}`,
      );
      return;
    }

    let improved = 0;
    for (const next of grid.neighbours(cell)) {
      if (grid.isWall(next) || done.has(next)) continue;
      const alt = d + grid.cost(next);
      if (alt < (dist[next] ?? Infinity)) {
        dist[next] = alt;
        prev.set(next, cell);
        open.push(next, [alt]);
        live.add(next);
        t.count("relaxations");
        improved++;
      }
    }
    yield t.step(
      state(),
      frame(hl("current", cellId(cell))),
      [8, 20],
      { cell: grid.name(cell), dist: d, open: live.size },
      improved > 0
        ? `Settle ${grid.name(cell)} at distance ${d} and lower the distance of ${improved} neighbour${improved === 1 ? "" : "s"}`
        : `Settle ${grid.name(cell)} at distance ${d}; no neighbour gets cheaper`,
    );
    closed.push(cellId(cell));
  }

  yield t.step(
    state(),
    frame(hl("notfound", cellId(end))),
    22,
    { pathLength: 0, cost: "∞" },
    `No open cells are left and ${grid.name(end)} was never reached, so there is no path`,
  );
}
