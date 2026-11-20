import { runToEnd, type AnyAlgorithm } from "@/algorithms/registry";

/**
 * What each counter measures, in words an answer can use. Tools return raw counters and never add them up or turn
 * one into another: a swap is not a write. This table is what tells the model which counters mean the same thing.
 *
 * Shifts and swaps are the same event on this site: Insertion and Shell Sort draw each shift as two elements trading
 * places (see insertion-sort.ts), so Insertion Sort's shifts equal Bubble Sort's swaps on the same input.
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
  swaps: { measures: "one exchange of two elements", comparableWith: ["swaps", "shifts"] },
  shifts: {
    measures: "one exchange of two elements to move a value towards its place (neighbours in Insertion Sort, a gap apart in Shell Sort)",
    comparableWith: ["shifts", "swaps"],
  },
  // Each sort writes in its own pattern (Merge copies back after each merge, Counting and Radix fill an output
  // array and copy it back), so the counters table compares writes across algorithms only loosely.
  writes: {
    measures: "one value written into an array, the temporary one or back into the original; each sort writes in its own pattern, so compare writes across algorithms only roughly",
    comparableWith: ["writes"],
  },
  // Only Counting Sort reads and only Radix Sort makes passes, so these have nothing to compare with.
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
