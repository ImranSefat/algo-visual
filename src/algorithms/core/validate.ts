import type {
  ArrayInputSpec,
  Cell,
  Distribution,
  GraphInputSpec,
  GridInputSpec,
  InputSpec,
  SequenceOp,
  SequenceOpName,
} from "./input";

/** Hard limits for every input kind. UI controls and URL parsing both enforce these. */
export const LIMITS = {
  arraySize: [5, 150],
  customLength: [2, 150],
  value: [1, 999],
  ops: 40,
  initial: 40,
  gridRows: [5, 30],
  gridCols: [5, 50],
  graphNodes: [2, 14],
  stringLength: 14,
  knapsackItems: 8,
  capacity: [1, 25],
  scalar: [1, 30],
} as const;

export const DISTRIBUTIONS: readonly Distribution[] = ["random", "nearly-sorted", "reversed", "few-unique", "custom"];
const OPS: readonly SequenceOpName[] = ["insert", "delete", "search", "push", "pop", "enqueue", "dequeue"];

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const inRange = (v: unknown, [lo, hi]: readonly [number, number]): v is number => isInt(v) && v >= lo && v <= hi;
const clampInt = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) =>
  isInt(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Parses "3, 14, 15 92" into values, or explains what is wrong. */
export function parseValues(
  text: string,
  [minLen, maxLen]: readonly [number, number] = LIMITS.customLength,
): { values: number[] } | { error: string } {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length < minLen) return { error: `Enter at least ${minLen} values` };
  if (parts.length > maxLen) return { error: `At most ${maxLen} values` };
  const values = parts.map(Number);
  const [lo, hi] = LIMITS.value;
  const bad = parts.find((p, i) => !inRange(values[i], LIMITS.value) || !/^\d+$/.test(p));
  if (bad !== undefined) return { error: `"${bad}" is not a whole number from ${lo} to ${hi}` };
  return { values };
}

function sanitizeArray(v: unknown, fallback: ArrayInputSpec): ArrayInputSpec {
  if (!isObj(v)) return fallback;
  const distribution = DISTRIBUTIONS.includes(v.distribution as Distribution) ? (v.distribution as Distribution) : fallback.distribution;
  const custom = Array.isArray(v.custom) && v.custom.every((x) => inRange(x, LIMITS.value)) ? (v.custom as number[]) : undefined;
  if (distribution === "custom" && custom && custom.length >= LIMITS.customLength[0] && custom.length <= LIMITS.customLength[1]) {
    return { kind: "array", distribution, custom, size: custom.length, seed: clampInt(v.seed, [0, 2 ** 31], fallback.seed) };
  }
  return {
    kind: "array",
    distribution: distribution === "custom" ? "random" : distribution,
    size: clampInt(v.size, LIMITS.arraySize, fallback.size),
    seed: clampInt(v.seed, [0, 2 ** 31], fallback.seed),
  };
}

function sanitizeCell(v: unknown, rows: number, cols: number): Cell | null {
  return Array.isArray(v) && inRange(v[0], [0, rows - 1]) && inRange(v[1], [0, cols - 1]) ? [v[0], v[1]] : null;
}

function sanitizeOps(v: unknown): SequenceOp[] | null {
  if (!Array.isArray(v) || v.length > LIMITS.ops) return null;
  const ops: SequenceOp[] = [];
  for (const raw of v) {
    if (!isObj(raw) || !OPS.includes(raw.op as SequenceOpName)) return null;
    const op: SequenceOp = { op: raw.op as SequenceOpName };
    if (raw.value !== undefined) {
      if (!inRange(raw.value, [-999, 999])) return null;
      op.value = raw.value;
    }
    if (raw.index !== undefined) {
      if (!inRange(raw.index, [0, 999])) return null;
      op.index = raw.index;
    }
    ops.push(op);
  }
  return ops;
}

/**
 * Coerces untrusted input (URL, pasted JSON) into a valid spec of the same kind as `fallback`,
 * or returns null when it cannot be salvaged.
 */
export function sanitizeSpec(value: unknown, fallback: InputSpec): InputSpec | null {
  if (!isObj(value) || value.kind !== fallback.kind) return null;
  switch (fallback.kind) {
    case "array":
      return sanitizeArray(value, fallback);
    case "search":
      return {
        kind: "search",
        array: sanitizeArray(value.array, fallback.array),
        target: clampInt(value.target, [0, 999], fallback.target),
      };
    case "sequence": {
      const ops = sanitizeOps(value.ops);
      if (!ops) return null;
      const initial =
        Array.isArray(value.initial) && value.initial.length <= LIMITS.initial && value.initial.every((x) => inRange(x, [-999, 999]))
          ? (value.initial as number[])
          : (fallback.initial ?? []);
      return { kind: "sequence", initial, ops };
    }
    case "grid": {
      const rows = clampInt(value.rows, LIMITS.gridRows, fallback.rows);
      const cols = clampInt(value.cols, LIMITS.gridCols, fallback.cols);
      const start = sanitizeCell(value.start, rows, cols);
      const end = sanitizeCell(value.end, rows, cols);
      if (!start || !end) return null;
      const walls = Array.isArray(value.walls)
        ? value.walls.map((w) => sanitizeCell(w, rows, cols)).filter((w): w is Cell => w !== null)
        : [];
      const weights = Array.isArray(value.weights)
        ? value.weights.flatMap((w) => {
            const cell = sanitizeCell(w, rows, cols);
            return cell && Array.isArray(w) && inRange(w[2], [1, 99]) ? [[cell[0], cell[1], w[2]] as [number, number, number]] : [];
          })
        : undefined;
      const spec: GridInputSpec = { kind: "grid", rows, cols, walls, start, end };
      if (weights) spec.weights = weights;
      return spec;
    }
    case "graph": {
      const nodes = clampInt(value.nodes, LIMITS.graphNodes, fallback.nodes);
      if (!Array.isArray(value.edges)) return null;
      const edges = value.edges.flatMap((e) => {
        if (!Array.isArray(e) || !inRange(e[0], [0, nodes - 1]) || !inRange(e[1], [0, nodes - 1]) || e[0] === e[1]) return [];
        const edge: [number, number, number?] = [e[0], e[1]];
        if (e[2] !== undefined) {
          if (!inRange(e[2], [1, 99])) return [];
          edge.push(e[2]);
        }
        return [edge];
      });
      const spec: GraphInputSpec = {
        kind: "graph",
        nodes,
        edges,
        directed: typeof value.directed === "boolean" ? value.directed : fallback.directed,
        source: clampInt(value.source, [0, nodes - 1], 0),
      };
      if (value.target !== undefined) spec.target = clampInt(value.target, [0, nodes - 1], nodes - 1);
      return spec;
    }
    case "strings": {
      const clean = (s: unknown, f: string) =>
        typeof s === "string" ? s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LIMITS.stringLength) : f;
      return { kind: "strings", a: clean(value.a, fallback.a), b: clean(value.b, fallback.b) };
    }
    case "knapsack": {
      const list = (v: unknown, f: number[]) =>
        Array.isArray(v) && v.length >= 1 && v.length <= LIMITS.knapsackItems && v.every((x) => inRange(x, [1, 99]))
          ? (v as number[])
          : f;
      const weights = list(value.weights, fallback.weights);
      const values = list(value.values, fallback.values);
      if (weights.length !== values.length) return null;
      return { kind: "knapsack", weights, values, capacity: clampInt(value.capacity, LIMITS.capacity, fallback.capacity) };
    }
    case "scalar":
      return { kind: "scalar", n: clampInt(value.n, LIMITS.scalar, fallback.n) };
  }
}
