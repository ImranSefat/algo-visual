import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function jumpSearch(a: number[], target: number) {
  const n = a.length;
  const step = Math.floor(Math.sqrt(n));
  let prev = 0, next = step;
  while (next < n && a[next - 1] < target) {
    prev = next;
    next += step;
  }
  for (let i = prev; i < Math.min(next, n); i++) {
    if (a[i] === target) return i;
  }
  return -1;
}`;

export const pseudocode = `procedure jumpSearch(A, target)    ▷ A is sorted
  n ← length(A)
  step ← ⌊√n⌋
  prev ← 0; next ← step
  while next < n and A[next − 1] < target do
    prev ← next
    next ← next + step
  end while
  for i ← prev to min(next, n) − 1 do    ▷ linear scan of one block
    if A[i] = target then return i
  end for
  return −1
end procedure`;

export const meta = {
  slug: "jump-search",
  name: "Jump Search",
  category: "searching",
  renderer: "array-bars",
  description:
    "On a sorted array, jumps ahead √n elements at a time until it overshoots the target, then scans that one block linearly. It sits between linear and binary search, and it only ever moves forward.",
  complexity: { time: { best: "O(1)", average: "O(√n)", worst: "O(√n)" }, space: "O(1)" },
  source,
  pseudocode,
  defaultInput: {
    kind: "search",
    array: { kind: "array", size: 36, distribution: "random", seed: 12 },
    target: 66,
  },
} satisfies AlgorithmMeta;

export function* run({ items, target }: ResolvedInput<"search">): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons"]);
  const a = [...items].sort((x, y) => x.value - y.value);
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.sqrt(n)));
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, target, pointers });
  const block = (from: number, to: number) => hl("range", ...a.slice(from, Math.min(to, n)).map((x) => x.id));
  const skipped = (to: number) => hl("visited", ...a.slice(0, to).map((x) => x.id));

  yield t.step({ items, target, pointers: {} }, [], 1, { target }, "Jump search needs a sorted array…");
  let prev = 0;
  let next = step;
  yield t.step(view({ prev, next: Math.min(next, n) - 1 }), [block(prev, next)], [2, 4], { target, n, step, prev, next }, `…so sort it first. Jump ${step} (≈ √${n}) elements at a time`);
  while (next < n) {
    t.count("comparisons");
    yield t.step(
      view({ prev, "next−1": next - 1 }),
      [hl("current", a[next - 1].id), block(prev, next), skipped(prev)],
      5,
      { target, step, prev, next },
      `Is the block's last value ${a[next - 1].value} < ${target}?`,
    );
    if (a[next - 1].value >= target) break;
    prev = next;
    next += step;
    yield t.step(view({ prev }), [block(prev, next), skipped(prev)], [6, 7], { target, step, prev, next }, `Yes, so jump to the next block, which starts at ${prev}`);
  }
  const end = Math.min(next, n);
  yield t.step(view({ prev, end: end - 1 }), [block(prev, end), skipped(prev)], 9, { target, prev, next }, `Scan the block [${prev}, ${end - 1}] linearly`);
  for (let i = prev; i < end; i++) {
    t.count("comparisons");
    yield t.step(view({ i }), [hl("current", a[i].id), block(prev, end), skipped(prev)], 10, { target, prev, next, i }, `Is a[${i}] = ${a[i].value} equal to ${target}?`);
    if (a[i].value === target) {
      yield t.step(view({ i }), [hl("found", a[i].id), skipped(i)], 10, { target, i, result: i }, `Found ${target} at index ${i}`);
      return;
    }
  }
  yield t.step(view({}), [hl("notfound", ...a.map((x) => x.id))], 12, { target, result: -1 }, `${target} is not in the array`);
}
