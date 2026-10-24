import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { TreeState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";
import { binaryForest, type BinaryNode } from "./binary-tree";
import { opLabel } from "./ops";

export const source = `class Node {
  left: Node | null = null;
  right: Node | null = null;
  height = 1;
  constructor(public key: number) {}
}

const h = (n: Node | null) => (n ? n.height : 0);
const update = (n: Node) => void (n.height = 1 + Math.max(h(n.left), h(n.right)));
const balance = (n: Node) => h(n.left) - h(n.right);

function rotateRight(y: Node) {
  const x = y.left!;
  y.left = x.right;
  x.right = y;
  update(y);
  update(x);
  return x;
}

function rotateLeft(x: Node) {
  const y = x.right!;
  x.right = y.left;
  y.left = x;
  update(x);
  update(y);
  return y;
}

function rebalance(n: Node) {
  update(n);
  const b = balance(n);
  if (b > 1 && balance(n.left!) < 0) n.left = rotateLeft(n.left!);
  if (b > 1) return rotateRight(n);
  if (b < -1 && balance(n.right!) > 0) n.right = rotateRight(n.right!);
  if (b < -1) return rotateLeft(n);
  return n;
}

function insert(n: Node | null, key: number): Node {
  if (!n) return new Node(key);
  if (key < n.key) n.left = insert(n.left, key);
  else if (key > n.key) n.right = insert(n.right, key);
  else return n;
  return rebalance(n);
}

function remove(n: Node | null, key: number): Node | null {
  if (!n) return null;
  if (key < n.key) n.left = remove(n.left, key);
  else if (key > n.key) n.right = remove(n.right, key);
  else {
    if (!n.left || !n.right) return n.left ?? n.right;
    let succ = n.right;
    while (succ.left) succ = succ.left;
    n.key = succ.key;
    n.right = remove(n.right, succ.key);
  }
  return rebalance(n);
}

function search(n: Node | null, key: number) {
  while (n && n.key !== key) n = key < n.key ? n.left : n.right;
  return n;
}`;

export const pseudocode = `structure Node(key)
  left ← null
  right ← null
  height ← 1
  key
end structure

h(n) = n.height, or 0 for null
update(n): n.height ← 1 + max(h(n.left), h(n.right))
balance(n) = h(n.left) − h(n.right)

function rotateRight(y)
  x ← y.left
  y.left ← x.right
  x.right ← y
  update(y)
  update(x)
  return x    ▷ x replaces y
end function

function rotateLeft(x)
  y ← x.right
  x.right ← y.left
  y.left ← x
  update(x)
  update(y)
  return y    ▷ y replaces x
end function

function rebalance(n)
  update(n)
  b ← balance(n)
  if b > 1 and balance(n.left) < 0 then n.left ← rotateLeft(n.left)    ▷ Left-Right
  if b > 1 then return rotateRight(n)    ▷ Left-Left
  if b < −1 and balance(n.right) > 0 then n.right ← rotateRight(n.right)    ▷ Right-Left
  if b < −1 then return rotateLeft(n)    ▷ Right-Right
  return n
end function

function insert(n, key)
  if n = null then return Node(key)
  if key < n.key then n.left ← insert(n.left, key)
  else if key > n.key then n.right ← insert(n.right, key)
  else return n    ▷ duplicate
  return rebalance(n)
end function

function remove(n, key)
  if n = null then return null
  if key < n.key then n.left ← remove(n.left, key)
  else if key > n.key then n.right ← remove(n.right, key)
  else
    if n has at most one child then return that child
    succ ← n.right
    while succ.left ≠ null do succ ← succ.left
    n.key ← succ.key
    n.right ← remove(n.right, succ.key)
  end if
  return rebalance(n)
end function

function search(n, key)
  while n ≠ null and n.key ≠ key do n ← n.left if key < n.key else n.right
  return n
end function`;

export const meta = {
  slug: "avl-tree",
  name: "AVL Tree",
  category: "structures",
  renderer: "tree",
  description:
    "A self-balancing BST: every node's subtrees differ in height by at most one. After each insert or delete the heights are updated on the way back up, and any node that tips out of balance is fixed with one or two rotations — so every operation stays O(log n).",
  complexity: {
    time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [],
    ops: [
      { op: "insert", value: 10 },
      { op: "insert", value: 20 },
      { op: "insert", value: 30 },
      { op: "insert", value: 25 },
      { op: "insert", value: 28 },
      { op: "insert", value: 5 },
      { op: "insert", value: 4 },
      { op: "insert", value: 35 },
      { op: "insert", value: 32 },
      { op: "delete", value: 20 },
      { op: "search", value: 28 },
    ],
  },
} satisfies AlgorithmMeta;

const signed = (b: number) => (b > 0 ? `+${b}` : b < 0 ? `−${-b}` : "0");

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<TreeState>> {
  const t = createTracer<TreeState>(["comparisons", "rotations"]);
  const f = binaryForest("v");
  const badge = (n: BinaryNode) => signed(f.height(n.left) - f.height(n.right));
  const snap = (probe?: TreeState["probe"]) => f.toState(probe, badge);
  type Link = (id: string | null) => void;

  function* rotateRight(yId: string, link: Link): Generator<Step<TreeState>, string> {
    const y = f.get(yId);
    const xId = y.left!;
    const x = f.get(xId);
    y.left = x.right;
    x.right = yId;
    f.update(yId);
    f.update(xId);
    link(xId);
    t.count("rotations");
    yield t.step(snap(), [hl("swap", xId, yId)], [12, 18], { pivot: y.key }, `Right rotate at ${y.key}: ${x.key} moves up and ${y.key} becomes its right child`);
    return xId;
  }

  function* rotateLeft(xId: string, link: Link): Generator<Step<TreeState>, string> {
    const x = f.get(xId);
    const yId = x.right!;
    const y = f.get(yId);
    x.right = y.left;
    y.left = xId;
    f.update(xId);
    f.update(yId);
    link(yId);
    t.count("rotations");
    yield t.step(snap(), [hl("swap", xId, yId)], [21, 27], { pivot: x.key }, `Left rotate at ${x.key}: ${y.key} moves up and ${x.key} becomes its left child`);
    return yId;
  }

  function* rebalance(id: string, link: Link): Generator<Step<TreeState>, void> {
    const n = f.get(id);
    f.update(id);
    const b = f.balance(id);
    const unbalanced = Math.abs(b) > 1;
    yield t.step(
      snap(),
      [hl(unbalanced ? "delete" : "current", id)],
      [31, 32],
      { node: n.key, height: n.height, balance: b },
      unbalanced ? `${n.key} has balance ${signed(b)} — out of balance` : `${n.key}: height ${n.height}, balance ${signed(b)} — fine`,
    );
    if (b > 1) {
      if (f.balance(n.left!) < 0) {
        yield t.step(snap(), [hl("delete", id), hl("pivot", n.left!)], 33, { node: n.key, balance: b }, `Left-Right case at ${n.key}: first rotate left at ${f.get(n.left!).key}`);
        yield* rotateLeft(n.left!, (c) => (n.left = c));
      } else {
        yield t.step(snap(), [hl("delete", id), hl("pivot", n.left!)], 34, { node: n.key, balance: b }, `Left-Left case at ${n.key}`);
      }
      yield* rotateRight(id, link);
    } else if (b < -1) {
      if (f.balance(n.right!) > 0) {
        yield t.step(snap(), [hl("delete", id), hl("pivot", n.right!)], 35, { node: n.key, balance: b }, `Right-Left case at ${n.key}: first rotate right at ${f.get(n.right!).key}`);
        yield* rotateRight(n.right!, (c) => (n.right = c));
      } else {
        yield t.step(snap(), [hl("delete", id), hl("pivot", n.right!)], 36, { node: n.key, balance: b }, `Right-Right case at ${n.key}`);
      }
      yield* rotateLeft(id, link);
    }
  }

  /** Returns whether the tree changed (duplicates leave heights untouched, so no rebalancing). */
  function* insert(id: string | null, key: number, link: Link): Generator<Step<TreeState>, boolean> {
    if (!id) {
      const node = f.create(key);
      link(node.id);
      yield t.step(snap(), [hl("insert", node.id)], 41, { key }, `Empty spot: create ${key} here`);
      return true;
    }
    const n = f.get(id);
    t.count("comparisons");
    if (key === n.key) {
      yield t.step(snap(), [hl("found", id)], 44, { key }, `${key} is already in the tree`);
      return false;
    }
    const side = key < n.key ? "left" : "right";
    yield t.step(snap({ label: String(key), at: id }), [hl("compare", id)], side === "left" ? 42 : 43, { key, node: n.key }, `${key} ${side === "left" ? "<" : ">"} ${n.key}: go ${side}`);
    const changed = yield* insert(n[side], key, (c) => (n[side] = c));
    if (changed) yield* rebalance(id, link);
    return changed;
  }

  function* remove(id: string | null, key: number, link: Link): Generator<Step<TreeState>, boolean> {
    if (!id) {
      yield t.step(snap(), [], 49, { key }, `Reached an empty subtree — ${key} is not in the tree`);
      return false;
    }
    const n = f.get(id);
    let changed = true;
    if (key !== n.key) {
      t.count("comparisons");
      const side = key < n.key ? "left" : "right";
      yield t.step(snap({ label: String(key), at: id }), [hl("compare", id)], side === "left" ? 50 : 51, { key, node: n.key }, `${key} ${side === "left" ? "<" : ">"} ${n.key}: go ${side}`);
      changed = yield* remove(n[side], key, (c) => (n[side] = c));
    } else if (!n.left || !n.right) {
      const child = n.left ?? n.right;
      yield t.step(snap(), [hl("delete", id)], 53, { key }, child ? `Found ${key}: replace it with its only child ${f.get(child).key}` : `Found ${key}: a leaf, just unlink it`);
      link(child);
      f.nodes.delete(id);
      yield t.step(snap(), child ? [hl("current", child)] : [], 53, { key }, `${key} is gone`);
      return true;
    } else {
      let succ = f.get(n.right);
      yield t.step(snap(), [hl("delete", id), hl("current", succ.id)], 54, { key }, `Found ${key} with two children: find its in-order successor`);
      while (succ.left) {
        succ = f.get(succ.left);
        yield t.step(snap(), [hl("delete", id), hl("current", succ.id)], 55, { key, succ: succ.key }, `Go left to ${succ.key}`);
      }
      n.key = succ.key;
      yield t.step(snap(), [hl("insert", id), hl("found", succ.id)], 56, { key, succ: succ.key }, `Copy the successor ${succ.key} up, then remove it from the right subtree`);
      yield* remove(n.right, succ.key, (c) => (n.right = c));
    }
    if (changed) yield* rebalance(id, link);
    return changed;
  }

  // Starting contents are inserted without tracing (but still balanced).
  function quietInsert(id: string | null, key: number): string {
    if (!id) return f.create(key).id;
    const n = f.get(id);
    if (key === n.key) return id;
    if (key < n.key) n.left = quietInsert(n.left, key);
    else n.right = quietInsert(n.right, key);
    f.update(id);
    const b = f.balance(id);
    const rotR = (y: string) => {
      const x = f.get(y).left!;
      f.get(y).left = f.get(x).right;
      f.get(x).right = y;
      f.update(y);
      f.update(x);
      return x;
    };
    const rotL = (x: string) => {
      const y = f.get(x).right!;
      f.get(x).right = f.get(y).left;
      f.get(y).left = x;
      f.update(x);
      f.update(y);
      return y;
    };
    if (b > 1) {
      if (f.balance(n.left!) < 0) n.left = rotL(n.left!);
      return rotR(id);
    }
    if (b < -1) {
      if (f.balance(n.right!) > 0) n.right = rotR(n.right!);
      return rotL(id);
    }
    return id;
  }
  for (const key of initial) f.root = quietInsert(f.root, key);

  yield t.step(snap(), [], 1, { n: f.inorder().length }, f.root ? `An AVL tree with ${f.inorder().length} keys; badges show each node's balance factor` : "An empty AVL tree; badges will show each node's balance factor");

  for (const op of ops) {
    const key = op.value ?? 0;
    if (op.op === "insert") {
      yield t.step(snap({ label: String(key), at: f.root }), f.root ? [hl("current", f.root)] : [], 40, { key }, `${opLabel(op)}: descend from the root`);
      yield* insert(f.root, key, (id) => (f.root = id));
    } else if (op.op === "delete") {
      yield t.step(snap({ label: String(key), at: f.root }), f.root ? [hl("current", f.root)] : [], 48, { key }, `${opLabel(op)}: descend from the root`);
      yield* remove(f.root, key, (id) => (f.root = id));
    } else if (op.op === "search") {
      let cur = f.root;
      while (cur && f.get(cur).key !== key) {
        const n: BinaryNode = f.get(cur);
        t.count("comparisons");
        const side = key < n.key ? "left" : "right";
        yield t.step(snap({ label: String(key), at: cur }), [hl("compare", cur)], 63, { key, node: n.key }, `${opLabel(op)}: ${key} ${side === "left" ? "<" : ">"} ${n.key}, go ${side}`);
        cur = n[side];
      }
      yield t.step(snap(), cur ? [hl("found", cur)] : [], 64, { key, result: cur !== null }, cur ? `Found ${key}` : `${key} is not in the tree`);
      continue;
    } else {
      yield t.step(snap(), [], 1, {}, `${opLabel(op)} is not an AVL operation — skipped`);
      continue;
    }
    yield t.step(snap(), [], op.op === "insert" ? 45 : 59, { key, height: f.height(f.root) }, `Balanced again: height ${f.height(f.root)} with ${f.inorder().length} keys`);
  }
  yield t.step(snap(), [], 1, { n: f.inorder().length, height: f.height(f.root) }, `Done: ${f.inorder().length} keys, height ${f.height(f.root)}`);
}
