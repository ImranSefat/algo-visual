import { createTracer, hl } from "../core/step";
import type { AuxState, Slot } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function mergeSort(a: number[]) {
  const n = a.length;
  const aux = new Array(n);
  for (let width = 1; width < n; width *= 2) {
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width;
      const hi = Math.min(lo + 2 * width, n);
      let i = lo, j = mid;
      for (let k = lo; k < hi; k++) {
        if (j >= hi || (i < mid && a[i] <= a[j])) aux[k] = a[i++];
        else aux[k] = a[j++];
      }
      for (let k = lo; k < hi; k++) a[k] = aux[k];
    }
  }
  return a;
}`;

export const pseudocode = `procedure mergeSort(A)    ▷ bottom-up
  n ← length(A)
  aux ← new array of size n
  for width ← 1, 2, 4, … while width < n do
    for each pair of runs starting at lo do
      mid ← lo + width
      hi ← min(lo + 2·width, n)
      i ← lo; j ← mid
      for k ← lo to hi − 1 do
        if right run empty or (left not empty and A[i] ≤ A[j]) then aux[k] ← A[i++]
        else aux[k] ← A[j++]
      end for
      copy aux[lo..hi) back into A[lo..hi)
    end for
  end for
  return A
end procedure`;

export const meta = {
  slug: "merge-sort",
  name: "Merge Sort",
  category: "sorting",
  renderer: "array-bars-aux",
  description:
    "Bottom-up merge sort: runs of width 1, 2, 4, … are merged pairwise into an auxiliary buffer and copied back, doubling the sorted run length each pass. It is always O(n log n) and stable, but it needs O(n) extra space.",
  complexity: {
    time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
    space: "O(n)",
    stable: true,
    inPlace: false,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 16, distribution: "random", seed: 21 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<AuxState>> {
  const t = createTracer<AuxState>(["comparisons", "writes"]);
  const n = input.length;
  const main: Slot[] = [...input];
  const aux: Slot[] = new Array(n).fill(null);
  const state = (pointers: AuxState["pointers"] = {}, auxPointers: AuxState["auxPointers"] = {}): AuxState => ({
    main,
    aux,
    auxLabel: "aux",
    pointers,
    auxPointers,
  });
  const ids = (slots: Slot[], from: number, to: number) =>
    slots.slice(from, to).flatMap((x) => (x ? [x.id] : []));

  yield t.step(state(), [], [2, 3], { n }, `Allocate an auxiliary buffer of ${n} slots`);
  for (let width = 1; width < n; width *= 2) {
    yield t.step(state(), [], 4, { width }, `Merge neighbouring sorted runs of width ${width}`);
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width;
      const hi = Math.min(lo + 2 * width, n);
      let i = lo;
      let j = mid;
      yield t.step(
        state({ lo, mid, hi: hi - 1 }),
        [hl("range", ...ids(main, lo, hi))],
        [5, 8],
        { width, lo, mid, hi },
        `Merge [${lo}, ${mid}) with [${mid}, ${hi})`,
      );
      for (let k = lo; k < hi; k++) {
        const left = i < mid ? main[i]! : null;
        const right = j < hi ? main[j]! : null;
        const pending = hl("range", ...ids(main, lo, hi));
        if (left && right) {
          t.count("comparisons");
          yield t.step(
            state({ i, j }, { k }),
            [hl("compare", left.id, right.id), pending],
            10,
            { width, lo, mid, hi, i, j, k },
            `Compare ${left.value} and ${right.value}`,
          );
        }
        const takeLeft = right === null || (left !== null && left.value <= right.value);
        const item = takeLeft ? left! : right!;
        aux[k] = item;
        if (takeLeft) main[i++] = null;
        else main[j++] = null;
        t.count("writes");
        yield t.step(
          state({ i: Math.min(i, mid - 1), j: Math.min(j, hi - 1) }, { k }),
          [hl("insert", item.id), hl("range", ...ids(main, lo, hi))],
          takeLeft ? 10 : 11,
          { width, lo, mid, hi, i, j, k },
          `${item.value} is the smaller head, so write it to aux[${k}]`,
        );
      }
      for (let k = lo; k < hi; k++) {
        main[k] = aux[k];
        aux[k] = null;
      }
      t.count("writes", hi - lo);
      yield t.step(
        state({ lo, hi: hi - 1 }),
        [hl("sorted", ...ids(main, lo, hi))],
        13,
        { width, lo, mid, hi },
        `Copy the merged run back: [${lo}, ${hi}) is sorted`,
      );
    }
  }
  yield t.step(state(), [hl("sorted", ...ids(main, 0, n))], 16, { n }, "Sorted");
}
