import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { tableCellId as id, type DPTableState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function editDistance(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) dp[i][0] = i;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  let i = m, j = n;
  const ops: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift(\`keep \${a[i - 1]}\`); i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.unshift(\`substitute \${a[i - 1]} → \${b[j - 1]}\`); i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.unshift(\`delete \${a[i - 1]}\`); i--;
    } else {
      ops.unshift(\`insert \${b[j - 1]}\`); j--;
    }
  }
  return { distance: dp[m][n], ops };
}`;

export const pseudocode = `procedure editDistance(A, B)
  m ← |A|; n ← |B|
  dp ← (m + 1) × (n + 1) table
  for j ← 0 to n do dp[0][j] ← j    ▷ j inserts
  for i ← 1 to m do dp[i][0] ← i    ▷ i deletes
  for i ← 1 to m do
    for j ← 1 to n do
      if A[i] = B[j] then dp[i][j] ← dp[i − 1][j − 1]    ▷ free match
      else dp[i][j] ← 1 + min(dp[i − 1][j − 1], dp[i − 1][j], dp[i][j − 1])    ▷ substitute, delete, insert
    end for
  end for
  i ← m; j ← n    ▷ walk back from the corner
  ops ← empty list
  while i > 0 or j > 0 do
    if i > 0 and j > 0 and A[i] = B[j] then
      prepend "keep A[i]"; i ← i − 1; j ← j − 1
    else if i > 0 and j > 0 and dp[i][j] = dp[i − 1][j − 1] + 1 then
      prepend "substitute A[i] → B[j]"; i ← i − 1; j ← j − 1
    else if i > 0 and dp[i][j] = dp[i − 1][j] + 1 then
      prepend "delete A[i]"; i ← i − 1
    else
      prepend "insert B[j]"; j ← j − 1
    end if
  end while
  return dp[m][n], ops
end procedure`;

export const meta = {
  slug: "edit-distance",
  name: "Edit Distance",
  category: "dp",
  renderer: "dp-table",
  description:
    "Counts the fewest single-letter inserts, deletes and substitutions that turn one string into another (Levenshtein distance). Cell [i][j] holds the cost for the first i letters of a and the first j letters of b: matching letters cost nothing, otherwise pay 1 plus the cheapest neighbouring cell. Walking back from the corner spells out the edits.",
  complexity: { time: { best: "O(m·n)", average: "O(m·n)", worst: "O(m·n)" }, space: "O(m·n)" },
  source,
  pseudocode,
  defaultInput: { kind: "strings", a: "KITTEN", b: "SITTING" },
} satisfies AlgorithmMeta;

type Edit = "substitute" | "delete" | "insert";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

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
    `Cell [i][j] will hold the fewest edits that turn the first i letters of "${a}" into the first j letters of "${b}"`,
  );
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  t.count("cellsFilled", n + 1);
  yield t.step(
    state(),
    [hl("current", ...dp[0].map((_, j) => id(0, j)))],
    4,
    { n },
    "Building the first j letters of b from nothing takes j inserts, so row 0 counts 0, 1, 2, …",
  );
  if (m > 0) {
    for (let i = 1; i <= m; i++) dp[i][0] = i;
    t.count("cellsFilled", m);
    yield t.step(
      state(),
      [hl("current", ...Array.from({ length: m }, (_, k) => id(k + 1, 0)))],
      5,
      { m },
      "Erasing the first i letters of a takes i deletes, so column 0 counts up the same way",
    );
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1];
      const cb = b[j - 1];
      const diag = at(i - 1, j - 1);
      t.count("cellsFilled");
      if (ca === cb) {
        dp[i][j] = diag;
        yield t.step(
          state(),
          [hl("current", id(i, j)), hl("range", id(i - 1, j - 1))],
          8,
          { i, j, "a[i-1]": ca, "b[j-1]": cb, diag, "dp[i][j]": diag },
          `a[${i - 1}] = b[${j - 1}] = '${ca}', so no edit is needed: copy the diagonal ${diag}`,
        );
      } else {
        const up = at(i - 1, j);
        const left = at(i, j - 1);
        const cost = 1 + Math.min(diag, up, left);
        dp[i][j] = cost;
        yield t.step(
          state(),
          [hl("current", id(i, j)), hl("range", id(i - 1, j - 1), id(i - 1, j), id(i, j - 1))],
          9,
          { i, j, "a[i-1]": ca, "b[j-1]": cb, diag, up, left, "dp[i][j]": cost },
          `'${ca}' ≠ '${cb}', so pay 1 plus the cheapest of substitute (${diag}), delete (${up}) and insert (${left}): ${cost}`,
        );
      }
    }
  }

  const distance = at(m, n);
  const edits: string[] = [];
  const tally: Record<Edit, number> = { substitute: 0, delete: 0, insert: 0 };
  // Cells already walked through; the cell under examination is drawn as `current` instead.
  const path: string[] = [];
  let i = m;
  let j = n;
  yield t.step(
    state(),
    [hl("current", id(m, n))],
    [12, 13],
    { i, j, distance },
    `The corner holds the distance ${distance}; walk back from it to see which edits produced it`,
  );
  while (i > 0 || j > 0) {
    const here = id(i, j);
    const cost = at(i, j);
    const trail = hl("path", ...path);
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      const ca = a[i - 1];
      yield t.step(
        state(),
        [trail, hl("current", here), hl("range", id(i - 1, j - 1))],
        [15, 16],
        { i, j, op: `keep ${ca}` },
        `'${ca}' already matches, so keep it at no cost and step diagonally`,
      );
      i--;
      j--;
    } else if (i > 0 && j > 0 && cost === at(i - 1, j - 1) + 1) {
      const op = `substitute ${a[i - 1]} → ${b[j - 1]}`;
      edits.unshift(op);
      tally.substitute++;
      yield t.step(
        state(),
        [trail, hl("current", here), hl("range", id(i - 1, j - 1))],
        [17, 18],
        { i, j, op },
        `Substitute '${a[i - 1]}' with '${b[j - 1]}': ${cost} = ${at(i - 1, j - 1)} + 1 from the diagonal, so step diagonally`,
      );
      i--;
      j--;
    } else if (i > 0 && cost === at(i - 1, j) + 1) {
      const op = `delete ${a[i - 1]}`;
      edits.unshift(op);
      tally.delete++;
      yield t.step(
        state(),
        [trail, hl("current", here), hl("range", id(i - 1, j))],
        [19, 20],
        { i, j, op },
        `Delete '${a[i - 1]}': ${cost} = ${at(i - 1, j)} + 1 from the cell above, so move up`,
      );
      i--;
    } else {
      const op = `insert ${b[j - 1]}`;
      edits.unshift(op);
      tally.insert++;
      yield t.step(
        state(),
        [trail, hl("current", here), hl("range", id(i, j - 1))],
        [21, 22],
        { i, j, op },
        `Insert '${b[j - 1]}': ${cost} = ${at(i, j - 1)} + 1 from the cell to the left, so move left`,
      );
      j--;
    }
    path.push(here);
  }
  path.push(id(0, 0));

  const breakdown = [
    tally.substitute > 0 ? plural(tally.substitute, "substitution") : "",
    tally.delete > 0 ? plural(tally.delete, "deletion") : "",
    tally.insert > 0 ? plural(tally.insert, "insertion") : "",
  ].filter(Boolean);
  yield t.step(
    state(breakdown.length > 0 ? `distance ${distance} (${breakdown.join(", ")})` : `distance ${distance}`),
    [hl("path", ...path), hl("found", id(m, n))],
    25,
    { distance },
    distance > 0
      ? `"${a}" becomes "${b}" in ${plural(distance, "edit")}: ${edits.join(", ")}`
      : `"${a}" and "${b}" are already equal, so no edits are needed`,
  );
}
