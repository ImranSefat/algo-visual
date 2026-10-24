import type { TreeState } from "../core/states";

/** Mutable node used while tracing BST / AVL operations. */
export type BinaryNode = { id: string; key: number; left: string | null; right: string | null; height: number };

/** Shared bookkeeping for binary-tree traces: node table, root, ids and snapshots. */
export class BinaryForest {
  root: string | null = null;
  readonly nodes = new Map<string, BinaryNode>();
  private next = 0;

  constructor(private readonly prefix: string) {}

  create(key: number): BinaryNode {
    const node = { id: `${this.prefix}${this.next++}`, key, left: null, right: null, height: 1 };
    this.nodes.set(node.id, node);
    return node;
  }

  get(id: string): BinaryNode {
    return this.nodes.get(id)!;
  }

  height(id: string | null): number {
    return id ? this.get(id).height : 0;
  }

  balance(id: string): number {
    const n = this.get(id);
    return this.height(n.left) - this.height(n.right);
  }

  update(id: string): void {
    const n = this.get(id);
    n.height = 1 + Math.max(this.height(n.left), this.height(n.right));
  }

  /** All ids in a subtree (for highlighting). */
  subtree(id: string | null): string[] {
    if (!id) return [];
    const n = this.get(id);
    return [id, ...this.subtree(n.left), ...this.subtree(n.right)];
  }

  inorder(id: string | null = this.root): number[] {
    if (!id) return [];
    const n = this.get(id);
    return [...this.inorder(n.left), n.key, ...this.inorder(n.right)];
  }

  toState(probe?: TreeState["probe"], badge?: (n: BinaryNode) => string): TreeState {
    const out: TreeState["nodes"] = {};
    const visit = (id: string | null) => {
      if (!id) return;
      const n = this.get(id);
      out[id] = { id, label: String(n.key), children: [n.left, n.right], ...(badge ? { badge: badge(n) } : {}) };
      visit(n.left);
      visit(n.right);
    };
    visit(this.root);
    return { root: this.root, nodes: out, binary: true, ...(probe ? { probe } : {}) };
  }
}

export const binaryForest = (prefix: string) => new BinaryForest(prefix);
