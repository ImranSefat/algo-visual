import { createTracer, hl } from "../core/step";
import type { HeapState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function heapSort(a: number[]) {
  const n = a.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(a, i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(a, 0, end);
  }
  return a;
}

function siftDown(a: number[], i: number, size: number) {
  while (true) {
    const l = 2 * i + 1, r = l + 1;
    let largest = i;
    if (l < size && a[l] > a[largest]) largest = l;
    if (r < size && a[r] > a[largest]) largest = r;
    if (largest === i) return;
    [a[i], a[largest]] = [a[largest], a[i]];
    i = largest;
  }
}`;

export const pseudocode = `procedure heapSort(A)
  n ← length(A)
  for i ← ⌊n/2⌋ − 1 down to 0 do siftDown(A, i, n)    ▷ build max-heap
  for end ← n − 1 down to 1 do
    swap A[0] and A[end]    ▷ max goes to the back
    siftDown(A, 0, end)
  end for
  return A
end procedure

procedure siftDown(A, i, size)
  loop
    l ← 2i + 1; r ← l + 1
    largest ← i
    if l < size and A[l] > A[largest] then largest ← l
    if r < size and A[r] > A[largest] then largest ← r
    if largest = i then return
    swap A[i] and A[largest]
    i ← largest
  end loop
end procedure`;

export const meta = {
  slug: "heap-sort",
  name: "Heap Sort",
  category: "sorting",
  renderer: "heap",
  description:
    "Arranges the array as a binary max-heap, then repeatedly swaps the root (the maximum) to the end and sifts the new root down to restore the heap. In-place and O(n log n) in every case, though not stable.",
  complexity: {
    time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
    space: "O(1)",
    stable: false,
    inPlace: true,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 15, distribution: "random", seed: 17 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<HeapState>> {
  const t = createTracer<HeapState>(["comparisons", "swaps"]);
  const a = [...input];
  const n = a.length;
  let size = n;
  const state = (pointers: HeapState["pointers"] = {}): HeapState => ({ items: a, size, pointers });
  const tail = () => hl("sorted", ...a.slice(size).map((x) => x.id));

  function* siftDown(start: number, phase: "build" | "sort"): Generator<Step<HeapState>, void> {
    let i = start;
    const line = phase === "build" ? 3 : 6;
    yield t.step(state({ i }), [hl("current", a[i].id), tail()], line, { i, size }, `Sift ${a[i].value} down from index ${i}`);
    while (true) {
      const l = 2 * i + 1;
      const r = l + 1;
      let largest = i;
      const children = [l, r].filter((c) => c < size);
      if (children.length === 0) {
        yield t.step(state({ i }), [hl("current", a[i].id), tail()], 17, { i, size }, `${a[i].value} is a leaf — heap property holds`);
        return;
      }
      t.count("comparisons", children.length);
      yield t.step(
        state({ i, l, ...(r < size ? { r } : {}) }),
        [hl("compare", ...children.map((c) => a[c].id)), hl("current", a[i].id), tail()],
        [13, 16],
        { i, l, r, size },
        `Compare ${a[i].value} with its children ${children.map((c) => a[c].value).join(" and ")}`,
      );
      if (l < size && a[l].value > a[largest].value) largest = l;
      if (r < size && a[r].value > a[largest].value) largest = r;
      if (largest === i) {
        yield t.step(state({ i }), [hl("current", a[i].id), tail()], 17, { i, largest, size }, `${a[i].value} is not smaller than its children — stop`);
        return;
      }
      [a[i], a[largest]] = [a[largest], a[i]];
      t.count("swaps");
      yield t.step(
        state({ i, largest }),
        [hl("swap", a[i].id, a[largest].id), tail()],
        [18, 19],
        { i, largest, size },
        `Swap ${a[largest].value} down below ${a[i].value}`,
      );
      i = largest;
    }
  }

  yield t.step(state(), [], 2, { n }, `Treat the ${n} values as a complete binary tree`);
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* siftDown(i, "build");
  yield t.step(state(), [hl("found", a[0]?.id ?? "")], 3, { n }, n > 0 ? `Max-heap built: the root ${a[0].value} is the maximum` : "Empty input");
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    t.count("swaps");
    size = end;
    yield t.step(state({ end }), [hl("swap", a[0].id, a[end].id), tail()], 5, { end, size }, `Move the maximum ${a[end].value} to index ${end}`);
    yield* siftDown(0, "sort");
  }
  size = 0;
  yield t.step(state(), [hl("sorted", ...a.map((x) => x.id))], 8, { n }, "Sorted");
}
