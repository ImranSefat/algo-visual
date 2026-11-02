import { resolveInput, type ArrayInputSpec, type Distribution, type ResolvedInput } from "@/algorithms/core/input";
import type { Step } from "@/algorithms/core/types";
import type { AnyAlgorithm } from "@/algorithms/registry";

/** Array sizes the growth chart measures. */
export const GROWTH_SIZES = [10, 25, 50, 100, 150, 200, 300, 400];

/** Sizes above this are beyond what the animation allows; they only exist to show the trend. */
export const ANIMATION_MAX_SIZE = 150;

/** Input kinds drawn as separate lines, in the order the Distribution control lists them. */
export const GROWTH_DISTRIBUTIONS: Distribution[] = ["random", "nearly-sorted", "reversed", "few-unique"];

/**
 * Seeded runs averaged per size. Reversed input barely varies and is the slowest to run, and large sizes
 * vary less in relative terms, so both get fewer runs.
 */
export function samplesFor(distribution: Distribution, size: number): number {
  const large = size > ANIMATION_MAX_SIZE;
  if (distribution === "reversed") return large ? 1 : 2;
  return large ? 2 : 5;
}

/**
 * Counters after the last step. Unlike `runAlgorithm`, the steps are not kept and `MAX_STEPS` does not
 * apply, so large sizes are counted in full instead of being cut off at the cap.
 */
function finalCounters(algo: AnyAlgorithm, spec: ArrayInputSpec): Record<string, number> {
  const run = algo.run as (input: ResolvedInput) => Generator<Step<unknown>>;
  let counters: Record<string, number> = {};
  for (const step of run(resolveInput(spec))) if (step.counters) counters = step.counters;
  return counters;
}

/** Counter name -> average value at each size, for one distribution. */
export type GrowthSeries = Record<string, number[]>;

export type GrowthData = {
  sizes: number[];
  /** How many of `sizes` are measured so far; the chart draws progressively. */
  done: number;
  series: Partial<Record<Distribution, GrowthSeries>>;
};

/** Average final counters of `algo` over `samples` seeded runs on arrays of `size`. */
export function measurePoint(
  algo: AnyAlgorithm,
  size: number,
  distribution: Distribution,
  samples = samplesFor(distribution, size),
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (let sample = 0; sample < samples; sample++) {
    const counters = finalCounters(algo, { kind: "array", size, distribution, seed: 101 + sample });
    for (const [name, value] of Object.entries(counters)) totals[name] = (totals[name] ?? 0) + value;
  }
  for (const name of Object.keys(totals)) totals[name] /= samples;
  return totals;
}

/**
 * Measures every size and distribution, calling `onProgress` after each size so the chart can draw as it
 * goes. Yields to the browser between sizes; resolves to null if `isCancelled()` turns true part-way.
 */
export async function measureGrowth(
  algo: AnyAlgorithm,
  isCancelled: () => boolean,
  onProgress?: (data: GrowthData) => void,
): Promise<GrowthData | null> {
  const data: GrowthData = { sizes: GROWTH_SIZES, done: 0, series: {} };
  for (let i = 0; i < GROWTH_SIZES.length; i++) {
    for (const distribution of GROWTH_DISTRIBUTIONS) {
      const point = measurePoint(algo, GROWTH_SIZES[i], distribution);
      const series = (data.series[distribution] ??= {});
      for (const [name, value] of Object.entries(point)) {
        (series[name] ??= new Array<number>(GROWTH_SIZES.length).fill(0))[i] = value;
      }
    }
    data.done = i + 1;
    onProgress?.({ ...data });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (isCancelled()) return null;
  }
  return data;
}
