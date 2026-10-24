import { describe, expect, it } from "vitest";
import { resolveInput } from "../core/input";
import { mulberry32, randInt } from "../core/prng";
import { collect } from "../core/step";
import type { DPTableState } from "../core/states";
import type { AlgorithmMeta, AlgorithmModule, Step } from "../core/types";
import { LIMITS } from "../core/validate";
import * as editDistance from "../dp/edit-distance";
import * as fibonacci from "../dp/fibonacci";
import * as knapsack from "../dp/knapsack";
import * as lcs from "../dp/lcs";

type Trace = Step<DPTableState>[];

const lineCount = (text: string) => text.split("\n").length;

/** Cheap structural checks, run on every input (the default-input suite below goes deeper). */
function expectWellFormed(steps: Trace, source: string) {
  const max = lineCount(source);
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) {
    const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
    expect(from).toBeGreaterThanOrEqual(1);
    expect(to).toBeLessThanOrEqual(max);
    expect(step.note.length).toBeGreaterThan(0);
  }
  const last = steps.at(-1)!;
  expect(last.state.cells.flat().includes(null)).toBe(false);
  expect(last.state.result).toBeTruthy();
}

const runFibonacci = (n: number): Trace => collect(fibonacci.run(resolveInput<"scalar">({ kind: "scalar", n })));
const runLcs = (a: string, b: string): Trace => collect(lcs.run(resolveInput<"strings">({ kind: "strings", a, b })));
const runEditDistance = (a: string, b: string): Trace =>
  collect(editDistance.run(resolveInput<"strings">({ kind: "strings", a, b })));
const runKnapsack = (weights: number[], values: number[], capacity: number): Trace =>
  collect(knapsack.run(resolveInput<"knapsack">({ kind: "knapsack", weights, values, capacity })));

const defaults: [AlgorithmMeta, Trace][] = [
  [fibonacci.meta, collect(fibonacci.run(resolveInput<"scalar">(fibonacci.meta.defaultInput)))],
  [lcs.meta, collect(lcs.run(resolveInput<"strings">(lcs.meta.defaultInput)))],
  [knapsack.meta, collect(knapsack.run(resolveInput<"knapsack">(knapsack.meta.defaultInput)))],
  [editDistance.meta, collect(editDistance.run(resolveInput<"strings">(editDistance.meta.defaultInput)))],
];

it("modules have the shape the registry expects", () => {
  // `satisfies` makes `tsc` fail here if a module drifts from AlgorithmModule<K>.
  const modules = [
    fibonacci satisfies AlgorithmModule<"scalar">,
    lcs satisfies AlgorithmModule<"strings">,
    knapsack satisfies AlgorithmModule<"knapsack">,
    editDistance satisfies AlgorithmModule<"strings">,
  ];
  expect(new Set(modules.map((m) => m.meta.slug)).size).toBe(modules.length);
});

