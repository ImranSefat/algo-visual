import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { tableCellId, type DPTableState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function fibonacci(n: number) {
  const f: number[] = new Array(n + 1);
  f[0] = 0;
  if (n >= 1) f[1] = 1;
  for (let i = 2; i <= n; i++) {
    f[i] = f[i - 1] + f[i - 2];
  }
  return f[n];
}`;

export const pseudocode = `procedure fibonacci(n)
  F ← table of n + 1 cells
  F[0] ← 0
  if n ≥ 1 then F[1] ← 1
  for i ← 2 to n do
    F[i] ← F[i − 1] + F[i − 2]    ▷ both already in the table
  end for
  return F[n]
end procedure`;

export const meta = {
  slug: "fibonacci",
  name: "Fibonacci",
  category: "dp",
  renderer: "dp-table",
  description:
    "Computes F(n) bottom-up: write down the base cases F(0) = 0 and F(1) = 1, then fill each cell as the sum of the two before it. Naive recursion recomputes the same subproblems an exponential number of times; the table solves each one exactly once.",
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  source,
  pseudocode,
  defaultInput: { kind: "scalar", n: 12 },
} satisfies AlgorithmMeta;

export function* run({ n }: ResolvedInput<"scalar">): Generator<Step<DPTableState>> {
  const t = createTracer<DPTableState>(["cellsFilled"]);
  const f: (number | null)[] = new Array(n + 1).fill(null);
  const colHeaders = f.map((_, i) => String(i));
  const state = (result?: string): DPTableState => ({
    rowHeaders: ["F(i)"],
    colHeaders,
    cells: [f],
    ...(result === undefined ? {} : { result }),
  });
  const cell = (i: number) => tableCellId(0, i);

  yield t.step(state(), [], 2, { n }, `Make a table of ${n + 1} cells: cell i will hold F(i)`);
  f[0] = 0;
  t.count("cellsFilled");
  yield t.step(state(), [hl("current", cell(0))], 3, { n, "f[0]": 0 }, "Base case: F(0) = 0");
  if (n >= 1) {
    f[1] = 1;
    t.count("cellsFilled");
    yield t.step(state(), [hl("current", cell(1))], 4, { n, "f[1]": 1 }, "Base case: F(1) = 1");
  }
  for (let i = 2; i <= n; i++) {
    const prev = f[i - 1] as number;
    const prev2 = f[i - 2] as number;
    f[i] = prev + prev2;
    t.count("cellsFilled");
    yield t.step(
      state(),
      [hl("current", cell(i)), hl("range", cell(i - 1), cell(i - 2))],
      6,
      { i, "f[i-1]": prev, "f[i-2]": prev2, "f[i]": prev + prev2 },
      `F(${i}) = F(${i - 1}) + F(${i - 2}) = ${prev} + ${prev2} = ${prev + prev2}`,
    );
  }
  const result = f[n] as number;
  yield t.step(
    state(`F(${n}) = ${result}`),
    [hl("found", cell(n))],
    8,
    { n, result },
    `The last cell is the answer: F(${n}) = ${result}`,
  );
}
