import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import { bucketId, type HashTableState } from "../core/states";
import type { AlgorithmMeta, Item, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class HashTable {
  private buckets: number[][];
  constructor(private m = 7) {
    this.buckets = Array.from({ length: m }, () => []);
  }

  private hash(key: number) {
    return ((key % this.m) + this.m) % this.m;
  }

  insert(key: number) {
    const h = this.hash(key);
    for (const k of this.buckets[h]) {
      if (k === key) return false;
    }
    this.buckets[h].push(key);
    return true;
  }

  delete(key: number) {
    const h = this.hash(key);
    const chain = this.buckets[h];
    for (let i = 0; i < chain.length; i++) {
      if (chain[i] === key) {
        chain.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  search(key: number) {
    const h = this.hash(key);
    for (const k of this.buckets[h]) {
      if (k === key) return true;
    }
    return false;
  }
}`;

export const pseudocode = `structure HashTable    ▷ separate chaining
  buckets
  constructor(m = 7)
    buckets ← m empty chains
  end constructor

  function hash(key)
    return key mod m
  end function

  procedure insert(key)
    h ← hash(key)
    for each k in buckets[h] do
      if k = key then return false    ▷ no duplicates
    end for
    append key to buckets[h]
    return true
  end procedure

  procedure delete(key)
    h ← hash(key)
    chain ← buckets[h]
    for i ← 0 to length(chain) − 1 do
      if chain[i] = key then
        remove chain[i]
        return true
      end if
    end for
    return false
  end procedure

  procedure search(key)
    h ← hash(key)
    for each k in buckets[h] do
      if k = key then return true
    end for
    return false
  end procedure
end structure`;

const M = 7;

export const meta = {
  slug: "hash-table",
  name: "Hash Table",
  category: "structures",
  renderer: "hash-table",
  description:
    "Maps each key to one of m buckets with hash(k) = k mod m and keeps colliding keys in a chain. With a good hash and a low load factor every chain is short, so insert, search and delete take O(1) on average. If every key collides, they take O(n).",
  complexity: {
    time: { best: "O(1)", average: "O(1)", worst: "O(n)" },
    space: "O(n + m)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [10, 22, 31],
    ops: [
      { op: "insert", value: 15 },
      { op: "insert", value: 29 },
      { op: "insert", value: 8 },
      { op: "insert", value: 22 },
      { op: "search", value: 29 },
      { op: "delete", value: 15 },
      { op: "search", value: 44 },
      { op: "insert", value: 36 },
    ],
  },
} satisfies AlgorithmMeta;

const hash = (key: number) => ((key % M) + M) % M;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<HashTableState>> {
  const t = createTracer<HashTableState>(["probes", "collisions"]);
  const make = itemFactory("h");
  const buckets: Item[][] = Array.from({ length: M }, () => []);
  for (const key of initial) {
    const chain = buckets[hash(key)];
    if (!chain.some((x) => x.value === key)) chain.push(make(key));
  }
  let incoming: HashTableState["incoming"];
  const state = (): HashTableState => ({ buckets, incoming });
  const size = () => buckets.reduce((n, c) => n + c.length, 0);
  const load = () => Number((size() / M).toFixed(2));

  yield t.step(state(), [], [2, 4], { m: M, n: size(), load: load() }, `${M} buckets holding ${size()} keys (load factor ${load()})`);

  for (const op of ops) {
    incoming = undefined;
    const key = op.value ?? 0;
    const name = op.op === "insert" || op.op === "push" || op.op === "enqueue" ? "insert" : op.op === "search" ? "search" : "delete";
    const base = name === "insert" ? 12 : name === "delete" ? 21 : 33;
    const item = make(key);
    incoming = { item, hash: null };
    yield t.step(state(), [hl("current", item.id)], name === "insert" ? 11 : name === "delete" ? 20 : 32, { key }, `${opLabel(op)}: hash the key ${key}`);
    const h = hash(key);
    incoming = { item, hash: h };
    yield t.step(state(), [hl("current", item.id), hl("range", bucketId(h))], base, { key, h }, `hash(${key}) = ${key} mod ${M} = ${h}`);

    const chain = buckets[h];
    let index = -1;
    for (let i = 0; i < chain.length; i++) {
      t.count("probes");
      const hit = chain[i].value === key;
      yield t.step(
        state(),
        [hl(hit ? "found" : "compare", chain[i].id), hl("current", item.id), hl("range", bucketId(h))],
        name === "insert" ? [13, 14] : name === "delete" ? [23, 24] : [34, 35],
        { key, h, i },
        hit ? `${chain[i].value} = ${key}: match` : `${chain[i].value} ≠ ${key}`,
      );
      if (hit) {
        index = i;
        break;
      }
    }

    if (name === "insert") {
      if (index !== -1) {
        incoming = undefined;
        yield t.step(state(), [hl("found", chain[index].id)], 14, { key, h, result: false }, `${key} is already in bucket ${h}, so it isn't added twice`);
        continue;
      }
      if (chain.length > 0) t.count("collisions");
      chain.push(item);
      incoming = undefined;
      yield t.step(state(), [hl("insert", item.id), hl("range", bucketId(h))], [16, 17], { key, h, n: size(), load: load() }, chain.length > 1 ? `Collision: append ${key} to the chain in bucket ${h}` : `Bucket ${h} was empty: ${key} goes straight in`);
    } else if (name === "delete") {
      incoming = undefined;
      if (index === -1) {
        yield t.step(state(), [hl("notfound", bucketId(h))], 29, { key, h, result: false }, `${key} is not in bucket ${h}, so there is nothing to delete`);
        continue;
      }
      const victim = chain[index];
      yield t.step(state(), [hl("delete", victim.id)], 25, { key, h }, `Remove ${key} from the chain`);
      chain.splice(index, 1);
      yield t.step(state(), [hl("range", bucketId(h))], 26, { key, h, n: size(), load: load(), result: true }, `${key} deleted; ${size()} keys remain`);
    } else {
      incoming = undefined;
      yield t.step(
        state(),
        index === -1 ? [hl("notfound", bucketId(h))] : [hl("found", chain[index].id)],
        index === -1 ? 37 : 35,
        { key, h, result: index !== -1 },
        index === -1 ? `${key} is not in the table` : `Found ${key} in bucket ${h} after ${index + 1} probe${index === 0 ? "" : "s"}`,
      );
    }
  }
  incoming = undefined;
  yield t.step(state(), [], 1, { n: size(), load: load() }, `Done: ${size()} keys, load factor ${load()}`);
}
