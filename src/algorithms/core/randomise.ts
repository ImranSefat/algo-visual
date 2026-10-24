import { generateValues, type InputSpec, type SequenceInputSpec, type SequenceOp, type SequenceOpName } from "./input";
import { mulberry32, randInt } from "./prng";

/** Picks a search target from the generated array most of the time, occasionally a miss. */
export function pickTarget(values: number[], seed: number): number {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  if (values.length === 0 || rng() < 0.2) return randInt(rng, 1, 99);
  return values[randInt(rng, 0, values.length - 1)];
}

/**
 * A random op sequence using the same op names (and index-style) as `template`. A simulated
 * multiset of live values keeps deletes/searches mostly pointing at values that exist.
 */
export function randomSequence(template: SequenceInputSpec, seed: number): SequenceInputSpec {
  const rng = mulberry32(seed);
  const names = [...new Set(template.ops.map((o) => o.op))] as SequenceOpName[];
  const indexed = new Set(template.ops.filter((o) => o.index !== undefined).map((o) => o.op));
  const adds: SequenceOpName[] = ["insert", "push", "enqueue"];
  const live = Array.from({ length: randInt(rng, 2, 5) }, () => randInt(rng, 1, 99));
  const initial = [...live];
  const ops: SequenceOp[] = [];
  const count = Math.max(4, Math.min(10, template.ops.length + randInt(rng, -1, 2)));
  for (let k = 0; k < count && names.length > 0; k++) {
    const op = names[randInt(rng, 0, names.length - 1)];
    if (adds.includes(op)) {
      const value = randInt(rng, 1, 99);
      const index = indexed.has(op) ? randInt(rng, 0, live.length) : undefined;
      live.splice(index ?? live.length, 0, value);
      ops.push(index === undefined ? { op, value } : { op, value, index });
    } else if (op === "pop" || op === "dequeue") {
      if (op === "pop") live.pop();
      else live.shift();
      ops.push({ op });
    } else if (indexed.has(op) && op === "delete") {
      if (live.length === 0) continue;
      const index = randInt(rng, 0, live.length - 1);
      live.splice(index, 1);
      ops.push({ op, index });
    } else {
      const hit = live.length > 0 && rng() < 0.8;
      const value = hit ? live[randInt(rng, 0, live.length - 1)] : randInt(rng, 1, 99);
      if (op === "delete" && hit) live.splice(live.indexOf(value), 1);
      ops.push({ op, value });
    }
  }
  return { kind: "sequence", initial, ops };
}

/** Same input shape, new random content derived from `seed`. Kinds without randomness are returned as-is. */
export function randomiseSpec(spec: InputSpec, seed: number): InputSpec {
  switch (spec.kind) {
    case "array":
      return { ...spec, seed, distribution: spec.distribution === "custom" ? "random" : spec.distribution };
    case "search": {
      const array = { ...spec.array, seed, distribution: spec.array.distribution === "custom" ? "random" : spec.array.distribution } as const;
      return { ...spec, array, target: pickTarget(generateValues(array), seed) };
    }
    case "sequence":
      return randomSequence(spec, seed);
    default:
      return spec;
  }
}
