"use client";

import { AnimatePresence, motion } from "motion/react";
import { asArrayView, type ArrayState, type LegendItem, type Pointers, type SlotArrayState } from "@/algorithms/core/states";
import type { HighlightKind, Item } from "@/algorithms/core/types";
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
  /** Bars that also carry the `boundary` highlight but are filled with a stronger kind: drawn with an inner outline. */
  outlined?: Set<string>;
};

export function BarRow({ slots, max, kinds, duration, labels, className, target, presence, outlined }: BarRowProps) {
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
          // Always set explicitly: motion keeps the last value of a style that becomes undefined.
          boxShadow: outlined?.has(item.id) ? "inset 0 0 0 2px var(--viz-boundary)" : "inset 0 0 0 0 transparent",
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
export function PointerRow({
  pointers,
  n,
  duration,
  notes,
  pointerKinds,
}: {
  pointers: Pointers;
  n: number;
  duration: number;
  /** Short role text per label. A pointer with a note gets its own row, with the note beside the label. */
  notes?: Record<string, string>;
  /** Highlight kind per label; colours the arrow and outline of a noted pointer. */
  pointerKinds?: Record<string, HighlightKind>;
}) {
  const gap = barGap(n);
  // Passing `notes` (even an empty object) switches to the larger, centre-aligned label style.
  const aligned = notes !== undefined;
  const rowPitch = aligned ? 18 : 15;
  const notedPitch = 23;
  const entries = Object.entries(pointers);
  const plain = entries.filter(([label]) => !notes?.[label]);
  const noted = entries.filter(([label]) => notes?.[label]);
  const stacks = new Map<number, string[]>();
  for (const [label, index] of plain) stacks.set(index, [...(stacks.get(index) ?? []), label]);
  const plainRows = plain.length ? Math.max(...[...stacks.values()].map((s) => s.length)) : 0;
  // Aligned mode reserves room for 1 plain + 3 noted rows so the bars above never change height.
  const height = aligned
    ? Math.max(4 + rowPitch + 3 * notedPitch, 4 + plainRows * rowPitch + noted.length * notedPitch)
    : Math.max(rowPitch, plainRows * rowPitch) + 4;
  const arrow = "block h-0 w-0 shrink-0 border-x-[4px] border-b-[7px] border-x-transparent";
  const alignStyle = (index: number) => {
    const rightHalf = index >= n / 2;
    return {
      rightHalf,
      transform: rightHalf ? "translateX(calc(-100% + 4px))" : "translateX(-4px)",
    };
  };
  return (
    <div className="relative w-full shrink-0" style={{ height }} aria-hidden>
      {noted.map(([label, index], k) => {
        const { rightHalf, transform } = alignStyle(index);
        const color = vizColor(pointerKinds?.[label]);
        return (
          <span
            key={label}
            className={cn(
              "viz-pointer absolute flex items-center gap-1.5 font-mono text-[11px] leading-[13px] font-medium whitespace-nowrap text-foreground",
              rightHalf && "flex-row-reverse",
            )}
            style={{
              left: slotCenter(index, n, gap),
              top: 4 + plainRows * rowPitch + k * notedPitch,
              transform,
              transitionDuration: `${duration}s`,
            }}
          >
            <span className={arrow} style={{ borderBottomColor: color }} />
            <span
              className="rounded-full border px-2.5 py-0.5"
              style={{ borderColor: color, backgroundColor: `color-mix(in oklch, ${color} 22%, transparent)` }}
            >
              {label}:
              <span className="ml-1.5 font-normal text-foreground/70">{notes![label]}</span>
            </span>
          </span>
        );
      })}
      {plain.map(([label, index]) => {
        const top = 4 + stacks.get(index)!.indexOf(label) * rowPitch;
        if (!aligned) {
          return (
            <span
              key={label}
              className="viz-pointer absolute -translate-x-1/2 font-mono text-[11px] leading-[15px] font-medium whitespace-nowrap text-foreground/80"
              style={{ left: slotCenter(index, n, gap), top, transitionDuration: `${duration}s` }}
            >
              <span className="text-[8px] text-muted-foreground">▲</span>
              {label}
            </span>
          );
        }
        const { rightHalf, transform } = alignStyle(index);
        return (
          <span
            key={label}
            className={cn(
              "viz-pointer absolute flex items-center gap-1.5 font-mono text-[11px] leading-[18px] font-medium whitespace-nowrap text-foreground/80",
              rightHalf && "flex-row-reverse",
            )}
            style={{ left: slotCenter(index, n, gap), top, transform, transitionDuration: `${duration}s` }}
          >
            <span className={arrow} style={{ borderBottomColor: vizColor(undefined) }} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** What each bar colour means, as a row of swatches. Only drawn when the algorithm provides one. */
function ColorLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul
      className="flex shrink-0 flex-nowrap gap-x-2 overflow-hidden pt-3 text-[11px] whitespace-nowrap text-foreground/80 @sm:gap-x-3 @sm:text-xs @lg:gap-x-5 @lg:text-sm"
      aria-label="Colour legend"
    >
      {items.map(({ kind, label }) => (
        <li key={label} className="flex items-center gap-1.5 @lg:gap-2">
          <span className="size-2.5 rounded-[3px] @sm:size-3 @lg:size-3.5" style={{ backgroundColor: vizColor(kind) }} />
          {label}
        </li>
      ))}
    </ul>
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
  const { items, target, pointers, pointerNotes, pointerKinds, legend } = asArrayView(state);
  const kinds = highlightMap(step.highlights);
  // A bar shared by `i` (boundary) and a stronger kind keeps that fill but gets an outline in the `i` colour.
  const outlined = new Set<string>();
  for (const h of step.highlights) {
    if (h.kind !== "boundary") continue;
    for (const id of h.ids) if (kinds.get(id) !== "boundary") outlined.add(id);
  }
  const max = Math.max(maxValue(items), target ?? 0);
  return (
    <div className="flex h-full w-full flex-col">
      <BarRow
        className="min-h-0 flex-1"
        slots={items}
        max={max}
        kinds={kinds}
        duration={duration}
        labels={!compact && items.length <= LABEL_LIMIT}
        target={target}
        outlined={outlined}
      />
      {pointers && !compact && <PointerRow pointers={pointers} n={items.length} duration={duration} notes={pointerNotes} pointerKinds={pointerKinds} />}
      {legend && !compact && <ColorLegend items={legend} />}
    </div>
  );
}
