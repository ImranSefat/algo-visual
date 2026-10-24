import { describe, expect, it } from "vitest";
import type { SequenceInputSpec, SequenceOp } from "../core/input";
import { randomSequence } from "../core/randomise";
import type { HashTableState, LinkedListState, QueueState, SlotArrayState, StackState } from "../core/states";
import { getAlgorithm, runAlgorithm } from "../registry";

/** Reference behaviour of each structure, applied to plain arrays. */
const reference: Record<string, (initial: number[], ops: SequenceOp[]) => number[]> = {
  array: (initial, ops) => {
    const a = [...initial];
    for (const op of ops) {
      if (op.op === "insert") {
        const i = op.index ?? a.length;
        if (i >= 0 && i <= a.length) a.splice(i, 0, op.value ?? 0);
      } else if (op.op === "delete") {
        const i = op.index ?? a.length - 1;
        if (i >= 0 && i < a.length) a.splice(i, 1);
      }
    }
    return a;
  },
  "singly-linked-list": listReference,
  "doubly-linked-list": listReference,
  stack: (initial, ops) => {
    const a = initial.slice(0, 8);
    for (const op of ops) {
      if (op.op === "push" && a.length < 8) a.push(op.value ?? 0);
      if (op.op === "pop") a.pop();
    }
    return a;
  },
  queue: (initial, ops) => {
    const a = [...initial];
    for (const op of ops) {
      if (op.op === "enqueue") a.push(op.value ?? 0);
      if (op.op === "dequeue") a.shift();
    }
    return a;
  },
  "hash-table": (initial, ops) => {
    const set = new Set(initial);
    for (const op of ops) {
      if (op.op === "insert") set.add(op.value ?? 0);
      if (op.op === "delete") set.delete(op.value ?? 0);
    }
    return [...set].sort((x, y) => x - y);
  },
};

function listReference(initial: number[], ops: SequenceOp[]): number[] {
  const a = [...initial];
  for (const op of ops) {
    if (op.op === "insert") a.splice(Math.min(op.index ?? a.length, a.length), 0, op.value ?? 0);
    if (op.op === "delete") {
      const i = a.indexOf(op.value ?? 0);
      if (i !== -1) a.splice(i, 1);
    }
  }
  return a;
}

function finalValues(slug: string, state: unknown): number[] {
  switch (slug) {
    case "array": {
      const s = state as SlotArrayState;
      return s.slots.slice(0, s.size).map((x) => x!.value);
    }
    case "singly-linked-list":
    case "doubly-linked-list":
      return (state as LinkedListState).nodes.map((x) => x.value);
    case "stack":
      return (state as StackState).items.map((x) => x.value);
    case "queue":
      return (state as QueueState).items.map((x) => x.value);
    case "hash-table":
      return (state as HashTableState).buckets.flat().map((x) => x.value).sort((x, y) => x - y);
    default:
      throw new Error(slug);
  }
}

describe.each(Object.keys(reference).map((slug) => [slug] as const))("%s", (slug) => {
  const algo = getAlgorithm(slug)!;
  const template = algo.meta.defaultInput as SequenceInputSpec;

  it("default ops match the reference", () => {
    const steps = runAlgorithm(algo, template);
    expect(finalValues(slug, steps.at(-1)!.state)).toEqual(reference[slug](template.initial ?? [], template.ops));
  });

  for (let seed = 1; seed <= 25; seed++) {
    it(`random ops (seed ${seed}) match the reference`, () => {
      const spec = randomSequence(template, seed);
      const steps = runAlgorithm(algo, spec);
      expect(finalValues(slug, steps.at(-1)!.state)).toEqual(reference[slug](spec.initial ?? [], spec.ops));
    });
  }

  it("never leaves a pending node or incoming key at the end", () => {
    const last = runAlgorithm(algo, template).at(-1)!.state as Partial<LinkedListState & HashTableState>;
    expect(last.pending).toBeUndefined();
    expect(last.incoming).toBeUndefined();
  });
});
