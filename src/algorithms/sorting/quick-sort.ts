import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, HighlightKind, Item, Step } from "../core/types";

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
  variablesFirst: true,
  defaultInput: { kind: "array", size: 24, distribution: "random", seed: 13 },
} satisfies AlgorithmMeta;

const LEGEND: NonNullable<ArrayView["legend"]> = [
  { label: "Waiting" },
  { kind: "span", label: "Current range" },
  { kind: "swap", label: "Just swapped" },
  { kind: "sorted", label: "In final position" },
];

const POINTER_KINDS: Record<string, HighlightKind> = { pivot: "pivot", i: "boundary", j: "compare" };

const POINTER_NOTES: Record<string, string> = {
  pivot: "compared against",
  i: "swap if j < pivot",
  j: "being checked",
};

export function* run(input: Item[]): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons", "swaps"]);
  const a = [...input];
  const n = a.length;
  const done = new Set<string>();
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({
    items: a,
    pointers,
    pointerNotes: Object.fromEntries(Object.entries(POINTER_NOTES).filter(([label]) => !!pointers && label in pointers)),
    pointerKinds: POINTER_KINDS,
    legend: LEGEND,
  });
  const finished = () => hl("sorted", ...done);
  const range = (lo: number, hi: number) => hl("span", ...a.slice(lo, hi + 1).map((x) => x.id));

  // The very first partition introduces pivot, i and j one at a time; later partitions skip straight in.
  let introduced = false;

  function* partition(lo: number, hi: number): Generator<Step<ArrayView>, number> {
    const pivot = a[hi];
    let i = lo;
    if (!introduced) {
      introduced = true;
      yield t.step(
        view({ lo, hi, pivot: hi }),
        [hl("pivot", pivot.id), range(lo, hi), finished()],
        10,
        { lo, hi, pivot: pivot.value },
        `pivot = ${pivot.value}: the last value in the range. Every other value will be compared against it`,
      );
      yield t.step(
        view({ lo, hi, pivot: hi, i }),
        [hl("boundary", a[i].id), hl("pivot", pivot.id), range(lo, hi), finished()],
        11,
        { lo, hi, pivot: pivot.value, i },
        `i = ${i}: the edge of the "less than pivot" section. Everything left of i will be smaller than the pivot (nothing yet)`,
      );
      yield t.step(
        view({ lo, hi, pivot: hi, i, j: lo }),
        [hl("compare", a[lo].id), hl("boundary", a[i].id), hl("pivot", pivot.id), range(lo, hi), finished()],
        12,
        { lo, hi, pivot: pivot.value, i, j: lo },
        `j = ${lo}: the value being checked. j walks right one slot at a time, up to the slot before the pivot`,
      );
    } else {
      yield t.step(
        view({ lo, hi, pivot: hi, i }),
        [hl("boundary", a[i].id), hl("pivot", pivot.id), range(lo, hi), finished()],
        [10, 11],
        { lo, hi, pivot: pivot.value, i },
        `Partition [${lo}, ${hi}] around pivot ${pivot.value}`,
      );
    }
    for (let j = lo; j < hi; j++) {
      t.count("comparisons");
      yield t.step(
        view({ lo, hi, pivot: hi, i, j }),
        [hl("compare", a[j].id), hl("boundary", a[i].id), hl("pivot", pivot.id), range(lo, hi), finished()],
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
          view({ lo, hi, pivot: hi, i: i + 1, j }),
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
      view({ lo, hi, pivot: i, i }),
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
