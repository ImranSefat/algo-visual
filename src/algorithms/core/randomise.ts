import { generateValues, type InputSpec } from "./input";
import { mulberry32, randInt } from "./prng";

/** Picks a search target from the generated array most of the time, occasionally a miss. */
export function pickTarget(values: number[], seed: number): number {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  if (values.length === 0 || rng() < 0.2) return randInt(rng, 1, 99);
  return values[randInt(rng, 0, values.length - 1)];
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
    default:
      return spec;
  }
}
