import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function shellSort(a: number[]) {
  for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < a.length; i++) {
      const temp = a[i];
      let j = i;
      while (j >= gap && a[j - gap] > temp) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = temp;
    }
  }
  return a;
}`;

export const pseudocode = `procedure shellSort(A)
  for gap ← ⌊n / 2⌋, ⌊gap / 2⌋, … while gap > 0 do
    for i ← gap to n − 1 do
      temp ← A[i]
      j ← i
      while j ≥ gap and A[j − gap] > temp do
        A[j] ← A[j − gap]
        j ← j − gap
      end while
      A[j] ← temp
    end for
  end for
  return A
end procedure`;

export const meta = {
  slug: "shell-sort",
  name: "Shell Sort",
  category: "sorting",
  renderer: "array-bars",
  description:
    "An insertion sort over interleaved sub-arrays: elements gap apart are sorted first, then the gap shrinks until it is 1. Early long-distance moves mean the final insertion-sort pass has very little left to do.",
  complexity: {
    time: { best: "O(n log n)", average: "O(n^1.5)", worst: "O(n²)" },
    space: "O(1)",
    stable: false,
    inPlace: true,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 32, distribution: "random", seed: 5 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons", "shifts"]);
  const a = [...input];
  const n = a.length;
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, pointers });
  /** The interleaved sub-array that `i` belongs to for this gap. */
  const lane = (i: number, gap: number) => {
    const ids: string[] = [];
    for (let k = i % gap; k < n; k += gap) ids.push(a[k].id);
    return hl("range", ...ids);
  };

  yield t.step(view({}), [], 1, { n }, `Start with ${n} unsorted values`);
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    yield t.step(view({}), [], 2, { gap }, `Gap ${gap}: sort every ${gap === 1 ? "element (plain insertion sort)" : `sub-array of elements ${gap} apart`}`);
    for (let i = gap; i < n; i++) {
      const temp = a[i];
      let j = i;
      yield t.step(view({ i, j }), [hl("current", temp.id), lane(i, gap)], [4, 5], { gap, i, j, temp: temp.value }, `Take ${temp.value} and insert it into its lane`);
      while (j >= gap) {
        t.count("comparisons");
        yield t.step(
          view({ i, j, "j−gap": j - gap }),
          [hl("compare", a[j - gap].id), hl("current", temp.id), lane(i, gap)],
          6,
          { gap, i, j, temp: temp.value },
          `Is ${a[j - gap].value} greater than ${temp.value}?`,
        );
        if (a[j - gap].value <= temp.value) break;
        [a[j], a[j - gap]] = [a[j - gap], a[j]];
        t.count("shifts");
        yield t.step(
          view({ i, j: j - gap }),
          [hl("swap", a[j].id, temp.id), lane(i, gap)],
          [7, 8],
          { gap, i, j: j - gap, temp: temp.value },
          `Move ${a[j].value} ${gap} place${gap === 1 ? "" : "s"} right`,
        );
        j -= gap;
      }
      yield t.step(view({ i, j }), [hl("insert", temp.id), lane(i, gap)], 10, { gap, i, j, temp: temp.value }, `Place ${temp.value} at index ${j}`);
    }
  }
  yield t.step(view({}), [hl("sorted", ...a.map((x) => x.id))], 13, { n }, "Sorted");
}
