import { resolveInput, type InputKind, type InputSpec, type ResolvedInput } from "./core/input";
import { collect } from "./core/step";
import type { AlgorithmMeta, AlgorithmModule, Category, Step } from "./core/types";

import * as bubbleSort from "./sorting/bubble-sort";

/** Any registered algorithm, discriminated by its input kind. */
export type AnyAlgorithm = { [K in InputKind]: AlgorithmModule<K> }[InputKind];

const modules: AnyAlgorithm[] = [bubbleSort];

export const algorithms: Record<string, AnyAlgorithm> = Object.fromEntries(
  modules.map((m) => [m.meta.slug, m]),
);

export const algorithmList: AlgorithmMeta[] = modules.map((m) => m.meta);

export const byCategory = algorithmList.reduce(
  (acc, meta) => {
    acc[meta.category].push(meta);
    return acc;
  },
  { sorting: [], searching: [], structures: [], graphs: [], dp: [] } as Record<Category, AlgorithmMeta[]>,
);

export function getAlgorithm(slug: string): AnyAlgorithm | undefined {
  return algorithms[slug];
}

export function algorithmHref(meta: Pick<AlgorithmMeta, "category" | "slug">): string {
  return `/${meta.category}/${meta.slug}`;
}

/** Resolves `spec` and exhausts the algorithm into a timeline. */
export function runAlgorithm(algo: AnyAlgorithm, spec: InputSpec): Step<unknown>[] {
  const run = algo.run as (input: ResolvedInput) => Generator<Step<unknown>>;
  return collect(run(resolveInput(spec)));
}
