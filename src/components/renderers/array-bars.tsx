"use client";

import { AnimatePresence, motion } from "motion/react";
import { asArrayView, type ArrayState, type Pointers, type SlotArrayState } from "@/algorithms/core/states";
import type { Item } from "@/algorithms/core/types";
import { cn } from "@/lib/utils";
import { highlightMap, vizColor, type HighlightMap } from "./highlight";
import type { RendererProps } from "./types";

/** Above this many bars, layout animation is too costly: colour only. */
export const LAYOUT_LIMIT = 120;
/** Value labels only when they can be read. */
export const LABEL_LIMIT = 40;

export function barGap(n: number): number {
  return n > 80 ? 1 : n > 40 ? 2 : n > 20 ? 3 : 5;
}

/** Horizontal centre of slot `index` in a row of `n` flex slots separated by `gap` px. */
export function slotCenter(index: number, n: number, gap: number): string {
  return `calc((100% - ${(n - 1) * gap}px) * ${(index + 0.5) / n} + ${index * gap}px)`;
}

export function maxValue(slots: (Item | null)[]): number {
  let max = 1;
  for (const item of slots) if (item && item.value > max) max = item.value;
  return max;
}

type BarRowProps = {
  /** `null` is an empty slot (e.g. an item that moved to the auxiliary row). */
  slots: (Item | null)[];
  max: number;
  kinds: HighlightMap;
  duration: number;
  labels: boolean;
  className?: string;
  /** Draws a dashed reference line at this value (search target). */
  target?: number;
  /** Animate bars in and out (structures that create and destroy items). */
  presence?: boolean;
};

export function BarRow({ slots, max, kinds, duration, labels, className, target, presence }: BarRowProps) {
  const n = slots.length;
  const layout = n <= LAYOUT_LIMIT;
  const gap = barGap(n);
  // Mount/unmount animations only for structures; sorting bars never appear or disappear.
  const enterExit = presence
    ? { initial: { opacity: 0, scaleY: 0 }, animate: { opacity: 1, scaleY: 1 }, exit: { opacity: 0, scaleY: 0 } }
    : {};
  const bars = slots.map((item, i) =>
    item === null ? (
      <div key={`slot-${i}`} className="h-full flex-1 rounded-t-[3px] border border-dashed border-border" />
    ) : (
      <motion.div
        key={item.id}
        layout={layout}
        layoutId={layout ? item.id : undefined}
        {...enterExit}
        transition={{ layout: { type: "spring", visualDuration: duration, bounce: 0.18 }, default: { duration } }}
        className="viz-color relative min-h-[3px] flex-1 origin-bottom rounded-t-[3px]"
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
  );
  return (
    <div className={cn("@container h-full w-full", labels && "pt-5", className)}>
      <div className="relative flex h-full w-full items-end" style={{ gap }}>
        {presence ? (
          <AnimatePresence initial={false} mode="popLayout">
            {bars}
          </AnimatePresence>
        ) : (
          bars
        )}
        {target !== undefined && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/50"
            style={{ bottom: `${Math.min(100, (target / max) * 100)}%` }}
          >
            <span className="absolute -top-2.5 right-0 rounded bg-foreground px-1.5 py-px font-mono text-[10px] leading-4 text-background">
              target {target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Labels (i, j, lo, mid…) under the bar they point at; they slide as the index changes. */
export function PointerRow({ pointers, n, duration }: { pointers: Pointers; n: number; duration: number }) {
  const gap = barGap(n);
  const stacks = new Map<number, string[]>();
  for (const [label, index] of Object.entries(pointers)) stacks.set(index, [...(stacks.get(index) ?? []), label]);
  const rows = Math.max(1, ...[...stacks.values()].map((s) => s.length));
  return (
    <div className="relative w-full shrink-0" style={{ height: rows * 15 + 4 }} aria-hidden>
      {Object.entries(pointers).map(([label, index]) => (
        <span
          key={label}
          className="viz-pointer absolute -translate-x-1/2 font-mono text-[11px] leading-[15px] font-medium whitespace-nowrap text-foreground/80"
          style={{
            left: slotCenter(index, n, gap),
            top: 4 + stacks.get(index)!.indexOf(label) * 15,
            transitionDuration: `${duration}s`,
          }}
        >
          <span className="text-[8px] text-muted-foreground">▲</span>
          {label}
        </span>
      ))}
    </div>
  );
}

/** Slot numbers under a fixed-capacity array. */
function IndexRow({ n }: { n: number }) {
  return (
    <div className="flex w-full shrink-0 pt-1" style={{ gap: barGap(n) }} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex-1 text-center font-mono text-[10px] text-muted-foreground/70">
          {i}
        </span>
      ))}
    </div>
  );
}

export function ArrayBars({ step, duration, compact }: RendererProps<ArrayState | SlotArrayState>) {
  const state = step.state;
  if ("slots" in state) {
    const { slots, pointers } = state;
    return (
      <div className="flex h-full w-full flex-col">
        <BarRow
          className="min-h-0 flex-1"
          slots={slots}
          max={maxValue(slots)}
          kinds={highlightMap(step.highlights)}
          duration={duration}
          labels={!compact && slots.length <= LABEL_LIMIT}
          presence
        />
        {!compact && <IndexRow n={slots.length} />}
        {pointers && !compact && <PointerRow pointers={pointers} n={slots.length} duration={duration} />}
      </div>
    );
  }
  const { items, target, pointers } = asArrayView(state);
  const max = Math.max(maxValue(items), target ?? 0);
  return (
    <div className="flex h-full w-full flex-col">
      <BarRow
        className="min-h-0 flex-1"
        slots={items}
        max={max}
        kinds={highlightMap(step.highlights)}
        duration={duration}
        labels={!compact && items.length <= LABEL_LIMIT}
        target={target}
      />
      {pointers && !compact && <PointerRow pointers={pointers} n={items.length} duration={duration} />}
    </div>
  );
}
