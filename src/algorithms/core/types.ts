import type { InputKind, InputSpec, ResolvedInput } from "./input";

export type HighlightKind =
  | "compare"
  | "swap"
  | "sorted"
  | "pivot"
  | "range"
  | "current"
  | "visited"
  | "frontier"
  | "path"
  | "wall"
  | "insert"
  | "delete"
  | "found"
  | "notfound";

export type Highlight = { ids: string[]; kind: HighlightKind };

export type StepLine = number | [number, number];

export type StepVars = Record<string, string | number | boolean>;

export type Step<S> = {
  /** Snapshot of the data structure at this moment. Never shares mutable references with other steps. */
  state: S;
  highlights: Highlight[];
  /** 1-based line or inclusive line range in `source` that is executing. */
  line: StepLine;
  /** Live variables shown in the Variables panel. */
  vars: StepVars;
  /** One-sentence plain-English explanation of this step. */
  note: string;
  /** Running counters, cumulative. */
  counters?: Record<string, number>;
};

export type Complexity = {
  time: { best: string; average: string; worst: string };
  space: string;
  stable?: boolean;
  inPlace?: boolean;
};

export type Category = "sorting" | "searching" | "structures" | "graphs" | "dp";

export type RendererKind =
  | "array-bars"
  | "array-bars-aux"
  | "linked-list"
  | "stack"
  | "queue"
  | "hash-table"
  | "tree"
  | "heap"
  | "grid-graph"
  | "node-graph"
  | "dp-table";

export type AlgorithmMeta = {
  slug: string;
  name: string;
  category: Category;
  renderer: RendererKind;
  /** Two or three sentences. */
  description: string;
  complexity: Complexity;
  /** Display source. Same logic as the generator, no yield lines. Line numbers in Steps refer to THIS string. */
  source: string;
  /** Optional pseudocode, line-aligned with `source` (line N describes source line N). */
  pseudocode?: string;
  /** Optional Python version, line-aligned with `source` (blank lines where the TypeScript has closing braces). */
  python?: string;
  defaultInput: InputSpec;
};

/** Array element. Frozen at creation: ids never change when values move. */
export type Item = { readonly id: string; readonly value: number };

export type AlgorithmModule<K extends InputKind = InputKind> = {
  meta: AlgorithmMeta & { defaultInput: Extract<InputSpec, { kind: K }> };
  run: (input: ResolvedInput<K>) => Generator<Step<unknown>>;
};
