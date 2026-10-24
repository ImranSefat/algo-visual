import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function binarySearch(a: number[], target: number) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`;

export const pseudocode = `procedure binarySearch(A, target)    ▷ A is sorted
  lo ← 0; hi ← n − 1
  while lo ≤ hi do
    mid ← ⌊(lo + hi) / 2⌋
    if A[mid] = target then return mid
    if A[mid] < target then lo ← mid + 1
    else hi ← mid − 1
  end while
  return −1
end procedure`;

export const meta = {
  slug: "binary-search",
  name: "Binary Search",
  category: "searching",
  renderer: "array-bars",
  description:
    "On a sorted array, compares the target with the middle of the remaining range and throws away the half that cannot contain it. Each comparison halves the search space, so even a million elements take about 20 steps.",
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  source,
  pseudocode,
  defaultInput: {
    kind: "search",
    array: { kind: "array", size: 32, distribution: "random", seed: 8 },
    target: 64,
  },
} satisfies AlgorithmMeta;

export function* run({ items, target }: ResolvedInput<"search">): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons"]);
  // Binary search needs sorted input; ids are kept so the bars glide into order.
  const a = [...items].sort((x, y) => x.value - y.value);
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, target, pointers });
  const range = (lo: number, hi: number) => hl("range", ...a.slice(lo, hi + 1).map((x) => x.id));
  const out = (lo: number, hi: number) => hl("visited", ...a.filter((_, k) => k < lo || k > hi).map((x) => x.id));

  yield t.step({ items, target, pointers: {} }, [], 1, { target }, "Binary search needs a sorted array…");
  let lo = 0;
  let hi = a.length - 1;
  yield t.step(view({ lo, hi }), [range(lo, hi)], 2, { target, lo, hi }, `…so sort it first. Search the whole range [${lo}, ${hi}]`);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    t.count("comparisons");
    yield t.step(
      view({ lo, mid, hi }),
      [hl("current", a[mid].id), range(lo, hi), out(lo, hi)],
      [4, 5],
      { target, lo, mid, hi },
      `Middle of [${lo}, ${hi}] is index ${mid}: is ${a[mid].value} = ${target}?`,
    );
    if (a[mid].value === target) {
      yield t.step(view({ mid }), [hl("found", a[mid].id), out(mid, mid)], 5, { target, lo, mid, hi, result: mid }, `Found ${target} at index ${mid}`);
      return;
    }
    if (a[mid].value < target) {
      lo = mid + 1;
      yield t.step(view({ lo, mid, hi }), [range(lo, hi), out(lo, hi)], 6, { target, lo, mid, hi }, `${a[mid].value} < ${target}: discard the left half`);
    } else {
      hi = mid - 1;
      yield t.step(view({ lo, mid, hi }), [range(lo, hi), out(lo, hi)], 7, { target, lo, mid, hi }, `${a[mid].value} > ${target}: discard the right half`);
    }
  }
  yield t.step(view({}), [hl("notfound", ...a.map((x) => x.id))], 9, { target, lo, hi, result: -1 }, `The range is empty — ${target} is not in the array`);
}
