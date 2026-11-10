import { MAX_STEPS } from "@/algorithms/core/step";
import { LIMITS } from "@/algorithms/core/validate";

/**
 * What the visualizer can play. `LIMITS` (src/algorithms/core/validate.ts) caps every input the site accepts and
 * `MAX_STEPS` caps the animation length.
 */
export const ANIMATION = {
  maxArraySize: LIMITS.arraySize[1],
  maxSteps: MAX_STEPS,
} as const;

/**
 * What an experiment may do beyond that. A tool only needs the final counters, not the animation, so it may run
 * bigger arrays, within a step cap and a time budget so one call can never run away. A run that goes past the
 * animation limits reports its counters but gets no link.
 */
export const EXPERIMENT = {
  /** Largest array a tool will run. */
  maxArraySize: 500,
  /** Hard cap on steps for one run. Bubble Sort on 500 reversed values takes about 250,000. */
  maxSteps: 1_000_000,
  /** Time budget for one run, in milliseconds. */
  timeBudgetMs: 5000,
} as const;
