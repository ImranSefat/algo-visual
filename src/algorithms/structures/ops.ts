import type { SequenceOp } from "../core/input";
import type { Item } from "../core/types";

/** Human label for an op, e.g. `insert(42 @ 2)`. */
export function opLabel(op: SequenceOp): string {
  const args = [op.word !== undefined ? `"${op.word}"` : op.value, op.index !== undefined ? `@ ${op.index}` : undefined].filter(
    (a) => a !== undefined,
  );
  return `${op.op}(${args.join(" ")})`;
}

/** Deterministic item factory: ids are unique for the whole trace, so renderers can key by them. */
export function itemFactory(prefix: string) {
  let next = 0;
  return (value: number): Item => Object.freeze({ id: `${prefix}${next++}`, value });
}
