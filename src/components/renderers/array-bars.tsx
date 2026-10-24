"use client";

import { motion } from "motion/react";
import type { Item } from "@/algorithms/core/types";
import { cn } from "@/lib/utils";
import { highlightMap, vizColor, type HighlightMap } from "./highlight";
import type { RendererProps } from "./types";

/** Above this many bars, layout animation is too costly: colour only. */
export const LAYOUT_LIMIT = 120;
/** Value labels only when they can be read. */
export const LABEL_LIMIT = 40;

type BarRowProps = {
  /** `null` is an empty slot (e.g. an item that moved to the auxiliary row). */
  slots: (Item | null)[];
  max: number;
  kinds: HighlightMap;
  duration: number;
  labels: boolean;
  className?: string;
  /** Ids that get a small marker under the bar (e.g. the heap boundary). */
  dimmed?: Set<string>;
};

export function BarRow({ slots, max, kinds, duration, labels, className, dimmed }: BarRowProps) {
  const n = slots.length;
  const layout = n <= LAYOUT_LIMIT;
  const gap = n > 80 ? 1 : n > 40 ? 2 : n > 20 ? 3 : 5;
  return (
    <div
      className={cn("@container flex h-full w-full items-end", labels && "pt-5", className)}
      style={{ gap }}
    >
      {slots.map((item, i) =>
        item === null ? (
          <div key={`slot-${i}`} className="h-full flex-1 rounded-t-[3px] border border-dashed border-border/70" />
        ) : (
          <motion.div
            key={item.id}
            layout={layout}
            layoutId={layout ? item.id : undefined}
            transition={{ layout: { type: "spring", visualDuration: duration, bounce: 0.18 } }}
            className={cn(
              "viz-color relative min-h-[3px] flex-1 rounded-t-[3px]",
              dimmed?.has(item.id) && "opacity-35",
            )}
            style={{
              height: `${(item.value / max) * 100}%`,
              backgroundColor: vizColor(kinds.get(item.id)),
              transitionDuration: `${duration}s`,
            }}
          >
            {labels && (
              <span
                className="absolute inset-x-0 -top-[1.35em] text-center font-mono leading-none text-muted-foreground tabular-nums"
                style={{ fontSize: `min(11px, calc(100cqw / ${n} * 0.42))` }}
              >
                {item.value}
              </span>
            )}
          </motion.div>
        ),
      )}
    </div>
  );
}

export function maxValue(slots: (Item | null)[]): number {
  let max = 1;
  for (const item of slots) if (item && item.value > max) max = item.value;
  return max;
}

export function ArrayBars({ step, duration, compact }: RendererProps<Item[]>) {
  const items = step.state;
  return (
    <BarRow
      slots={items}
      max={maxValue(items)}
      kinds={highlightMap(step.highlights)}
      duration={duration}
      labels={!compact && items.length <= LABEL_LIMIT}
    />
  );
}
