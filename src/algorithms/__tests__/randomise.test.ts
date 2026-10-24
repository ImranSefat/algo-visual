import { describe, expect, it } from "vitest";
import type { GraphInputSpec, GridInputSpec, InputSpec } from "../core/input";
import { randomiseSpec } from "../core/randomise";
import { sanitizeSpec } from "../core/validate";
import { algorithmList, getAlgorithm, runAlgorithm } from "../registry";

const seeds = [1, 2, 3, 17, 99, 1234, 98765];

/** Every algorithm must accept every randomised version of its own default input. */
describe.each(algorithmList.map((m) => [m.slug] as const))("%s randomised", (slug) => {
  const algo = getAlgorithm(slug)!;
  for (const seed of seeds) {
    it(`seed ${seed}: valid input and an in-range trace`, () => {
      const spec = randomiseSpec(algo.meta.defaultInput, seed);
      expect(sanitizeSpec(JSON.parse(JSON.stringify(spec)), algo.meta.defaultInput)).not.toBeNull();
      const steps = runAlgorithm(algo, spec);
      const max = algo.meta.source.split("\n").length;
      expect(steps.length).toBeGreaterThan(0);
      for (const s of steps) {
        const [a, b] = Array.isArray(s.line) ? s.line : [s.line, s.line];
        expect(a).toBeGreaterThanOrEqual(1);
        expect(b).toBeLessThanOrEqual(max);
      }
    });
  }
});

describe("grid randomiser", () => {
  it("always leaves a path from start to end", () => {
    const algo = getAlgorithm("bfs-grid")!;
    for (const seed of seeds) {
      const last = runAlgorithm(algo, randomiseSpec(algo.meta.defaultInput, seed) as GridInputSpec).at(-1)!;
      expect(last.vars.pathLength).toBeGreaterThan(0);
    }
  });
});

describe("graph randomiser", () => {
  const reach = (spec: GraphInputSpec) => {
    const adj = new Map<number, number[]>();
    for (const [a, b] of spec.edges) {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      if (!spec.directed) adj.set(b, [...(adj.get(b) ?? []), a]);
    }
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      for (const n of adj.get(stack.pop()!) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    return seen.size;
  };
  it("is connected from node 0, and acyclic when directed", () => {
    for (const slug of ["bfs-graph", "dijkstra-graph", "topological-sort", "prim"]) {
      const base = getAlgorithm(slug)!.meta.defaultInput as InputSpec & GraphInputSpec;
      for (const seed of seeds) {
        const spec = randomiseSpec(base, seed) as GraphInputSpec;
        expect(reach(spec)).toBe(spec.nodes);
        if (spec.directed) for (const [a, b] of spec.edges) expect(a).toBeLessThan(b);
      }
    }
  });
});
