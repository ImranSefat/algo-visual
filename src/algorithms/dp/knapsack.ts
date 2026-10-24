import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { tableCellId as id, type DPTableState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function knapsack(w: number[], v: number[], cap: number) {
  const n = w.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(cap + 1));
  for (let c = 0; c <= cap; c++) dp[0][c] = 0;
  for (let i = 1; i <= n; i++) {
    for (let c = 0; c <= cap; c++) {
      dp[i][c] = dp[i - 1][c];
      if (w[i - 1] <= c) {
        dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);
      }
    }
  }
  const items: number[] = [];
  for (let i = n, c = cap; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      items.unshift(i);
      c -= w[i - 1];
    }
  }
  return { best: dp[n][cap], items };
}`;

export const pseudocode = `procedure knapsack(W, V, cap)    ▷ item i weighs W[i] and is worth V[i]
  n ← number of items
  dp ← (n + 1) × (cap + 1) table
  for c ← 0 to cap do dp[0][c] ← 0    ▷ no items, no value
  for i ← 1 to n do
    for c ← 0 to cap do
      dp[i][c] ← dp[i − 1][c]    ▷ skip item i
      if W[i] ≤ c then
        dp[i][c] ← max(dp[i][c], dp[i − 1][c − W[i]] + V[i])    ▷ or take it
      end if
    end for
  end for
  chosen ← empty list
  c ← cap; for i ← n down to 1 do
    if dp[i][c] ≠ dp[i − 1][c] then    ▷ item i changed the best value
      add i to the front of chosen
      c ← c − W[i]
    end if
  end for
  return dp[n][cap], chosen
end procedure`;

export const meta = {
  slug: "knapsack",
  name: "0/1 Knapsack",
  category: "dp",
  renderer: "dp-table",
  description:
    "Picks the subset of items with the highest total value whose total weight fits the capacity, where each item is either taken whole or left behind. Cell [i][c] holds the best value using only the first i items with capacity c: either skip item i, or take it and add its value to the best answer for the remaining capacity. Walking back up the rows reveals which items were taken.",
  complexity: { time: { best: "O(n·W)", average: "O(n·W)", worst: "O(n·W)" }, space: "O(n·W)" },
  source,
  pseudocode,
  defaultInput: { kind: "knapsack", weights: [1, 3, 4, 5, 2], values: [1, 4, 5, 7, 3], capacity: 10 },
} satisfies AlgorithmMeta;

export function* run({ weights, values, capacity }: ResolvedInput<"knapsack">): Generator<Step<DPTableState>> {
  const t = createTracer<DPTableState>(["cellsFilled"]);
  const n = weights.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(null));
  const rowHeaders = ["∅", ...weights.map((w, k) => `#${k + 1} w${w} v${values[k]}`)];
  const colHeaders = dp[0].map((_, c) => String(c));
  const state = (result?: string): DPTableState => ({
    rowHeaders,
    colHeaders,
    cells: dp,
    ...(result === undefined ? {} : { result }),
  });
  const at = (i: number, c: number) => dp[i][c] as number;

  yield t.step(
    state(),
    [],
    [2, 3],
    { n, capacity },
    "Cell [i][c] will hold the best value using only the first i items with capacity c",
  );
  for (let c = 0; c <= capacity; c++) dp[0][c] = 0;
  t.count("cellsFilled", capacity + 1);
  yield t.step(
    state(),
    [hl("current", ...dp[0].map((_, c) => id(0, c)))],
    4,
    { capacity },
    "With no items to choose from, every capacity is worth 0",
  );

  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1];
    const v = values[i - 1];
    for (let c = 0; c <= capacity; c++) {
      const skip = at(i - 1, c);
      t.count("cellsFilled");
      if (w > c) {
        dp[i][c] = skip;
        yield t.step(
          state(),
          [hl("current", id(i, c)), hl("range", id(i - 1, c))],
          [7, 8],
          { i, c, w, v, skip, "dp[i][c]": skip },
          `Item #${i} weighs ${w}, more than capacity ${c}, so it must be skipped: copy ${skip} from above`,
        );
        continue;
      }
      const rest = at(i - 1, c - w);
      const take = rest + v;
      const best = Math.max(skip, take);
      dp[i][c] = best;
      yield t.step(
        state(),
        [hl("current", id(i, c)), hl("range", id(i - 1, c), id(i - 1, c - w))],
        [7, 9],
        { i, c, w, v, skip, take, "dp[i][c]": best },
        `Item #${i} fits: take it for ${rest} + ${v} = ${take} or skip it for ${skip}, so the best is ${best}`,
      );
    }
  }

  const best = at(n, capacity);
  const chosen: number[] = [];
  // Cells already walked through; the cell under examination is drawn as `current` instead.
  const path: string[] = [];
  let c = capacity;
  yield t.step(
    state(),
    [hl("current", id(n, capacity))],
    [13, 14],
    { best },
    `The best value is ${best}; walk back up the rows to see which items produced it`,
  );
  for (let i = n; i > 0; i--) {
    const here = id(i, c);
    const value = at(i, c);
    const above = at(i - 1, c);
    const highlights = [hl("path", ...path), hl("current", here), hl("range", id(i - 1, c))];
    if (value !== above) {
      const w = weights[i - 1];
      chosen.unshift(i);
      yield t.step(
        state(),
        highlights,
        [15, 17],
        { i, c, w, items: chosen.join(",") },
        `${value} differs from ${above} above, so item #${i} was taken: drop its weight ${w} and continue at capacity ${c - w}`,
      );
      c -= w;
    } else {
      yield t.step(
        state(),
        highlights,
        15,
        { i, c, items: chosen.join(",") },
        `${value} equals the cell above, so item #${i} was not needed: move up`,
      );
    }
    path.push(here);
  }
  path.push(id(0, c));

  const items = chosen.join(",");
  const listed = chosen.map((k) => `#${k}`).join(", ");
  yield t.step(
    state(chosen.length > 0 ? `best value ${best} with items ${listed}` : `best value ${best} with no items`),
    [hl("path", ...path), hl("found", id(n, capacity))],
    20,
    { best, items },
    chosen.length > 0
      ? `Items ${listed} weigh ${chosen.reduce((sum, k) => sum + weights[k - 1], 0)} in total, within capacity ${capacity}, for a best value of ${best}`
      : `No item fits within capacity ${capacity}, so the best value is 0`,
  );
}
