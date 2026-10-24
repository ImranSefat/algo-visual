import { createContext } from "react";
import type { GridInputSpec } from "@/algorithms/core/input";

export type GridEdit = Pick<GridInputSpec, "walls" | "start" | "end" | "weights">;

/** Provided by the visualizer when the input is an editable grid; absent in previews. */
export const GridEditContext = createContext<((edit: GridEdit) => void) | null>(null);
