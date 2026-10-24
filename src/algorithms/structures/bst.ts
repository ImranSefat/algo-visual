import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { TreeState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";
import { binaryForest } from "./binary-tree";
import { opLabel } from "./ops";

export const source = `class Node {
  left: Node | null = null;
  right: Node | null = null;
  constructor(public key: number) {}
}

class BST {
  root: Node | null = null;

  insert(key: number) {
    if (!this.root) return void (this.root = new Node(key));
    let cur = this.root;
    while (key !== cur.key) {
      const side = key < cur.key ? "left" : "right";
      if (!cur[side]) return void (cur[side] = new Node(key));
      cur = cur[side]!;
    }
  }

  search(key: number) {
    let cur = this.root;
    while (cur && cur.key !== key) {
      cur = key < cur.key ? cur.left : cur.right;
    }
    return cur;
  }

  delete(key: number) {
    this.root = this.remove(this.root, key);
  }

  private remove(node: Node | null, key: number): Node | null {
    if (!node) return null;
    if (key < node.key) node.left = this.remove(node.left, key);
    else if (key > node.key) node.right = this.remove(node.right, key);
    else {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      let succ = node.right;
      while (succ.left) succ = succ.left;
      node.key = succ.key;
      node.right = this.remove(node.right, succ.key);
    }
    return node;
  }
}`;

export const pseudocode = `structure Node(key)
  left ← null
  right ← null
  key
end structure

structure BST
  root ← null

  procedure insert(key)
    if root = null then root ← Node(key); return
    cur ← root
    while key ≠ cur.key do
      side ← left if key < cur.key else right
      if cur.side = null then cur.side ← Node(key); return
      cur ← cur.side
    end while
  end procedure

  procedure search(key)
    cur ← root
    while cur ≠ null and cur.key ≠ key do
      cur ← cur.left if key < cur.key else cur.right
    end while
    return cur
  end procedure

  procedure delete(key)
    root ← remove(root, key)
  end procedure

  function remove(node, key)
    if node = null then return null
    if key < node.key then node.left ← remove(node.left, key)
    else if key > node.key then node.right ← remove(node.right, key)
    else
      if node.left = null then return node.right
      if node.right = null then return node.left
      succ ← node.right    ▷ in-order successor:
      while succ.left ≠ null do succ ← succ.left    ▷ leftmost of the right subtree
      node.key ← succ.key
      node.right ← remove(node.right, succ.key)
    end if
    return node
  end function
end structure`;

export const meta = {
  slug: "bst",
  name: "Binary Search Tree",
  category: "structures",
  renderer: "tree",
  description:
    "Every key in a node's left subtree is smaller and every key in its right subtree is larger, so search, insert and delete each follow one root-to-leaf path. Deleting a node with two children swaps in its in-order successor. Fast when balanced, but sorted inserts degrade it to a linked list.",
  complexity: {
    time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [50, 30, 70, 20, 40, 60, 80],
    ops: [
      { op: "insert", value: 35 },
      { op: "insert", value: 65 },
      { op: "search", value: 60 },
      { op: "delete", value: 20 },
      { op: "delete", value: 70 },
      { op: "delete", value: 30 },
      { op: "search", value: 45 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<TreeState>> {
  const t = createTracer<TreeState>(["comparisons"]);
  const f = binaryForest("b");

  /** Untraced insert used for the starting contents. */
  const place = (key: number) => {
    if (!f.root) return void (f.root = f.create(key).id);
    let cur = f.get(f.root);
    while (key !== cur.key) {
      const side = key < cur.key ? "left" : "right";
      if (!cur[side]) return void (cur[side] = f.create(key).id);
      cur = f.get(cur[side]!);
    }
  };
  initial.forEach(place);

  yield t.step(f.toState(), [], 8, { n: f.nodes.size }, f.root ? `A BST with ${f.inorder().length} keys, rooted at ${f.get(f.root).key}` : "An empty tree");

  function* remove(id: string | null, key: number, link: (id: string | null) => void): Generator<Step<TreeState>, void> {
    if (!id) {
      yield t.step(f.toState({ label: String(key), at: null }), [], 33, { key }, `Reached an empty subtree — ${key} is not in the tree`);
      return;
    }
    const node = f.get(id);
    if (key !== node.key) {
      t.count("comparisons");
      const side = key < node.key ? "left" : "right";
      yield t.step(
        f.toState({ label: String(key), at: id }),
        [hl("compare", id)],
        side === "left" ? 34 : 35,
        { key, node: node.key },
        `${key} ${side === "left" ? "<" : ">"} ${node.key}: recurse into the ${side} subtree`,
      );
      yield* remove(node[side], key, (child) => (node[side] = child));
      return;
    }
    yield t.step(f.toState(), [hl("delete", id)], 36, { key }, `Found ${key}`);
    if (!node.left || !node.right) {
      const child = node.left ?? node.right;
      link(child);
      f.nodes.delete(id);
      yield t.step(
        f.toState(),
        child ? [hl("current", ...f.subtree(child))] : [],
        node.left ? 38 : 37,
        { key },
        child ? `One child: its subtree (rooted at ${f.get(child).key}) takes ${key}'s place` : `${key} is a leaf: just unlink it`,
      );
      return;
    }
    let succ = f.get(node.right);
    yield t.step(f.toState(), [hl("delete", id), hl("current", succ.id)], 39, { key, succ: succ.key }, "Two children: look for the in-order successor in the right subtree");
    while (succ.left) {
      succ = f.get(succ.left);
      yield t.step(f.toState(), [hl("delete", id), hl("current", succ.id)], 40, { key, succ: succ.key }, `Go left to ${succ.key}`);
    }
    yield t.step(f.toState(), [hl("delete", id), hl("found", succ.id)], 40, { key, succ: succ.key }, `${succ.key} has no left child: it is the successor`);
    node.key = succ.key;
    yield t.step(f.toState(), [hl("insert", id), hl("found", succ.id)], 41, { key, succ: succ.key }, `Copy ${succ.key} into the node; now delete the old ${succ.key} from the right subtree`);
    yield* remove(node.right, succ.key, (child) => (node.right = child));
  }

  for (const op of ops) {
    const key = op.value ?? 0;
    if (op.op === "insert") {
      if (!f.root) {
        f.root = f.create(key).id;
        yield t.step(f.toState(), [hl("insert", f.root)], [10, 11], { key }, `${opLabel(op)}: the tree is empty, ${key} becomes the root`);
        continue;
      }
      let cur = f.get(f.root);
      yield t.step(f.toState({ label: String(key), at: cur.id }), [hl("current", cur.id)], [10, 12], { key }, `${opLabel(op)}: start at the root`);
      while (true) {
        t.count("comparisons");
        if (key === cur.key) {
          yield t.step(f.toState(), [hl("found", cur.id)], 13, { key }, `${key} is already in the tree — nothing to insert`);
          break;
        }
        const side = key < cur.key ? "left" : "right";
        const child = cur[side];
        if (!child) {
          const node = f.create(key);
          cur[side] = node.id;
          yield t.step(f.toState(), [hl("insert", node.id)], 15, { key, parent: cur.key, side }, `${key} ${side === "left" ? "<" : ">"} ${cur.key} and the ${side} slot is empty: place ${key} there`);
          break;
        }
        yield t.step(f.toState({ label: String(key), at: child }), [hl("compare", cur.id), hl("current", child)], [14, 16], { key, node: cur.key, side }, `${key} ${side === "left" ? "<" : ">"} ${cur.key}: go ${side}`);
        cur = f.get(child);
      }
    } else if (op.op === "search") {
      let cur = f.root;
      yield t.step(f.toState({ label: String(key), at: cur }), cur ? [hl("current", cur)] : [], [20, 21], { key }, `${opLabel(op)}: start at the root`);
      while (cur && f.get(cur).key !== key) {
        const node = f.get(cur);
        t.count("comparisons");
        const side = key < node.key ? "left" : "right";
        cur = node[side];
        yield t.step(f.toState({ label: String(key), at: cur }), [hl("compare", node.id), ...(cur ? [hl("current", cur)] : [])], [22, 23], { key, node: node.key }, `${key} ${side === "left" ? "<" : ">"} ${node.key}: go ${side}${cur ? "" : " — but there is nothing there"}`);
      }
      yield t.step(
        f.toState(),
        cur ? [hl("found", cur)] : [],
        25,
        { key, result: cur !== null },
        cur ? `Found ${key}` : `${key} is not in the tree`,
      );
    } else if (op.op === "delete") {
      yield t.step(f.toState({ label: String(key), at: f.root }), [], 29, { key }, `${opLabel(op)}: find ${key}, starting at the root`);
      yield* remove(f.root, key, (id) => (f.root = id));
      yield t.step(f.toState(), [], 44, { key, n: f.inorder().length }, `Done: in-order traversal is ${f.inorder().join(", ") || "empty"}`);
    } else {
      yield t.step(f.toState(), [], 7, {}, `${opLabel(op)} is not a BST operation — skipped`);
    }
  }
  yield t.step(f.toState(), [], 7, { n: f.inorder().length }, `Done: ${f.inorder().length} keys`);
}
