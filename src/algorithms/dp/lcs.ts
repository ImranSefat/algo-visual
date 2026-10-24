import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { tableCellId as id, type DPTableState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function lcs(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let j = 0; j <= n; j++) dp[0][j] = 0;
  for (let i = 1; i <= m; i++) dp[i][0] = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  let i = m, j = n, out = "";
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out = a[i - 1] + out;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out;
}`;

export const pseudocode = `procedure LCS(A, B)
  m ← |A|; n ← |B|
  dp ← (m + 1) × (n + 1) table
  for j ← 0 to n do dp[0][j] ← 0    ▷ empty prefix of A
  for i ← 1 to m do dp[i][0] ← 0    ▷ empty prefix of B
  for i ← 1 to m do
    for j ← 1 to n do
      if A[i] = B[j] then dp[i][j] ← dp[i − 1][j − 1] + 1
      else dp[i][j] ← max(dp[i − 1][j], dp[i][j − 1])
    end for
  end for
  i ← m; j ← n; S ← ""    ▷ walk back from the corner
  while i > 0 and j > 0 do
    if A[i] = B[j] then
      prepend A[i] to S
      i ← i − 1; j ← j − 1
    else if dp[i − 1][j] ≥ dp[i][j − 1] then i ← i − 1
    else j ← j − 1
  end while
  return S
end procedure`;

export const meta = {
  slug: "lcs",
  name: "Longest Common Subsequence",
  category: "dp",
  renderer: "dp-table",
  description:
    "Finds the longest sequence of letters that appears in both strings in the same order, not necessarily side by side. Cell [i][j] holds the answer for the first i letters of a and the first j letters of b: a matching pair extends the diagonal by one, otherwise the better of dropping a letter from either string wins. Walking back from the corner recovers the subsequence itself.",
  complexity: { time: { best: "O(m·n)", average: "O(m·n)", worst: "O(m·n)" }, space: "O(m·n)" },
  source,
  pseudocode,
  defaultInput: { kind: "strings", a: "AGGTAB", b: "GXTXAYB" },
} satisfies AlgorithmMeta;

export function* run({ a, b }: ResolvedInput<"strings">): Generator<Step<DPTableState>> {
  const t = createTracer<DPTableState>(["cellsFilled"]);
  const m = a.length;
  const n = b.length;
  const dp: (number | null)[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
  const rowHeaders = ["ε", ...a];
  const colHeaders = ["ε", ...b];
  const state = (result?: string): DPTableState => ({
    rowHeaders,
    colHeaders,
    cells: dp,
    ...(result === undefined ? {} : { result }),
  });
  const at = (i: number, j: number) => dp[i][j] as number;

  yield t.step(
    state(),
    [],
    [2, 3],
    { m, n },
    `Cell [i][j] will hold the LCS length of the first i letters of "${a}" and the first j letters of "${b}"`,
  );
  for (let j = 0; j <= n; j++) dp[0][j] = 0;
  t.count("cellsFilled", n + 1);
  yield t.step(
    state(),
    [hl("current", ...dp[0].map((_, j) => id(0, j)))],
    4,
    { n },
    "An empty prefix of a has nothing in common with b, so row 0 is all 0",
  );
  if (m > 0) {
    for (let i = 1; i <= m; i++) dp[i][0] = 0;
    t.count("cellsFilled", m);
    yield t.step(
      state(),
      [hl("current", ...Array.from({ length: m }, (_, k) => id(k + 1, 0)))],
      5,
      { m },
      "Likewise nothing matches an empty prefix of b, so column 0 is all 0",
    );
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1];
      const cb = b[j - 1];
      t.count("cellsFilled");
      if (ca === cb) {
        const diag = at(i - 1, j - 1);
        dp[i][j] = diag + 1;
        yield t.step(
          state(),
          [hl("current", id(i, j)), hl("range", id(i - 1, j - 1))],
          8,
          { i, j, "a[i-1]": ca, "b[j-1]": cb, diag, "dp[i][j]": diag + 1 },
          `a[${i - 1}] = b[${j - 1}] = '${ca}', so extend the diagonal: ${diag} + 1 = ${diag + 1}`,
        );
      } else {
        const up = at(i - 1, j);
        const left = at(i, j - 1);
        const best = Math.max(up, left);
        dp[i][j] = best;
        yield t.step(
          state(),
          [hl("current", id(i, j)), hl("range", id(i - 1, j), id(i, j - 1))],
          9,
          { i, j, "a[i-1]": ca, "b[j-1]": cb, up, left, "dp[i][j]": best },
          `'${ca}' ≠ '${cb}', so drop one of them and keep the better of up (${up}) and left (${left}): ${best}`,
        );
      }
    }
  }

  let i = m;
  let j = n;
  let out = "";
  // Cells already walked through; the cell under examination is drawn as `current` instead.
  const path: string[] = [];
  yield t.step(
    state(),
    [hl("current", id(i, j))],
    12,
    { i, j, lcs: out },
    `The corner holds the LCS length ${at(m, n)}; walk back from it to recover the letters`,
  );
  while (i > 0 && j > 0) {
    const ca = a[i - 1];
    const cb = b[j - 1];
    const here = id(i, j);
    if (ca === cb) {
      out = ca + out;
      yield t.step(
        state(),
        [hl("path", ...path), hl("current", here), hl("range", id(i - 1, j - 1))],
        [14, 16],
        { i, j, "a[i-1]": ca, "b[j-1]": cb, lcs: out },
        `'${ca}' matches, so it belongs to the LCS: prepend it and step diagonally`,
      );
      i--;
      j--;
    } else {
      const up = at(i - 1, j);
      const left = at(i, j - 1);
      const goUp = up >= left;
      yield t.step(
        state(),
        [hl("path", ...path), hl("current", here), hl("range", goUp ? id(i - 1, j) : id(i, j - 1))],
        goUp ? 17 : 18,
        { i, j, "a[i-1]": ca, "b[j-1]": cb, up, left, lcs: out },
        goUp
          ? `'${ca}' ≠ '${cb}' and up (${up}) ≥ left (${left}), so this length came from above: move up`
          : `'${ca}' ≠ '${cb}' and left (${left}) > up (${up}), so this length came from the left: move left`,
      );
      if (goUp) i--;
      else j--;
    }
    path.push(here);
  }
  path.push(id(i, j));

  const length = out.length;
  yield t.step(
    state(length > 0 ? `LCS = ${out} (${length})` : "LCS is empty (0)"),
    [hl("path", ...path), hl("found", id(m, n))],
    20,
    { length, lcs: out },
    length > 0
      ? `Reading the matched letters in order gives "${out}", a common subsequence of length ${length}`
      : "The strings share no letters, so the longest common subsequence is empty",
  );
}
