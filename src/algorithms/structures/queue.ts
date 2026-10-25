import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { QueueState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class Queue {
  private items: number[] = [];
  private head = 0;

  enqueue(value: number) {
    this.items.push(value);
  }

  dequeue() {
    if (this.head === this.items.length) throw new Error("Queue is empty");
    const value = this.items[this.head];
    this.head++;
    return value;
  }

  get size() {
    return this.items.length - this.head;
  }
}`;

export const pseudocode = `structure Queue
  items ← empty list
  head ← 0    ▷ index of the front

  procedure enqueue(value)
    append value at the rear
  end procedure

  procedure dequeue()
    if the queue is empty then error
    value ← items[head]
    head ← head + 1    ▷ O(1): no shifting
    return value
  end procedure

  function size
    return length − head
  end function
end structure`;

export const meta = {
  slug: "queue",
  name: "Queue",
  category: "structures",
  renderer: "queue",
  description:
    "First in, first out: enqueue joins at the rear and dequeue leaves from the front. Keeping a moving head index instead of shifting the array makes both operations O(1). Breadth-first search, schedulers and buffers all use queues.",
  complexity: {
    time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [7, 19],
    ops: [
      { op: "enqueue", value: 31 },
      { op: "enqueue", value: 4 },
      { op: "dequeue" },
      { op: "enqueue", value: 56 },
      { op: "dequeue" },
      { op: "dequeue" },
      { op: "enqueue", value: 12 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<QueueState>> {
  const t = createTracer<QueueState>(["enqueues", "dequeues"]);
  const make = itemFactory("q");
  const items: Item[] = initial.map(make);
  const state = (): QueueState => ({ items });
  const ends = () => (items.length ? [hl("current", items[0].id)] : []);

  yield t.step(state(), ends(), [2, 3], { size: items.length }, items.length ? `A queue of ${items.length}; ${items[0].value} is at the front` : "An empty queue");

  for (const op of ops) {
    if (op.op === "enqueue" || op.op === "insert" || op.op === "push") {
      const value = op.value ?? 0;
      const item = make(value);
      items.push(item);
      t.count("enqueues");
      yield t.step(state(), [hl("insert", item.id)], [5, 6], { value, size: items.length }, `${opLabel(op)}: ${value} joins at the rear`);
    } else if (op.op === "dequeue" || op.op === "delete" || op.op === "pop") {
      if (items.length === 0) {
        yield t.step(state(), [], 10, { size: 0 }, `${opLabel(op)}: the queue is empty`);
        continue;
      }
      const item = items[0];
      yield t.step(state(), [hl("delete", item.id)], 11, { size: items.length }, `${opLabel(op)}: ${item.value} is at the front`);
      items.shift();
      t.count("dequeues");
      yield t.step(state(), ends(), [12, 13], { dequeued: item.value, size: items.length }, `head moves on: ${item.value} leaves${items.length ? `, ${items[0].value} is the new front` : " and the queue is empty"}`);
    } else if (op.op === "search") {
      yield t.step(state(), ends(), 17, { size: items.length }, `${items.length} value${items.length === 1 ? "" : "s"} waiting${items.length ? `; the front is ${items[0].value}` : ""}`);
    } else {
      yield t.step(state(), [], 1, {}, `Skipping ${opLabel(op)}: it is not a queue operation`);
    }
  }
  yield t.step(state(), ends(), 1, { size: items.length }, `Done: ${items.length} value${items.length === 1 ? "" : "s"} in the queue`);
}
