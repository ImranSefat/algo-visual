import { runToEnd, type AnyAlgorithm } from "@/algorithms/registry";

/**
 * What each counter measures, in words an answer can use. Tools return raw counters and never add them up: a
 * swap is not a shift is not a write. This table is what tells the model which counters mean the same thing.
 *
 * Insertion Sort's shifts equal Bubble Sort's swaps on the same input because both count its inversions, not because
 * they are the same operation: a shift writes one slot (`a[j + 1] = a[j]`), a swap writes two.
 *
 * Source: the counters table for the sorting algorithms (November 2026). Searching, structure and graph counters
 * can be added the same way later.
 */
export type CounterInfo = {
  /** One unit of this counter, in a few words. */
  measures: string;
  /** Counter names that measure the same thing, so values can be compared across algorithms. */
  comparableWith: string[];
};

export const COUNTERS: Partial<Record<string, CounterInfo>> = {
  comparisons: { measures: "one comparison of two values", comparableWith: ["comparisons"] },
  swaps: { measures: "one exchange of two elements", comparableWith: ["swaps"] },
  shifts: {
    measures: "one value moved to another slot: one place over in Insertion Sort and the Dynamic Array, gap places in Shell Sort",
    comparableWith: ["shifts"],
  },
  // Writes leave out work that has no counter: Counting Sort walks its whole value range (max - min + 1), and both
  // Counting and Radix Sort update a count array for every value. So the counters table compares writes only loosely.
  writes: {
    measures:
      "one element placed into the output or aux array, or copied back; writes leave out other work (Counting and Radix Sort also update a count array), so compare writes across algorithms only roughly",
    comparableWith: ["writes"],
  },
  // Only Counting Sort reports reads (Radix Sort also reads every value on each pass but has no counter for it), and
  // only Radix Sort reports passes, so these have nothing to compare with yet.
  reads: { measures: "one value read to count it", comparableWith: ["reads"] },
  passes: { measures: "one pass over all the values, sorting them by one digit", comparableWith: ["passes"] },
};

/** What `name` measures, for tool output; a plain fallback until the table covers it. */
export function describeCounter(name: string): string {
  return COUNTERS[name]?.measures ?? `${name} (not described yet, see src/agent/counters.ts)`;
}

/** Names of the counters `algo` reports, read off a run of its default input. */
export function counterNames(algo: AnyAlgorithm): string[] {
  return Object.keys(runToEnd(algo, algo.meta.defaultInput).counters);
}
