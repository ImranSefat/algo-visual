import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { RendererKind } from "@/algorithms/core/types";
import type { RendererProps } from "./types";

export type AnyRenderer = ComponentType<RendererProps<unknown>>;

/**
 * Each renderer is its own chunk (a sorting page never downloads d3-force). They still render on
 * the server, and Next preloads the chunk a page uses, so hydration doesn't flash.
 * The cast erases the state type; the registry guarantees each algorithm's state matches its renderer.
 */
const load = <S>(loader: () => Promise<ComponentType<RendererProps<S>>>) =>
  dynamic(loader) as unknown as AnyRenderer;

export const renderers: Record<RendererKind, AnyRenderer> = {
  "array-bars": load(() => import("./array-bars").then((m) => m.ArrayBars)),
  "array-bars-aux": load(() => import("./array-bars-aux").then((m) => m.ArrayBarsAux)),
  heap: load(() => import("./heap").then((m) => m.Heap)),
  "linked-list": load(() => import("./linked-list").then((m) => m.LinkedList)),
  stack: load(() => import("./stack-queue").then((m) => m.Stack)),
  queue: load(() => import("./stack-queue").then((m) => m.Queue)),
  "hash-table": load(() => import("./hash-table").then((m) => m.HashTable)),
  tree: load(() => import("./tree").then((m) => m.Tree)),
  "grid-graph": load(() => import("./grid-graph").then((m) => m.GridGraph)),
  "node-graph": load(() => import("./node-graph").then((m) => m.NodeGraph)),
  "dp-table": load(() => import("./dp-table").then((m) => m.DPTable)),
};
