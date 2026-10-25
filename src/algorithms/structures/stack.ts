import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { StackState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class Stack {
  private items: number[] = [];
  constructor(private capacity = 8) {}

  push(value: number) {
    if (this.items.length === this.capacity) throw new Error("Stack overflow");
    this.items.push(value);
  }

  pop() {
    if (this.items.length === 0) throw new Error("Stack underflow");
    return this.items.pop()!;
  }

  peek() {
    return this.items[this.items.length - 1];
  }
}`;

export const pseudocode = `structure Stack
  items ← empty list
  capacity ← 8

  procedure push(value)
    if size = capacity then error "overflow"
    place value on top
  end procedure

  procedure pop()
    if size = 0 then error "underflow"
    remove and return the top value
  end procedure

  procedure peek()
    return the top value
  end procedure
end structure`;

const CAPACITY = 8;

export const meta = {
  slug: "stack",
  name: "Stack",
  category: "structures",
  renderer: "stack",
  description:
    "Last in, first out: push adds on top and pop takes from the top, both in O(1). Undo, expression parsing, depth-first search and the call stack itself all use stacks. This one has a fixed capacity, so it can also overflow and underflow.",
  complexity: {
    time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [4, 15],
    ops: [
      { op: "push", value: 23 },
      { op: "push", value: 42 },
      { op: "pop" },
      { op: "push", value: 8 },
      { op: "push", value: 16 },
      { op: "pop" },
      { op: "pop" },
      { op: "push", value: 37 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<StackState>> {
  const t = createTracer<StackState>(["pushes", "pops"]);
  const make = itemFactory("s");
  const items: Item[] = initial.slice(0, CAPACITY).map(make);
  const state = (): StackState => ({ items, capacity: CAPACITY });
  const top = () => items.at(-1);

  yield t.step(state(), top() ? [hl("current", top()!.id)] : [], [2, 3], { size: items.length, capacity: CAPACITY }, items.length ? `A stack of ${items.length}; ${top()!.value} is on top` : "An empty stack");

  for (const op of ops) {
    if (op.op === "push" || op.op === "insert") {
      const value = op.value ?? 0;
      if (items.length === CAPACITY) {
        yield t.step(state(), [hl("notfound", ...items.map((x) => x.id))], 6, { value, size: items.length }, `${opLabel(op)}: the stack is full, so ${value} is rejected (overflow)`);
        continue;
      }
      const item = make(value);
      items.push(item);
      t.count("pushes");
      yield t.step(state(), [hl("insert", item.id)], [6, 7], { value, size: items.length }, `${opLabel(op)}: ${value} goes on top`);
    } else if (op.op === "pop" || op.op === "delete") {
      if (items.length === 0) {
        yield t.step(state(), [], 11, { size: 0 }, `${opLabel(op)}: the stack is empty (underflow)`);
        continue;
      }
      const item = top()!;
      yield t.step(state(), [hl("delete", item.id)], 11, { size: items.length }, `${opLabel(op)}: the top value is ${item.value}`);
      items.pop();
      t.count("pops");
      yield t.step(state(), top() ? [hl("current", top()!.id)] : [], 12, { popped: item.value, size: items.length }, `Return ${item.value}${top() ? `; ${top()!.value} is the new top` : "; the stack is now empty"}`);
    } else if (op.op === "search") {
      yield t.step(state(), top() ? [hl("found", top()!.id)] : [], 16, { top: top()?.value ?? "none" }, top() ? `peek(): only the top (${top()!.value}) is visible` : "peek(): the stack is empty");
    } else {
      yield t.step(state(), [], 1, {}, `Skipping ${opLabel(op)}: it is not a stack operation`);
    }
  }
  yield t.step(state(), [], 1, { size: items.length }, `Done: ${items.length} value${items.length === 1 ? "" : "s"} on the stack`);
}
