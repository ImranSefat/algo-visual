import { createSerializer, parseAsString } from "nuqs";
import { resolveInput, type InputSpec } from "@/algorithms/core/input";
import { sanitizeSpec } from "@/algorithms/core/validate";
import { algorithmHref, type AnyAlgorithm } from "@/algorithms/registry";
import { queryFromSpec, urlParsers } from "@/lib/url-state";

/** Where links point. Set ALGO_VISUAL_URL to point them at a dev server, for example http://localhost:3000. */
export const SITE_URL = (process.env.ALGO_VISUAL_URL ?? "https://algo-visual-iota.vercel.app").replace(/\/+$/, "");

/** The same parsers the pages use (src/lib/url-state.ts), so a link built here is exactly what the page reads back. */
const toQuery = createSerializer(urlParsers);
const toCompareQuery = createSerializer({ a: parseAsString, b: parseAsString, ...urlParsers });

/** JSON with sorted keys, so two values compare by meaning rather than by key order. */
function canon(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v,
  );
}

/**
 * True when opening `spec` in the visualizer plays exactly this input. The page passes the URL through
 * `sanitizeSpec`, which clamps experiment sizes down to the animation limits, so a run that went past them has
 * no honest link.
 */
export function isPlayable(spec: InputSpec, algo: AnyAlgorithm): boolean {
  const onSite = sanitizeSpec(spec, algo.meta.defaultInput);
  return onSite !== null && canon(resolveInput(onSite)) === canon(resolveInput(spec));
}

/** URL that opens the visualizer on `spec`, paused at `step` when given; null when the input is not playable. */
export function visualizerLink(algo: AnyAlgorithm, spec: InputSpec, step?: number): string | null {
  if (!isPlayable(spec, algo)) return null;
  return SITE_URL + toQuery(algorithmHref(algo.meta), { ...queryFromSpec(spec), step: step ?? null });
}

/** URL that opens compare mode with `a` on the left and `b` on the right, both on `spec`; null when not playable. */
export function compareLink(a: AnyAlgorithm, b: AnyAlgorithm, spec: InputSpec, step?: number): string | null {
  if (!isPlayable(spec, a)) return null;
  return SITE_URL + toCompareQuery("/compare", { a: a.meta.slug, b: b.meta.slug, ...queryFromSpec(spec), step: step ?? null });
}
