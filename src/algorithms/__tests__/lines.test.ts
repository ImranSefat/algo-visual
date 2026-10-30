import { describe, expect, it } from "vitest";
import { algorithms, runAlgorithm } from "../registry";

const lineCount = (text: string) => text.split("\n").length;

describe.each(Object.values(algorithms).map((a) => [a.meta.slug, a] as const))("%s", (_slug, algo) => {
  const { meta } = algo;
  const steps = runAlgorithm(algo, meta.defaultInput);
  const max = lineCount(meta.source);

  it("yields at least one step", () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  it("every line is within the display source", () => {
    for (const [i, step] of steps.entries()) {
      const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
      expect(from, `step ${i} line`).toBeGreaterThanOrEqual(1);
      expect(to, `step ${i} line`).toBeLessThanOrEqual(max);
      expect(from, `step ${i} range`).toBeLessThanOrEqual(to);
    }
  });

  it("pseudocode is line-aligned with the source", () => {
    if (meta.pseudocode) expect(lineCount(meta.pseudocode)).toBe(max);
  });

  it("python is line-aligned with the source", () => {
    if (meta.python) expect(lineCount(meta.python)).toBe(max);
  });

  it("every step has a note", () => {
    for (const step of steps) expect(step.note.length).toBeGreaterThan(0);
  });

  it("steps never share mutable state", () => {
    if (steps.length < 2) return;
    const [a, b] = steps;
    if (typeof a.state === "object" && a.state !== null) expect(a.state).not.toBe(b.state);
  });
});
