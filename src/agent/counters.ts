import { runToEnd, type AnyAlgorithm } from "@/algorithms/registry";

/**
 * What each counter measures, in words an answer can use. Tools return raw counters and never add them up: a
 * swap is not a shift is not a write. This table is what tells the model which counters mean the same thing.
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
  // TODO: add swaps, shifts, writes, reads and passes from the counters table, one entry each.
  // Say what one unit is (a swap moves two elements, a shift moves one...) and which names can be compared.
};

/** What `name` measures, for tool output; a plain fallback until the table covers it. */
export function describeCounter(name: string): string {
  return COUNTERS[name]?.measures ?? `${name} (not described yet, see src/agent/counters.ts)`;
}

/** Names of the counters `algo` reports, read off a run of its default input. */
export function counterNames(algo: AnyAlgorithm): string[] {
  return Object.keys(runToEnd(algo, algo.meta.defaultInput).counters);
}
