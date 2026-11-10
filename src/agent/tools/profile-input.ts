import { z } from "zod";
import { EXPERIMENT } from "../limits";
import { value } from "../schemas";
import { defineTool, ToolError } from "../tool";

/**
 * TODO: describes the user's own data, so the model can pick a matching `distribution` for experiments and
 * explain its choice ("your data is nearly sorted with many repeats").
 *
 *  1. size, min, max and how many distinct values there are (a Set helps).
 *  2. duplicateRatio = 1 - distinct / size.
 *  3. inversions = pairs i < j with values[i] > values[j]; two nested loops are fine at this size.
 *     inversionRatio = inversions / (size * (size - 1) / 2): 0 is sorted, about 0.5 is random, 1 is reversed.
 *  4. A word for it: "sorted", "nearly-sorted", "random" or "reversed", from the inversion ratio.
 *  5. Move the tool from `planned` to `tools` in ./index.ts and turn the it.todo test into a real one.
 */
export const profileInputTool = defineTool({
  name: "profile_input",
  description:
    "Describes a list of values: size, range, how many repeats, and how close to sorted it is (inversion ratio). " +
    "Use it on the user's data before choosing experiments.",
  input: z.object({
    values: z.array(value).min(2).max(EXPERIMENT.maxArraySize).describe("The user's values, in their current order."),
  }),
  run() {
    throw new ToolError("profile_input is not built yet (see the TODO in src/agent/tools/profile-input.ts).");
  },
});
