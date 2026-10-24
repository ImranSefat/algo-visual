import { create } from "zustand";

export type GridTool = "wall" | "erase" | "start" | "end" | "weight";

/** The active grid editing tool, shared by the input controls and the grid canvas. */
export const useGridTool = create<{ tool: GridTool; setTool(tool: GridTool): void }>()((set) => ({
  tool: "wall",
  setTool: (tool) => set({ tool }),
}));

/** Cost painted by the weight tool. */
export const WEIGHT_COST = 5;
