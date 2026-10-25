import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { TreeState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";
import { opLabel } from "./ops";

export const source = `class TrieNode {
  children = new Map<string, TrieNode>();
  end = false;
}

class Trie {
  root = new TrieNode();

  insert(word: string) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
    }
    node.end = true;
  }

  search(word: string) {
    let node = this.root;
    for (const ch of word) {
      const next = node.children.get(ch);
      if (!next) return false;
      node = next;
    }
    return node.end;
  }
}`;

export const pseudocode = `structure TrieNode
  children ← empty map from letter to node
  end ← false
end structure

structure Trie
  root ← new TrieNode

  procedure insert(word)
    node ← root
    for each letter ch in word do
      if node has no child ch then add a new child ch
      node ← node.children[ch]
    end for
    node.end ← true    ▷ a word ends here
  end procedure

  procedure search(word)
    node ← root
    for each letter ch in word do
      next ← node.children[ch]
      if next = null then return false
      node ← next
    end for
    return node.end    ▷ a prefix alone is not a word
  end procedure
end structure`;

export const meta = {
  slug: "trie",
  name: "Trie",
  category: "structures",
  renderer: "tree",
  description:
    "A prefix tree: each edge is a letter and each path from the root spells a prefix, so words that share a prefix share nodes. Insert and search take O(L) for a word of length L, independent of how many words are stored. A flag marks where whole words end.",
  complexity: {
    time: { best: "O(L)", average: "O(L)", worst: "O(L)" },
    space: "O(total letters)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [],
    ops: [
      { op: "insert", word: "car" },
      { op: "insert", word: "cat" },
      { op: "insert", word: "cart" },
      { op: "insert", word: "dog" },
      { op: "insert", word: "do" },
      { op: "search", word: "cat" },
      { op: "search", word: "ca" },
      { op: "search", word: "dot" },
    ],
  },
} satisfies AlgorithmMeta;

type TNode = { id: string; ch: string; children: Map<string, string>; end: boolean };

export function* run({ ops }: ResolvedInput<"sequence">): Generator<Step<TreeState>> {
  const t = createTracer<TreeState>(["nodesCreated", "steps"]);
  const nodes = new Map<string, TNode>();
  let next = 0;
  const create = (ch: string): TNode => {
    const node = { id: `t${next++}`, ch, children: new Map<string, string>(), end: false };
    nodes.set(node.id, node);
    return node;
  };
  const root = create("");
  const snap = (probe?: TreeState["probe"]): TreeState => {
    const out: TreeState["nodes"] = {};
    for (const n of nodes.values()) {
      out[n.id] = {
        id: n.id,
        label: n.ch,
        children: [...n.children.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, id]) => id),
        ...(n.end ? { terminal: true } : {}),
      };
    }
    return { root: root.id, nodes: out, binary: false, ...(probe ? { probe } : {}) };
  };
  /** The word with the part already matched marked off, e.g. "ca·rt". */
  const progress = (word: string, i: number) => `${word.slice(0, i)}·${word.slice(i)}`;
  const words = () => {
    const out: string[] = [];
    const walk = (n: TNode, prefix: string) => {
      if (n.end) out.push(prefix);
      for (const [ch, id] of [...n.children.entries()].sort()) walk(nodes.get(id)!, prefix + ch);
    };
    walk(root, "");
    return out;
  };

  yield t.step(snap(), [hl("current", root.id)], 7, {}, "An empty trie: just the root");

  for (const op of ops) {
    const word = op.word ?? String(op.value ?? "");
    if (!word) {
      yield t.step(snap(), [], 6, {}, `Skipping ${opLabel(op)}: it has no word`);
      continue;
    }
    if (op.op === "insert") {
      let node = root;
      const path = [root.id];
      yield t.step(snap({ label: progress(word, 0), at: root.id }), [hl("current", root.id)], [9, 10], { word }, `${opLabel(op)}: start at the root`);
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        let childId = node.children.get(ch);
        t.count("steps");
        if (!childId) {
          const child = create(ch);
          node.children.set(ch, child.id);
          childId = child.id;
          t.count("nodesCreated");
          yield t.step(snap({ label: progress(word, i + 1), at: childId }), [hl("path", ...path), hl("insert", childId)], 12, { word, ch, i }, `No '${ch}' child yet: create it`);
        } else {
          yield t.step(snap({ label: progress(word, i + 1), at: childId }), [hl("path", ...path), hl("current", childId)], 13, { word, ch, i }, `'${ch}' already exists: follow the shared prefix`);
        }
        node = nodes.get(childId)!;
        path.push(childId);
      }
      const already = node.end;
      node.end = true;
      yield t.step(snap(), [hl("path", ...path), hl("found", node.id)], 15, { word }, already ? `"${word}" was already stored` : `Mark the end of "${word}"`);
    } else if (op.op === "search") {
      let node = root;
      const path = [root.id];
      let found = true;
      yield t.step(snap({ label: progress(word, 0), at: root.id }), [hl("current", root.id)], [18, 19], { word }, `${opLabel(op)}: start at the root`);
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        const childId = node.children.get(ch);
        t.count("steps");
        if (!childId) {
          yield t.step(snap({ label: progress(word, i), at: node.id }), [hl("visited", ...path), hl("notfound", node.id)], [21, 22], { word, ch, i, result: false }, `No '${ch}' after "${word.slice(0, i)}", so "${word}" is not stored`);
          found = false;
          break;
        }
        node = nodes.get(childId)!;
        path.push(childId);
        yield t.step(snap({ label: progress(word, i + 1), at: childId }), [hl("visited", ...path.slice(0, -1)), hl("current", childId)], [21, 23], { word, ch, i }, `Follow '${ch}'`);
      }
      if (found) {
        yield t.step(
          snap(),
          [hl("visited", ...path.slice(0, -1)), hl(node.end ? "found" : "notfound", node.id)],
          25,
          { word, result: node.end },
          node.end ? `"${word}" is stored` : `"${word}" is only a prefix: no stored word ends here`,
        );
      }
    } else {
      yield t.step(snap(), [], 6, {}, `Skipping ${opLabel(op)}: it is not a trie operation`);
    }
  }
  const stored = words();
  yield t.step(snap(), [], 6, { words: stored.length, nodes: nodes.size }, `Done: ${stored.length} words (${stored.join(", ") || "none"}) in ${nodes.size} nodes`);
}
