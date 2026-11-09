import { describe, expect, it } from "vitest";
import type { ArrayInputSpec } from "../core/input";
import { getAlgorithm, runAlgorithm } from "../registry";

const VALUES = [6, 10, 97, 71, 54, 43, 49, 27, 57, 74, 29, 19, 77, 54, 23, 39, 32, 55, 33, 97, 28, 88, 23, 18];

function custom(values: number[]): ArrayInputSpec {
  return { kind: "array", size: values.length, distribution: "custom", custom: values, seed: 1 };
}

/** Final counters of a run: the counters on the last step. */
function counters(slug: string, values: number[]): Record<string, number> {
  const algo = getAlgorithm(slug);
  if (!algo) throw new Error(`unknown algorithm: ${slug}`);
  return runAlgorithm(algo, custom(values)).at(-1)?.counters ?? {};
}

const sorted = Array.from({ length: 24 }, (_, i) => i + 1);
const reversed = [...sorted].reverse();

describe("sorting counters", () => {
  it("Selection Sort compares every pair once: n(n-1)/2", () => {
    expect(counters("selection-sort", VALUES).comparisons).toBe((24 * 23) / 2);
  });

  it("Bubble swaps equal Insertion shifts on the same input", () => {
    for (const values of [VALUES, sorted, reversed]) {
      expect(counters("bubble-sort", values).swaps).toBe(counters("insertion-sort", values).shifts);
    }
    expect(counters("bubble-sort", VALUES).swaps).toBe(141);
    expect(counters("bubble-sort", sorted).swaps).toBe(0);
    expect(counters("bubble-sort", reversed).swaps).toBe(276);
  });

  it("Counting Sort reads n values and writes 2n", () => {
    const c = counters("counting-sort", VALUES);
    expect(c.reads).toBe(24);
    expect(c.writes).toBe(48);
  });

  it("Radix Sort writes 2n per pass", () => {
    const c = counters("radix-sort", VALUES);
    expect(c.passes).toBe(2);
    expect(c.writes).toBe(2 * 24 * c.passes);
  });

  it("Quick Sort does not count a swap when the pivot is already in place", () => {
    expect(counters("quick-sort", sorted).swaps).toBe(0);
    expect(counters("quick-sort", reversed).swaps).toBe(12);
    expect(counters("quick-sort", VALUES)).toMatchObject({ comparisons: 108, swaps: 30 });
  });
});
