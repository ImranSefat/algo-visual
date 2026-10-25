import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { LinkedListState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class Node {
  constructor(public value: number, public next: Node | null = null) {}
}

class LinkedList {
  head: Node | null = null;

  insert(value: number, index: number) {
    const node = new Node(value);
    if (index === 0 || !this.head) {
      node.next = this.head;
      this.head = node;
      return;
    }
    let cur = this.head;
    for (let i = 0; i < index - 1 && cur.next; i++) cur = cur.next;
    node.next = cur.next;
    cur.next = node;
  }

  delete(value: number) {
    let prev: Node | null = null;
    let cur = this.head;
    while (cur && cur.value !== value) {
      prev = cur;
      cur = cur.next;
    }
    if (!cur) return false;
    if (prev) prev.next = cur.next;
    else this.head = cur.next;
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

export const pseudocode = `structure Node(value, next)

end structure

structure LinkedList
  head ← null

  procedure insert(value, index)
    node ← new Node(value)
    if index = 0 or head = null then
      node.next ← head
      head ← node
      return
    end if
    cur ← head
    advance cur index − 1 times (or to the tail)
    node.next ← cur.next
    cur.next ← node
  end procedure

  procedure delete(value)
    prev ← null
    cur ← head
    while cur ≠ null and cur.value ≠ value do
      prev ← cur
      cur ← cur.next
    end while
    if cur = null then return false
    if prev ≠ null then prev.next ← cur.next
    else head ← cur.next
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
  slug: "singly-linked-list",
  name: "Singly Linked List",
  category: "structures",
  renderer: "linked-list",
  description:
    "Each node stores a value and a pointer to the next node, so inserting or deleting rewires a pointer or two instead of shifting elements. The price is access: reaching position i means walking i links from the head.",
  complexity: {
    time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [12, 27, 8, 41],
    ops: [
      { op: "insert", value: 33, index: 2 },
      { op: "insert", value: 5, index: 0 },
      { op: "search", value: 41 },
      { op: "delete", value: 27 },
      { op: "insert", value: 19 },
      { op: "delete", value: 99 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<LinkedListState>> {
  const t = createTracer<LinkedListState>(["hops", "relinks"]);
  const make = itemFactory("n");
  const nodes: Item[] = initial.map(make);
  let pending: LinkedListState["pending"];
  let pointers: LinkedListState["pointers"] = {};
  const state = (): LinkedListState => ({
    nodes,
    doubly: false,
    pending,
    pointers: { head: nodes[0]?.id ?? null, ...pointers },
  });
  const nodeAt = (i: number) => nodes[i];

  yield t.step(state(), [], 6, { length: nodes.length }, nodes.length ? `A list of ${nodes.length} nodes; head points at ${nodes[0].value}` : "An empty list: head is null");

  for (const op of ops) {
    pointers = {};
    pending = undefined;
    if (op.op === "insert") {
      const value = op.value ?? 0;
      const index = Math.max(0, op.index ?? nodes.length);
      const node = make(value);
      pending = { node, index: Math.min(index, nodes.length) };
      pointers = { node: node.id };
      yield t.step(state(), [hl("insert", node.id)], [8, 9], { value, index }, `${opLabel(op)}: create a node holding ${value}`);
      if (index === 0 || nodes.length === 0) {
        yield t.step(state(), [hl("insert", node.id)], [10, 11], { value, index }, nodes.length ? `node.next ← head (${nodes[0].value})` : "The list is empty: node.next ← null");
        nodes.unshift(node);
        pending = undefined;
        t.count("relinks", 2);
        yield t.step(state(), [hl("insert", node.id)], 12, { value, index }, `head ← node: ${value} is the new first node`);
        continue;
      }
      let cur = 0;
      pointers = { node: node.id, cur: nodeAt(cur).id };
      yield t.step(state(), [hl("insert", node.id), hl("current", nodeAt(cur).id)], 15, { value, index, i: 0 }, `cur starts at the head (${nodeAt(cur).value})`);
      for (let i = 0; i < index - 1 && cur < nodes.length - 1; i++) {
        cur++;
        t.count("hops");
        pointers = { node: node.id, cur: nodeAt(cur).id };
        yield t.step(state(), [hl("insert", node.id), hl("current", nodeAt(cur).id)], 16, { value, index, i: i + 1 }, `Follow next to ${nodeAt(cur).value}`);
      }
      const after = nodes[cur + 1];
      yield t.step(
        state(),
        [hl("insert", node.id), hl("current", nodeAt(cur).id), ...(after ? [hl("range", after.id)] : [])],
        17,
        { value, index },
        after ? `node.next ← cur.next (${after.value})` : `cur is the tail: node.next ← null`,
      );
      nodes.splice(cur + 1, 0, node);
      pending = undefined;
      t.count("relinks", 2);
      yield t.step(state(), [hl("insert", node.id), hl("current", nodeAt(cur).id)], 18, { value, index }, `cur.next ← node: ${value} is linked in after ${nodeAt(cur).value}`);
    } else if (op.op === "delete") {
      const value = op.value ?? 0;
      let cur = 0;
      pointers = { prev: null, cur: nodes[0]?.id ?? null };
      yield t.step(state(), nodes[0] ? [hl("current", nodes[0].id)] : [], [22, 23], { value }, `${opLabel(op)}: walk from the head looking for ${value}`);
      while (cur < nodes.length && nodes[cur].value !== value) {
        yield t.step(state(), [hl("compare", nodes[cur].id)], 24, { value }, `${nodes[cur].value} ≠ ${value}, keep going`);
        cur++;
        t.count("hops");
        pointers = { prev: nodes[cur - 1].id, cur: nodes[cur]?.id ?? null };
        yield t.step(state(), nodes[cur] ? [hl("current", nodes[cur].id)] : [], [25, 26], { value }, nodes[cur] ? `prev ← cur; cur ← ${nodes[cur].value}` : "cur ran off the end of the list");
      }
      if (cur === nodes.length) {
        yield t.step(state(), [hl("notfound", ...nodes.map((n) => n.id))], 28, { value, result: false }, `${value} is not in the list, so there is nothing to delete`);
        continue;
      }
      const victim = nodes[cur];
      yield t.step(state(), [hl("delete", victim.id)], 24, { value }, `Found ${value}`);
      nodes.splice(cur, 1);
      t.count("relinks");
      pointers = cur > 0 ? { prev: nodes[cur - 1].id } : {};
      yield t.step(
        state(),
        cur > 0 ? [hl("current", nodes[cur - 1].id)] : [],
        cur > 0 ? 29 : 30,
        { value, result: true },
        cur > 0 ? `prev.next ← cur.next: ${value} is unlinked` : `head ← cur.next: ${value} was the head and is unlinked`,
      );
    } else if (op.op === "search") {
      const value = op.value ?? 0;
      let found = false;
      for (let cur = 0; cur < nodes.length; cur++) {
        pointers = { cur: nodes[cur].id };
        if (nodes[cur].value === value) {
          yield t.step(state(), [hl("found", nodes[cur].id)], 37, { value, result: true }, `Found ${value} after ${cur} hop${cur === 1 ? "" : "s"}`);
          found = true;
          break;
        }
        yield t.step(state(), [hl("compare", nodes[cur].id)], cur === 0 ? [35, 37] : [37, 38], { value }, `${opLabel(op)}: ${nodes[cur].value} ≠ ${value}, follow next`);
        t.count("hops");
      }
      if (!found) {
        pointers = {};
        yield t.step(state(), [hl("notfound", ...nodes.map((n) => n.id))], 40, { value, result: false }, `Reached null, so ${value} is not in the list`);
      }
    } else {
      yield t.step(state(), [], 5, {}, `Skipping ${opLabel(op)}: it is not a list operation`);
    }
  }
  pointers = {};
  pending = undefined;
  yield t.step(state(), [], 5, { length: nodes.length }, `Done: ${nodes.length} node${nodes.length === 1 ? "" : "s"}`);
}
