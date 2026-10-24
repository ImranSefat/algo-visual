"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import { tableCellId, type DPTableState } from "@/algorithms/core/states";
import type { HighlightKind } from "@/algorithms/core/types";
import { cn } from "@/lib/utils";
import { highlightMap } from "./highlight";
import type { RendererProps } from "./types";

function cellStyle(kind: HighlightKind | undefined, filled: boolean, duration: number) {
  if (!kind) {
    return {
      backgroundColor: filled ? "var(--muted)" : "transparent",
      borderColor: filled ? "transparent" : "var(--border)",
      transitionDuration: `${duration}s`,
    };
  }
  return {
    backgroundColor: `color-mix(in oklch, var(--viz-${kind}) ${kind === "range" ? "55%" : "70%"}, var(--card))`,
    borderColor: `var(--viz-${kind})`,
    transitionDuration: `${duration}s`,
  };
}

/** Grid of subproblems. A cell pops in when filled; the cell being computed and the cells it reads are highlighted. */
export function DPTable({ step, duration, compact }: RendererProps<DPTableState>) {
  const { rowHeaders, colHeaders, cells, result } = step.state;
  const kinds = highlightMap(step.highlights);
  const cols = cells[0]?.length ?? 0;
  const dense = cols > 14;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-auto">
      <div
        className={cn("grid font-mono", dense ? "gap-0.5 text-[10px]" : "gap-1 text-xs sm:text-sm")}
        style={{
          gridTemplateColumns: `auto repeat(${cols}, minmax(${dense ? 22 : 30}px, ${compact ? 28 : 52}px))`,
        }}
      >
        <div />
        {colHeaders.map((h, j) => (
          <div key={`c${j}`} className="grid place-items-center pb-1 text-muted-foreground">
            {h}
          </div>
        ))}
        {cells.map((row, i) => (
          <Fragment key={`r${i}`}>
            <div className="flex items-center justify-end pr-2 whitespace-nowrap text-muted-foreground">{rowHeaders[i]}</div>
            {row.map((value, j) => {
              const kind = kinds.get(tableCellId(i, j));
              const filled = value !== null;
              return (
                <div
                  key={j}
                  className={cn(
                    "viz-color relative grid aspect-square place-items-center rounded-md border",
                    !filled && "border-dashed",
                  )}
                  style={cellStyle(kind, filled, duration)}
                >
                  {filled && (
                    <motion.span
                      key={String(value)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", visualDuration: duration, bounce: 0.35 }}
                      className={cn("font-semibold tabular-nums", kind && "text-foreground")}
                    >
                      {value}
                    </motion.span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      {!compact && (
        <div className="min-h-7">
          <AnimatePresence mode="wait" initial={false}>
            {result && (
              <motion.div
                key={result}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
                className="rounded-lg bg-foreground px-3 py-1 font-mono text-sm text-background"
              >
                {result}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
