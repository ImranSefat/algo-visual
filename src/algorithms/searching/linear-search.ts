import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { ArrayView } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";

export const source = `function linearSearch(a: number[], target: number) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === target) return i;
  }
  return -1;
}`;

export const pseudocode = `procedure linearSearch(A, target)
  for i ← 0 to n − 1 do
    if A[i] = target then return i
  end for
  return −1
end procedure`;

export const meta = {
  slug: "linear-search",
  name: "Linear Search",
  category: "searching",
  renderer: "array-bars",
  description:
    "Checks every element from left to right until it finds the target or runs out of array. Works on unsorted data and needs no preprocessing, but may look at all n elements.",
  complexity: { time: { best: "O(1)", average: "O(n)", worst: "O(n)" }, space: "O(1)" },
  source,
  pseudocode,
  defaultInput: {
    kind: "search",
    array: { kind: "array", size: 20, distribution: "random", seed: 8 },
    target: 25,
  },
} satisfies AlgorithmMeta;

export function* run({ items, target }: ResolvedInput<"search">): Generator<Step<ArrayView>> {
  const t = createTracer<ArrayView>(["comparisons"]);
  const a = items;
  const view = (pointers: ArrayView["pointers"]): ArrayView => ({ items: a, target, pointers });
  const checked = (k: number) => hl("visited", ...a.slice(0, k).map((x) => x.id));

  yield t.step(view({}), [], 1, { target }, `Look for ${target} from the left`);
  for (let i = 0; i < a.length; i++) {
    t.count("comparisons");
    yield t.step(view({ i }), [hl("current", a[i].id), checked(i)], 3, { target, i }, `Is a[${i}] = ${a[i].value} equal to ${target}?`);
    if (a[i].value === target) {
      yield t.step(view({ i }), [hl("found", a[i].id), checked(i)], 3, { target, i, result: i }, `Found ${target} at index ${i}`);
      return;
    }
  }
  yield t.step(view({}), [hl("notfound", ...a.map((x) => x.id))], 5, { target, result: -1 }, `${target} is not in the array`);
}
