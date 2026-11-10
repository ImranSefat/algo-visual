import type { ArrayInputSpec, InputSpec, SearchInputSpec } from "@/algorithms/core/input";
import { sanitizeSpec } from "@/algorithms/core/validate";
import { getAlgorithm, type AnyAlgorithm } from "@/algorithms/registry";
import type { ArrayFields, ToolInputSpec } from "./schemas";
import { ToolError } from "./tool";

export function requireAlgorithm(slug: string): AnyAlgorithm {
  const algo = getAlgorithm(slug);
  if (!algo) throw new ToolError(`Unknown algorithm "${slug}". list_algorithms gives every slug.`);
  return algo;
}

/**
 * Turns a validated tool input into the engine's own InputSpec. Fields the tool input leaves out come from the
 * algorithm's default input, and no input at all means the default input.
 */
export function toSpec(input: ToolInputSpec | undefined, algo: AnyAlgorithm): InputSpec {
  const defaults = algo.meta.defaultInput;
  if (!input) return defaults;
  if (input.kind !== defaults.kind) {
    throw new ToolError(`${algo.meta.name} takes a "${defaults.kind}" input, not "${input.kind}".`);
  }
  switch (input.kind) {
    case "array":
      return arraySpec(input, defaults as ArrayInputSpec);
    case "search":
      return { kind: "search", array: arraySpec(input.array ?? {}, (defaults as SearchInputSpec).array), target: input.target };
    default: {
      // The other kinds are small and already shaped like the engine's spec; the site's own validator has the last word.
      const spec = sanitizeSpec(input, defaults);
      if (!spec) throw new ToolError("That input is outside the limits in src/algorithms/core/validate.ts.");
      return spec;
    }
  }
}

/**
 * `custom` wins when given (its length is the size). Otherwise the values are generated from size, distribution
 * and seed, exactly as the site's Distribution control does. The seed is unused with custom values, so it keeps
 * the default and links round-trip exactly.
 */
function arraySpec(input: ArrayFields, defaults: ArrayInputSpec): ArrayInputSpec {
  if (input.custom) {
    return { kind: "array", distribution: "custom", custom: [...input.custom], size: input.custom.length, seed: defaults.seed };
  }
  const distribution = input.distribution ?? defaults.distribution;
  if (distribution === "custom") throw new ToolError('distribution "custom" needs custom values.');
  return { kind: "array", size: input.size ?? defaults.size, distribution, seed: input.seed ?? defaults.seed };
}
