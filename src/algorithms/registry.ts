import { resolveInput, type InputKind, type InputSpec, type ResolvedInput } from "./core/input";
import { collect } from "./core/step";
import type { AlgorithmMeta, AlgorithmModule, Category, Step } from "./core/types";

import * as binarySearch from "./searching/binary-search";
import * as jumpSearch from "./searching/jump-search";
import * as linearSearch from "./searching/linear-search";
import * as bubbleSort from "./sorting/bubble-sort";
import * as countingSort from "./sorting/counting-sort";
import * as heapSort from "./sorting/heap-sort";
import * as insertionSort from "./sorting/insertion-sort";
import * as mergeSort from "./sorting/merge-sort";
import * as quickSort from "./sorting/quick-sort";
import * as radixSort from "./sorting/radix-sort";
import * as selectionSort from "./sorting/selection-sort";
import * as shellSort from "./sorting/shell-sort";
import * as dynamicArray from "./structures/array";
import * as avlTree from "./structures/avl-tree";
import * as bst from "./structures/bst";
import * as doublyLinkedList from "./structures/doubly-linked-list";
import * as hashTable from "./structures/hash-table";
import * as minHeap from "./structures/min-heap";
import * as queue from "./structures/queue";
import * as singlyLinkedList from "./structures/singly-linked-list";
import * as stack from "./structures/stack";
import * as trie from "./structures/trie";

/** Any registered algorithm, discriminated by its input kind. */
export type AnyAlgorithm = { [K in InputKind]: AlgorithmModule<K> }[InputKind];

/** Display order within each category. */
const modules: AnyAlgorithm[] = [
  bubbleSort,
  selectionSort,
  insertionSort,
  shellSort,
  mergeSort,
  quickSort,
  heapSort,
  countingSort,
  radixSort,
  linearSearch,
  binarySearch,
  jumpSearch,
  dynamicArray,
  singlyLinkedList,
  doublyLinkedList,
  stack,
  queue,
  hashTable,
  bst,
  avlTree,
  minHeap,
  trie,
];

export const algorithms: Record<string, AnyAlgorithm> = Object.fromEntries(
  modules.map((m) => [m.meta.slug, m]),
);

export const algorithmList: AlgorithmMeta[] = modules.map((m) => m.meta);

export const byCategory = algorithmList.reduce(
  (acc, meta) => {
    acc[meta.category].push(meta);
    return acc;
  },
  { sorting: [], searching: [], structures: [], graphs: [], dp: [] } as Record<Category, AlgorithmMeta[]>,
);

export function getAlgorithm(slug: string): AnyAlgorithm | undefined {
  return algorithms[slug];
}

export function algorithmHref(meta: Pick<AlgorithmMeta, "category" | "slug">): string {
  return `/${meta.category}/${meta.slug}`;
}

/** Resolves `spec` and exhausts the algorithm into a timeline. */
export function runAlgorithm(algo: AnyAlgorithm, spec: InputSpec): Step<unknown>[] {
  const run = algo.run as (input: ResolvedInput) => Generator<Step<unknown>>;
  return collect(run(resolveInput(spec)));
}
