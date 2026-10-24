import type { ComponentType } from "react";
import type { RendererKind } from "@/algorithms/core/types";
import { ArrayBars } from "./array-bars";
import type { RendererProps } from "./types";

export type AnyRenderer = ComponentType<RendererProps<unknown>>;

/** Erases the state type; the registry guarantees each algorithm's state matches its renderer. */
const erase = <S>(renderer: ComponentType<RendererProps<S>>) => renderer as unknown as AnyRenderer;

export const renderers: Partial<Record<RendererKind, AnyRenderer>> = {
  "array-bars": erase(ArrayBars),
};
