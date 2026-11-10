import { z } from "zod";
import { DISTRIBUTIONS, LIMITS } from "@/algorithms/core/validate";
import { EXPERIMENT } from "./limits";

/**
 * zod schemas for what the tools accept. They mirror the input specs in src/algorithms/core/input.ts, with the
 * experiment limits from ./limits.ts for arrays and the site's own limits for everything else. The `describe`
 * strings are what an AI model reads, so they say what a field means, not only its type.
 */

const int = (lo: number, hi: number) => z.int().min(lo).max(hi);

export const value = int(...LIMITS.value).describe(`A whole number from ${LIMITS.value[0]} to ${LIMITS.value[1]}.`);

export const slug = z.string().min(1).describe("Algorithm slug, for example quick-sort. list_algorithms gives every slug.");

/** Array fields, shared by array and search inputs. Missing fields fall back to the algorithm's default input. */
const arrayFields = {
  size: int(LIMITS.arraySize[0], EXPERIMENT.maxArraySize)
    .optional()
    .describe(`How many values to generate, ${LIMITS.arraySize[0]} to ${EXPERIMENT.maxArraySize}. Ignored when custom is given.`),
  distribution: z
    .enum(DISTRIBUTIONS)
    .optional()
    .describe("Shape of the generated values: random, nearly-sorted, reversed or few-unique. custom means use the custom values."),
  custom: z
    .array(value)
    .min(LIMITS.customLength[0])
    .max(EXPERIMENT.maxArraySize)
    .optional()
    .describe("The exact values to run on, in order. Use this for the user's own data."),
  seed: int(0, 2 ** 31).optional().describe("Seed for the generated values. The same seed always gives the same values."),
};

const arrayShape = z.object(arrayFields);

export const arrayInput = z.object({ kind: z.literal("array"), ...arrayFields });

export const searchInput = z.object({
  kind: z.literal("search"),
  array: arrayShape.optional().describe("The array to search. Omit for the algorithm's default array."),
  target: int(0, 999).describe("The value to look for."),
});

const cell = z.tuple([z.int().min(0), z.int().min(0)]).describe("[row, col], counted from 0.");

const sequenceOp = z.object({
  op: z.enum(["insert", "delete", "search", "push", "pop", "enqueue", "dequeue"]),
  value: int(-999, 999).optional(),
  index: int(0, 999).optional().describe("Position, for insert and delete on the array structure."),
  word: z
    .string()
    .regex(/^[a-z]{1,12}$/)
    .optional()
    .describe("A lower-case word, for the trie."),
});

export const sequenceInput = z.object({
  kind: z.literal("sequence"),
  initial: z.array(int(-999, 999)).max(LIMITS.initial).optional().describe("Values loaded before the first operation."),
  ops: z.array(sequenceOp).min(1).max(LIMITS.ops).describe("Operations to trace, in order."),
});

export const gridInput = z.object({
  kind: z.literal("grid"),
  rows: int(...LIMITS.gridRows),
  cols: int(...LIMITS.gridCols),
  walls: z.array(cell).default([]),
  start: cell,
  end: cell,
  weights: z
    .array(z.tuple([z.int().min(0), z.int().min(0), int(1, 99)]))
    .optional()
    .describe("[row, col, cost] for cells that cost more than 1 to enter (weighted grids)."),
});

export const graphInput = z.object({
  kind: z.literal("graph"),
  nodes: int(...LIMITS.graphNodes).describe("Number of nodes; they are numbered from 0."),
  edges: z.array(z.tuple([z.int().min(0), z.int().min(0), int(1, 99).optional()])).describe("[from, to] or [from, to, weight]."),
  directed: z.boolean().default(false),
  source: z.int().min(0).default(0).describe("Node the traversal starts from."),
  target: z.int().min(0).optional().describe("Node to reach, for shortest-path algorithms."),
});

export const stringsInput = z.object({
  kind: z.literal("strings"),
  a: z.string().max(LIMITS.stringLength).describe("Letters only; the site upper-cases them."),
  b: z.string().max(LIMITS.stringLength),
});

export const knapsackInput = z.object({
  kind: z.literal("knapsack"),
  weights: z.array(int(1, 99)).min(1).max(LIMITS.knapsackItems),
  values: z.array(int(1, 99)).min(1).max(LIMITS.knapsackItems).describe("One value per weight, in the same order."),
  capacity: int(...LIMITS.capacity),
});

export const scalarInput = z.object({
  kind: z.literal("scalar"),
  n: int(...LIMITS.scalar).describe("The single number the algorithm takes, for example Fibonacci's n."),
});

/** Any input the engine accepts, discriminated by `kind`. Each algorithm takes exactly one kind. */
export const inputSpec = z
  .discriminatedUnion("kind", [arrayInput, searchInput, sequenceInput, gridInput, graphInput, stringsInput, knapsackInput, scalarInput])
  .describe("The input to run on. Its kind must match the algorithm's input kind. Omit it to use the algorithm's default input.");

export type ToolInputSpec = z.infer<typeof inputSpec>;
export type ArrayFields = z.infer<typeof arrayShape>;
