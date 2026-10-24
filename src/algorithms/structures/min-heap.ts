import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { HeapState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class MinHeap {
  private a: number[] = [];

  insert(value: number) {
    this.a.push(value);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p] <= this.a[i]) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }

  extractMin() {
    const min = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let s = i;
        if (l < this.a.length && this.a[l] < this.a[s]) s = l;
        if (r < this.a.length && this.a[r] < this.a[s]) s = r;
        if (s === i) break;
        [this.a[i], this.a[s]] = [this.a[s], this.a[i]];
        i = s;
      }
    }
    return min;
  }
}`;

export const pseudocode = `structure MinHeap
  A ← empty array    ▷ A[i]'s children are A[2i+1] and A[2i+2]

  procedure insert(value)
    append value to A
    i ← last index
    while i > 0 do    ▷ sift up
      p ← ⌊(i − 1) / 2⌋
      if A[p] ≤ A[i] then stop
      swap A[p] and A[i]
      i ← p
    end while
  end procedure

  procedure extractMin()
    min ← A[0]
    last ← remove the last element
    if A is not empty then
      A[0] ← last
      i ← 0
      loop    ▷ sift down
        l ← 2i + 1; r ← 2i + 2
        s ← i
        if l exists and A[l] < A[s] then s ← l
        if r exists and A[r] < A[s] then s ← r
        if s = i then stop
        swap A[i] and A[s]
        i ← s
      end loop
    end if
    return min
  end procedure
end structure`;

export const meta = {
  slug: "min-heap",
  name: "Min-Heap",
  category: "structures",
  renderer: "heap",
  description:
    "A complete binary tree stored in an array where every parent is ≤ its children, so the minimum is always at the root. Insert sifts the new value up; extract-min moves the last value to the root and sifts it down. The backbone of priority queues and Dijkstra.",
  complexity: {
    time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [8, 15, 10, 21, 30, 14],
    ops: [
      { op: "insert", value: 3 },
      { op: "insert", value: 12 },
      { op: "pop" },
      { op: "insert", value: 1 },
      { op: "pop" },
      { op: "pop" },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<HeapState>> {
  const t = createTracer<HeapState>(["comparisons", "swaps"]);
  const make = itemFactory("m");
  const a: Item[] = [];
  // Untraced heapify of the starting contents (sift-up insertion).
  for (const v of initial) {
    a.push(make(v));
    for (let i = a.length - 1; i > 0 && a[(i - 1) >> 1].value > a[i].value; i = (i - 1) >> 1) {
      const p = (i - 1) >> 1;
      [a[p], a[i]] = [a[i], a[p]];
    }
  }
  const capacity = initial.length + ops.filter((o) => o.op === "insert" || o.op === "push").length;
  const state = (pointers: HeapState["pointers"] = {}): HeapState => ({ items: a, size: a.length, capacity, pointers });

  yield t.step(state(), a.length ? [hl("found", a[0].id)] : [], 2, { size: a.length }, a.length ? `A min-heap of ${a.length}; the minimum ${a[0].value} sits at the root` : "An empty heap");

  for (const op of ops) {
    if (op.op === "insert" || op.op === "push") {
      const item = make(op.value ?? 0);
      a.push(item);
      let i = a.length - 1;
      yield t.step(state({ i }), [hl("insert", item.id)], [5, 6], { value: item.value, i }, `${opLabel(op)}: append ${item.value} at index ${i}`);
      while (i > 0) {
        const p = (i - 1) >> 1;
        t.count("comparisons");
        yield t.step(state({ i, p }), [hl("compare", a[p].id, a[i].id)], [8, 9], { value: item.value, i, p }, `Is the parent ${a[p].value} ≤ ${a[i].value}?`);
        if (a[p].value <= a[i].value) break;
        [a[p], a[i]] = [a[i], a[p]];
        t.count("swaps");
        yield t.step(state({ i: p }), [hl("swap", a[p].id, a[i].id)], [10, 11], { value: item.value, i: p }, `No — swap: ${a[p].value} moves up`);
        i = p;
      }
      yield t.step(state(), [hl("found", a[0].id)], 13, { size: a.length, min: a[0].value }, `Heap order restored; the minimum is ${a[0].value}`);
    } else if (op.op === "pop" || op.op === "delete") {
      if (a.length === 0) {
        yield t.step(state(), [], 15, { size: 0 }, `${opLabel(op)}: the heap is empty`);
        continue;
      }
      const min = a[0];
      yield t.step(state({ i: 0 }), [hl("found", min.id)], 16, { min: min.value }, `${opLabel(op)}: the minimum is ${min.value}, at the root`);
      const last = a.pop()!;
      if (a.length > 0) {
        a[0] = last;
        yield t.step(state({ i: 0 }), [hl("current", last.id)], [17, 19], { min: min.value, size: a.length }, `Remove ${min.value}; move the last value ${last.value} to the root`);
        let i = 0;
        while (true) {
          const l = 2 * i + 1;
          const r = l + 1;
          let s = i;
          const kids = [l, r].filter((c) => c < a.length);
          if (kids.length === 0) {
            yield t.step(state({ i }), [hl("current", a[i].id)], 26, { i }, `${a[i].value} is a leaf — done`);
            break;
          }
          t.count("comparisons", kids.length);
          yield t.step(state({ i, ...(l < a.length ? { l } : {}), ...(r < a.length ? { r } : {}) }), [hl("compare", ...kids.map((k) => a[k].id)), hl("current", a[i].id)], [22, 25], { i, l, r }, `Compare ${a[i].value} with ${kids.map((k) => a[k].value).join(" and ")}`);
          if (l < a.length && a[l].value < a[s].value) s = l;
          if (r < a.length && a[r].value < a[s].value) s = r;
          if (s === i) {
            yield t.step(state({ i }), [hl("current", a[i].id)], 26, { i }, `${a[i].value} is not larger than its children — stop`);
            break;
          }
          [a[i], a[s]] = [a[s], a[i]];
          t.count("swaps");
          yield t.step(state({ i: s }), [hl("swap", a[i].id, a[s].id)], [27, 28], { i: s }, `Swap: ${a[i].value} moves up, ${a[s].value} sinks`);
          i = s;
        }
      } else {
        yield t.step(state(), [], 17, { min: min.value, size: 0 }, `Remove ${min.value}; the heap is now empty`);
      }
      yield t.step(state(), a.length ? [hl("found", a[0].id)] : [], 31, { returned: min.value, size: a.length }, `Return ${min.value}`);
    } else {
      yield t.step(state(), [], 1, {}, `${opLabel(op)} is not a heap operation — skipped`);
    }
  }
  yield t.step(state(), a.length ? [hl("found", a[0].id)] : [], 1, { size: a.length }, `Done: ${a.length} value${a.length === 1 ? "" : "s"} in the heap`);
}
