import { parseAsArrayOf, parseAsInteger, parseAsJson, parseAsStringLiteral, type Values } from "nuqs";
import type { ArrayInputSpec, InputSpec } from "@/algorithms/core/input";
import { DISTRIBUTIONS, sanitizeSpec } from "@/algorithms/core/validate";

/**
 * Shareable URL state. Array-shaped inputs use short readable keys (`?n=24&seed=7&dist=random`);
 * every other input kind round-trips through `in` as JSON. `step` is written only while paused.
 */
export const urlParsers = {
  n: parseAsInteger,
  seed: parseAsInteger,
  dist: parseAsStringLiteral(DISTRIBUTIONS),
  custom: parseAsArrayOf(parseAsInteger),
  target: parseAsInteger,
  in: parseAsJson((value: unknown) => value),
  step: parseAsInteger,
};

export type UrlQuery = Values<typeof urlParsers>;
type SpecQuery = Omit<UrlQuery, "step">;

const EMPTY: SpecQuery = { n: null, seed: null, dist: null, custom: null, target: null, in: null };

function arrayFromQuery(q: UrlQuery, defaults: ArrayInputSpec): ArrayInputSpec {
  return {
    kind: "array",
    size: q.n ?? defaults.size,
    seed: q.seed ?? defaults.seed,
    distribution: q.dist ?? (q.custom ? "custom" : defaults.distribution),
    ...(q.custom ? { custom: q.custom } : {}),
  };
}

/** The spec encoded in the URL, validated against the algorithm's input kind; null if the URL has none. */
export function specFromQuery(q: UrlQuery, defaults: InputSpec): InputSpec | null {
  switch (defaults.kind) {
    case "array":
      if (q.n === null && q.seed === null && q.dist === null && q.custom === null) return null;
      return sanitizeSpec(arrayFromQuery(q, defaults), defaults);
    case "search":
      if (q.n === null && q.seed === null && q.dist === null && q.custom === null && q.target === null) return null;
      return sanitizeSpec(
        { kind: "search", array: arrayFromQuery(q, defaults.array), target: q.target ?? defaults.target },
        defaults,
      );
    default:
      return q.in === null ? null : sanitizeSpec(q.in, defaults);
  }
}

function arrayToQuery(spec: ArrayInputSpec): Partial<SpecQuery> {
  return spec.distribution === "custom" && spec.custom
    ? { custom: spec.custom, dist: "custom" }
    : { n: spec.size, seed: spec.seed, dist: spec.distribution };
}

/** URL values for `spec`; keys it doesn't use are cleared. */
export function queryFromSpec(spec: InputSpec): SpecQuery {
  switch (spec.kind) {
    case "array":
      return { ...EMPTY, ...arrayToQuery(spec) };
    case "search":
      return { ...EMPTY, ...arrayToQuery(spec.array), target: spec.target };
    default:
      return { ...EMPTY, in: spec };
  }
}