describe.each(defaults.map(([meta, steps]) => [meta.slug, meta, steps] as const))("%s (default input)", (_slug, meta, steps) => {
  const max = lineCount(meta.source);
  const last = steps.at(-1)!;

  it("is a dp-table algorithm", () => {
    expect(meta.category).toBe("dp");
    expect(meta.renderer).toBe("dp-table");
  });

  it("yields a modest number of steps", () => {
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThan(400);
  });

  it("every line is within the display source", () => {
    for (const [i, step] of steps.entries()) {
      const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
      expect(from, `step ${i} line`).toBeGreaterThanOrEqual(1);
      expect(to, `step ${i} line`).toBeLessThanOrEqual(max);
      expect(from, `step ${i} range`).toBeLessThanOrEqual(to);
    }
  });

  it("pseudocode is line-aligned with the source", () => {
    expect(meta.pseudocode).toBeDefined();
    expect(lineCount(meta.pseudocode!)).toBe(max);
  });

  it("every step has a note", () => {
    for (const [i, step] of steps.entries()) expect(step.note.trim().length, `step ${i}`).toBeGreaterThan(0);
  });

  it("headers match the table shape", () => {
    for (const { state } of steps) {
      expect(state.rowHeaders).toHaveLength(state.cells.length);
      for (const row of state.cells) expect(row).toHaveLength(state.colHeaders.length);
    }
  });

  it("highlights only reference cells inside the table", () => {
    for (const [i, { state, highlights }] of steps.entries()) {
      for (const id of highlights.flatMap((h) => h.ids)) {
        const match = /^r(\d+)c(\d+)$/.exec(id);
        expect(match, `step ${i}: ${id}`).not.toBeNull();
        const [row, col] = [Number(match![1]), Number(match![2])];
        expect(row, `step ${i}: ${id}`).toBeLessThan(state.cells.length);
        expect(col, `step ${i}: ${id}`).toBeLessThan(state.colHeaders.length);
      }
    }
  });

  it("never changes a cell once it is filled", () => {
    for (let s = 1; s < steps.length; s++) {
      const before = steps[s - 1].state.cells;
      const after = steps[s].state.cells;
      before.forEach((row, r) =>
        row.forEach((value, c) => {
          if (value !== null) expect(after[r][c], `step ${s} cell [${r}][${c}]`).toBe(value);
        }),
      );
    }
  });

  it("starts empty and leaves no empty cell, filling each exactly once", () => {
    expect(steps[0].state.cells.flat().every((v) => v === null)).toBe(true);
    const cells = last.state.cells.flat();
    expect(cells.some((v) => v === null)).toBe(false);
    expect(last.counters?.cellsFilled).toBe(cells.length);
  });

  it("ends with a result and the answer cell marked found", () => {
    expect(last.state.result).toBeTruthy();
    const found = last.highlights.filter((h) => h.kind === "found").flatMap((h) => h.ids);
    expect(found).toHaveLength(1);
  });

  it("snapshots state per step", () => {
    expect(steps[0].state).not.toBe(steps[1].state);
    expect(steps[0].state.cells).not.toBe(steps[1].state.cells);
  });
});

describe("fibonacci", () => {
  const reference = (n: number) => {
    let [x, y] = [0, 1];
    for (let i = 0; i < n; i++) [x, y] = [y, x + y];
    return x;
  };

  for (let n = LIMITS.scalar[0]; n <= LIMITS.scalar[1]; n++) {
    it(`F(${n}) = ${reference(n)}`, () => {
      const steps = runFibonacci(n);
      expectWellFormed(steps, fibonacci.source);
      const last = steps.at(-1)!;
      expect(last.vars.result).toBe(reference(n));
      expect(last.state.cells[0]).toEqual(Array.from({ length: n + 1 }, (_, i) => reference(i)));
      expect(last.state.result).toBe(`F(${n}) = ${reference(n)}`);
    });
  }
});

/** Seeded random strings over a small alphabet so matches are common. */
function randomPairs(seed: number, count: number, alphabet: string): [string, string][] {
  const rng = mulberry32(seed);
  const word = () =>
    Array.from({ length: randInt(rng, 0, LIMITS.stringLength) }, () => alphabet[randInt(rng, 0, alphabet.length - 1)]).join("");
  return Array.from({ length: count }, () => [word(), word()]);
}

const stringPairs: [string, string][] = [
  ["AGGTAB", "GXTXAYB"],
  ["ABCBDAB", "BDCABA"],
  ["KITTEN", "SITTING"],
  ["SUNDAY", "SATURDAY"],
  ["INTENTION", "EXECUTION"],
  ["ABC", "XYZ"],
  ["HELLO", "HELLO"],
  ["A", "A"],
  ["A", "B"],
  ["", "ABC"],
  ["ABC", ""],
  ["", ""],
  ["ABCDEFGHIJKLMN", "NMLKJIHGFEDCBA"],
  ["AAAAAAAAAAAAAA", "AAAA"],
  ...randomPairs(7, 20, "ACGT"),
];

describe("lcs", () => {
  const reference = (a: string, b: string) => {
    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[a.length][b.length];
  };
  const isSubsequence = (s: string, of: string) => {
    let k = 0;
    for (const ch of of) if (k < s.length && s[k] === ch) k++;
    return k === s.length;
  };

  it.each(stringPairs)("%j vs %j", (a, b) => {
    const steps = runLcs(a, b);
    expectWellFormed(steps, lcs.source);
    const last = steps.at(-1)!;
    const expected = reference(a, b);
    const found = String(last.vars.lcs);
    expect(last.vars.length).toBe(expected);
    expect(found).toHaveLength(expected);
    expect(isSubsequence(found, a)).toBe(true);
    expect(isSubsequence(found, b)).toBe(true);
    expect(last.state.cells[a.length][b.length]).toBe(expected);
  });
});

