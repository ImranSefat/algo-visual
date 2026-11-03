import { describe, expect, it } from "vitest";
import { GROWTH_SIZES, measurePoint } from "../../lib/growth";
import { getAlgorithm } from "../registry";

describe("growth measurement (quick-sort)", () => {
  const algo = getAlgorithm("quick-sort")!;

  it("reports the algorithm's own counters", () => {
    const point = measurePoint(algo, 20, "random", 2);
    expect(Object.keys(point)).toEqual(["comparisons", "swaps"]);
    expect(point.comparisons).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(measurePoint(algo, 40, "nearly-sorted", 3)).toEqual(measurePoint(algo, 40, "nearly-sorted", 3));
  });

  it("costs more comparisons on reversed input than on random input", () => {
    const reversed = measurePoint(algo, 100, "reversed", 3);
    const random = measurePoint(algo, 100, "random", 3);
    expect(reversed.comparisons).toBeGreaterThan(random.comparisons);
  });

  it("reaches the textbook worst case on reversed input", () => {
    // Distinct descending values: each partition removes one element, so n(n-1)/2 comparisons.
    expect(measurePoint(algo, 60, "reversed", 1).comparisons).toBe((60 * 59) / 2);
  });

  it("grows with the array size", () => {
    const counts = GROWTH_SIZES.map((size) => measurePoint(algo, size, "random", 2).comparisons);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
  });
});
