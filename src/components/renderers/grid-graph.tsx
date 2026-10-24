"use client";

import { Flag, Play } from "lucide-react";
import { createContext, useContext, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Cell, GridInputSpec } from "@/algorithms/core/input";
import { cellId, type GridState } from "@/algorithms/core/states";
import type { HighlightKind } from "@/algorithms/core/types";
import { cn } from "@/lib/utils";
import { useGridTool, WEIGHT_COST, type GridTool } from "@/store/grid-tool";
import { highlightMap } from "./highlight";
import type { RendererProps } from "./types";

export type GridEdit = Pick<GridInputSpec, "walls" | "start" | "end" | "weights">;

/** Provided by the visualizer when the input is an editable grid; absent in previews. */
export const GridEditContext = createContext<((edit: GridEdit) => void) | null>(null);

type Draft = {
  mode: GridTool;
  walls: Set<number>;
  weights: Map<number, number>;
  start: number;
  end: number;
  /** Last painted cell, so fast drags fill the cells in between. */
  last: number;
};

/** Cells on the straight line from a to b (inclusive), so a quick drag leaves no gaps. */
function line(a: number, b: number, cols: number): number[] {
  if (a < 0) return [b];
  const [r0, c0] = [Math.floor(a / cols), a % cols];
  const [r1, c1] = [Math.floor(b / cols), b % cols];
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = n === 0 ? 0 : k / n;
    return Math.round(r0 + (r1 - r0) * t) * cols + Math.round(c0 + (c1 - c0) * t);
  });
}

function cellBackground(kind: HighlightKind | undefined, wall: boolean, weight: number): string {
  if (wall) return "var(--viz-wall)";
  if (kind) return `var(--viz-${kind})`;
  if (weight > 1) return "color-mix(in oklch, var(--viz-pivot) 22%, var(--muted))";
  return "var(--muted)";
}

/**
 * CSS grid of cells. Status (visited / frontier / path…) comes from highlights; walls, weights,
 * start and end from state. When editable, pointer drags paint a draft that is committed on release.
 */
export function GridGraph({ step, duration, compact }: RendererProps<GridState>) {
  const state = step.state;
  const { rows, cols, dist } = state;
  const kinds = highlightMap(step.highlights);
  const commit = useContext(GridEditContext);
  const tool = useGridTool((s) => s.tool);
  const gridRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const editable = Boolean(commit) && !compact;

  const walls = draft?.walls ?? null;
  const isWall = (i: number) => (walls ? walls.has(i) : state.walls[i]);
  const weightOf = (i: number) => (draft ? (draft.weights.get(i) ?? 1) : (state.weights?.[i] ?? 1));
  const start = draft?.start ?? state.start;
  const end = draft?.end ?? state.end;

  // Path cells pop in order; negative delays keep earlier cells settled when the path grows one cell at a time.
  const pathIds = step.highlights.filter((h) => h.kind === "path").flatMap((h) => h.ids);
  const pathIndex = new Map(pathIds.map((id, i) => [id, i]));

  const cellAt = (e: PointerEvent): number => {
    const rect = gridRef.current!.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * rows);
    return r < 0 || c < 0 || r >= rows || c >= cols ? -1 : r * cols + c;
  };

  const paint = (d: Draft, target: number): Draft => {
    if (target < 0 || target === d.last) return d;
    // Start/end jump straight to the cell under the pointer; brushes fill the whole stroke.
    const cells = d.mode === "start" || d.mode === "end" ? [target] : line(d.last, target, cols);
    return { ...cells.reduce(paintCell, d), last: target };
  };

  const paintCell = (d: Draft, i: number): Draft => {
    switch (d.mode) {
      case "wall":
        if (i === d.start || i === d.end || d.walls.has(i)) return d;
        return { ...d, walls: new Set(d.walls).add(i) };
      case "erase": {
        if (!d.walls.has(i) && !d.weights.has(i)) return d;
        const walls = new Set(d.walls);
        const weights = new Map(d.weights);
        walls.delete(i);
        weights.delete(i);
        return { ...d, walls, weights };
      }
      case "weight":
        if (i === d.start || i === d.end || d.walls.has(i) || d.weights.has(i)) return d;
        return { ...d, weights: new Map(d.weights).set(i, WEIGHT_COST) };
      case "start":
        return d.walls.has(i) || i === d.end ? d : { ...d, start: i };
      case "end":
        return d.walls.has(i) || i === d.start ? d : { ...d, end: i };
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return;
    const i = cellAt(e);
    if (i < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const wallSet = new Set<number>();
    state.walls.forEach((w, k) => w && wallSet.add(k));
    const weights = new Map<number, number>();
    state.weights?.forEach((w, k) => w > 1 && weights.set(k, w));
    // Dragging the start/end always moves it; on a wall the wall tool erases instead.
    const mode: GridTool =
      i === state.start ? "start" : i === state.end ? "end" : tool === "wall" && wallSet.has(i) ? "erase" : tool;
    setDraft(paint({ mode, walls: wallSet, weights, start: state.start, end: state.end, last: -1 }, i));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (draft) setDraft(paint(draft, cellAt(e)));
  };

  const onPointerUp = () => {
    if (!draft || !commit) return;
    const toCell = (i: number): Cell => [Math.floor(i / cols), i % cols];
    commit({
      walls: [...draft.walls].map(toCell),
      start: toCell(draft.start),
      end: toCell(draft.end),
      // Unweighted grids stay unweighted.
      ...(state.weights ? { weights: [...draft.weights].map(([i, w]) => [...toCell(i), w] as [number, number, number]) } : {}),
    });
    setDraft(null);
  };

  return (
    <div className="grid h-full w-full place-items-center [container-type:size]">
      <div
        ref={gridRef}
        className={cn("grid select-none", editable && "cursor-crosshair touch-none")}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: `min(100cqw, calc(100cqh * ${cols / rows}))`,
          aspectRatio: `${cols} / ${rows}`,
          gap: cols > 40 ? 1 : 2,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDraft(null)}
        role="img"
        aria-label={`${rows} by ${cols} grid`}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const id = cellId(i);
          const wall = isWall(i);
          const kind = draft ? undefined : kinds.get(id);
          const weight = weightOf(i);
          const isStart = i === start;
          const isEnd = i === end;
          const order = pathIndex.get(id);
          const d = dist?.[i];
          return (
            <div
              key={i}
              className={cn(
                "viz-color relative grid place-items-center overflow-hidden rounded-[3px]",
                kind === "path" && "viz-path-cell",
                kind === "current" && "z-10 ring-2 ring-viz-current",
                wall && "viz-wall-cell",
              )}
              style={
                {
                  backgroundColor: isStart ? "var(--brand)" : isEnd ? "var(--viz-found)" : cellBackground(kind, wall, weight),
                  transitionDuration: `${duration}s`,
                  "--i": order ?? 0,
                  "--n": pathIds.length,
                } as CSSProperties
              }
            >
              {isStart && <Play className="size-[60%] fill-current text-white" />}
              {isEnd && <Flag className="size-[60%] fill-current text-white" />}
              {!isStart && !isEnd && !wall && !compact && (weight > 1 || (d !== undefined && d !== null)) && cols <= 32 && (
                <span
                  className="font-mono leading-none text-foreground/70"
                  style={{ fontSize: `min(10px, calc(100cqw / ${cols} * 0.36))` }}
                >
                  {d ?? weight}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
