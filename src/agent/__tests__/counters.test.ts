import { describe, expect, it } from "vitest";
import { algorithmList, getAlgorithm } from "../../algorithms/registry";
import { COUNTERS, counterNames } from "../counters";

const all = algorithmList.map((meta) => getAlgorithm(meta.slug)!);
const sorting = all.filter((algo) => algo.meta.category === "sorting");

describe("counters table", () => {
  it("describes every counter the sorting algorithms report", () => {
    expect(sorting.length).toBeGreaterThan(0);
    for (const algo of sorting) {
      for (const name of counterNames(algo)) expect(COUNTERS[name], `${algo.meta.slug}: ${name}`).toBeDefined();
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

  it("keeps every counter in a group of its own", () => {
    const groups = Object.fromEntries(Object.entries(COUNTERS).map(([name, info]) => [name, info?.comparableWith]));
    expect(groups).toEqual({
      comparisons: ["comparisons"],
      swaps: ["swaps"],
      shifts: ["shifts"],
      writes: ["writes"],
      reads: ["reads"],
      passes: ["passes"],
    });
  });

  // The table is looked up by name only, so an entry's wording must hold for every algorithm that reports that name.
  // If this list changes, check the wording still fits the new algorithm.
  it("knows every algorithm that shares a described counter", () => {
    const reporters = (name: string) =>
      all
        .filter((algo) => counterNames(algo).includes(name))
        .map((algo) => algo.meta.slug)
        .sort();
    expect(reporters("swaps")).toEqual(["bubble-sort", "heap-sort", "min-heap", "quick-sort", "selection-sort"]);
    expect(reporters("shifts")).toEqual(["array", "insertion-sort", "shell-sort"]);
    expect(reporters("writes")).toEqual(["counting-sort", "merge-sort", "radix-sort"]);
    expect(reporters("reads")).toEqual(["counting-sort"]);
    expect(reporters("passes")).toEqual(["radix-sort"]);
  });
});
