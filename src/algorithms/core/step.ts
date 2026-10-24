import type { Highlight, HighlightKind, Step, StepLine, StepVars } from "./types";

/** Hard cap so a pathological input can never hang the tab. */
export const MAX_STEPS = 60_000;

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep copy of `state` for a Step. Arrays and plain objects are copied recursively;
 * frozen objects (e.g. `Item`) are immutable, so they are shared rather than copied.
 * Anything else (Map, Set, typed arrays) goes through `structuredClone`.
 *
 * Sharing frozen leaves keeps O(n²) sorts at n=150 (~17k steps) to a few MB
 * instead of the ~150 MB a full `structuredClone` per step would cost.
 */
export function snapshot<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) return value.map(snapshot) as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) out[key] = snapshot(value[key]);
    return out as T;
  }
  return structuredClone(value);
}

export function hl(kind: HighlightKind, ...ids: string[]): Highlight {
  return { kind, ids };
}

export type Tracer<S> = {
  count(name: string, by?: number): void;
  step(state: S, highlights: Highlight[], line: StepLine, vars?: StepVars, note?: string): Step<S>;
};

/** Builds Steps with snapshotted state and cumulative counters. `counters` are shown from step 0. */
export function createTracer<S>(counters: string[] = []): Tracer<S> {
  const totals: Record<string, number> = Object.fromEntries(counters.map((name) => [name, 0]));
  const hasCounters = () => Object.keys(totals).length > 0;
  return {
    count(name, by = 1) {
      totals[name] = (totals[name] ?? 0) + by;
    },
    step(state, highlights, line, vars = {}, note = "") {
      return {
        state: snapshot(state),
        highlights,
        line,
        vars: { ...vars },
        note,
        counters: hasCounters() ? { ...totals } : undefined,
      };
    },
  };
}

/** Exhausts a generator into a timeline. */
export function collect<S>(gen: Generator<Step<S>>): Step<S>[] {
  const steps: Step<S>[] = [];
  for (const step of gen) {
    steps.push(step);
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}
