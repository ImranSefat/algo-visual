import { createLoader } from "nuqs";
import { describe, expect, it } from "vitest";
import { generateValues, type ArrayInputSpec } from "../../algorithms/core/input";
import { sanitizeSpec } from "../../algorithms/core/validate";
import { algorithmList, getAlgorithm } from "../../algorithms/registry";
import { specFromQuery, urlParsers } from "../../lib/url-state";
import { counterNames } from "../counters";
import { SITE_URL, visualizerLink } from "../links";
import { callTool, ToolError } from "../tool";
import { makeLinkTool, planned, runAlgorithmTool, tools } from "../tools";

const load = createLoader(urlParsers);
const run = (raw: unknown) => callTool(runAlgorithmTool, raw);
const sorted = (spec: ArrayInputSpec) => [...generateValues(spec)].sort((a, b) => a - b);

describe("run_algorithm", () => {
  it("uses the algorithm's default input when none is given", () => {
    const out = run({ slug: "quick-sort" });
    const defaults = getAlgorithm("quick-sort")!.meta.defaultInput as ArrayInputSpec;
    expect(out.input).toEqual(defaults);
    expect(Object.keys(out.counters)).toEqual(["comparisons", "swaps"]);
    expect(out.animationSteps).toBeGreaterThan(0);
    expect(out.stoppedEarly).toBe(false);
    expect(out.result.values).toEqual(sorted(defaults));
    expect(out.link).toBe(`${SITE_URL}/sorting/quick-sort?n=24&seed=13&dist=random`);
  });

  it("fills in missing array fields from the defaults", () => {
    const out = run({ slug: "quick-sort", input: { kind: "array", size: 40 } });
    expect(out.input).toEqual({ kind: "array", size: 40, distribution: "random", seed: 13 });
  });

  it("runs custom values and links to them", () => {
    const out = run({ slug: "insertion-sort", input: { kind: "array", custom: [5, 3, 8, 1] } });
    expect(out.result.values).toEqual([1, 3, 5, 8]);
    expect(out.counters.comparisons).toBeGreaterThan(0);
    expect(out.link).toBe(`${SITE_URL}/sorting/insertion-sort?dist=custom&custom=5,3,8,1`);
  });

  it("is deterministic", () => {
    const input = { slug: "heap-sort", input: { kind: "array", size: 40, seed: 3, distribution: "nearly-sorted" } };
    expect(run(input)).toEqual(run(input));
  });

  it("reaches Quick Sort's textbook worst case on reversed distinct values", () => {
    // Each partition removes one element, so n(n-1)/2 comparisons. Swaps are not asserted here: see the Quick Sort tests.
    const custom = Array.from({ length: 60 }, (_, i) => 60 - i);
    expect(run({ slug: "quick-sort", input: { kind: "array", custom } }).counters.comparisons).toBe((60 * 59) / 2);
  });

  it("runs arrays beyond the animation limit, with counters but no link", () => {
    const out = run({ slug: "merge-sort", input: { kind: "array", size: 500, seed: 1, distribution: "random" } });
    expect(out.stoppedEarly).toBe(false);
    expect(out.link).toBeNull();
    expect(out.result.values).toEqual(sorted(out.input as ArrayInputSpec));
    expect(out.counters.comparisons).toBeGreaterThan(2000);
  });

  it("searches", () => {
    const out = run({ slug: "binary-search", input: { kind: "search", array: { custom: [1, 3, 5, 7, 9] }, target: 7 } });
    expect(out.result.vars.result).toBe(3);
    expect(out.link).toBe(`${SITE_URL}/searching/binary-search?dist=custom&custom=1,3,5,7,9&target=7`);
  });

  it("runs every algorithm's default input and links to it", () => {
    for (const meta of algorithmList) {
      const out = run({ slug: meta.slug });
      expect(out.animationSteps, meta.slug).toBeGreaterThan(0);
      expect(out.stoppedEarly, meta.slug).toBe(false);
      expect(out.link, meta.slug).toContain(`${SITE_URL}/${meta.category}/${meta.slug}?`);
    }
  });

  it("rejects an unknown slug", () => {
    expect(() => run({ slug: "bogo-sort" })).toThrow(ToolError);
  });

  it("rejects an input of the wrong kind", () => {
    expect(() => run({ slug: "quick-sort", input: { kind: "scalar", n: 5 } })).toThrow(/takes a "array" input/);
  });

  it("rejects values outside the limits", () => {
    expect(() => run({ slug: "quick-sort", input: { kind: "array", custom: [0, 5] } })).toThrow(/Bad input/);
    expect(() => run({ slug: "quick-sort", input: { kind: "array", size: 5000 } })).toThrow(/Bad input/);
  });
});

describe("make_link", () => {
  it("links compare mode with both algorithms on the same input", () => {
    const out = callTool(makeLinkTool, {
      slug: "quick-sort",
      compareWith: "merge-sort",
      input: { kind: "array", size: 50, seed: 7, distribution: "reversed" },
      step: 120,
    });
    expect(out.link).toBe(`${SITE_URL}/compare?a=quick-sort&b=merge-sort&n=50&seed=7&dist=reversed&step=120`);
  });

  it("refuses to compare different input kinds", () => {
    expect(() => callTool(makeLinkTool, { slug: "quick-sort", compareWith: "binary-search" })).toThrow(ToolError);
  });

  it("every default input round-trips through the page's URL parser", () => {
    for (const meta of algorithmList) {
      const link = visualizerLink(getAlgorithm(meta.slug)!, meta.defaultInput);
      expect(link, meta.slug).not.toBeNull();
      const query = load(new URL(link!));
      expect(specFromQuery(query, meta.defaultInput), meta.slug).toEqual(sanitizeSpec(meta.defaultInput, meta.defaultInput));
    }
  });
});

describe("tool list", () => {
  it("has unique snake_case names", () => {
    const names = [...tools, ...planned].map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });

  it("reads counter names off a run", () => {
    expect(counterNames(getAlgorithm("merge-sort")!)).toEqual(["comparisons", "writes"]);
  });

  // Planned tools: turn each of these into a real test when the tool is built.
  it.todo("list_algorithms lists every algorithm with its input kind, complexity and counter names");
  it.todo("list_algorithms filters by category");
  it.todo("get_algorithm returns the description and complexity, and the source only when asked");
  it.todo("profile_input reports size, range, duplicates and how sorted the values are");
});