describe("edit distance", () => {
  const reference = (a: string, b: string) => {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = row;
    }
    return prev[b.length];
  };

  /** Replays the traceback's narrated operations (emitted end-to-start) against `a`. */
  const replay = (steps: Trace, a: string) => {
    const ops = steps.flatMap((s) => (typeof s.vars.op === "string" ? [s.vars.op] : [])).reverse();
    let p = 0;
    let out = "";
    let edits = 0;
    for (const op of ops) {
      const [kind, x, , y] = op.split(" ");
      if (kind === "keep" || kind === "substitute" || kind === "delete") expect(a[p++], op).toBe(x);
      if (kind === "keep") out += x;
      else if (kind === "substitute") out += y;
      else if (kind === "insert") out += x;
      if (kind !== "keep") edits++;
    }
    expect(p).toBe(a.length);
    return { out, edits };
  };

  it.each(stringPairs)("%j → %j", (a, b) => {
    const steps = runEditDistance(a, b);
    expectWellFormed(steps, editDistance.source);
    const last = steps.at(-1)!;
    const expected = reference(a, b);
    expect(last.vars.distance).toBe(expected);
    expect(last.state.cells[a.length][b.length]).toBe(expected);
    const { out, edits } = replay(steps, a);
    expect(out).toBe(b);
    expect(edits).toBe(expected);
  });
});

describe("knapsack", () => {
  const brute = (weights: number[], values: number[], capacity: number) => {
    let best = 0;
    for (let mask = 0; mask < 1 << weights.length; mask++) {
      let w = 0;
      let v = 0;
      weights.forEach((wk, k) => {
        if (mask & (1 << k)) {
          w += wk;
          v += values[k];
        }
      });
      if (w <= capacity) best = Math.max(best, v);
    }
    return best;
  };

  const rng = mulberry32(42);
  const randomCases = Array.from({ length: 20 }, () => {
    const n = randInt(rng, 1, LIMITS.knapsackItems);
    return {
      weights: Array.from({ length: n }, () => randInt(rng, 1, 12)),
      values: Array.from({ length: n }, () => randInt(rng, 1, 30)),
      capacity: randInt(rng, LIMITS.capacity[0], LIMITS.capacity[1]),
    };
  });

  const cases = [
    { ...knapsack.meta.defaultInput },
    { weights: [5], values: [10], capacity: 4 },
    { weights: [1, 2, 3], values: [6, 10, 12], capacity: 5 },
    { weights: [1, 2, 3], values: [1, 2, 3], capacity: 25 },
    { weights: [10, 20, 30], values: [60, 100, 120], capacity: 25 },
    { weights: [5, 4, 6, 3], values: [10, 40, 30, 50], capacity: 10 },
    { weights: [3, 3, 3, 3, 3, 3, 3, 3], values: [1, 2, 3, 4, 5, 6, 7, 8], capacity: 25 },
    { weights: [99, 1], values: [99, 1], capacity: 1 },
    ...randomCases,
  ];

  it.each(cases)("w=$weights v=$values cap=$capacity", ({ weights, values, capacity }) => {
    const steps = runKnapsack(weights, values, capacity);
    expectWellFormed(steps, knapsack.source);
    const last = steps.at(-1)!;
    const expected = brute(weights, values, capacity);
    expect(last.vars.best).toBe(expected);
    expect(last.state.cells[weights.length][capacity]).toBe(expected);

    const items = String(last.vars.items).split(",").filter(Boolean).map(Number);
    expect(new Set(items).size).toBe(items.length);
    for (const k of items) expect(k >= 1 && k <= weights.length, `item #${k}`).toBe(true);
    expect(items.reduce((sum, k) => sum + weights[k - 1], 0)).toBeLessThanOrEqual(capacity);
    expect(items.reduce((sum, k) => sum + values[k - 1], 0)).toBe(expected);
  });
});
