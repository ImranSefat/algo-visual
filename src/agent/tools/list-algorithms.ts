import { z } from "zod";
import { defineTool, ToolError } from "../tool";

/**
 * TODO: the model calls this first, to learn which algorithms exist and what each one counts.
 *
 *  1. Import `algorithmList` from "@/algorithms/registry" and `counterNames` from "../counters".
 *  2. Keep only the algorithms in `category` when one is given.
 *  3. Return one entry per algorithm: slug, name, category, inputKind (meta.defaultInput.kind), complexity
 *     (meta.complexity has time.best, time.average, time.worst, space, stable and inPlace) and counters.
 *  4. Move this tool from `planned` to `tools` in ./index.ts, and turn the it.todo tests in
 *     src/agent/__tests__/tools.test.ts into real ones. `pnpm agent list_algorithms category=sorting` to try it.
 */
export const listAlgorithmsTool = defineTool({
  name: "list_algorithms",
  description:
    "Lists the algorithms the visualizer has, with the input kind each one takes, its complexity, and the names of the " +
    "counters it reports. Call this first to get valid slugs.",
  input: z.object({
    category: z.enum(["sorting", "searching", "structures", "graphs", "dp"]).optional().describe("Only this category. Omit for all."),
  }),
  run() {
    throw new ToolError("list_algorithms is not built yet (see the TODO in src/agent/tools/list-algorithms.ts).");
  },
});
