import { createTracer, hl } from "../core/step";
import { countId, type AuxState, type Slot } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function countingSort(a: number[]) {
  const min = Math.min(...a), max = Math.max(...a);
  const count = new Array(max - min + 1).fill(0);
  for (const x of a) count[x - min]++;
  for (let v = 1; v < count.length; v++) count[v] += count[v - 1];
  const out = new Array(a.length);
  for (let i = a.length - 1; i >= 0; i--) {
    out[--count[a[i] - min]] = a[i];
  }
  for (let i = 0; i < a.length; i++) a[i] = out[i];
  return a;
}`;

export const pseudocode = `procedure countingSort(A)
  min ← minimum(A); max ← maximum(A)
  count ← array of (max − min + 1) zeros
  for each x in A do count[x − min] ← count[x − min] + 1
  for v ← 1 to max − min do count[v] ← count[v] + count[v − 1]
  out ← new array of size n
  for i ← n − 1 down to 0 do    ▷ backwards keeps it stable
    count[A[i] − min] ← count[A[i] − min] − 1; out[count[A[i] − min]] ← A[i]
  end for
  copy out back into A
  return A
end procedure`;

export const meta = {
  slug: "counting-sort",
  name: "Counting Sort",
  category: "sorting",
  renderer: "array-bars-aux",
  description:
    "Never compares elements: it tallies how often each value occurs, turns the tally into prefix sums (each value's end position), then places every element straight into the output. Linear time when the value range k is small.",
  complexity: {
    time: { best: "O(n + k)", average: "O(n + k)", worst: "O(n + k)" },
    space: "O(n + k)",
    stable: true,
    inPlace: false,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 24, distribution: "few-unique", seed: 9 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<AuxState>> {
  const t = createTracer<AuxState>(["reads", "writes"]);
  const n = input.length;
  const main: Slot[] = [...input];
  const out: Slot[] = new Array(n).fill(null);
  const values = input.map((x) => x.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const count: number[] = new Array(max - min + 1).fill(0);
  const state = (pointers: AuxState["pointers"] = {}, auxPointers: AuxState["auxPointers"] = {}): AuxState => ({
    main,
    aux: out,
    auxLabel: "out",
    counts: count,
    countsBase: min,
    countsLabel: "count",
    pointers,
    auxPointers,
  });

  yield t.step(state(), [], 2, { min, max }, `Values range from ${min} to ${max}`);
  yield t.step(state(), [], 3, { min, max, k: count.length }, `One counter per value: ${count.length} counters, all zero`);
  for (let i = 0; i < n; i++) {
    const x = main[i]!;
    count[x.value - min]++;
    t.count("reads");
    yield t.step(
      state({ i }),
      [hl("current", x.id), hl("insert", countId(x.value - min))],
      4,
      { i, x: x.value, [`count[${x.value - min}]`]: count[x.value - min] },
      `Count ${x.value}: seen ${count[x.value - min]} time${count[x.value - min] === 1 ? "" : "s"}`,
    );
  }
  for (let v = 1; v < count.length; v++) {
    count[v] += count[v - 1];
    // Empty buckets don't change the picture; only narrate the ones that matter.
    if (count[v] === count[v - 1]) continue;
    yield t.step(
      state(),
      [hl("current", countId(v)), hl("range", countId(v - 1))],
      5,
      { v, [`count[${v}]`]: count[v] },
      `Prefix sum: values ≤ ${v + min} end before index ${count[v]}`,
    );
  }
  yield t.step(state(), [], 6, { n }, "Allocate the output array");
  for (let i = n - 1; i >= 0; i--) {
    const x = main[i]!;
    const pos = --count[x.value - min];
    out[pos] = x;
    main[i] = null;
    t.count("writes");
    yield t.step(
      state({ i }, { pos }),
      [hl("insert", x.id), hl("current", countId(x.value - min))],
      [7, 8],
      { i, x: x.value, pos },
      `Place ${x.value} at out[${pos}]`,
    );
  }
  for (let i = 0; i < n; i++) {
    main[i] = out[i];
    out[i] = null;
  }
  t.count("writes", n);
  yield t.step(state(), [hl("sorted", ...main.map((x) => x!.id))], 10, { n }, "Copy the output back — sorted");
  yield t.step(state(), [hl("sorted", ...main.map((x) => x!.id))], 11, { n }, "Sorted without a single comparison");
}
