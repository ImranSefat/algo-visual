import { z } from "zod";
import type { Item } from "@/algorithms/core/types";
import { runToEnd } from "@/algorithms/registry";
import { describeCounter } from "../counters";
import { requireAlgorithm, toSpec } from "../input";
import { ANIMATION, EXPERIMENT } from "../limits";
import { visualizerLink } from "../links";
import { inputSpec, slug as slugSchema } from "../schemas";
import { defineTool } from "../tool";

/** Values of an array-shaped final state: a bare item array, a view with `items`, or an aux state with `main`. */
function finalValues(state: unknown): number[] | undefined {
  const view = state as { items?: unknown; main?: unknown } | null;
  const candidate = Array.isArray(state) ? state : (view?.items ?? view?.main);
  if (!Array.isArray(candidate)) return undefined;
  const values = (candidate as (Item | null)[]).map((item) => item?.value);
  return values.every((v) => typeof v === "number") ? (values as number[]) : undefined;
}

/**
 * The worked example for every other tool: validate with the schema, build the engine's spec, run to the end
 * without keeping steps, and report counters plus a link that plays the same run.
 */
export const runAlgorithmTool = defineTool({
  name: "run_algorithm",
  description:
    "Runs one algorithm on an input and measures the work it did: the algorithm's own counters (such as comparisons and swaps), " +
    "the number of animation steps, and the final state. Counters measure different things for different algorithms, " +
    "so only compare counters that share a name, and never add different counters together. " +
    `animationSteps is how long the visualizer's animation is (it plays at most ${ANIMATION.maxSteps}), not a measure of work. ` +
    "Omit input to use the algorithm's default input. link opens this exact run in the visualizer; it is null when the input " +
    `is bigger than the visualizer animates (arrays above ${ANIMATION.maxArraySize} elements, allowed up to ${EXPERIMENT.maxArraySize}).`,
  input: z.object({ slug: slugSchema, input: inputSpec.optional() }),
  run({ slug, input }) {
    const algo = requireAlgorithm(slug);
    const spec = toSpec(input, algo);
    const run = runToEnd(algo, spec, { maxSteps: EXPERIMENT.maxSteps, maxMs: EXPERIMENT.timeBudgetMs });
    return {
      slug,
      name: algo.meta.name,
      category: algo.meta.category,
      /** The exact input that ran, with every default filled in. */
      input: spec,
      counters: run.counters,
      counterMeaning: Object.fromEntries(Object.keys(run.counters).map((name) => [name, describeCounter(name)])),
      animationSteps: run.steps,
      /** True when the step cap or the time budget stopped the run, so the counters are partial. */
      stoppedEarly: run.stoppedEarly,
      result: {
        note: run.last?.note ?? "",
        vars: run.last?.vars ?? {},
        values: finalValues(run.last?.state),
      },
      link: run.stoppedEarly ? null : visualizerLink(algo, spec),
    };
  },
});
