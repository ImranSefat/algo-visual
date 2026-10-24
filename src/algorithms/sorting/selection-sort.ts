import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function selectionSort(a: number[]) {
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[min]) {
        min = j;
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
    }
  }
  return a;
}`;

export const pseudocode = `procedure selectionSort(A)
  for i ← 0 to n − 2 do
    min ← i
    for j ← i + 1 to n − 1 do
      if A[j] < A[min] then
        min ← j
      end if
    end for
    if min ≠ i then
      swap A[i] and A[min]
    end if
  end for
  return A
end procedure`;

export const meta = {
  slug: "selection-sort",
  name: "Selection Sort",
  category: "sorting",
  renderer: "array-bars",
  description:
    "Scans the unsorted suffix for its smallest element and swaps it to the front. After pass i the first i + 1 elements are final, so it makes at most n − 1 swaps — but always n²/2 comparisons.",
  complexity: {
    time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
    space: "O(1)",
    stable: false,
    inPlace: true,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 20, distribution: "random", seed: 11 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons", "swaps"]);
  const a = [...input];
  const n = a.length;
  const sorted = (k: number) => hl("sorted", ...a.slice(0, k).map((x) => x.id));
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, pointers });

  yield t.step(view({}), [], 1, { n }, `Start with ${n} unsorted values`);
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    yield t.step(
      view({ i, min }),
      [hl("current", a[min].id), sorted(i)],
      3,
      { i, min },
      `Assume ${a[i].value} at index ${i} is the smallest of the rest`,
    );
    for (let j = i + 1; j < n; j++) {
      t.count("comparisons");
      yield t.step(
        view({ i, j, min }),
        [hl("compare", a[j].id), hl("current", a[min].id), sorted(i)],
        5,
        { i, j, min },
        `Is ${a[j].value} smaller than the current minimum ${a[min].value}?`,
      );
      if (a[j].value < a[min].value) {
        min = j;
        yield t.step(
          view({ i, j, min }),
          [hl("current", a[min].id), sorted(i)],
          6,
          { i, j, min },
          `Yes — ${a[min].value} is the new minimum`,
        );
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      t.count("swaps");
      yield t.step(
        view({ i, min }),
        [hl("swap", a[i].id, a[min].id), sorted(i)],
        10,
        { i, min },
        `Swap ${a[i].value} into position ${i}`,
      );
    }
    yield t.step(view({ i }), [sorted(i + 1)], 2, { i }, `${a[i].value} is in its final position`);
  }
  yield t.step(view({}), [sorted(n)], 13, { n }, "Sorted");
}
