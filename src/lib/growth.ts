import type { ArrayInputSpec, Distribution } from "@/algorithms/core/input";
import { mulberry32, randInt, shuffle } from "@/algorithms/core/prng";
import { runToEnd, type AnyAlgorithm } from "@/algorithms/registry";

/** Array sizes the growth chart measures. */
export const GROWTH_SIZES = [10, 25, 50, 100, 150, 200, 250, 300];

/** Sizes above this are beyond what the animation allows; they only exist to show the trend. */
export const ANIMATION_MAX_SIZE = 150;

/** Input kinds drawn as separate lines, in the order the Distribution control lists them. */
export const GROWTH_DISTRIBUTIONS: Distribution[] = ["random", "nearly-sorted", "reversed", "few-unique"];

/**
 * Seeded runs averaged per size. Reversed and Nearly sorted barely vary and are the slowest to run, and
 * large sizes vary less in relative terms, so those get fewer runs.
 */
export function samplesFor(distribution: Distribution, size: number): number {
  const large = size > ANIMATION_MAX_SIZE;
  if (distribution === "reversed") return large ? 1 : 2;
  // Nearly sorted is almost as slow as Reversed and barely varies between seeds.
  if (distribution === "nearly-sorted") return large ? 1 : 3;
  return large ? 2 : 5;
}

/**
 * The site's own inputs pick values from 5 to 99, so they repeat even in small arrays (a random array of 12
 * already has about a 50% chance of a repeat), which blunts the worst cases (Reversed no longer costs
 * n(n-1)/2). For the chart, Random, Nearly sorted and Reversed use the distinct values 1..n instead, shaped
 * the same way as the Distribution control builds them. Few unique keeps the site's own four values.
 */
function growthSpec(size: number, distribution: Distribution, seed: number): ArrayInputSpec {
  const ascending = Array.from({ length: size }, (_, i) => i + 1);
  const rng = mulberry32(seed);
  let custom: number[] | undefined;
  if (distribution === "random") custom = shuffle(rng, ascending);
  else if (distribution === "reversed") custom = ascending.reverse();
  else if (distribution === "nearly-sorted") {
    custom = ascending;
    const swaps = Math.max(1, Math.round(size / 10));
    for (let k = 0; k < swaps; k++) {
      const i = randInt(rng, 0, size - 1);
      const j = Math.min(size - 1, i + randInt(rng, 1, 3));
      [custom[i], custom[j]] = [custom[j], custom[i]];
    }
  }
  return custom
    ? { kind: "array", size, distribution: "custom", custom, seed }
    : { kind: "array", size, distribution, seed };
}

/** Counter name -> average value at each size, for one distribution. */
export type GrowthSeries = Record<string, number[]>;

export type GrowthData = {
  sizes: number[];
  series: Partial<Record<Distribution, GrowthSeries>>;
};

/**
 * Average final counters of `algo` over `samples` seeded runs on arrays of `size`. The steps are not kept and no
 * cap applies, so large sizes are counted in full instead of being cut off at `MAX_STEPS`.
 */
export function measurePoint(
  algo: AnyAlgorithm,
  size: number,
  distribution: Distribution,
  samples = samplesFor(distribution, size),
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (let sample = 0; sample < samples; sample++) {
    const counters = runToEnd(algo, growthSpec(size, distribution, 101 + sample)).counters;
    for (const [name, value] of Object.entries(counters)) totals[name] = (totals[name] ?? 0) + value;
  }
  for (const name of Object.keys(totals)) totals[name] /= samples;
  return totals;
}

const measured = new Map<string, GrowthData>();

/**
 * Measures every size and distribution. The runs are seeded, so the result is the same for every visitor:
 * call this on the server (at build time) and pass the data to the chart, rather than measuring in the
 * browser. Results are remembered per algorithm so the dev server does not repeat the work on every reload.
 */
export function measureGrowth(algo: AnyAlgorithm): GrowthData {
  const known = measured.get(algo.meta.slug);
  if (known) return known;
  const data: GrowthData = { sizes: GROWTH_SIZES, series: {} };
  GROWTH_SIZES.forEach((size, i) => {
    for (const distribution of GROWTH_DISTRIBUTIONS) {
      const point = measurePoint(algo, size, distribution);
      const series = (data.series[distribution] ??= {});
      for (const [name, value] of Object.entries(point)) {
        (series[name] ??= new Array<number>(GROWTH_SIZES.length).fill(0))[i] = value;
      }
    }
  });
  measured.set(algo.meta.slug, data);
  return data;
}
