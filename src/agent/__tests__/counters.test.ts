import { describe, expect, it } from "vitest";
import { algorithmList, getAlgorithm } from "../../algorithms/registry";
import { COUNTERS, counterNames, describeCounter } from "../counters";

const sorting = algorithmList.filter((meta) => meta.category === "sorting").map((meta) => getAlgorithm(meta.slug)!);

describe("counters table", () => {
  it("describes every counter the sorting algorithms report", () => {
    expect(sorting).toHaveLength(9);
    for (const algo of sorting) {
      for (const name of counterNames(algo)) {
        expect(COUNTERS[name], `${algo.meta.slug}: ${name}`).toBeDefined();
        expect(describeCounter(name)).toBe(COUNTERS[name]?.measures);
      }
    }
  });

  it("only lists counters that exist, each comparable with itself and both ways", () => {
    for (const [name, info] of Object.entries(COUNTERS)) {
      expect(info?.comparableWith, name).toContain(name);
      for (const other of info?.comparableWith ?? []) {
        expect(COUNTERS[other], `${name} -> ${other}`).toBeDefined();
        expect(COUNTERS[other]?.comparableWith, `${other} -> ${name}`).toContain(name);
      }
    }
  });

  it("matches the groups in the counters table exactly", () => {
    const groups = Object.fromEntries(Object.entries(COUNTERS).map(([name, info]) => [name, [...(info?.comparableWith ?? [])].sort()]));
    expect(groups).toEqual({
      comparisons: ["comparisons"],
      swaps: ["shifts", "swaps"],
      shifts: ["shifts", "swaps"],
      writes: ["writes"],
      reads: ["reads"],
      passes: ["passes"],
    });
  });
});
