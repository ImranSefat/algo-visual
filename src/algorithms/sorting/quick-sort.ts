import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function quickSort(a: number[], lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const p = partition(a, lo, hi);
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
  return a;
}

function partition(a: number[], lo: number, hi: number) {
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) {
      [a[i], a[j]] = [a[j], a[i]];
      i++;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}`;

export const pseudocode = `procedure quickSort(A, lo, hi)
  if lo ≥ hi then return
  p ← partition(A, lo, hi)
  quickSort(A, lo, p − 1)
  quickSort(A, p + 1, hi)
end procedure

▷ Lomuto partition
procedure partition(A, lo, hi)
  pivot ← A[hi]
  i ← lo
  for j ← lo to hi − 1 do
    if A[j] < pivot then
      swap A[i] and A[j]
      i ← i + 1
    end if
  end for
  swap A[i] and A[hi]
  return i
end procedure`;

export const python = `def quick_sort(a, lo, hi):
    if lo >= hi: return a
    p = partition(a, lo, hi)
    quick_sort(a, lo, p - 1)
    quick_sort(a, p + 1, hi)
    return a


def partition(a, lo, hi):
    pivot = a[hi]
    i = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1


    a[i], a[hi] = a[hi], a[i]
    return i
`;

export const meta = {
  slug: "quick-sort",
  name: "Quick Sort",
  category: "sorting",
  renderer: "array-bars",
  description:
    "Picks the last element as a pivot and partitions the range so smaller elements land to its left (Lomuto scheme); the pivot is then in its final place and both sides are sorted recursively. It is fast in practice, but a bad run of pivots slows it to O(n²).",
  complexity: {
    time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" },
    space: "O(log n)",
    stable: false,
    inPlace: true,
  },
  source,
  pseudocode,
  python,
  defaultInput: { kind: "array", size: 24, distribution: "random", seed: 13 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons", "swaps"]);
  const a = [...input];
  const n = a.length;
  const done = new Set<string>();
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, pointers });
  const finished = () => hl("sorted", ...done);
  const range = (lo: number, hi: number) => hl("range", ...a.slice(lo, hi + 1).map((x) => x.id));

  function* partition(lo: number, hi: number): Generator<Step<ArrayView>, number> {
    const pivot = a[hi];
    let i = lo;
    yield t.step(
      view({ lo, hi, i }),
      [hl("pivot", pivot.id), range(lo, hi), finished()],
      [10, 11],
      { lo, hi, pivot: pivot.value, i },
      `Partition [${lo}, ${hi}] around pivot ${pivot.value}`,
    );
    for (let j = lo; j < hi; j++) {
      t.count("comparisons");
      yield t.step(
        view({ lo, hi, i, j }),
        [hl("compare", a[j].id), hl("pivot", pivot.id), range(lo, hi), finished()],
        13,
        { lo, hi, pivot: pivot.value, i, j },
        `Is ${a[j].value} less than the pivot ${pivot.value}?`,
      );
      if (a[j].value < pivot.value) {
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          t.count("swaps");
        }
        yield t.step(
          view({ lo, hi, i, j }),
          [hl("swap", a[i].id, a[j].id), hl("pivot", pivot.id), range(lo, hi), finished()],
          [14, 15],
          { lo, hi, pivot: pivot.value, i: i + 1, j },
          i === j ? `${a[i].value} stays on the small side` : `Swap ${a[i].value} to the small side`,
        );
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    t.count("swaps");
    done.add(pivot.id);
    yield t.step(
      view({ lo, hi, i }),
      [hl("swap", pivot.id), range(lo, hi), finished()],
      18,
      { lo, hi, pivot: pivot.value, i },
      `Move pivot ${pivot.value} to index ${i}, its final position`,
    );
    return i;
  }

  function* quickSort(lo: number, hi: number): Generator<Step<ArrayView>, void> {
    if (lo >= hi) {
      if (lo === hi) {
        done.add(a[lo].id);
        yield t.step(view({ lo, hi }), [finished()], 2, { lo, hi }, `A single element (${a[lo].value}) is already sorted`);
      }
      return;
    }
    const p = yield* partition(lo, hi);
    yield t.step(view({ lo, p, hi }), [range(lo, p - 1), hl("pivot", a[p].id), finished()], 4, { lo, hi, p }, `Recurse left: [${lo}, ${p - 1}]`);
    yield* quickSort(lo, p - 1);
    yield t.step(view({ lo, p, hi }), [range(p + 1, hi), hl("pivot", a[p].id), finished()], 5, { lo, hi, p }, `Recurse right: [${p + 1}, ${hi}]`);
    yield* quickSort(p + 1, hi);
  }

  yield t.step(view({}), [], 1, { n }, `Start with ${n} unsorted values`);
  yield* quickSort(0, n - 1);
  yield t.step(view({}), [hl("sorted", ...a.map((x) => x.id))], 6, { n }, "Sorted");
}
