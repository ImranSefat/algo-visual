import { createTracer, hl } from "../core/step";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function bubbleSort(a: number[]) {
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}`;

export const pseudocode = `procedure bubbleSort(A)
  for i ← 0 to n − 2 do
    swapped ← false
    for j ← 0 to n − i − 2 do
      if A[j] > A[j + 1] then
        swap A[j] and A[j + 1]
        swapped ← true
      end if
    end for
    if not swapped then stop
  end for
  return A
end procedure`;

export const meta = {
  slug: "bubble-sort",
  name: "Bubble Sort",
  category: "sorting",
  renderer: "array-bars",
  description:
    "Repeatedly steps through the list, compares adjacent pairs and swaps them if they are out of order. Each pass bubbles the largest remaining element to the end, and a pass with no swaps means the list is sorted.",
  complexity: {
    time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
    space: "O(1)",
    stable: true,
    inPlace: true,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 24, distribution: "random", seed: 7 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<Item[]>> {
  const t = createTracer<Item[]>(["comparisons", "swaps"]);
  const a = [...input];
  const n = a.length;
  const sortedFrom = (k: number) => hl("sorted", ...a.slice(k).map((x) => x.id));

  yield t.step(a, [], 1, { n }, `Start with ${n} unsorted values`);
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    yield t.step(a, [sortedFrom(n - i)], 3, { i, swapped }, `Pass ${i + 1}: walk the unsorted prefix`);
    for (let j = 0; j < n - i - 1; j++) {
      t.count("comparisons");
      yield t.step(
        a,
        [hl("compare", a[j].id, a[j + 1].id), sortedFrom(n - i)],
        5,
        { i, j, swapped },
        `Compare ${a[j].value} and ${a[j + 1].value}`,
      );
      if (a[j].value > a[j + 1].value) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        t.count("swaps");
        yield t.step(
          a,
          [hl("swap", a[j].id, a[j + 1].id), sortedFrom(n - i)],
          [6, 7],
          { i, j, swapped },
          `Swap: ${a[j + 1].value} moves right past ${a[j].value}`,
        );
      }
    }
    if (!swapped) {
      yield t.step(a, [sortedFrom(0)], 10, { i, swapped }, "No swaps in this pass, so the array is already sorted");
      break;
    }
    yield t.step(a, [sortedFrom(n - 1 - i)], 10, { i, swapped }, `${a[n - 1 - i].value} is in its final position`);
  }
  yield t.step(a, [sortedFrom(0)], 12, { n }, "Sorted");
}
