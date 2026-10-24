import type { Category } from "./core/types";

export type CategoryInfo = { id: Category; name: string; blurb: string };

export const categories: CategoryInfo[] = [
  { id: "sorting", name: "Sorting", blurb: "Put things in order — and watch every comparison and swap." },
  { id: "searching", name: "Searching", blurb: "Find a target by scanning, halving, or jumping ahead." },
  { id: "structures", name: "Data Structures", blurb: "Lists, stacks, queues, hash tables, trees and heaps, op by op." },
  { id: "graphs", name: "Graphs", blurb: "Traversals, shortest paths and spanning trees on grids and networks." },
  { id: "dp", name: "Dynamic Programming", blurb: "Fill the table one subproblem at a time." },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<Category, CategoryInfo>;
