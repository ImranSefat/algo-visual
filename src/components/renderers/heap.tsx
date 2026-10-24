"use client";

import { AnimatePresence, motion } from "motion/react";
import type { HeapState } from "@/algorithms/core/states";
import type { Item } from "@/algorithms/core/types";
import { BarRow, LABEL_LIMIT, maxValue, PointerRow } from "./array-bars";
import { highlightMap, nodeFill, nodeStroke, type HighlightMap } from "./highlight";
import type { RendererProps } from "./types";

const WIDTH = 1000;

/** Complete-binary-tree coordinates: node i sits at level ⌊log2(i+1)⌋, evenly spaced within the level. */
function heapLayout(n: number) {
  const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, n))) + 1);
  const bottom = 2 ** (levels - 1);
  const r = Math.max(3, Math.min(26, (WIDTH / bottom) * 0.36));
  const levelGap = Math.max(r * 2.8, Math.min(90, 560 / levels));
  const pos = (i: number) => {
    const level = Math.floor(Math.log2(i + 1));
    const offset = i - (2 ** level - 1);
    return { x: ((offset + 0.5) * WIDTH) / 2 ** level, y: levelGap * (level + 0.5) };
  };
  return { r, height: levels * levelGap, pos };
}

export function HeapTree({
  items,
  size,
  kinds,
  duration,
  capacity = items.length,
}: {
  items: Item[];
  size: number;
  kinds: HighlightMap;
  duration: number;
  /** Lay out for this many nodes so positions stay put as the heap shrinks or grows. */
  capacity?: number;
}) {
  const { r, height, pos } = heapLayout(Math.max(capacity, size));
  const heap = items.slice(0, size);
  const spring = { type: "spring", visualDuration: duration, bounce: 0.15 } as const;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-full w-full" role="img" aria-label="Heap drawn as a binary tree">
      <g>
        {heap.map((_, i) => {
          if (i === 0) return null;
          const a = pos((i - 1) >> 1);
          const b = pos(i);
          return (
            <line
              key={`edge-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-border"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
      <AnimatePresence initial={false}>
        {heap.map((item, i) => {
          const { x, y } = pos(i);
          const kind = kinds.get(item.id);
          return (
            <motion.g
              key={item.id}
              initial={{ x, y, opacity: 0, scale: 0.5 }}
              animate={{ x, y, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={spring}
            >
              <circle
                r={r}
                className="viz-color"
                style={{ fill: nodeFill(kind), stroke: nodeStroke(kind), transitionDuration: `${duration}s` }}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {r >= 10 && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground font-mono font-medium"
                  style={{ fontSize: r * 0.78 }}
                >
                  {item.value}
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

/** Two synced views of the same items: the heap as a tree, and the backing array as bars. */
export function Heap({ step, duration, compact }: RendererProps<HeapState>) {
  const { items, size, capacity, pointers } = step.state;
  const kinds = highlightMap(step.highlights);
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="min-h-0 flex-[3]">
        <HeapTree items={items} size={size} kinds={kinds} duration={duration} capacity={capacity} />
      </div>
      <div className="flex min-h-0 flex-[2] flex-col">
        <BarRow
          className="min-h-0 flex-1"
          slots={items}
          max={maxValue(items)}
          kinds={kinds}
          duration={duration}
          labels={!compact && items.length <= LABEL_LIMIT}
          presence
        />
        {pointers && !compact && <PointerRow pointers={pointers} n={items.length} duration={duration} />}
      </div>
    </div>
  );
}
