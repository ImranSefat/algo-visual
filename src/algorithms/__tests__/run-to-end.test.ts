import { describe, expect, it } from "vitest";
import { getAlgorithm, runAlgorithm, runToEnd } from "../registry";

describe("runToEnd", () => {
  it("matches the step count and final counters of the full timeline", () => {
    for (const slug of ["bubble-sort", "binary-search", "stack", "bfs-grid", "dijkstra-graph", "lcs"]) {
      const algo = getAlgorithm(slug)!;
      const steps = runAlgorithm(algo, algo.meta.defaultInput);
      const summary = runToEnd(algo, algo.meta.defaultInput);
      expect(summary.steps, slug).toBe(steps.length);
      expect(summary.counters, slug).toEqual(steps.at(-1)!.counters ?? {});
      expect(summary.last?.note, slug).toBe(steps.at(-1)!.note);
      expect(summary.stoppedEarly, slug).toBe(false);
    }
  });

  it("stops at the step cap and says so", () => {
    const algo = getAlgorithm("bubble-sort")!;
    const summary = runToEnd(algo, { kind: "array", size: 100, distribution: "reversed", seed: 1 }, { maxSteps: 50 });
    expect(summary.stoppedEarly).toBe(true);
    expect(summary.steps).toBe(50);
    expect(summary.last).not.toBeNull();
  });

  it("does not flag a run that ends exactly at the cap", () => {
    const algo = getAlgorithm("linear-search")!;
    const total = runToEnd(algo, algo.meta.defaultInput).steps;
    const summary = runToEnd(algo, algo.meta.defaultInput, { maxSteps: total });
    expect(summary.stoppedEarly).toBe(false);
    expect(summary.steps).toBe(total);
  });
});
