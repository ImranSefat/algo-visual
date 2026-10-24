import { createTracer, hl } from "../core/step";
import { countId, type AuxState, type Slot } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function radixSort(a: number[]) {
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const count = new Array(10).fill(0);
    for (const x of a) count[Math.floor(x / exp) % 10]++;
    for (let d = 1; d < 10; d++) count[d] += count[d - 1];
    const out = new Array(a.length);
    for (let i = a.length - 1; i >= 0; i--) {
      out[--count[Math.floor(a[i] / exp) % 10]] = a[i];
    }
    for (let i = 0; i < a.length; i++) a[i] = out[i];
  }
  return a;
}`;

export const pseudocode = `procedure radixSort(A)    ▷ LSD, base 10
  max ← maximum(A)
  for exp ← 1, 10, 100, … while ⌊max / exp⌋ > 0 do
    count ← ten zeros
    for each x in A do count[digit(x, exp)] ← count[digit(x, exp)] + 1
    for d ← 1 to 9 do count[d] ← count[d] + count[d − 1]
    out ← new array of size n
    for i ← n − 1 down to 0 do    ▷ stable counting sort by this digit
      count[digit(A[i], exp)] ← count[digit(A[i], exp)] − 1; out[count[digit(A[i], exp)]] ← A[i]
    end for
    copy out back into A
  end for
  return A
end procedure`;

export const meta = {
  slug: "radix-sort",
  name: "Radix Sort",
  category: "sorting",
  renderer: "array-bars-aux",
  description:
    "Sorts by one decimal digit at a time, least significant first, using a stable counting sort for each digit. Because each pass is stable, ties keep the order the earlier digits produced, and after the last digit the whole array is sorted.",
  complexity: {
    time: { best: "O(d·(n + b))", average: "O(d·(n + b))", worst: "O(d·(n + b))" },
    space: "O(n + b)",
    stable: true,
    inPlace: false,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 20, distribution: "random", seed: 4 },
} satisfies AlgorithmMeta;

const digitName = (exp: number) => (exp === 1 ? "ones" : exp === 10 ? "tens" : exp === 100 ? "hundreds" : `10^${Math.log10(exp)}`);

export function* run(input: Item[]): Generator<Step<AuxState>> {
  const t = createTracer<AuxState>(["passes", "writes"]);
  const n = input.length;
  const main: Slot[] = [...input];
  const out: Slot[] = new Array(n).fill(null);
  let count: number[] = new Array(10).fill(0);
  const max = Math.max(...input.map((x) => x.value));
  const state = (pointers: AuxState["pointers"] = {}, auxPointers: AuxState["auxPointers"] = {}): AuxState => ({
    main,
    aux: out,
    auxLabel: "out",
    counts: count,
    countsBase: 0,
    countsLabel: "digit",
    pointers,
    auxPointers,
  });

  yield t.step(state(), [], 2, { max }, `The largest value ${max} has ${String(max).length} digit${max >= 10 ? "s" : ""}`);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const digit = (x: Item) => Math.floor(x.value / exp) % 10;
    count = new Array(10).fill(0);
    t.count("passes");
    yield t.step(state(), [], [3, 4], { exp }, `Pass on the ${digitName(exp)} digit`);
    for (let i = 0; i < n; i++) {
      const x = main[i]!;
      count[digit(x)]++;
      yield t.step(
        state({ i }),
        [hl("current", x.id), hl("insert", countId(digit(x)))],
        5,
        { exp, i, x: x.value, digit: digit(x) },
        `${x.value} has ${digitName(exp)} digit ${digit(x)}`,
      );
    }
    for (let d = 1; d < 10; d++) count[d] += count[d - 1];
    yield t.step(state(), [hl("range", ...count.map((_, d) => countId(d)))], 6, { exp }, "Prefix sums: where each digit's group ends in the output");
    for (let i = n - 1; i >= 0; i--) {
      const x = main[i]!;
      const pos = --count[digit(x)];
      out[pos] = x;
      main[i] = null;
      t.count("writes");
      yield t.step(
        state({ i }, { pos }),
        [hl("insert", x.id), hl("current", countId(digit(x)))],
        [8, 9],
        { exp, i, x: x.value, digit: digit(x), pos },
        `Place ${x.value} at out[${pos}]`,
      );
    }
    for (let i = 0; i < n; i++) {
      main[i] = out[i];
      out[i] = null;
    }
    t.count("writes", n);
    yield t.step(state(), [], 11, { exp }, `Copy back: now sorted by the last ${String(exp).length} digit${exp > 1 ? "s" : ""}`);
  }
  yield t.step(state(), [hl("sorted", ...main.map((x) => x!.id))], 13, { n }, "Sorted");
}
