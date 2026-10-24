import { describe, expect, it } from "vitest";
import type { SearchInputSpec } from "../core/input";
import { generateValues } from "../core/input";
import { pickTarget } from "../core/randomise";
import { byCategory, getAlgorithm, runAlgorithm } from "../registry";
import type { ArrayView } from "../core/states";

describe.each(byCategory.searching.map((m) => [m.slug] as const))("%s", (slug) => {
  const algo = getAlgorithm(slug)!;

  it("default input finds its target", () => {
    const last = runAlgorithm(algo, algo.meta.defaultInput).at(-1)!;
    expect(last.vars.result).not.toBe(-1);
  });

  for (let seed = 1; seed <= 40; seed++) {
    it(`seed ${seed}: result matches the array`, () => {
      const array = { kind: "array", size: 5 + (seed % 30), distribution: "random", seed } as const;
      const values = generateValues(array);
      const spec: SearchInputSpec = { kind: "search", array, target: pickTarget(values, seed) };
      const steps = runAlgorithm(algo, spec);
      const last = steps.at(-1)!;
      const result = last.vars.result as number;
      const present = values.includes(spec.target);
      if (!present) {
        expect(result).toBe(-1);
        return;
      }
      expect(result).toBeGreaterThanOrEqual(0);
      const items = (last.state as ArrayView).items;
      // Binary and jump search sort first, so check against the array the trace ended on.
      const searched = slug === "linear-search" ? values : [...values].sort((a, b) => a - b);
      expect(searched[result]).toBe(spec.target);
      expect(items.find((x) => last.highlights.some((h) => h.kind === "found" && h.ids.includes(x.id)))?.value).toBe(spec.target);
    });
  }
});
