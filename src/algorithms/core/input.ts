import { mulberry32, randInt, shuffle } from "./prng";
import type { Item } from "./types";

export type Distribution = "random" | "nearly-sorted" | "reversed" | "few-unique" | "custom";

export type ArrayInputSpec = {
  kind: "array";
  size: number;
  distribution: Distribution;
  custom?: number[];
  seed: number;
};

export type SearchInputSpec = { kind: "search"; array: ArrayInputSpec; target: number };

export type SequenceOpName = "insert" | "delete" | "search" | "push" | "pop" | "enqueue" | "dequeue";

/** `index` is used by positional structures (array insert/delete at index). */
export type SequenceOp = { op: SequenceOpName; value?: number; index?: number };

/** `initial` values are loaded before the first traced op. */
export type SequenceInputSpec = { kind: "sequence"; initial?: number[]; ops: SequenceOp[] };

export type Cell = [row: number, col: number];

export type GridInputSpec = {
  kind: "grid";
  rows: number;
  cols: number;
  walls: Cell[];
  start: Cell;
  end: Cell;
  /** Weighted cells as [row, col, cost]. Unlisted cells cost 1. */
  weights?: [number, number, number][];
};

export type GraphInputSpec = {
  kind: "graph";
  nodes: number;
  /** [from, to, weight?] */
  edges: [number, number, number?][];
  directed: boolean;
  source: number;
  target?: number;
};

export type StringsInputSpec = { kind: "strings"; a: string; b: string };

export type KnapsackInputSpec = { kind: "knapsack"; weights: number[]; values: number[]; capacity: number };

/** Single integer parameter, e.g. Fibonacci's n. */
export type ScalarInputSpec = { kind: "scalar"; n: number };

export type InputSpec =
  | ArrayInputSpec
  | SearchInputSpec
  | SequenceInputSpec
  | GridInputSpec
  | GraphInputSpec
  | StringsInputSpec
  | KnapsackInputSpec
  | ScalarInputSpec;

export type InputKind = InputSpec["kind"];

type ResolvedInputMap = {
  array: Item[];
  search: { items: Item[]; target: number };
  sequence: { initial: number[]; ops: SequenceOp[] };
  grid: Omit<GridInputSpec, "kind">;
  graph: Omit<GraphInputSpec, "kind">;
  strings: Omit<StringsInputSpec, "kind">;
  knapsack: Omit<KnapsackInputSpec, "kind">;
  scalar: Omit<ScalarInputSpec, "kind">;
};

export type ResolvedInput<K extends InputKind = InputKind> = ResolvedInputMap[K];

export const MIN_VALUE = 5;
export const MAX_VALUE = 99;

export function makeItems(values: number[]): Item[] {
  return values.map((value, i) => Object.freeze({ id: `e${i}`, value }));
}

export function generateValues(spec: ArrayInputSpec): number[] {
  const rng = mulberry32(spec.seed);
  const n = spec.size;
  const random = () => Array.from({ length: n }, () => randInt(rng, MIN_VALUE, MAX_VALUE));
  switch (spec.distribution) {
    case "random":
      return random();
    case "nearly-sorted": {
      const values = random().sort((a, b) => a - b);
      const swaps = Math.max(1, Math.round(n / 10));
      for (let k = 0; k < swaps; k++) {
        const i = randInt(rng, 0, n - 1);
        const j = Math.min(n - 1, i + randInt(rng, 1, 3));
        [values[i], values[j]] = [values[j], values[i]];
      }
      return values;
    }
    case "reversed":
      return random().sort((a, b) => b - a);
    case "few-unique": {
      const pool = shuffle(rng, [15, 35, 55, 75, 95]).slice(0, 4);
      return Array.from({ length: n }, () => pool[randInt(rng, 0, pool.length - 1)]);
    }
    case "custom":
      return spec.custom && spec.custom.length > 0 ? [...spec.custom] : random();
  }
}

export function resolveInput<K extends InputKind>(spec: Extract<InputSpec, { kind: K }>): ResolvedInput<K>;
export function resolveInput(spec: InputSpec): ResolvedInput;
export function resolveInput(spec: InputSpec): ResolvedInput {
  switch (spec.kind) {
    case "array":
      return makeItems(generateValues(spec));
    case "search":
      return { items: makeItems(generateValues(spec.array)), target: spec.target };
    case "sequence":
      return { initial: spec.initial ?? [], ops: spec.ops };
    default:
      // The remaining kinds are already plain data; the extra `kind` field is harmless.
      return spec;
  }
}
