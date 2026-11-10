import { z } from "zod";
import { requireAlgorithm, toSpec } from "../input";
import { ANIMATION } from "../limits";
import { compareLink, visualizerLink } from "../links";
import { inputSpec, slug as slugSchema } from "../schemas";
import { defineTool, ToolError } from "../tool";

export const makeLinkTool = defineTool({
  name: "make_link",
  description:
    "Builds a URL that opens the visualizer on an exact input, or compare mode when compareWith names a second algorithm, " +
    "optionally paused at a step. The link is null when the input is bigger than the visualizer animates " +
    `(arrays above ${ANIMATION.maxArraySize} elements).`,
  input: z.object({
    slug: slugSchema,
    compareWith: slugSchema.optional().describe("A second algorithm, to open compare mode with both on the same input."),
    input: inputSpec.optional(),
    step: z.int().min(0).optional().describe("Open paused at this step, counted from 0."),
  }),
  run({ slug, compareWith, input, step }) {
    const algo = requireAlgorithm(slug);
    const spec = toSpec(input, algo);
    if (!compareWith) return { link: visualizerLink(algo, spec, step) };
    const other = requireAlgorithm(compareWith);
    if (other.meta.defaultInput.kind !== algo.meta.defaultInput.kind) {
      throw new ToolError(`${algo.meta.name} and ${other.meta.name} take different input kinds, so they cannot be compared.`);
    }
    return { link: compareLink(algo, other, spec, step) };
  },
});
