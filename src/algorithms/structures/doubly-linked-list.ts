import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { LinkedListState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class Node {
  prev: Node | null = null;
  next: Node | null = null;
  constructor(public value: number) {}
}

class DoublyLinkedList {
  head: Node | null = null;
  tail: Node | null = null;
  length = 0;

  insert(value: number, index: number) {
    const node = new Node(value);
    if (!this.head || !this.tail) {
      this.head = this.tail = node;
    } else if (index === 0) {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    } else if (index >= this.length) {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    } else {
      let cur = this.head;
      for (let i = 0; i < index; i++) cur = cur.next!;
      node.prev = cur.prev;
      node.next = cur;
      cur.prev!.next = node;
      cur.prev = node;
    }
    this.length++;
  }

  delete(value: number) {
    let cur = this.head;
    while (cur && cur.value !== value) cur = cur.next;
    if (!cur) return false;
    if (cur.prev) cur.prev.next = cur.next;
    else this.head = cur.next;
    if (cur.next) cur.next.prev = cur.prev;
    else this.tail = cur.prev;
    this.length--;
    return true;
  }

  search(value: number) {
    let cur = this.head;
    while (cur) {
      if (cur.value === value) return cur;
      cur = cur.next;
    }
    return null;
  }
}`;

export const pseudocode = `structure Node
  prev ← null
  next ← null
  value
end structure

structure DoublyLinkedList
  head ← null
  tail ← null
  length ← 0

  procedure insert(value, index)
    node ← new Node(value)
    if the list is empty then
      head ← tail ← node
    else if index = 0 then
      node.next ← head
      head.prev ← node
      head ← node
    else if index ≥ length then    ▷ O(1) append via tail
      node.prev ← tail
      tail.next ← node
      tail ← node
    else
      cur ← head
      advance cur index times
      node.prev ← cur.prev
      node.next ← cur
      cur.prev.next ← node
      cur.prev ← node
    end if
    length ← length + 1
  end procedure

  procedure delete(value)
    cur ← head
    while cur ≠ null and cur.value ≠ value do cur ← cur.next
    if cur = null then return false
    if cur.prev ≠ null then cur.prev.next ← cur.next
    else head ← cur.next
    if cur.next ≠ null then cur.next.prev ← cur.prev
    else tail ← cur.prev
    length ← length − 1
    return true
  end procedure

  procedure search(value)
    cur ← head
    while cur ≠ null do
      if cur.value = value then return cur
      cur ← cur.next
    end while
    return null
  end procedure
end structure`;

export const meta = {
  slug: "doubly-linked-list",
  name: "Doubly Linked List",
  category: "structures",
  renderer: "linked-list",
  description:
    "Every node links both to its successor and its predecessor, and the list keeps a tail pointer. That makes appends and removals of a known node O(1), at the cost of one extra pointer per node and twice the rewiring on every edit.",
  complexity: {
    time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [14, 36, 7],
    ops: [
      { op: "insert", value: 52 },
      { op: "insert", value: 21, index: 2 },
      { op: "insert", value: 3, index: 0 },
      { op: "delete", value: 36 },
      { op: "search", value: 52 },
      { op: "delete", value: 52 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<LinkedListState>> {
  const t = createTracer<LinkedListState>(["hops", "relinks"]);
  const make = itemFactory("d");
  const nodes: Item[] = initial.map(make);
  let pending: LinkedListState["pending"];
  let pointers: LinkedListState["pointers"] = {};
  const state = (): LinkedListState => ({
    nodes,
    doubly: true,
    pending,
    pointers: { head: nodes[0]?.id ?? null, tail: nodes.at(-1)?.id ?? null, ...pointers },
  });

  yield t.step(state(), [], [8, 10], { length: nodes.length }, nodes.length ? `${nodes.length} nodes linked both ways, from head ${nodes[0].value} to tail ${nodes.at(-1)!.value}` : "An empty list");

  for (const op of ops) {
    pointers = {};
    pending = undefined;
    if (op.op === "insert") {
      const value = op.value ?? 0;
      const index = Math.max(0, op.index ?? nodes.length);
      const node = make(value);
      pending = { node, index: Math.min(index, nodes.length) };
      pointers = { node: node.id };
      const mark = [hl("insert", node.id)];
      yield t.step(state(), mark, [12, 13], { value, index, length: nodes.length }, `${opLabel(op)}: create a node holding ${value}`);
      if (nodes.length === 0) {
        nodes.push(node);
        pending = undefined;
        yield t.step(state(), mark, [14, 15], { value, index }, "The list was empty: head and tail both point at the new node");
      } else if (index === 0) {
        const head = nodes[0];
        yield t.step(state(), [...mark, hl("current", head.id)], 17, { value, index }, `node.next ← head (${head.value})`);
        yield t.step(state(), [...mark, hl("current", head.id)], 18, { value, index }, `head.prev ← node`);
        nodes.unshift(node);
        pending = undefined;
        t.count("relinks", 3);
        yield t.step(state(), mark, 19, { value, index }, `head ← node: ${value} is the new head`);
      } else if (index >= nodes.length) {
        const tail = nodes.at(-1)!;
        yield t.step(state(), [...mark, hl("current", tail.id)], 21, { value, index }, `No walk needed: node.prev ← tail (${tail.value})`);
        yield t.step(state(), [...mark, hl("current", tail.id)], 22, { value, index }, "tail.next ← node");
        nodes.push(node);
        pending = undefined;
        t.count("relinks", 3);
        yield t.step(state(), mark, 23, { value, index }, `tail ← node: ${value} appended in O(1)`);
      } else {
        let cur = 0;
        pointers = { node: node.id, cur: nodes[0].id };
        yield t.step(state(), [...mark, hl("current", nodes[0].id)], 25, { value, index, i: 0 }, `cur starts at the head (${nodes[0].value})`);
        for (let i = 0; i < index; i++) {
          cur++;
          t.count("hops");
          pointers = { node: node.id, cur: nodes[cur].id };
          yield t.step(state(), [...mark, hl("current", nodes[cur].id)], 26, { value, index, i: i + 1 }, `Follow next to ${nodes[cur].value}`);
        }
        const c = nodes[cur];
        const before = nodes[cur - 1];
        const ctx = [...mark, hl("current", c.id), hl("range", before.id)];
        yield t.step(state(), ctx, 27, { value, index }, `node.prev ← cur.prev (${before.value})`);
        yield t.step(state(), ctx, 28, { value, index }, `node.next ← cur (${c.value})`);
        yield t.step(state(), ctx, 29, { value, index }, `${before.value}.next ← node`);
        nodes.splice(cur, 0, node);
        pending = undefined;
        t.count("relinks", 4);
        yield t.step(state(), [...mark, hl("current", c.id)], 30, { value, index }, `${c.value}.prev ← node: ${value} sits between ${before.value} and ${c.value}`);
      }
      pointers = {};
      yield t.step(state(), [hl("insert", node.id)], 32, { length: nodes.length }, `length is now ${nodes.length}`);
    } else if (op.op === "delete") {
      const value = op.value ?? 0;
      let cur = 0;
      pointers = { cur: nodes[0]?.id ?? null };
      yield t.step(state(), nodes[0] ? [hl("current", nodes[0].id)] : [], 36, { value }, `${opLabel(op)}: walk from the head looking for ${value}`);
      while (cur < nodes.length && nodes[cur].value !== value) {
        yield t.step(state(), [hl("compare", nodes[cur].id)], 37, { value }, `${nodes[cur].value} ≠ ${value}, follow next`);
        cur++;
        t.count("hops");
        pointers = { cur: nodes[cur]?.id ?? null };
      }
      if (cur === nodes.length) {
        yield t.step(state(), [hl("notfound", ...nodes.map((n) => n.id))], 38, { value, result: false }, `${value} is not in the list, so there is nothing to delete`);
        continue;
      }
      const victim = nodes[cur];
      const before = nodes[cur - 1];
      const after = nodes[cur + 1];
      yield t.step(state(), [hl("delete", victim.id)], 37, { value }, `Found ${value}`);
      yield t.step(
        state(),
        [hl("delete", victim.id), ...(before ? [hl("current", before.id)] : [])],
        before ? 39 : 40,
        { value },
        before ? `${before.value}.next ← ${after ? after.value : "null"}` : `It was the head: head ← ${after ? after.value : "null"}`,
      );
      yield t.step(
        state(),
        [hl("delete", victim.id), ...(after ? [hl("current", after.id)] : [])],
        after ? 41 : 42,
        { value },
        after ? `${after.value}.prev ← ${before ? before.value : "null"}` : `It was the tail: tail ← ${before ? before.value : "null"}`,
      );
      nodes.splice(cur, 1);
      t.count("relinks", 2);
      pointers = {};
      yield t.step(state(), [], [43, 44], { value, result: true, length: nodes.length }, `${value} is unlinked from both sides; length is now ${nodes.length}`);
    } else if (op.op === "search") {
      const value = op.value ?? 0;
      let found = false;
      for (let cur = 0; cur < nodes.length; cur++) {
        pointers = { cur: nodes[cur].id };
        if (nodes[cur].value === value) {
          yield t.step(state(), [hl("found", nodes[cur].id)], 50, { value, result: true }, `Found ${value} after ${cur} hop${cur === 1 ? "" : "s"}`);
          found = true;
          break;
        }
        yield t.step(state(), [hl("compare", nodes[cur].id)], cur === 0 ? [48, 50] : [50, 51], { value }, `${opLabel(op)}: ${nodes[cur].value} ≠ ${value}, follow next`);
        t.count("hops");
      }
      if (!found) {
        pointers = {};
        yield t.step(state(), [hl("notfound", ...nodes.map((n) => n.id))], 53, { value, result: false }, `Reached null, so ${value} is not in the list`);
      }
    } else {
      yield t.step(state(), [], 7, {}, `Skipping ${opLabel(op)}: it is not a list operation`);
    }
  }
  pointers = {};
  pending = undefined;
  yield t.step(state(), [], 7, { length: nodes.length }, `Done: ${nodes.length} node${nodes.length === 1 ? "" : "s"}`);
}
