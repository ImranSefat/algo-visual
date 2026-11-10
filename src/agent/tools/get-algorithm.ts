import { z } from "zod";
import { defineTool, ToolError } from "../tool";
import { slug as slugSchema } from "../schemas";

/**
 * TODO: everything the model needs to explain one algorithm.
 *
 *  1. `requireAlgorithm(slug)` from "../input" gives the module; `meta` has description, complexity, defaultInput,
 *     source, pseudocode and python.
 *  2. Return description, complexity, inputKind, defaultInput and counters (`counterNames` in "../counters").
 *  3. Add source, pseudocode or python only when `include` asks for it: they are long, and the model pays per token.
 *  4. Move the tool from `planned` to `tools` in ./index.ts and turn the it.todo test into a real one.
 */
export const getAlgorithmTool = defineTool({
  name: "get_algorithm",
  description:
    "Describes one algorithm: what it does, its complexity, the input it takes and the counters it reports. " +
    "Ask for source, pseudocode or python with include when the code itself is needed.",
  input: z.object({
    slug: slugSchema,
    include: z.array(z.enum(["source", "pseudocode", "python"])).optional().describe("Long fields to add to the answer."),
  }),
  run() {
    throw new ToolError("get_algorithm is not built yet (see the TODO in src/agent/tools/get-algorithm.ts).");
  },
});
