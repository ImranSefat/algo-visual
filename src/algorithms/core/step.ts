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

export type RunLimits = {
  /** Stop once this many steps have been produced. */
  maxSteps?: number;
  /** Stop once the run has taken this many milliseconds (checked every 256 steps). */
  maxMs?: number;
};

export type RunSummary<S> = {
  /** Steps produced before the generator finished or a limit stopped it. */
  steps: number;
  /** The last step produced, or null when there was none. */
  last: Step<S> | null;
  /** Counters after the last step. */
  counters: Record<string, number>;
  /** True when a limit stopped the run with steps still to come, so `counters` are partial. */
  stoppedEarly: boolean;
};

/**
 * Exhausts a generator keeping only the last step and the counters, so memory stays flat however long the run
 * is. Unlike `collect`, nothing is capped unless `limits` says so, and a run that ends exactly at a cap counts
 * as complete.
 */
export function exhaust<S>(gen: Generator<Step<S>>, limits: RunLimits = {}): RunSummary<S> {
  const { maxSteps = Infinity, maxMs = Infinity } = limits;
  const started = performance.now();
  const summary: RunSummary<S> = { steps: 0, last: null, counters: {}, stoppedEarly: false };
  for (;;) {
    const { done, value } = gen.next();
    if (done) return summary;
    summary.steps++;
    summary.last = value;
    if (value.counters) summary.counters = value.counters;
    const outOfTime = summary.steps % 256 === 0 && performance.now() - started > maxMs;
    if (summary.steps >= maxSteps || outOfTime) {
      summary.stoppedEarly = !gen.next().done;
      return summary;
    }
  }
}
