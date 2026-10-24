import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";

export const source = `function insertionSort(a: number[]) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}`;

export const pseudocode = `procedure insertionSort(A)
  for i ← 1 to n − 1 do
    key ← A[i]
    j ← i − 1
    while j ≥ 0 and A[j] > key do
      A[j + 1] ← A[j]
      j ← j − 1
    end while
    A[j + 1] ← key
  end for
  return A
end procedure`;

export const meta = {
  slug: "insertion-sort",
  name: "Insertion Sort",
  category: "sorting",
  renderer: "array-bars",
  description:
    "Grows a sorted prefix one element at a time: each new key is shifted left past every larger element until it reaches its place. Very fast on nearly-sorted input, which is why hybrid sorts use it for small runs.",
  complexity: {
    time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
    space: "O(1)",
    stable: true,
    inPlace: true,
  },
  source,
  pseudocode,
  defaultInput: { kind: "array", size: 20, distribution: "random", seed: 3 },
} satisfies AlgorithmMeta;

export function* run(input: Item[]): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons", "shifts"]);
  const a = [...input];
  const n = a.length;
  const prefix = (k: number) => hl("range", ...a.slice(0, k).map((x) => x.id));
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, pointers });

  yield t.step(view({}), n > 0 ? [prefix(1)] : [], 1, { n }, "A single element is already a sorted prefix");
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    yield t.step(view({ i, j }), [hl("current", key.id), prefix(i)], [3, 4], { i, j, key: key.value }, `Pick up key ${key.value}`);
    while (j >= 0) {
      t.count("comparisons");
      yield t.step(
        view({ i, j }),
        [hl("compare", a[j].id), hl("current", key.id), prefix(i + 1)],
        5,
        { i, j, key: key.value },
        `Is ${a[j].value} greater than ${key.value}?`,
      );
      if (a[j].value <= key.value) break;
      // Shifting a[j] right is drawn as the key and a[j] trading places.
      [a[j], a[j + 1]] = [a[j + 1], a[j]];
      t.count("shifts");
      yield t.step(
        view({ i, j }),
        [hl("swap", a[j + 1].id), hl("current", key.id), prefix(i + 1)],
        [6, 7],
        { i, j: j - 1, key: key.value },
        `Shift ${a[j + 1].value} one place right`,
      );
      j--;
    }
    yield t.step(
      view({ i, j: Math.max(j, 0) }),
      [hl("insert", key.id), prefix(i + 1)],
      9,
      { i, j, key: key.value },
      `Insert ${key.value} at index ${j + 1}`,
    );
  }
  yield t.step(view({}), [hl("sorted", ...a.map((x) => x.id))], 11, { n }, "Sorted");
}
