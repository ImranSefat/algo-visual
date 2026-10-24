import type { ComponentType } from "react";
import type { RendererKind } from "@/algorithms/core/types";
import { ArrayBars } from "./array-bars";
import { ArrayBarsAux } from "./array-bars-aux";
import { DPTable } from "./dp-table";
import { GridGraph } from "./grid-graph";
import { HashTable } from "./hash-table";
import { Heap } from "./heap";
import { LinkedList } from "./linked-list";
import { NodeGraph } from "./node-graph";
import { Queue, Stack } from "./stack-queue";
import { Tree } from "./tree";
import type { RendererProps } from "./types";

export type AnyRenderer = ComponentType<RendererProps<unknown>>;

/** Erases the state type; the registry guarantees each algorithm's state matches its renderer. */
const erase = <S>(renderer: ComponentType<RendererProps<S>>) => renderer as unknown as AnyRenderer;

export const renderers: Record<RendererKind, AnyRenderer> = {
  "array-bars": erase(ArrayBars),
  "array-bars-aux": erase(ArrayBarsAux),
  heap: erase(Heap),
  "linked-list": erase(LinkedList),
  stack: erase(Stack),
  queue: erase(Queue),
  "hash-table": erase(HashTable),
  tree: erase(Tree),
  "grid-graph": erase(GridGraph),
  "node-graph": erase(NodeGraph),
  "dp-table": erase(DPTable),
};
