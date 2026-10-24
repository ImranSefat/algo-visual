import { describe, expect, it } from "vitest";
import type { ArrayInputSpec, Distribution } from "../core/input";
import { generateValues } from "../core/input";
import type { Item } from "../core/types";
import { byCategory, getAlgorithm, runAlgorithm } from "../registry";

/** Final array of a sorting trace, whatever the renderer's state shape. */
function finalValues(state: unknown): number[] {
  if (Array.isArray(state)) return (state as Item[]).map((x) => x.value);
  const s = state as { main?: (Item | null)[]; items?: Item[] };
  const arr = s.main ?? s.items ?? [];
  return arr.map((x) => {
    if (!x) throw new Error("hole left in final array");
    return x.value;
  });
}

const distributions: Distribution[] = ["random", "nearly-sorted", "reversed", "few-unique"];
const sizes = [1, 2, 3, 10, 37];

describe.each(byCategory.sorting.map((m) => [m.slug] as const))("%s", (slug) => {
  const algo = getAlgorithm(slug)!;

  for (const distribution of distributions) {
    for (const size of sizes) {
      it(`sorts ${distribution} n=${size}`, () => {
        const spec: ArrayInputSpec = { kind: "array", size, distribution, seed: size * 31 + 7 };
        const steps = runAlgorithm(algo, spec);
        const expected = generateValues(spec).sort((a, b) => a - b);
        expect(finalValues(steps.at(-1)!.state)).toEqual(expected);
      });
    }
  }

  it("keeps item ids stable (a permutation of the input)", () => {
    const steps = runAlgorithm(algo, algo.meta.defaultInput);
    const ids = (s: unknown) => {
      const arr = Array.isArray(s) ? s : ((s as { main?: Item[]; items?: Item[] }).main ?? (s as { items: Item[] }).items);
      return (arr as Item[]).map((x) => x.id).sort();
    };
    expect(ids(steps.at(-1)!.state)).toEqual(ids(steps[0].state));
  });
});
