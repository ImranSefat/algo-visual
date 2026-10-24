import { describe, expect, it } from "vitest";
import type { SequenceInputSpec, SequenceOp } from "../core/input";
import { randomSequence } from "../core/randomise";
import type { HeapState, TreeState } from "../core/states";
import { getAlgorithm, runAlgorithm } from "../registry";

function inorder(state: TreeState, id = state.root): number[] {
  if (!id) return [];
  const n = state.nodes[id];
  const [l, r] = n.children;
  return [...inorder(state, l), Number(n.label), ...inorder(state, r)];
}

function height(state: TreeState, id: string | null): number {
  if (!id) return 0;
  const [l, r] = state.nodes[id].children;
  return 1 + Math.max(height(state, l), height(state, r));
}

function balanced(state: TreeState, id = state.root): boolean {
  if (!id) return true;
  const [l, r] = state.nodes[id].children;
  return Math.abs(height(state, l) - height(state, r)) <= 1 && balanced(state, l) && balanced(state, r);
}

function keySet(spec: SequenceInputSpec): number[] {
  const set = new Set(spec.initial ?? []);
  for (const op of spec.ops) {
    if (op.op === "insert") set.add(op.value ?? 0);
    if (op.op === "delete") set.delete(op.value ?? 0);
  }
  return [...set].sort((a, b) => a - b);
}

const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

describe.each([["bst"], ["avl-tree"]])("%s", (slug) => {
  const algo = getAlgorithm(slug)!;
  const template = algo.meta.defaultInput as SequenceInputSpec;
  const check = (spec: SequenceInputSpec) => {
    const steps = runAlgorithm(algo, spec);
    const last = steps.at(-1)!.state as TreeState;
    expect(inorder(last)).toEqual(keySet(spec));
    if (slug === "avl-tree") expect(balanced(last)).toBe(true);
    // Every state is a well-formed binary tree whose in-order walk is sorted.
    for (const step of steps) {
      const keys = inorder(step.state as TreeState);
      expect([...keys].sort((a, b) => a - b)).toEqual(keys);
    }
    return steps;
  };

  it("default ops", () => {
    check(template);
  });

  for (const seed of seeds) {
    it(`random ops (seed ${seed})`, () => {
      check(randomSequence(template, seed));
    });
  }

  it("sorted inserts stay balanced only for AVL", () => {
    const ops: SequenceOp[] = Array.from({ length: 15 }, (_, i) => ({ op: "insert", value: i + 1 }));
    const last = runAlgorithm(algo, { kind: "sequence", initial: [], ops }).at(-1)!.state as TreeState;
    expect(height(last, last.root)).toBe(slug === "avl-tree" ? 4 : 15);
  });
});

describe("avl-tree rotations", () => {
  it("names every rotation case in the default trace", () => {
    const algo = getAlgorithm("avl-tree")!;
    const notes = runAlgorithm(algo, algo.meta.defaultInput).map((s) => s.note).join("\n");
    for (const name of ["Left-Left", "Right-Right", "Left-Right", "Right-Left", "Right rotate at", "Left rotate at"]) {
      expect(notes).toContain(name);
    }
  });
});

describe("trie", () => {
  const algo = getAlgorithm("trie")!;
  const words = (state: TreeState) => {
    const out: string[] = [];
    const walk = (id: string, prefix: string) => {
      const n = state.nodes[id];
      if (n.terminal) out.push(prefix);
      for (const c of n.children) if (c) walk(c, prefix + state.nodes[c].label);
    };
    if (state.root) walk(state.root, "");
    return out.sort();
  };
  for (const seed of [0, ...seeds]) {
    it(`stores exactly the inserted words (seed ${seed})`, () => {
      const spec = seed === 0 ? (algo.meta.defaultInput as SequenceInputSpec) : randomSequence(algo.meta.defaultInput as SequenceInputSpec, seed);
      const steps = runAlgorithm(algo, spec);
      const inserted = [...new Set(spec.ops.filter((o) => o.op === "insert").map((o) => o.word!))].sort();
      expect(words(steps.at(-1)!.state as TreeState)).toEqual(inserted);
      // Each search ends with result = whether the word was inserted before it.
      const seen = new Set<string>();
      const results = steps.filter((s) => "result" in s.vars && "word" in s.vars).map((s) => [s.vars.word, s.vars.result]);
      const expected: [string, boolean][] = [];
      for (const op of spec.ops) {
        if (op.op === "insert") seen.add(op.word!);
        else expected.push([op.word!, seen.has(op.word!)]);
      }
      expect(results).toEqual(expected);
    });
  }
});

describe("min-heap", () => {
  const algo = getAlgorithm("min-heap")!;
  const template = algo.meta.defaultInput as SequenceInputSpec;
  for (const seed of [0, ...seeds]) {
    it(`keeps heap order and contents (seed ${seed})`, () => {
      const spec = seed === 0 ? template : randomSequence(template, seed);
      const steps = runAlgorithm(algo, spec);
      const ref = [...(spec.initial ?? [])];
      const popped: number[] = [];
      for (const op of spec.ops) {
        if (op.op === "insert") ref.push(op.value ?? 0);
        if (op.op === "pop" && ref.length) {
          const min = Math.min(...ref);
          ref.splice(ref.indexOf(min), 1);
          popped.push(min);
        }
      }
      const last = steps.at(-1)!.state as HeapState;
      const a = last.items.map((x) => x.value);
      expect([...a].sort((x, y) => x - y)).toEqual([...ref].sort((x, y) => x - y));
      for (let i = 1; i < a.length; i++) expect(a[(i - 1) >> 1]).toBeLessThanOrEqual(a[i]);
      expect(steps.filter((s) => "returned" in s.vars).map((s) => s.vars.returned)).toEqual(popped);
    });
  }
});
